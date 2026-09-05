#!/usr/bin/env python3
"""Extract the 24 ImageGen poses without drawing or deforming the character.

The generated poses cross the nominal grid lines. Connected black silhouettes,
not a fixed grid crop, locate each whale. Only the exterior paper is removed;
the enclosed white eye is preserved. Uniform scale and translation stabilize
the eye and body area. No frame interpolation or pose reordering is performed.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "artwork-sources/ink-whale-poses-imagegen.png"
IDENTITY = ROOT / "artwork-sources/ink-whale-identity-imagegen.png"
ASSETS = ROOT / "packages/dsh-whale-companion/assets"
FRAME_SIZE = (384, 320)
EYE_TARGET = (287.0, 149.0)
BODY_AREA_TARGET = 12100.0


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def components(mask: np.ndarray) -> list[np.ndarray]:
    """Deterministic 4-connected components; no optional scipy dependency."""
    pending = mask.copy()
    height, width = pending.shape
    found = []
    for y, x in zip(*np.where(mask)):
        if not pending[y, x]:
            continue
        pending[y, x] = False
        stack = [(int(y), int(x))]
        points = []
        while stack:
            row, col = stack.pop()
            points.append((row, col))
            for yy, xx in ((row - 1, col), (row + 1, col), (row, col - 1), (row, col + 1)):
                if 0 <= yy < height and 0 <= xx < width and pending[yy, xx]:
                    pending[yy, xx] = False
                    stack.append((yy, xx))
        found.append(np.asarray(points, dtype=np.int32))
    return found


def edge_connected(mask: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    result = np.zeros_like(mask)
    queue = deque()
    for y, x in ([(0, x) for x in range(width)] + [(height - 1, x) for x in range(width)]
                 + [(y, 0) for y in range(height)] + [(y, width - 1) for y in range(height)]):
        if mask[y, x] and not result[y, x]:
            result[y, x] = True
            queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= yy < height and 0 <= xx < width and mask[yy, xx] and not result[yy, xx]:
                result[yy, xx] = True
                queue.append((yy, xx))
    return result


def remove_paper(rgb: np.ndarray) -> tuple[Image.Image, tuple[float, float]]:
    gray = rgb.astype(np.float32).mean(axis=2)
    exterior = edge_connected(gray >= 75)
    # A white feature enclosed by the silhouette is artwork, not paper.
    eyes = []
    for part in components((gray >= 130) & ~exterior):
        y, x = part.mean(axis=0)
        if 1 <= len(part) <= 45 and x > rgb.shape[1] * 0.65:
            eyes.append((len(part), float(x), float(y)))
    if not eyes:
        raise ValueError("No enclosed eye found; review source instead of inventing an anchor")
    _, eye_x, eye_y = max(eyes)
    alpha = np.full(gray.shape, 255, dtype=np.float32)
    # Remove off-white paper and retain source antialias coverage at the edge.
    alpha[exterior] = np.clip((240.0 - gray[exterior]) * 255.0 / 240.0, 0, 255)
    rgba = np.dstack([rgb, np.rint(alpha).astype(np.uint8)])
    # Undo white matte only on the partially transparent outer edge.
    aa = exterior & (alpha > 0)
    if aa.any():
        coverage = alpha[aa, None] / 255.0
        rgba[aa, :3] = np.clip((rgb[aa] - 255.0 * (1.0 - coverage)) / coverage, 0, 255).round()
    rgba[alpha == 0, :3] = 0
    return Image.fromarray(rgba, "RGBA"), (eye_x, eye_y)


def png_bytes(image: Image.Image) -> bytes:
    stream = io.BytesIO()
    image.save(stream, format="PNG", optimize=False, compress_level=9)
    return stream.getvalue()


def composite_white(frame: Image.Image, width: int) -> Image.Image:
    small = frame.resize((width, round(width * FRAME_SIZE[1] / FRAME_SIZE[0])), Image.Resampling.LANCZOS)
    paper = Image.new("RGBA", small.size, "white")
    paper.alpha_composite(small)
    return paper.convert("RGB")


def build() -> dict[Path, bytes]:
    source_bytes = SOURCE.read_bytes()
    image = Image.open(io.BytesIO(source_bytes)).convert("RGB")
    rgb = np.asarray(image)
    dark = rgb.mean(axis=2) < 100
    silhouettes = [part for part in components(dark) if len(part) > 2000]
    if len(silhouettes) != 24:
        raise ValueError(f"Expected 24 separate whales, got {len(silhouettes)}")
    # Group top-to-bottom in six-whale rows, then left-to-right. This preserves
    # the generated sheet's original 1..24 sequence and does not optimize order.
    silhouettes.sort(key=lambda part: float(part[:, 0].mean()))
    ordered = []
    for row in range(4):
        ordered.extend(sorted(silhouettes[row * 6:(row + 1) * 6], key=lambda part: float(part[:, 1].mean())))
    frames = []
    records = []
    for index, part in enumerate(ordered):
        ymin, xmin = part.min(axis=0)
        ymax, xmax = part.max(axis=0)
        bounds = (max(0, int(xmin) - 5), max(0, int(ymin) - 5), min(image.width, int(xmax) + 6), min(image.height, int(ymax) + 6))
        crop_rgb = np.asarray(image.crop(bounds))
        cleaned, eye = remove_paper(crop_rgb)
        # Equal silhouette area reduces generated identity/volume breathing.
        # It is a single uniform transform of the source, not anatomical warping.
        scale = (BODY_AREA_TARGET / len(part)) ** 0.5
        new_size = (round(cleaned.width * scale), round(cleaned.height * scale))
        scaled = cleaned.resize(new_size, Image.Resampling.LANCZOS)
        realized_scale = (new_size[0] / cleaned.width, new_size[1] / cleaned.height)
        eye_scaled = (eye[0] * realized_scale[0], eye[1] * realized_scale[1])
        origin = (round(EYE_TARGET[0] - eye_scaled[0]), round(EYE_TARGET[1] - eye_scaled[1]))
        if origin[0] < 6 or origin[1] < 6 or origin[0] + scaled.width > FRAME_SIZE[0] - 6 or origin[1] + scaled.height > FRAME_SIZE[1] - 6:
            raise ValueError(f"Frame {index + 1} would clip: origin={origin} size={scaled.size}")
        frame = Image.new("RGBA", FRAME_SIZE)
        frame.alpha_composite(scaled, origin)
        frames.append(frame)
        alpha = np.asarray(frame)[:, :, 3]
        records.append({"frame": index + 1, "sourceCrop": list(bounds), "sourceDarkArea": len(part), "sourceEye": [round(eye[0] + bounds[0], 5), round(eye[1] + bounds[1], 5)], "uniformScale": round(scale, 8), "resizedSize": list(new_size), "origin": list(origin), "outputEye": [round(eye_scaled[0] + origin[0], 5), round(eye_scaled[1] + origin[1], 5)], "alphaBoundingBox": list(frame.getbbox()), "opaqueArea": int((alpha > 200).sum()), "sha256": digest(png_bytes(frame))})

    sheet = Image.new("RGBA", (2304, 1280))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % 6) * 384, (index // 6) * 320))
    output = {ASSETS / "ink-whale-sprite.png": png_bytes(sheet), ASSETS / "ink-whale-still.png": png_bytes(frames[0])}

    contact = Image.new("RGB", (1536, 1440), "#edf1f6")
    draw = ImageDraw.Draw(contact)
    draw.text((16, 14), "IMAGEGEN ORIGINAL ORDER - 24 POSES - FULL BODY / EYE ALIGNED", fill="#17212b")
    for index, frame in enumerate(frames):
        x, y = (index % 6) * 256, 45 + (index // 6) * 240
        contact.paste(composite_white(frame, 240), (x + 8, y + 25))
        draw.text((x + 12, y + 6), f"{index + 1:02d} / 240 px", fill="#25364b")
    draw.text((16, 1017), "ACTUAL COMPACT RENDER SIZE: 144 PX / FRAME (NO GENERATED IN-BETWEEN POSES)", fill="#17212b")
    for index, frame in enumerate(frames):
        x, y = (index % 8) * 192, 1050 + (index // 8) * 128
        contact.paste(composite_white(frame, 144), (x + 24, y))
        draw.text((x + 4, y + 10), f"{index + 1:02d}", fill="#25364b")
    output[ROOT / "docs/ink-whale-contact-sheet.png"] = png_bytes(contact)

    previews = []
    for index, frame in enumerate(frames):
        preview = Image.new("RGB", (620, 270), "#f4f5f7")
        preview.paste(composite_white(frame, 240), (16, 42))
        preview.paste(composite_white(frame, 144), (300, 80))
        preview.paste(composite_white(frame, 100), (490, 100))
        label = ImageDraw.Draw(preview)
        label.text((16, 14), "240 px / 24 generated poses / 24 fps", fill="#152235")
        label.text((300, 55), "144 px", fill="#152235")
        label.text((490, 75), "100 px", fill="#152235")
        label.text((16, 248), f"SOURCE ORDER - frame {index + 1:02d}/24", fill="#152235")
        previews.append(preview)
    stream = io.BytesIO()
    durations = [round((n + 1) * 100 / 24) * 10 - round(n * 100 / 24) * 10 for n in range(24)]
    previews[0].save(stream, format="GIF", save_all=True, append_images=previews[1:], duration=durations, loop=0, disposal=2, optimize=False)
    output[ROOT / "docs/ink-whale-motion-preview.gif"] = stream.getvalue()

    arrays = np.asarray(frames).astype(np.float32)
    # Compare premultiplied raster pixels, avoiding invisible RGB differences.
    premultiplied = np.concatenate([arrays[:, :, :, :3] * arrays[:, :, :, 3:] / 255, arrays[:, :, :, 3:]], axis=3)
    def mad(first, second, region=None):
        delta = np.abs(first - second)
        if region:
            x1, y1, x2, y2 = region
            delta = delta[y1:y2, x1:x2]
        return float(delta.mean())
    adjacent = [mad(premultiplied[n], premultiplied[n + 1]) for n in range(23)]
    seam = mad(premultiplied[-1], premultiplied[0])
    regions = {"head": [275, 95, 365, 195], "torso": [140, 80, 275, 215], "tail": [15, 75, 140, 245]}
    report = {
        "version": 1,
        "source": {
            "path": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
            "sha256": digest(source_bytes),
            "size": list(image.size),
            "identityPath": str(IDENTITY.relative_to(ROOT)).replace("\\", "/"),
            "identitySha256": digest(IDENTITY.read_bytes()),
            "method": "ImageGen source; component crop, exterior paper removal, uniform scale and eye translation only; original row-major order; no SVG, redraw, deformation or frame interpolation",
        },
        "runtime": {
            "spritePath": "packages/dsh-whale-companion/assets/ink-whale-sprite.png",
            "spriteSha256": digest(output[ASSETS / "ink-whale-sprite.png"]),
            "size": list(sheet.size), "grid": [6, 4], "frameSize": list(FRAME_SIZE),
            "frameCount": 24, "previewFps": 24, "previewDurationMs": sum(durations),
            "previewWidthsPx": [240, 144, 100],
        },
        "checks": {
            "uniqueFrames": len(set(record["sha256"] for record in records)),
            "allFrameBordersTransparent": all(not np.any(np.asarray(frame)[[0, -1], :, 3]) and not np.any(np.asarray(frame)[:, [0, -1], 3]) for frame in frames),
            "outputEyeRangePx": np.ptp(np.asarray([record["outputEye"] for record in records]), axis=0).round(6).tolist(),
            "opaqueAreaRange": [min(record["opaqueArea"] for record in records), max(record["opaqueArea"] for record in records)],
            "adjacentPremultipliedRgbaMad": [round(value, 6) for value in adjacent],
            "largestAdjacentPairs": [{"fromFrame": n + 1, "toFrame": n + 2, "mad": round(adjacent[n], 6)} for n in sorted(range(23), key=lambda n: adjacent[n], reverse=True)[:5]],
            "meanAdjacentMad": round(float(np.mean(adjacent)), 6),
            "maxAdjacentMad": round(max(adjacent), 6),
            "loopSeamMad": round(seam, 6),
            "loopSeamToMeanAdjacentRatio": round(seam / np.mean(adjacent), 6),
            "regions": {name: {"bounds": bounds, "meanAdjacentMad": round(float(np.mean([mad(premultiplied[n], premultiplied[n + 1], bounds) for n in range(23)])), 6)} for name, bounds in regions.items()},
        },
        "visualAcceptance": {
            "status": "REQUIRES_MOTION_REVIEW",
            "limitations": [
                "Independent generated poses vary in head outline, body anatomy and tail height.",
                "Eye alignment and equal area remove positional drift but cannot make an inconsistent source temporally smooth.",
                "24 distinct poses and a small seam metric do not prove attractive or fluid motion.",
                "This extraction preserves source order, including possible discontinuities at row transitions.",
                "The largest change is 06 to 07: the downward tail suddenly moves upward and the torso flattens.",
                "Other conspicuous reversals include 02 to 03 and 16 to 17. Review the 1-second preview before runtime acceptance.",
            ],
        },
        "frames": records,
    }
    output[ASSETS / "ink-whale-motion-report.json"] = (json.dumps(report, indent=2, ensure_ascii=False) + "\n").encode("utf-8")
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify exact output bytes without writing")
    args = parser.parse_args()
    output = build()
    mismatches = []
    for path, data in output.items():
        if args.check:
            if not path.exists() or path.read_bytes() != data:
                mismatches.append(str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    if mismatches:
        raise SystemExit("Non-reproducible/missing files: " + ", ".join(mismatches))
    print(("CHECK OK: " if args.check else "BUILT: ") + ", ".join(str(path.relative_to(ROOT)) for path in output))


if __name__ == "__main__":
    main()
