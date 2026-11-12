"""Check the optimized bundle, including ML Kit's reflection entry points."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import xml.etree.ElementTree as ET
from zipfile import ZipFile


def dex_stats(bundle):
    entries = [name for name in bundle.namelist()
               if name.startswith('base/dex/') and name.endswith('.dex')]
    return {
        'files': len(entries),
        'bytes': sum(bundle.getinfo(name).file_size for name in entries),
        'methodReferences': sum(struct.unpack_from('<I', bundle.read(name), 88)[0]
                                for name in entries),
    }


def verify(args):
    mapping = args.mapping.read_text(encoding='utf-8')
    sections = {}
    current = None
    for line in mapping.splitlines():
        if line and not line.startswith((' ', '#')) and ' -> ' in line:
            original, renamed = line[:-1].split(' -> ', 1)
            current = original
            sections[current] = [renamed, []]
        elif current and line.startswith(' '):
            sections[current][1].append(line)

    android_name = '{http://schemas.android.com/apk/res/android}name'
    prefix = 'com.google.firebase.components:'
    registrars = [item.attrib[android_name][len(prefix):]
                  for item in ET.parse(args.manifest).iter('meta-data')
                  if item.attrib.get(android_name, '').startswith(prefix)]
    if not registrars:
        raise ValueError('No ML Kit/Firebase registrars found in merged manifest')
    for registrar in registrars:
        renamed, members = sections.get(registrar, (None, []))
        if renamed != registrar or not any('void <init>()' in item for item in members):
            raise ValueError('Missing reflective registrar constructor: ' + registrar)

    with ZipFile(args.bundle) as bundle:
        if bundle.testzip() is not None:
            raise ValueError('Bundle ZIP integrity check failed')
        if bundle.read('BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map') != args.mapping.read_bytes():
            raise ValueError('Embedded mapping differs from this build')
        if not bundle.read('base/assets/index.android.bundle'):
            raise ValueError('Missing embedded JavaScript')
        names = {Path(name).name for name in bundle.namelist() if name.endswith('.png')}
        poses = list(args.poses.glob('*.png'))
        if not poses:
            raise ValueError('Pose source directory is empty')
        for pose in poses:
            resource = 'src_assets_poses_' + re.sub('[^a-z0-9_]', '', pose.stem.lower()) + '.png'
            if resource not in names:
                raise ValueError('Pose image removed by resource shrinking: ' + pose.name)
        report = {'bundle': str(args.bundle), 'bytes': args.bundle.stat().st_size,
                  'sha256': hashlib.sha256(args.bundle.read_bytes()).hexdigest(),
                  'dex': dex_stats(bundle), 'retainedPoses': len(poses),
                  'reflectiveRegistrars': registrars, 'embeddedMappingMatches': True}
    if args.baseline:
        with ZipFile(args.baseline) as baseline:
            report['baselineDex'] = dex_stats(baseline)
        report['dexReductionPercent'] = round(
            (1 - report['dex']['bytes'] / report['baselineDex']['bytes']) * 100, 2)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle', type=Path, required=True)
    parser.add_argument('--mapping', type=Path, default=Path('android/app/build/outputs/mapping/release/mapping.txt'))
    parser.add_argument('--manifest', type=Path, default=Path('android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml'))
    parser.add_argument('--poses', type=Path, default=Path('src/assets/poses'))
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--output', type=Path)
    options = parser.parse_args()
    result = json.dumps(verify(options), indent=2)
    if options.output:
        options.output.write_text(result + '\n', encoding='utf-8')
    print(result)
