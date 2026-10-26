#!/usr/bin/env python3
"""Create grey PLACEHOLDER originals so the site can be previewed before real photos exist.

Only creates files that do not exist yet; it never overwrites or deletes anything.
Delete the placeholder-*.jpg files from originals/ yourself once you add real photos.
"""
import random
from fractions import Fraction
from pathlib import Path

from PIL import ExifTags, Image, ImageDraw, ImageFont
from PIL.TiffImagePlugin import IFDRational

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "originals"

# name, aspect (w, h), fake camera settings: focal mm, f-number, exposure seconds, ISO
PLACEHOLDERS = [
    ("placeholder-01", (3, 2), 35, 8, Fraction(1, 250), 200),
    ("placeholder-02", (2, 3), 50, 5.6, Fraction(1, 125), 400),
    ("placeholder-03", (4, 5), 28, 11, Fraction(1, 60), 100),
    ("placeholder-04", (16, 9), 35, 4, Fraction(1, 500), 200),
    ("placeholder-05", (1, 1), 50, 2.8, Fraction(1, 1000), 800),
    ("placeholder-06", (3, 2), 400, 6.3, Fraction(1, 2000), 1600),
    ("placeholder-07", (2, 3), 300, 5.6, Fraction(1, 1600), 640),
    ("placeholder-08", (3, 2), 600, 6.3, Fraction(1, 3200), 1250),
    ("placeholder-09", (4, 5), 400, 8, Fraction(1, 1000), 500),
    ("placeholder-10", (2, 3), 90, 8, Fraction(1, 30), 100),
    ("placeholder-11", (3, 2), 90, 11, Fraction(1, 15), 100),
    ("placeholder-12", (1, 1), 60, 5.6, Fraction(1, 8), 200),
    ("placeholder-13", (5, 4), 90, 16, Fraction(1, 4), 64),
    ("portrait", (4, 5), 85, 2, Fraction(1, 200), 400),
]

LONG_EDGE = 3000


def make(name, aspect, focal, fnum, exposure, iso, seed):
    w, h = aspect
    scale = LONG_EDGE / max(w, h)
    size = (round(w * scale), round(h * scale))
    rnd = random.Random(seed)

    # Soft diagonal tone ramp with a little grain — neutral grey only.
    base = rnd.randint(70, 150)
    ramp = Image.linear_gradient("L").rotate(rnd.choice([0, 45, 90, 135]), expand=True)
    ramp = ramp.resize(size).point(lambda v: base + (v - 128) * 0.35)
    grain = Image.effect_noise(size, 10)
    img = Image.blend(ramp, grain.point(lambda v: v * 0.5 + base * 0.5), 0.15)

    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default(size=size[0] // 16)
    small = ImageFont.load_default(size=size[0] // 34)
    ink = 235 if base < 115 else 25
    draw.text((size[0] / 2, size[1] / 2), "PLACEHOLDER", fill=ink, font=font, anchor="mm")
    draw.text((size[0] / 2, size[1] / 2 + size[0] // 11), f"{name}  ·  {w}:{h}", fill=ink, font=small, anchor="mm")

    exif = Image.Exif()
    exif[ExifTags.Base.Make] = "[Camera make]"
    exif[ExifTags.Base.Model] = "[Camera model]"
    sub = exif.get_ifd(ExifTags.IFD.Exif)
    sub[ExifTags.Base.FocalLength] = IFDRational(focal, 1)
    sub[ExifTags.Base.FNumber] = IFDRational(Fraction(fnum).limit_denominator(10))
    sub[ExifTags.Base.ExposureTime] = IFDRational(exposure)
    sub[ExifTags.Base.ISOSpeedRatings] = iso
    sub[ExifTags.Base.LensModel] = "[Lens model]"
    img.convert("RGB").save(ORIGINALS / f"{name}.jpg", quality=90, exif=exif)


def main():
    ORIGINALS.mkdir(exist_ok=True)
    for i, (name, aspect, *settings) in enumerate(PLACEHOLDERS):
        target = ORIGINALS / f"{name}.jpg"
        if target.exists():
            print(f"skip   {target.name} (already exists)")
            continue
        make(name, aspect, *settings, seed=i)
        print(f"create {target.name}")


if __name__ == "__main__":
    main()
