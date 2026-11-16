"""Use red pose contours while preserving green guides and source alpha."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
POSE_RED = (255, 59, 48)


def recolor():
    files = sorted((ROOT / 'src/assets/poses').glob('*.png'))
    changed = 0
    for path in files:
        image = Image.open(path).convert('RGBA')
        pixels = np.array(image)
        before = pixels.copy()
        rgb = pixels[:, :, :3].astype(int)
        contour = ((rgb.max(axis=2) - rgb.min(axis=2) < 25)
                   & (rgb.max(axis=2) < 180) & (pixels[:, :, 3] > 0))
        if contour.any():
            pixels[contour, :3] = POSE_RED
            assert np.array_equal(before[:, :, 3], pixels[:, :, 3])
            assert np.array_equal(before[~contour], pixels[~contour])
            Image.fromarray(pixels).save(path, optimize=True)
            changed += 1
    # A small visual audit on light and dark camera-like backgrounds.
    sample = ['male-selfie-06.png', 'male-selfie-08.png',
              'female-guide-d-01.png', 'female-guide-d-04.png']
    preview = Image.new('RGB', (880, 620))
    draw = ImageDraw.Draw(preview)
    for row, background in enumerate(['#eee9e0', '#27343c']):
        draw.rectangle((0, row * 310, 880, (row + 1) * 310), fill=background)
        for col, name in enumerate(sample):
            overlay = Image.open(ROOT / 'src/assets/poses' / name).convert('RGBA')
            overlay.thumbnail((195, 275))
            x = col * 220 + (220 - overlay.width) // 2
            y = row * 310 + (280 - overlay.height) // 2
            preview.paste(overlay, (x, y), overlay)
            draw.text((col * 220 + 8, row * 310 + 288), name,
                      fill='black' if row == 0 else 'white')
    audit = ROOT / 'artifacts/pose-import/red-contours-audit.png'
    audit.parent.mkdir(parents=True, exist_ok=True)
    preview.save(audit)
    print(f'Recolored {changed}/{len(files)} poses; alpha and green guides unchanged.')


if __name__ == '__main__':
    recolor()
