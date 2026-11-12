"""Extract the supplied 4 x 5 sheet without redrawing its pose or green guides."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/pose-sheets/single-guides.png'
OUTPUT = ROOT / 'src/assets/poses'

def extract():
    sheet = Image.open(SOURCE).convert('RGB')
    previews = Image.new('RGB', (1000, 1400), '#dedede')
    for index in range(20):
        row, col = divmod(index, 4)
        # Measured card edges; leave the complete body inside each card.
        left, top = [16, 287, 558, 829][col], [16, 339, 662, 985, 1308][row]
        right, bottom = [275, 546, 817, 1088][col], [327, 650, 974, 1297, 1620][row]
        pixels = np.array(sheet.crop((left + 5, top + 5, right - 5, bottom - 5)))
        h, w = pixels.shape[:2]
        # Remove the source's small header labels, outside the person.
        if index in (14, 15):
            pixels[:46, :151] = 255
        dark = pixels.max(axis=2) < 145
        # Card frames are long straight rows/columns near the edges. Avoid
        # following connected contours into limbs, furniture, or green marks.
        for y in range(h):
            if (y < h * .25 or y > h * .94) and dark[y].mean() > .55:
                pixels[max(0, y-2):min(h, y+3)] = 255
        for x in range(w):
            if (x < w * .15 or x > w * .85) and dark[:, x].mean() > .55:
                pixels[:, max(0, x-2):min(w, x+3)] = 255
        # Rounded frame fragments occupy only the outside corners.
        pixels[:12, :12] = 255
        pixels[:12, -12:] = 255
        pixels[-12:, :12] = 255
        pixels[-12:, -12:] = 255
        green = (pixels[:, :, 1].astype(int) > pixels[:, :, 0].astype(int) + 35) & (pixels[:, :, 1].astype(int) > pixels[:, :, 2].astype(int) + 35)
        alpha = np.where(green, 255, np.clip((235 - pixels.min(axis=2).astype(float)) * 255 / 235, 0, 255)).astype('uint8')
        # Isolated fragments of rounded borders remain in the outer margins.
        visited = np.zeros((h, w), dtype=bool)
        for sy, sx in zip(*np.where(alpha > 30)):
            if visited[sy, sx]:
                continue
            stack, component = [(sy, sx)], []
            visited[sy, sx] = True
            while stack:
                yy, xx = stack.pop()
                component.append((yy, xx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = yy + dy, xx + dx
                        if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and alpha[ny, nx] > 30:
                            visited[ny, nx] = True
                            stack.append((ny, nx))
            if len(component) < 100 and all(yy < h * .15 or xx < 12 or xx > w - 12 for yy, xx in component) and not any(green[yy, xx] for yy, xx in component):
                for yy, xx in component:
                    alpha[yy, xx] = 0
        # Neutral strokes become black; green strokes keep their source color.
        rgb = np.where(green[:, :, None], pixels, 0).astype('uint8')
        overlay = Image.fromarray(np.dstack((rgb, alpha)), 'RGBA')
        bounds = overlay.getbbox()
        if bounds is None:
            raise ValueError(f'Empty pose {index + 1}')
        overlay = overlay.crop(bounds)
        padded = Image.new('RGBA', (overlay.width + 32, overlay.height + 32))
        padded.paste(overlay, (16, 16))
        padded.save(OUTPUT / f'single-guide-{index + 1:02}.png')
        padded.thumbnail((230, 250))
        x, y = col * 250 + (250 - padded.width) // 2, row * 280 + 8
        previews.paste(padded, (x, y), padded)
        ImageDraw.Draw(previews).text((col * 250 + 15, row * 280 + 262), f'{index + 1:02}', fill='black')
    audit = ROOT / 'artifacts/pose-import/single-guide-audit.png'
    audit.parent.mkdir(parents=True, exist_ok=True)
    previews.save(audit)
    print('Extracted 20 transparent pose assets.')

if __name__ == '__main__':
    extract()
