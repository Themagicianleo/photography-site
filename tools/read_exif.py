#!/usr/bin/env python3
"""Fill the camera settings in photos.json from the EXIF data in originals/.

    python3 tools/read_exif.py                    # preview what would change
    python3 tools/read_exif.py --write            # fill in empty fields only
    python3 tools/read_exif.py --write --overwrite  # replace existing values too

Reads focal length, aperture, shutter speed and ISO. Originals are only read, never changed.
"""
import argparse
import json
import sys
from fractions import Fraction
from pathlib import Path

from PIL import ExifTags, Image

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "originals"
DATA = ROOT / "photos.json"

FIELDS = ("focalLength", "aperture", "shutter", "iso")


def number(value) -> str:
    """Format 8.0 as '8' and 5.6 as '5.6'."""
    return f"{float(value):.1f}".rstrip("0").rstrip(".")


def shutter(seconds) -> str:
    seconds = float(seconds)
    if seconds >= 0.3:
        return f"{number(seconds)}s"
    return f"1/{round(1 / seconds)}s"


def read_settings(path: Path) -> dict:
    with Image.open(path) as im:
        exif = im.getexif().get_ifd(ExifTags.IFD.Exif)
    tags = ExifTags.Base
    found = {}
    if exif.get(tags.FocalLength):
        found["focalLength"] = f"{number(exif[tags.FocalLength])}mm"
    if exif.get(tags.FNumber):
        found["aperture"] = f"f/{number(exif[tags.FNumber])}"
    if exif.get(tags.ExposureTime):
        found["shutter"] = shutter(Fraction(float(exif[tags.ExposureTime])).limit_denominator(100000))
    iso = exif.get(tags.ISOSpeedRatings)
    if isinstance(iso, (tuple, list)):
        iso = iso[0] if iso else None
    if iso:
        found["iso"] = f"ISO {iso}"
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--write", action="store_true", help="save the changes to photos.json")
    parser.add_argument("--overwrite", action="store_true", help="also replace values that are already filled in")
    args = parser.parse_args()

    data = json.loads(DATA.read_text(encoding="utf-8"))
    changes = 0
    for photo in data["photos"]:
        src = ORIGINALS / photo["file"]
        if not src.exists():
            print(f"  missing     {photo['file']} (not in originals/)")
            continue
        settings = read_settings(src)
        camera = photo.setdefault("camera", {})
        updates = {k: v for k, v in settings.items() if args.overwrite or not camera.get(k)}
        updates = {k: v for k, v in updates.items() if camera.get(k) != v}
        if not settings:
            print(f"  no EXIF     {photo['file']}")
        elif updates:
            changes += 1
            print(f"  update      {photo['file']}: " + ", ".join(f"{k}={v}" for k, v in updates.items()))
            camera.update(updates)
        else:
            print(f"  unchanged   {photo['file']}")
        # keep a consistent key order
        photo["camera"] = {k: camera.get(k, "") for k in FIELDS}

    if not args.write:
        print(f"\n{changes} photo(s) would change. Run again with --write to save.")
    elif changes:
        DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nSaved {changes} photo(s) to photos.json.")
    else:
        print("\nNothing to change.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
