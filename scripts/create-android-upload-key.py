"""Create local upload signing material once; never print passwords or overwrite keys."""
import csv
import io
import os
from pathlib import Path
import secrets
import subprocess

root = Path(__file__).resolve().parents[1]
private_dir = root / 'android' / 'signing'
key_file = private_dir / 'bfcam-upload.p12'
properties = root / 'android' / 'signing.local.properties'
certificate = root / 'artifacts' / 'bfcam-upload-certificate.pem'
keytool = Path(os.environ.get('JAVA_HOME', r'C:\Program Files\Android\Android Studio\jbr')) / 'bin' / 'keytool.exe'

if any(path.exists() for path in (key_file, properties, certificate)):
    raise SystemExit('Signing files already exist. Reuse and back them up; this script will not overwrite them.')
if not keytool.is_file():
    raise SystemExit('Set JAVA_HOME to an installed JDK before creating an upload key.')

identity = subprocess.run(['whoami', '/user', '/fo', 'csv', '/nh'], capture_output=True, text=True, check=True)
sid = next(csv.reader(io.StringIO(identity.stdout.strip())))[1]
if not sid.startswith('S-1-'):
    raise SystemExit('Cannot determine Windows user SID; signing files were not created.')
private_dir.mkdir(parents=True, exist_ok=True)
subprocess.run(['icacls', str(private_dir), '/inheritance:r', '/grant:r', f'*{sid}:(OI)(CI)F'], capture_output=True, check=True)

password = secrets.token_urlsafe(36)
pending = private_dir / 'pending-signing.properties'
with pending.open('x', encoding='ascii') as output:
    output.write('storeFile=signing/bfcam-upload.p12\nstoreType=PKCS12\nkeyAlias=bfcam-upload\n')
    output.write(f'storePassword={password}\nkeyPassword={password}\n')
# Move within the volume, retaining the private ACL, then explicitly protect the final file.
pending.rename(properties)
subprocess.run(['icacls', str(properties), '/inheritance:r', '/grant:r', f'*{sid}:F'], capture_output=True, check=True)
environment = dict(os.environ, BFCAM_GENERATED_KEY_PASSWORD=password)
result = subprocess.run([str(keytool), '-genkeypair', '-noprompt', '-keystore', str(key_file),
    '-storetype', 'PKCS12', '-alias', 'bfcam-upload', '-keyalg', 'RSA', '-keysize', '4096',
    '-sigalg', 'SHA256withRSA', '-validity', '10000', '-dname', 'CN=BFCam Upload',
    '-storepass:env', 'BFCAM_GENERATED_KEY_PASSWORD', '-keypass:env', 'BFCAM_GENERATED_KEY_PASSWORD'],
    env=environment, capture_output=True)
if result.returncode:
    raise SystemExit('Key generation failed. Preserve signing.local.properties for recovery; no existing key will be overwritten.')
subprocess.run(['icacls', str(key_file), '/inheritance:r', '/grant:r', f'*{sid}:F'], capture_output=True, check=True)
certificate.parent.mkdir(parents=True, exist_ok=True)
result = subprocess.run([str(keytool), '-exportcert', '-rfc', '-keystore', str(key_file), '-alias', 'bfcam-upload',
    '-storepass:env', 'BFCAM_GENERATED_KEY_PASSWORD', '-file', str(certificate)], env=environment, capture_output=True)
if result.returncode:
    raise SystemExit('Key created; public certificate export failed. Preserve both private signing files.')
print('Upload key and password configuration created with private Windows file permissions.')
print('Public certificate:', certificate)
print('Back up android/signing and android/signing.local.properties securely. Do not share either.')
