#!/usr/bin/env python3
"""Turn originals/ into web-ready WebP files in images/.

    python3 tools/build_images.py            # only (re)build what changed
    python3 tools/build_images.py --force    # rebuild everything

For every originals/<name>.<ext> this writes images/<name>-800.webp, -1600.webp and
-2400.webp (never upscaled), and records the photo's pixel size in photos.json so the
page can reserve the right space before the image loads.

originals/ is opened read-only: nothing in it is ever modified, moved or deleted.
EXIF (including any GPS location) is not copied into the web versions.
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS = ROOT / "originals"
OUTPUT = ROOT / "images"
DATA = ROOT / "photos.json"

WIDTHS = (800, 1600, 2400)
QUALITY = 82
EXTENSIONS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}


def build(src: Path, force: bool) -> tuple[int, int]:
    """Write all sizes for one original; return its (width, height) after rotation."""
    with Image.open(src) as im:
        icc = im.info.get("icc_profile")
        im = ImageOps.exif_transpose(im)  # returns a copy; the file on disk is untouched
        width, height = im.size
        targets = [OUTPUT / f"{src.stem}-{w}.webp" for w in WIDTHS]
        if not force and all(t.exists() and t.stat().st_mtime >= src.stat().st_mtime for t in targets):
            print(f"  up to date  {src.name}")
            return width, height

        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        for w, target in zip(WIDTHS, targets):
            out_w = min(w, width)
            out = im if out_w == width else im.resize((out_w, round(height * out_w / width)), Image.LANCZOS)
            out.save(target, "WEBP", quality=QUALITY, method=6, icc_profile=icc)
        print(f"  built       {src.name}  ({width}×{height})")
        return width, height


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--force", action="store_true", help="rebuild even if outputs are newer than originals")
    args = parser.parse_args()

    OUTPUT.mkdir(exist_ok=True)
    sources = sorted(p for p in ORIGINALS.iterdir() if p.suffix.lower() in EXTENSIONS)
    if not sources:
        print("No images found in originals/.")
        return 1

    print(f"Processing {len(sources)} originals → images/")
    sizes = {src.name: build(src, args.force) for src in sources}

    data = json.loads(DATA.read_text(encoding="utf-8"))
    entries = list(data.get("photos", []))
    if data.get("portrait"):
        entries.append(data["portrait"])
    listed = set()
    for entry in entries:
        listed.add(entry["file"])
        if entry["file"] in sizes:
            entry["width"], entry["height"] = sizes[entry["file"]]
        else:
            print(f"  warning: photos.json lists {entry['file']} but it is not in originals/")
    for name in sizes.keys() - listed:
        print(f"  note: {name} is not listed in photos.json yet, so it will not appear on the site")

    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated photo sizes in photos.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
