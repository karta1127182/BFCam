"""Split the approved sheet, using red contours and its original green guides."""
from pathlib import Path
import shutil

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/pose-sheets/male-selfie.png'
OUTPUT = ROOT / 'src/assets/poses'


def extract():
    if not SOURCE.exists():
        shutil.copyfile(ROOT / '十格男性自拍姿勢示意圖.png', SOURCE)
    sheet = Image.open(SOURCE).convert('RGB')
    if sheet.size != (1774, 887):
        raise ValueError(f'Unexpected sheet dimensions: {sheet.size}')
    # The generated sheet has unequal column widths; use its actual panel edges.
    columns = [0, 392, 745, 1099, 1435, 1774]
    rows = [0, 443, 887]
    preview = Image.new('RGB', (1100, 620), '#dddddd')
    for index in range(10):
        row, col = divmod(index, 5)
        pixels = np.array(sheet.crop((columns[col] + 3, rows[row] + 3,
                                     columns[col + 1] - 3, rows[row + 1] - 3)))
        # Number badges sit above and to the left of every figure.
        pixels[:40, :70] = 255
        green = ((pixels[:, :, 1].astype(int) > pixels[:, :, 0].astype(int) + 35)
                 & (pixels[:, :, 1].astype(int) > pixels[:, :, 2].astype(int) + 35))
        alpha = np.where(green, 255,
                         np.clip((220 - pixels.min(axis=2).astype(float)) * 255 / 220,
                                 0, 255)).astype('uint8')
        rgb = np.where(green[:, :, None], pixels, (255, 59, 48)).astype('uint8')
        overlay = Image.fromarray(np.dstack((rgb, alpha)))
        bounds = overlay.getbbox()
        if bounds is None:
            raise ValueError(f'Empty pose {index + 1}')
        overlay = overlay.crop(bounds)
        padded = Image.new('RGBA', (overlay.width + 32, overlay.height + 32))
        padded.paste(overlay, (16, 16))
        padded.save(OUTPUT / f'male-selfie-{index + 1:02}.png', optimize=True)
        padded.thumbnail((200, 270))
        x = col * 220 + (220 - padded.width) // 2
        y = row * 310 + (280 - padded.height) // 2
        preview.paste(padded, (x, y), padded)
        ImageDraw.Draw(preview).text((col * 220 + 10, row * 310 + 287),
                                     f'{index + 1:02}', fill='black')
    audit = ROOT / 'artifacts/pose-import/male-selfie-audit.png'
    audit.parent.mkdir(parents=True, exist_ok=True)
    preview.save(audit)
    print('Extracted 10 transparent male selfie assets.')


if __name__ == '__main__':
    extract()
