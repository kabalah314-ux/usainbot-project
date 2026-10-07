from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).parent
SOURCE = Path(r"C:\Users\oscar\Downloads\Gemini_Generated_Image_xshthpxshthpxsht.jfif")
CHALLENGE_SOURCE = Path(r"C:\Users\oscar\Downloads\usainbot desafiante.jpeg")
DEV_LOGO_SOURCE = Path(r"C:\Users\oscar\Downloads\Gemini_Generated_Image_xtmtdaxtmtdaxtmt.jfif")
TOKENOMICS_SOURCE = Path(r"C:\Users\oscar\Downloads\b_poneme_a_este_person.png")
OUT = ROOT / "public"


def connected_white_background(
    rgb: np.ndarray,
    *,
    minimum: int = 215,
    maximum_spread: int = 24,
) -> np.ndarray:
    """Return the light neutral background connected to the image border.

    The tokenomics artwork also contains a soft grey floor shadow. Allowing a
    slightly darker neutral range for that asset removes the shadow while the
    flood-fill keeps light armour details that are enclosed by the outline.
    """
    near_white = (rgb.min(axis=2) >= minimum) & (
        (rgb.max(axis=2) - rgb.min(axis=2)) <= maximum_spread
    )
    h, w = near_white.shape
    seen = np.zeros((h, w), dtype=bool)
    queue: deque[tuple[int, int]] = deque()

    for x in range(w):
        if near_white[0, x]:
            seen[0, x] = True
            queue.append((0, x))
        if near_white[h - 1, x] and not seen[h - 1, x]:
            seen[h - 1, x] = True
            queue.append((h - 1, x))
    for y in range(h):
        if near_white[y, 0] and not seen[y, 0]:
            seen[y, 0] = True
            queue.append((y, 0))
        if near_white[y, w - 1] and not seen[y, w - 1]:
            seen[y, w - 1] = True
            queue.append((y, w - 1))

    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near_white[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    rgb = np.asarray(image.convert("RGB"))
    background = connected_white_background(rgb)
    rgba = np.asarray(image).copy()
    rgba[background, 3] = 0
    cutout = Image.fromarray(rgba, "RGBA")

    alpha = rgba[:, :, 3]
    ys, xs = np.where(alpha > 10)
    bbox = (max(0, int(xs.min()) - 10), max(0, int(ys.min()) - 10), min(image.width, int(xs.max()) + 11), min(image.height, int(ys.max()) + 11))
    print(f"character bbox: {bbox}")

    tight = cutout.crop(bbox)
    tight.save(OUT / "usain-bot-new.png")
    tight.save(OUT / "usain-bot.png")
    tight.save(ROOT / "src" / "assets" / "usain-bot.png")
    mini_games_asset = ROOT / "developing-react-mini-games" / "public" / "usain-bot.png"
    if mini_games_asset.parent.exists():
        tight.save(mini_games_asset)

    preview = tight.copy()
    draw = ImageDraw.Draw(preview)
    draw.rectangle((0, 0, preview.width - 1, preview.height - 1), outline=(255, 225, 77, 255), width=4)
    preview.save(OUT / "usain-bot-new-preview.png")

    polygons = {
        "rig-head.png": [(352, 0), (468, 0), (545, 35), (590, 115), (575, 205), (520, 255), (450, 265), (395, 230), (365, 170), (337, 100)],
        "rig-arm-back.png": [(48, 145), (90, 118), (135, 100), (180, 78), (232, 85), (285, 102), (335, 122), (362, 165), (359, 207), (340, 242), (300, 270), (250, 270), (210, 254), (180, 288), (135, 307), (88, 295), (53, 270), (38, 232), (36, 190)],
        "rig-arm-front.png": [(450, 248), (478, 238), (505, 245), (530, 260), (548, 280), (577, 252), (593, 212), (601, 178), (625, 166), (650, 182), (666, 215), (660, 260), (640, 302), (604, 337), (565, 345), (535, 340), (510, 325), (485, 315), (460, 300), (440, 276)],
        "rig-leg-back.png": [(0, 395), (35, 360), (70, 340), (107, 370), (132, 420), (175, 430), (230, 420), (285, 402), (314, 440), (290, 480), (245, 520), (192, 545), (147, 544), (110, 510), (75, 488), (35, 500), (5, 482)],
        "rig-leg-front.png": [(323, 335), (385, 320), (430, 350), (454, 410), (474, 475), (500, 525), (540, 545), (585, 515), (620, 500), (652, 505), (672, 535), (667, 590), (635, 620), (585, 652), (535, 680), (485, 676), (458, 648), (442, 600), (420, 550), (400, 500), (369, 460), (340, 430), (320, 390)],
    }
    # Keep the torso as a clean body layer. The previous mask reached into both
    # shoulders and left fragments of the source arms visible underneath the
    # animated arm layers, which made the mascot look like it had extra static
    # arms hanging from its sides.
    torso_polygon = [
        (270, 145),
        (335, 125),
        (397, 145),
        (433, 188),
        (450, 245),
        (458, 315),
        (438, 375),
        (395, 415),
        (335, 438),
        (275, 432),
        (225, 408),
        (192, 365),
        (184, 315),
        (202, 265),
        (228, 215),
    ]

    parts_preview = Image.new("RGBA", tight.size, (18, 18, 28, 255))
    masks: dict[str, Image.Image] = {}
    for filename, polygon in polygons.items():
        mask = Image.new("L", tight.size, 0)
        ImageDraw.Draw(mask).polygon(polygon, fill=255)
        mask = ImageChops.multiply(mask, tight.getchannel("A"))
        masks[filename] = mask

    torso_mask = Image.new("L", tight.size, 0)
    ImageDraw.Draw(torso_mask).polygon(torso_polygon, fill=255)
    # Arm layers are composited above the torso at runtime. Remove their
    # source pixels from the body mask as well, otherwise a second static arm
    # remains visible wherever the masks overlap.
    # The narrowed torso polygon already excludes the back arm. Subtracting
    # the whole arm mask here cuts a visible transparent wedge at the shoulder
    # after the arm is rotated, so keep the body underneath that joint solid.
    torso_mask = ImageChops.subtract(torso_mask, masks["rig-arm-front.png"])
    masks["rig-torso.png"] = ImageChops.multiply(tight.getchannel("A"), torso_mask)

    for filename in ("rig-torso.png", *polygons.keys()):
        mask = masks[filename]
        part = Image.new("RGBA", tight.size, (0, 0, 0, 0))
        part.paste(tight, (0, 0), mask)
        part_bbox = mask.getbbox()
        if part_bbox is None:
            continue
        pad = 6
        crop = (max(0, part_bbox[0] - pad), max(0, part_bbox[1] - pad), min(tight.width, part_bbox[2] + pad), min(tight.height, part_bbox[3] + pad))
        part.crop(crop).save(OUT / filename)
        parts_preview.alpha_composite(part)

    parts_preview.save(OUT / "usain-bot-new-parts-preview.png")

    if CHALLENGE_SOURCE.exists():
        challenge = Image.open(CHALLENGE_SOURCE).convert("RGBA")
        challenge_rgb = np.asarray(challenge.convert("RGB"))
        challenge_background = connected_white_background(challenge_rgb)
        challenge_rgba = np.asarray(challenge).copy()
        challenge_rgba[challenge_background, 3] = 0
        challenge_alpha = challenge_rgba[:, :, 3]
        ys, xs = np.where(challenge_alpha > 10)
        challenge_bbox = (
            max(0, int(xs.min()) - 24),
            max(0, int(ys.min()) - 24),
            min(challenge.width, int(xs.max()) + 25),
            min(challenge.height, int(ys.max()) + 25),
        )
        challenge_cutout = Image.fromarray(challenge_rgba, "RGBA").crop(challenge_bbox)
        challenge_cutout.save(OUT / "usain-bot-challenge.png")
        challenge_cutout.save(ROOT / "src" / "assets" / "usain-bot-challenge.png")
        print(f"challenge bbox: {challenge_bbox}")

    if DEV_LOGO_SOURCE.exists():
        logo = Image.open(DEV_LOGO_SOURCE).convert("RGB")
        logo_rgb = np.asarray(logo).astype(np.int16)
        red, green, blue = logo_rgb[:, :, 0], logo_rgb[:, :, 1], logo_rgb[:, :, 2]
        # The supplied JFIF contains a grey checkerboard instead of real
        # transparency. Gold pixels have a much higher red/blue separation;
        # use that chroma as an alpha matte and keep the mark intact.
        chroma = red - blue
        alpha = np.clip((chroma - 9) * 12, 0, 255).astype(np.uint8)
        alpha[(red - green) < 5] = 0
        logo_rgba = np.dstack((logo_rgb.astype(np.uint8), alpha))
        ys, xs = np.where(alpha > 24)
        logo_bbox = (
            max(0, int(xs.min()) - 16),
            max(0, int(ys.min()) - 16),
            min(logo.width, int(xs.max()) + 17),
            min(logo.height, int(ys.max()) + 17),
        )
        logo_cutout = Image.fromarray(logo_rgba, "RGBA").crop(logo_bbox)
        logo_cutout.save(OUT / "dev-logo.png")
        print(f"dev logo bbox: {logo_bbox}")

    if TOKENOMICS_SOURCE.exists():
        tokenomics = Image.open(TOKENOMICS_SOURCE).convert("RGBA")
        tokenomics_rgb = np.asarray(tokenomics.convert("RGB"))
        tokenomics_background = connected_white_background(
            tokenomics_rgb,
            minimum=175,
            maximum_spread=50,
        )
        tokenomics_rgba = np.asarray(tokenomics).copy()
        tokenomics_rgba[tokenomics_background, 3] = 0
        tokenomics_alpha = tokenomics_rgba[:, :, 3]
        ys, xs = np.where(tokenomics_alpha > 10)
        tokenomics_bbox = (
            max(0, int(xs.min()) - 24),
            max(0, int(ys.min()) - 24),
            min(tokenomics.width, int(xs.max()) + 25),
            min(tokenomics.height, int(ys.max()) + 25),
        )
        tokenomics_cutout = Image.fromarray(tokenomics_rgba, "RGBA").crop(tokenomics_bbox)
        tokenomics_cutout.save(OUT / "tokenomics-character.png")
        print(f"tokenomics character bbox: {tokenomics_bbox}")


if __name__ == "__main__":
    main()
