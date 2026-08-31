from __future__ import annotations

import hashlib
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "packages" / "dsh-whale-companion"
ATLAS = PACKAGE / "assets" / "whale-species-atlas.webp"
SOURCE = PACKAGE / "assets" / "minke-imagegen-clean.png"
SPRITE = PACKAGE / "assets" / "minke-swim-sprite.png"
PREVIEW = PACKAGE / "assets" / "minke-swim-preview.gif"
REPORT = PACKAGE / "assets" / "minke-motion-report.json"
CONTACT_SHEET = ROOT / "docs" / "minke-motion-contact-sheet.png"
FRAME_WIDTH, FRAME_HEIGHT = 384, 320
FRAME_COUNT, COLUMNS = 24, 6
VISIBLE_ALPHA = 128


def fail(message: str) -> None:
    raise SystemExit(f"minke motion audit failed: {message}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def png_chunk_types(path: Path) -> list[str]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        fail(f"{path.name} is not a PNG")
    chunks: list[str] = []
    offset = 8
    while offset + 12 <= len(data):
        length = struct.unpack(">I", data[offset:offset + 4])[0]
        chunks.append(data[offset + 4:offset + 8].decode("latin1"))
        offset += 12 + length
    return chunks


def reference_fingerprint() -> dict[str, object]:
    atlas = Image.open(ATLAS).convert("RGB")
    cell_width, cell_height = atlas.width // 5, atlas.height // 4
    cell = atlas.crop((2, 2, cell_width - 2, cell_height - 2)).resize((FRAME_WIDTH, FRAME_HEIGHT), Image.Resampling.LANCZOS)
    return {
        "path": "packages/dsh-whale-companion/assets/whale-species-atlas.webp",
        "sha256": sha256(ATLAS),
        "cell": [0, 0],
        "extraction": "crop (2,2,cellWidth-2,cellHeight-2), then Lanczos resize to 384x320 RGB",
        "decodedRgbSha256": hashlib.sha256(cell.tobytes()).hexdigest(),
    }


def largest_component(mask: np.ndarray) -> np.ndarray:
    visited = np.zeros(mask.shape, dtype=np.bool_)
    largest: list[tuple[int, int]] = []
    height, width = mask.shape
    for y, x in np.argwhere(mask):
        y, x = int(y), int(x)
        if visited[y, x]:
            continue
        visited[y, x] = True
        stack = [(y, x)]
        component: list[tuple[int, int]] = []
        while stack:
            current_y, current_x = stack.pop()
            component.append((current_y, current_x))
            for next_y, next_x in ((current_y - 1, current_x), (current_y + 1, current_x), (current_y, current_x - 1), (current_y, current_x + 1)):
                if 0 <= next_y < height and 0 <= next_x < width and mask[next_y, next_x] and not visited[next_y, next_x]:
                    visited[next_y, next_x] = True
                    stack.append((next_y, next_x))
        if len(component) > len(largest):
            largest = component
    result = np.zeros(mask.shape, dtype=np.bool_)
    if largest:
        rows, columns = zip(*largest)
        result[np.asarray(rows), np.asarray(columns)] = True
    return result


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    result = mask.copy()
    for _ in range(radius):
        padded = np.pad(result, 1, mode="constant", constant_values=False)
        result = np.logical_or.reduce([
            padded[y:y + mask.shape[0], x:x + mask.shape[1]]
            for y in range(3)
            for x in range(3)
        ])
    return result


def centroid_y(component: np.ndarray, x0: float, x1: float) -> float:
    region_component = component[:, round(FRAME_WIDTH * x0):round(FRAME_WIDTH * x1)]
    total = float(region_component.sum())
    if total <= 0.0:
        fail(f"empty audit region {x0:.2f}-{x1:.2f}")
    rows = np.arange(FRAME_HEIGHT, dtype=np.float32)[:, None]
    return float((region_component * rows).sum() / total)


def main() -> None:
    image = Image.open(SPRITE)
    if image.mode != "RGBA":
        fail(f"sprite mode is {image.mode}, expected RGBA")
    if image.size != (FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * 4):
        fail(f"sprite size is {image.size}, expected {(FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * 4)}")

    frames: list[np.ndarray] = []
    components: list[np.ndarray] = []
    component_share: list[float] = []
    nonzero_alpha_coverage: list[float] = []
    low_alpha_coverage: list[float] = []
    for index in range(FRAME_COUNT):
        left = (index % COLUMNS) * FRAME_WIDTH
        top = (index // COLUMNS) * FRAME_HEIGHT
        frame = np.asarray(image.crop((left, top, left + FRAME_WIDTH, top + FRAME_HEIGHT)), dtype=np.float32)
        threshold_mask = frame[..., 3] > VISIBLE_ALPHA
        component = largest_component(threshold_mask)
        if not np.any(component):
            fail(f"frame {index + 1} has no visible foreground")
        if np.any(frame[frame[..., 3] == 0, :3] != 0):
            fail(f"frame {index + 1} stores RGB values in fully transparent pixels")
        if np.any(frame[0, :, 3] > 0) or np.any(frame[-1, :, 3] > 0) or np.any(frame[:, 0, 3] > 0) or np.any(frame[:, -1, 3] > 0):
            fail(f"frame {index + 1} has non-transparent pixels on the canvas edge")
        nonzero_coverage = float(np.mean(frame[..., 3] > 0))
        low_coverage = float(np.mean((frame[..., 3] > 0) & (frame[..., 3] <= VISIBLE_ALPHA)))
        if nonzero_coverage > 0.13 or low_coverage > 0.02:
            fail(f"frame {index + 1} contains too much low-alpha or background coverage")
        if np.any((frame[..., 3] > 0) & ~dilate(component, 4)):
            fail(f"frame {index + 1} contains alpha outside the whale edge halo")
        nonzero_alpha_coverage.append(nonzero_coverage)
        low_alpha_coverage.append(low_coverage)
        share = float(component.sum() / max(1, threshold_mask.sum()))
        if share < 0.995:
            fail(f"frame {index + 1} main foreground component share {share:.6f} is below 0.995")
        component_share.append(share)
        visible = np.argwhere(component)
        if visible[:, 0].min() <= 1 or visible[:, 0].max() >= FRAME_HEIGHT - 2 or visible[:, 1].min() <= 1 or visible[:, 1].max() >= FRAME_WIDTH - 2:
            fail(f"frame {index + 1} touches the canvas edge")
        frames.append(frame)
        components.append(component)

    premultiplied: list[np.ndarray] = []
    for frame, component in zip(frames, components):
        alpha = frame[..., 3:4] / 255.0
        visible = np.concatenate((frame[..., :3] * alpha, frame[..., 3:4]), axis=2)
        visible[~component] = 0.0
        premultiplied.append(visible)
    hashes = {hashlib.sha256(np.clip(frame, 0, 255).round().astype(np.uint8).tobytes()).hexdigest() for frame in premultiplied}
    if len(hashes) != FRAME_COUNT:
        fail(f"only {len(hashes)} of {FRAME_COUNT} visible frames are unique")
    adjacent = [float(np.mean(np.abs(premultiplied[(index + 1) % FRAME_COUNT] - premultiplied[index]))) for index in range(FRAME_COUNT)]
    mask_changes = [float(np.mean(components[(index + 1) % FRAME_COUNT] != components[index])) for index in range(FRAME_COUNT)]
    median = float(np.median(adjacent[:-1]))
    mask_median = float(np.median(mask_changes[:-1]))
    seam_ratio = adjacent[-1] / max(median, 1e-9)
    max_ratio = max(adjacent) / max(median, 1e-9)
    if min(adjacent) <= 0.01:
        fail("one or more adjacent steps are effectively frozen")
    if seam_ratio > 2.0:
        fail(f"loop seam ratio {seam_ratio:.3f} exceeds 2.0")
    if max_ratio > 2.25:
        fail(f"adjacent motion ratio {max_ratio:.3f} exceeds 2.25")
    mask_hashes = {hashlib.sha256(component.tobytes()).hexdigest() for component in components}
    if len(mask_hashes) != FRAME_COUNT:
        fail(f"only {len(mask_hashes)} of {FRAME_COUNT} binary whale masks are unique")
    if min(mask_changes) <= 0.0001:
        fail("one or more adjacent binary whale masks are effectively static")
    mask_seam_ratio = mask_changes[-1] / max(mask_median, 1e-9)
    mask_max_ratio = max(mask_changes) / max(mask_median, 1e-9)
    if mask_seam_ratio > 2.0 or mask_max_ratio > 2.25:
        fail("binary whale-mask motion has a discontinuity")

    head = [centroid_y(component, 0.06, 0.36) for component in components]
    torso = [centroid_y(component, 0.36, 0.70) for component in components]
    tail = [centroid_y(component, 0.70, 0.95) for component in components]
    head_range = max(head) - min(head)
    torso_range = max(torso) - min(torso)
    tail_range = max(tail) - min(tail)
    if head_range > 4.0:
        fail(f"head centroid range {head_range:.3f}px exceeds 4px")
    if torso_range < 1.4:
        fail(f"torso centroid range {torso_range:.3f}px is too static")
    if tail_range < 5.0:
        fail(f"tail centroid range {tail_range:.3f}px is too static")
    if tail_range <= torso_range * 1.45:
        fail("tail motion does not build clearly beyond torso motion")

    report = json.loads(REPORT.read_text(encoding="utf-8"))
    unexpected_source_chunks = [chunk for chunk in png_chunk_types(SOURCE) if chunk not in {"IHDR", "IDAT", "IEND"}]
    if unexpected_source_chunks:
        fail(f"source PNG contains metadata chunks: {unexpected_source_chunks}")
    source_hash = sha256(SOURCE)
    sprite_hash = sha256(SPRITE)
    preview_hash = sha256(PREVIEW)
    contact_hash = sha256(CONTACT_SHEET)
    if report.get("schemaVersion") != 1:
        fail("motion report schema version is stale")
    if report.get("reference") != reference_fingerprint():
        fail("motion report original atlas reference is stale")
    expected_hashes = {
        "source": (report.get("source", {}).get("sha256"), source_hash),
        "sprite": (report.get("sprite", {}).get("sha256"), sprite_hash),
        "preview": (report.get("preview", {}).get("sha256"), preview_hash),
        "contact sheet": (report.get("contactSheet", {}).get("sha256"), contact_hash),
    }
    for label, (declared, actual) in expected_hashes.items():
        if declared != actual:
            fail(f"motion report {label} hash is stale")
    if report.get("source", {}).get("path") != "packages/dsh-whale-companion/assets/minke-imagegen-clean.png":
        fail("motion report source path is stale")
    expected_sprite = {
        "path": "packages/dsh-whale-companion/assets/minke-swim-sprite.png",
        "sha256": sprite_hash,
        "size": [FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * 4],
        "mode": "RGBA",
        "frames": FRAME_COUNT,
        "columns": COLUMNS,
        "frameSize": [FRAME_WIDTH, FRAME_HEIGHT],
    }
    if report.get("sprite") != expected_sprite:
        fail("motion report sprite metadata is stale")

    preview = Image.open(PREVIEW)
    if preview.size != (FRAME_WIDTH, FRAME_HEIGHT) or getattr(preview, "n_frames", 1) != FRAME_COUNT:
        fail("preview GIF frame geometry is stale")
    durations: list[int] = []
    for index in range(FRAME_COUNT):
        preview.seek(index)
        durations.append(int(preview.info.get("duration", 0)))
    if set(durations) != {70} or int(preview.info.get("loop", -1)) != 0:
        fail("preview GIF timing or loop metadata is stale")
    expected_preview = {
        "path": "packages/dsh-whale-companion/assets/minke-swim-preview.gif",
        "sha256": preview_hash,
        "durationMs": 70,
    }
    if report.get("preview") != expected_preview:
        fail("motion report preview metadata is stale")

    contact = Image.open(CONTACT_SHEET)
    if contact.size != (FRAME_WIDTH * COLUMNS, (FRAME_HEIGHT + 22) * 4):
        fail("contact sheet geometry is stale")
    expected_contact = {
        "path": "docs/minke-motion-contact-sheet.png",
        "sha256": contact_hash,
    }
    if report.get("contactSheet") != expected_contact:
        fail("motion report contact sheet metadata is stale")

    reported_motion = report.get("motion", {})
    recomputed_motion = {
        "uniqueFrames": len(hashes),
        "uniqueMasks": len(mask_hashes),
        "adjacentPremultipliedMad": [round(value, 6) for value in adjacent],
        "medianAdjacentMad": round(median, 6),
        "loopSeamRatio": round(seam_ratio, 6),
        "maxAdjacentRatio": round(max_ratio, 6),
        "adjacentMaskChange": [round(value, 6) for value in mask_changes],
        "medianMaskChange": round(mask_median, 6),
        "maskLoopSeamRatio": round(mask_seam_ratio, 6),
        "maxMaskChangeRatio": round(mask_max_ratio, 6),
        "headCentroidYRange": round(head_range, 6),
        "torsoCentroidYRange": round(torso_range, 6),
        "tailCentroidYRange": round(tail_range, 6),
        "foregroundCoverageRange": [round(min(float(component.mean()) for component in components), 6), round(max(float(component.mean()) for component in components), 6)],
        "mainComponentShareRange": [round(min(component_share), 6), round(max(component_share), 6)],
        "nonzeroAlphaCoverageRange": [round(min(nonzero_alpha_coverage), 6), round(max(nonzero_alpha_coverage), 6)],
        "lowAlphaCoverageRange": [round(min(low_alpha_coverage), 6), round(max(low_alpha_coverage), 6)],
    }
    if reported_motion != recomputed_motion:
        fail("motion report metrics are stale")
    if report.get("backgroundContract", "").startswith("The sprite is transparent RGBA") is False:
        fail("static-background contract is missing")

    result = {
        "frames": FRAME_COUNT,
        "uniqueFrames": len(hashes),
        "minimumAdjacentMad": round(min(adjacent), 6),
        "medianAdjacentMad": round(median, 6),
        "loopSeamRatio": round(seam_ratio, 6),
        "maxAdjacentRatio": round(max_ratio, 6),
        "headCentroidYRange": round(head_range, 6),
        "torsoCentroidYRange": round(torso_range, 6),
        "tailCentroidYRange": round(tail_range, 6),
        "sourceSha256": source_hash,
        "spriteSha256": sprite_hash,
        "previewSha256": preview_hash,
        "contactSheetSha256": contact_hash,
        "mainComponentShareRange": recomputed_motion["mainComponentShareRange"],
        "uniqueMasks": recomputed_motion["uniqueMasks"],
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
