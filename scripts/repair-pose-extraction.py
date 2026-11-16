"""Restore clipped source contours and respect the mixed sheet's alpha channel."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SHEETS = ROOT / 'src/assets/pose-sheets'
OUTPUT = ROOT / 'src/assets/poses'


def overlay(source, rectangle, destination, framed=False):
    pixels = np.array(source.crop(rectangle).convert('RGBA'))
    rgb = pixels[:, :, :3].astype(float)
    source_alpha = pixels[:, :, 3].astype(float)
    green = (rgb[:, :, 1] > rgb[:, :, 0] + 35) & (rgb[:, :, 1] > rgb[:, :, 2] + 35)
    # Hidden RGB and faint cutout fringes are not visible linework. In particular,
    # do not promote partially transparent black pixels to opaque contours.
    darkness = np.clip((235 - rgb.min(axis=2)) / 235, 0, 1)
    alpha = np.where(green, source_alpha, darkness * source_alpha)
    alpha[alpha < 35] = 0
    if framed:
        # Only the card's rounded corner remains after removing its straight
        # frame. Do not inset the entire image and cut through hands or feet.
        yy, xx = np.indices(alpha.shape)
        edge_x = np.minimum(xx, alpha.shape[1] - 1 - xx)
        edge_y = np.minimum(yy, alpha.shape[0] - 1 - yy)
        alpha[edge_x + edge_y < 22] = 0
        # Some generated cards contain a second, slightly inset border. Remove
        # its long straight runs, preserving the intentional wall references.
        height, width = alpha.shape
        if destination not in ('male-guide-a-04.png', 'male-guide-b-07.png'):
            for x in list(range(min(28, width))) + list(range(max(0, width - 28), width)):
                line = (alpha[:, x] > 35) & ~green[:, x]
                changes = np.diff(np.r_[False, line, False].astype(int))
                starts, ends = np.where(changes == 1)[0], np.where(changes == -1)[0]
                for start, end in zip(starts, ends):
                    if end - start > height * .72:
                        alpha[start:end, max(0, x - 1):min(width, x + 2)] = 0
    # Card edges and corner flecks are separate from the person. Remove only
    # these isolated components; never trace an edge through a connected limb.
    if destination.startswith('male-guide-'):
        occupied = alpha > 0
        visited = np.zeros(occupied.shape, dtype=bool)
        height, width = occupied.shape
        for sy, sx in zip(*np.where(occupied)):
            if visited[sy, sx]:
                continue
            stack, component = [(sy, sx)], []
            visited[sy, sx] = True
            while stack:
                y, x = stack.pop()
                component.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height and 0 <= nx < width and occupied[ny, nx] and not visited[ny, nx]:
                            visited[ny, nx] = True
                            stack.append((ny, nx))
            ys, xs = zip(*component)
            contains_guide = any(green[y, x] for y, x in component)
            frame = (max(xs) - min(xs) < 15 and max(ys) - min(ys) > height * .6
                     and (min(xs) < 12 or max(xs) > width - 12))
            corner = (len(component) < 120 and
                      (max(ys) < 20 or min(ys) > height - 20))
            if not contains_guide and (frame or corner):
                for y, x in component:
                    alpha[y, x] = 0
    color = np.where(green[:, :, None], rgb, (255, 59, 48)).astype('uint8')
    result = Image.fromarray(np.dstack((color, alpha.astype('uint8'))))
    bounds = result.getbbox()
    if bounds is None:
        raise ValueError(f'Empty overlay: {destination}')
    result = result.crop(bounds)
    padded = Image.new('RGBA', (result.width + 32, result.height + 32))
    padded.paste(result, (16, 16))
    padded.save(OUTPUT / destination, optimize=True)


def card_overlay(source, rectangle, destination):
    """Locate the actual frame near each measured edge and keep its interior."""
    rgb = np.array(source.convert('RGB'))
    ink = rgb.max(axis=2) < 120
    left, top, right, bottom = rectangle

    def vertical(guess):
        candidates = list(range(max(0, guess - 4), min(source.width, guess + 5)))
        return max(candidates, key=lambda x: ink[top + 25:bottom - 25, x].sum())

    def horizontal(guess):
        candidates = list(range(max(0, guess - 4), min(source.height, guess + 5)))
        return max(candidates, key=lambda y: ink[y, left + 25:right - 25].sum())

    left, right = vertical(left), vertical(right)
    top, bottom = horizontal(top), horizontal(bottom)
    overlay(source, (left + 3, top + 3, right - 2, bottom - 2), destination, framed=True)


def repair():
    repaired = []
    four = Image.open(SHEETS / 'four-guides.png')
    # The second row starts above the mathematical halfway point.
    for i in range(1, 9):
        row, col = divmod(i - 1, 4)
        name = f'four-guide-{i:02}.png'
        overlay(four, (col * 384, 0 if row == 0 else 454,
                       (col + 1) * 384, 454 if row == 0 else 1024), name)
        repaired.append(name)

    # Use the inside of each actual lower card, with just enough inset to remove
    # its frame. The old 20px inset cut through hair and heads.
    male_columns = [(8, 204), (212, 408), (418, 597),
                    (604, 789), (797, 989), (997, 1191)]
    male_rows = [(15, 436), (450, 849), (863, 1296)]
    for prefix in ['male-guide-a', 'male-guide-b']:
        sheet = Image.open(SHEETS / f'{prefix}.png')
        for i in range(1, 19):
            row, col = divmod(i - 1, 6)
            left, right = male_columns[col]
            top, bottom = male_rows[row]
            name = f'{prefix}-{i:02}.png'
            if name == 'male-guide-a-14.png':
                # This card has a duplicate inset border beside the elbow.
                overlay(sheet, (216, 867, 382, 1290), name, framed=True)
            else:
                card_overlay(sheet, (left, top, right, bottom), name)
            repaired.append(name)

    female_columns = [(29, 399), (419, 781), (802, 1170)]
    female_rows = [(17, 446), (461, 867), (883, 1295)]
    for suffix in ['a', 'b', 'c', 'd']:
        sheet = Image.open(SHEETS / f'female-guide-{suffix}.png')
        positions = [(r, c) for r in range(3) for c in range(3)]
        rows = female_rows
        if suffix == 'a':
            positions = [(0, 0), (0, 1), (0, 2), (1, 1), (1, 2), (2, 0), (2, 1)]
            rows = [(17, 483), (496, 870), (883, 1295)]
        for i, (row, col) in enumerate(positions, 1):
            left, right = female_columns[col]
            top, bottom = rows[row]
            name = f'female-guide-{suffix}-{i:02}.png'
            card_overlay(sheet, (left, top, right, bottom), name)
            repaired.append(name)

    couple = Image.open(SHEETS / '16格情侶姿勢線稿指南.png')
    couple_columns = [(13, 311), (324, 622), (633, 932), (942, 1241)]
    couple_rows = [(10, 312), (323, 623), (633, 934), (944, 1245)]
    for i in range(1, 17):
        row, col = divmod(i - 1, 4)
        left, right = couple_columns[col]
        top, bottom = couple_rows[row]
        name = f'couple-{i:02}.png'
        card_overlay(couple, (left, top, right, bottom), name)
        repaired.append(name)

    six = Image.open(SHEETS / 'six-standing.png')
    for i in range(1, 7):
        row, col = divmod(i - 1, 3)
        name = f'six-standing-{i:02}.png'
        overlay(six, (col * 512, 0 if row == 0 else 480,
                      (col + 1) * 512, 480 if row == 0 else 1024), name)
        repaired.append(name)

    mixed = Image.open(SHEETS / 'mixed-guides.png')
    rows = [(0, 350), (350, 647), (647, 971)]
    for i in range(1, 16):
        row, col = divmod(i - 1, 5)
        name = f'mixed-guide-{i:02}.png'
        overlay(mixed, (col * 324, rows[row][0], (col + 1) * 324, rows[row][1]), name)
        repaired.append(name)

    audit = Image.new('RGB', (1300, ((len(repaired) + 4) // 5) * 320), '#eeeeee')
    for index, name in enumerate(repaired):
        image = Image.open(OUTPUT / name).convert('RGBA')
        image.thumbnail((230, 280))
        row, col = divmod(index, 5)
        audit.paste(image, (col * 260 + (260 - image.width) // 2, row * 320 + 5), image)
        ImageDraw.Draw(audit).text((col * 260 + 8, row * 320 + 295), name, fill='black')
    audit_path = ROOT / 'artifacts/pose-import/repaired-contours.png'
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit.save(audit_path)
    print(f'Re-extracted {len(repaired)} overlays from the original source sheets.')


if __name__ == '__main__':
    repair()
