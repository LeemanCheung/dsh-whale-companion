#!/usr/bin/env python3
"""Build the approved V2 raster-motion candidate from 24 ImageGen anchor poses.

All source anchors remain untouched. The other 72 frames are openly documented
optical-flow/SDF interpolations, not additional generated drawings. The frozen
sequence makes one upward/downward tail sweep. No SVG, character redrawing,
network request, sequence search or experimental artifact is used by this build.

--check regenerates all 96 frames and checks visible pixels and encoded timing,
not encoder-specific WebP bytes. Anchors must be exact. Interpolated pixels have
at most one 8-bit level tolerance for CPU-dependent floating-point rounding.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import cv2
import numpy as np
import PIL
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "packages/dsh-whale-companion/assets"
SOURCE = ASSETS / "ink-whale-sprite.png"
POSES = ROOT / "artwork-sources/ink-whale-poses-imagegen.png"
IDENTITY = ROOT / "artwork-sources/ink-whale-identity-imagegen.png"
MOTION = ASSETS / "ink-whale-motion.webp"
REPORT = ASSETS / "ink-whale-playback-report.json"
PREVIEW = ROOT / "docs/ink-whale-motion-60fps.gif"
CONTACT = ROOT / "docs/ink-whale-transition-contact-sheet.png"
W, H = 384, 320
ORDER = [1, 19, 7, 10, 9, 8, 11, 12, 3, 16, 22, 13, 14, 23, 15, 5, 4, 17, 6, 18, 24, 2, 21, 20]
SOURCE_HASHES = {
    SOURCE: "557750b76da28e9aa8415e509924a310833426eda35a2093b5d986e0aa14c975",
    POSES: "a6993c0f3dfb158c3ad8fde200af0e3852f3620718467ffc02be8e0b0a9b802f",
    IDENTITY: "2efc6218ec3b23a9e383c6e6b813ce78765942fc2cbc20b27ff25d540b677414",
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def relative(path):
    return path.relative_to(ROOT).as_posix()


def durations(count=96, total=1600, quantum=1):
    return [round((n + 1) * total / count / quantum) * quantum - round(n * total / count / quantum) * quantum for n in range(count)]


def premultiply(rgba):
    alpha = rgba[..., 3:] / 255.0
    return np.concatenate([rgba[..., :3] * alpha, rgba[..., 3:]], axis=2).astype(np.float32)


def unpremultiply(array):
    alpha = np.clip(array[..., 3:], 0, 255)
    color = np.divide(array[..., :3] * 255, alpha, out=np.zeros_like(array[..., :3]), where=alpha > 0.5)
    result = np.concatenate([np.clip(color, 0, 255), alpha], axis=2).round().astype(np.uint8)
    result[result[..., 3] == 0, :3] = 0
    return result


def signed_distance(rgba):
    mask = (rgba[..., 3] > 127).astype(np.uint8)
    return cv2.distanceTransform(mask, cv2.DIST_L2, 5) - cv2.distanceTransform(1 - mask, cv2.DIST_L2, 5)


def motion_image(rgba):
    signed = np.clip(127 + signed_distance(rgba) * 3, 0, 255)
    return (signed * 0.65 + rgba[..., 3] * 0.35).round().astype(np.uint8)


def optical_flow(first, second):
    return cv2.calcOpticalFlowFarneback(first, second, None, 0.5, 4, 41, 8, 7, 1.5, 0)


def inverse_warp(image, flow, fraction):
    grid_x, grid_y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    map_x, map_y = grid_x.copy(), grid_y.copy()
    for _ in range(5):
        local = cv2.remap(flow, map_x, map_y, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        map_x = grid_x - local[..., 0] * fraction
        map_y = grid_y - local[..., 1] * fraction
    return cv2.remap(image, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def read_anchors():
    for path, expected in SOURCE_HASHES.items():
        if sha256(path.read_bytes()) != expected:
            raise ValueError(f"Image source changed; review provenance before rebuilding: {relative(path)}")
    sheet = Image.open(SOURCE).convert("RGBA")
    if sheet.size != (2304, 1280):
        raise ValueError("Anchor sheet must be 2304x1280, six columns and four rows")
    return [sheet.crop((n % 6 * W, n // 6 * H, (n % 6 + 1) * W, (n // 6 + 1) * H)) for n in range(24)]


def build_frames(anchors):
    rgba = [np.asarray(frame).astype(np.float32) for frame in anchors]
    premult = [premultiply(frame) for frame in rgba]
    sdf = [signed_distance(frame) for frame in rgba]
    gx, gy = np.meshgrid(np.arange(W), np.arange(H))
    # Preserve existing, eye-aligned source pixels. This attenuates sampling
    # motion around the eye; it neither draws nor substitutes an eye graphic.
    eye_guard = (1 - np.exp(-((gx - 287) ** 2 + (gy - 149) ** 2) / (2 * 9 ** 2))).astype(np.float32)[..., None]
    candidate, mapping, pairs = [], [], []
    order = [source - 1 for source in ORDER]
    for n, first in enumerate(order):
        second = order[(n + 1) % 24]
        forward = optical_flow(motion_image(rgba[first]), motion_image(rgba[second]))
        backward = optical_flow(motion_image(rgba[second]), motion_image(rgba[first]))
        pairs.append({"fromSourceFrame": first + 1, "toSourceFrame": second + 1, "maxFlowPx": round(float(np.linalg.norm(forward, axis=2).max()), 6)})
        for subframe in range(4):
            fraction = subframe / 4
            if subframe == 0:
                result = anchors[first].copy()
            else:
                contour = inverse_warp(sdf[first], forward, fraction) * (1 - fraction) + inverse_warp(sdf[second], backward, 1 - fraction) * fraction
                coverage = np.clip(contour / 2 + 0.5, 0, 1)
                sampled = inverse_warp(premult[first], forward * eye_guard, fraction) * (1 - fraction) + inverse_warp(premult[second], backward * eye_guard, 1 - fraction) * fraction
                colors = unpremultiply(sampled)
                colors[..., 3] = (coverage * 255).round().astype(np.uint8)
                colors[colors[..., 3] == 0, :3] = 0
                result = Image.fromarray(colors, "RGBA")
            candidate.append(result)
            mapping.append({"outputFrame": len(candidate), "kind": "ImageGen-anchor" if subframe == 0 else "optical-flow-SDF-interpolation", "sourceFrom": first + 1, "sourceTo": second + 1, "fraction": fraction})
    return candidate, mapping, pairs


def encode_webp(frames):
    stream = io.BytesIO()
    frames[0].save(stream, format="WEBP", save_all=True, append_images=frames[1:], duration=durations(), loop=0, lossless=True, method=6, minimize_size=False)
    return stream.getvalue()


def render_preview(frame, label):
    canvas = Image.new("RGB", (620, 255), "#f0f3f6")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), label, fill="#152b40")
    for width, x, y in ((240, 12, 35), (144, 300, 74), (100, 494, 94)):
        resized = frame.resize((width, round(width * H / W)), Image.Resampling.LANCZOS)
        paper = Image.new("RGBA", resized.size, "white")
        paper.alpha_composite(resized)
        canvas.paste(paper.convert("RGB"), (x, y))
        draw.text((x, y - 14), f"{width}px", fill="#425870")
    return canvas


def encode_preview(frames):
    previews = [render_preview(frame, "RASTER MOTION / 24 IMAGEGEN ANCHORS + 72 IN-BETWEENS / 1.6s") for frame in frames]
    stream = io.BytesIO()
    previews[0].save(stream, format="GIF", save_all=True, append_images=previews[1:], duration=durations(quantum=10), loop=0, disposal=2, optimize=False)
    return stream.getvalue()


def encode_contact(frames, anchors):
    premult = [premultiply(np.asarray(anchors[n - 1]).astype(np.float32)) for n in ORDER]
    edges = [float(np.abs(premult[n] - premult[(n + 1) % 24]).mean()) for n in range(24)]
    pairs = sorted(range(24), key=lambda n: edges[n], reverse=True)[:5]
    canvas = Image.new("RGB", (1600, 1190), "#edf1f6")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), "V2 - SINGLE WARPED SDF CONTOUR - SOURCE EYE PIXELS - ALL 24 ANCHORS UNTOUCHED", fill="#162637")
    for row, pair in enumerate(pairs):
        for phase in range(5):
            frame_id = (pair * 4 + phase) % 96
            x, y = phase * 320, row * 230 + 42
            shown = frames[frame_id].resize((288, 240), Image.Resampling.LANCZOS).crop((0, 25, 288, 215))
            paper = Image.new("RGBA", shown.size, "white")
            paper.alpha_composite(shown)
            canvas.paste(paper.convert("RGB"), (x + 16, y + 23))
            draw.text((x + 12, y + 5), f"{ORDER[pair]:02d}->{ORDER[(pair + 1) % 24]:02d} / t={phase / 4:.2f} / frame {frame_id + 1:02d}", fill="#162637")
    stream = io.BytesIO()
    canvas.save(stream, format="PNG")
    return stream.getvalue()


def frame_metrics(frames):
    arrays = [premultiply(np.asarray(frame).astype(np.float32)) for frame in frames]
    deltas = [float(np.abs(arrays[n] - arrays[(n + 1) % len(frames)]).mean()) for n in range(len(frames))]
    records = []
    for n, frame in enumerate(frames):
        rgba = np.asarray(frame)
        alpha = rgba[..., 3]
        count, _, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
        records.append({"frame": n + 1, "rgbaSha256": sha256(rgba.tobytes()), "alphaBoundingBox": list(frame.getbbox()), "largeConnectedBodies": sum(int(stats[i, cv2.CC_STAT_AREA]) > 100 for i in range(1, count)), "borderTransparent": not np.any(alpha[[0, -1], :]) and not np.any(alpha[:, [0, -1]]), "semiTransparentFraction": round(float(((alpha > 15) & (alpha < 240)).sum() / max(1, (alpha > 15).sum())), 6), "nextFramePremultipliedRgbaMad": round(deltas[n], 6)})
    return {
        "uniqueFrames": len(set(record["rgbaSha256"] for record in records)),
        "allBordersTransparent": all(record["borderTransparent"] for record in records),
        "maximumLargeConnectedBodies": max(record["largeConnectedBodies"] for record in records),
        "meanMad": round(float(np.mean(deltas)), 6), "maxMad": round(max(deltas), 6), "seamMad": round(deltas[-1], 6),
        "semiTransparentFractionRange": [min(record["semiTransparentFraction"] for record in records), max(record["semiTransparentFraction"] for record in records)],
        "frames": records,
    }


def verify_webp(data, expected, anchors):
    image = Image.open(io.BytesIO(data))
    if image.n_frames != 96 or image.size != (W, H):
        raise ValueError("Runtime animation must contain 96 frames at 384x320")
    observed_durations, largest_delta = [], 0
    for n in range(96):
        image.seek(n)
        actual = np.asarray(image.convert("RGBA"))
        observed_durations.append(image.info.get("duration", 0))
        regenerated = np.asarray(expected[n])
        visible = np.maximum(actual[..., 3], regenerated[..., 3]) > 0
        error = int(np.abs(actual[visible].astype(np.int16) - regenerated[visible].astype(np.int16)).max())
        largest_delta = max(largest_delta, error)
        if error > (0 if n % 4 == 0 else 1):
            raise ValueError(f"Frame {n + 1}: regenerated visible pixel error {error} exceeds tolerance")
        if n % 4 == 0:
            anchor = np.asarray(anchors[ORDER[n // 4] - 1])
            visible = np.maximum(actual[..., 3], anchor[..., 3]) > 0
            if not np.array_equal(actual[visible], anchor[visible]):
                raise ValueError(f"Frame {n + 1}: ImageGen anchor changed")
        if np.any(actual[[0, -1], :, 3]) or np.any(actual[:, [0, -1], 3]):
            raise ValueError(f"Frame {n + 1}: runtime border is not transparent")
    if observed_durations != durations():
        raise ValueError(f"Runtime frame duration sequence differs: {observed_durations}")
    return {"frameCount": 96, "totalDurationMs": sum(observed_durations), "durationCounts": {"16": observed_durations.count(16), "17": observed_durations.count(17)}, "all24AnchorVisibleRgbaExact": True, "all96VisibleFramesReproduced": True, "maximumInterpolatedChannelError": largest_delta}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Read-only provenance, complete frame pixel and timing verification")
    args = parser.parse_args()
    anchors = read_anchors()
    frames, mapping, pairs = build_frames(anchors)
    if args.check:
        check = verify_webp(MOTION.read_bytes(), frames, anchors)
        report = json.loads(REPORT.read_text(encoding="utf-8"))
        expected_sources = {relative(path): value for path, value in SOURCE_HASHES.items()}
        if report["sourceHashes"] != expected_sources or report["sourceOrder"] != ORDER or report["frameMapping"] != mapping:
            raise ValueError("Stored playback provenance or frame mapping differs")
        if report["runtime"]["frameCount"] != 96 or report["runtime"]["durationMs"] != 1600 or report["runtime"]["ImageGenAnchors"] != 24 or report["runtime"]["interpolatedFrames"] != 72:
            raise ValueError("Stored runtime frame claims differ")
        gif = Image.open(PREVIEW)
        gif_durations = []
        for n in range(gif.n_frames):
            gif.seek(n)
            gif.load()
            gif_durations.append(gif.info.get("duration", 0))
        if gif.n_frames != 96 or gif_durations != durations(quantum=10):
            raise ValueError("Preview GIF frame count or quantized timing differs")
        if Image.open(CONTACT).size != (1600, 1190):
            raise ValueError("Transition contact sheet dimensions differ")
        print("CHECK OK: " + json.dumps(check))
        return
    motion = encode_webp(frames)
    encoded = verify_webp(motion, frames, anchors)
    metrics = frame_metrics(frames)
    if metrics["uniqueFrames"] != 96 or not metrics["allBordersTransparent"] or metrics["maximumLargeConnectedBodies"] != 1:
        raise ValueError("Candidate failed unique-frame, full-border transparency or body-component checks")
    report = {
        "version": 1,
        "sourceHashes": {relative(path): value for path, value in SOURCE_HASHES.items()},
        "sourceOrder": ORDER,
        "runtime": {"path": relative(MOTION), "sha256": sha256(motion), "frameSize": [W, H], "frameCount": 96, "ImageGenAnchors": 24, "interpolatedFrames": 72, "durationMs": 1600, "fps": 60, "durationsMs": durations()},
        "method": "Frozen V2. Bidirectional Farneback flow warps signed-distance mattes to one interpolated contour. Premultiplied source RGB retains the source eye with a 9px stationary sampling guard. Only 72 intermediate frames are interpolated; all 24 original raster anchors remain unchanged. No SVG and no procedural drawing of the whale.",
        "buildEnvironment": {"numpy": np.__version__, "Pillow": PIL.__version__, "opencv": cv2.__version__},
        "encodedChecks": encoded,
        "metrics": metrics,
        "flowPairs": pairs,
        "frameMapping": mapping,
        "visualAcceptance": {"status": "PENDING_INDEPENDENT_REVIEW", "reviewFile": "docs/ink-whale-visual-review.json", "knownLimitations": ["Generated source anatomy varies slightly between the 24 anchors.", "SDF intermediate edges are slightly harder than unmodified source edges at 240px and above.", "Single connected bodies and low MAD do not prove attractive or fluid motion; inspect playable 100/144/240px output.", "The GIF preview uses 10/20ms timing quantization; runtime WebP uses 16/17ms frames for a 1600ms loop."]},
    }
    outputs = {MOTION: motion, REPORT: (json.dumps(report, indent=2) + "\n").encode("utf-8"), PREVIEW: encode_preview(frames), CONTACT: encode_contact(frames, anchors)}
    for path, data in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print("BUILT: " + json.dumps({"path": relative(MOTION), "sha256": sha256(motion), "encodedChecks": encoded, "visualStatus": report["visualAcceptance"]["status"]}))


if __name__ == "__main__":
    main()
