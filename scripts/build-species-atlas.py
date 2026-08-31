#!/usr/bin/env python3
"""Normalize the approved ImageGen 5x4 species atlas into the runtime WebP."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import PIL
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "packages" / "dsh-whale-companion" / "assets"
SOURCE = ASSETS / "whale-species-atlas-imagegen-source.png"
OUTPUT = ASSETS / "whale-species-atlas.webp"
REPORT = ASSETS / "whale-species-atlas-report.json"
REQUIRED_PILLOW = "12.3.0"
SOURCE_SIZE = (1537, 1023)
OUTPUT_SIZE = (960, 640)
SPECIES = [
    "common-minke", "brydes", "humpback", "gray", "beluga",
    "orca", "sperm", "pilot", "narwhal", "bowhead",
    "fin", "sei", "blue", "southern-right", "omura",
    "cuviers-beaked", "north-atlantic-right", "north-pacific-right", "rices", "spade-toothed",
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build() -> tuple[bytes, dict[str, object]]:
    if PIL.__version__ != REQUIRED_PILLOW:
        raise RuntimeError(f"Pillow {REQUIRED_PILLOW} required; found {PIL.__version__}")
    source_bytes = SOURCE.read_bytes()
    source = Image.open(io.BytesIO(source_bytes)).convert("RGB")
    if source.size != SOURCE_SIZE:
        raise RuntimeError(f"unexpected ImageGen source size {source.size}; expected {SOURCE_SIZE}")
    atlas = source.resize(OUTPUT_SIZE, Image.Resampling.LANCZOS)
    encoded = io.BytesIO()
    atlas.save(encoded, format="WEBP", quality=92, method=6, exact=True)
    output_bytes = encoded.getvalue()
    report: dict[str, object] = {
        "schemaVersion": 1,
        "source": {
            "file": SOURCE.name,
            "sha256": sha256(source_bytes),
            "mode": "RGB",
            "size": list(SOURCE_SIZE),
            "origin": "built-in image_gen",
            "prompt": "docs/species-atlas-imagegen-v2.md#final-built-in-imagegen-prompt",
        },
        "output": {
            "file": OUTPUT.name,
            "sha256": sha256(output_bytes),
            "format": "WEBP",
            "size": list(OUTPUT_SIZE),
            "columns": 5,
            "rows": 4,
            "cell": [192, 160],
            "speciesOrder": SPECIES,
        },
        "constraints": {
            "vectorRuntimeArt": False,
            "visibleGridLines": False,
            "textOrLogos": False,
        },
    }
    return output_bytes, report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output_bytes, report = build()
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_bytes() != output_bytes:
            raise RuntimeError("runtime species atlas is stale")
        if REPORT.read_text(encoding="utf-8") != serialized:
            raise RuntimeError("species atlas provenance report is stale")
    else:
        OUTPUT.write_bytes(output_bytes)
        REPORT.write_text(serialized, encoding="utf-8")
    print(json.dumps({"ok": True, "mode": "check" if args.check else "write", "outputSha256": report["output"]["sha256"]}))


if __name__ == "__main__":
    main()
