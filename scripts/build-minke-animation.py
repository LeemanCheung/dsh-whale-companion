from __future__ import annotations

import argparse
import hashlib
import json
import math
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
PACKAGE = ROOT / "packages" / "dsh-whale-companion"
ATLAS = PACKAGE / "assets" / "whale-species-atlas-minke-reference.webp"
SOURCE = PACKAGE / "assets" / "minke-imagegen-clean.png"
SPRITE = PACKAGE / "assets" / "minke-swim-sprite.png"
PREVIEW = PACKAGE / "assets" / "minke-swim-preview.gif"
REPORT = PACKAGE / "assets" / "minke-motion-report.json"
CONTACT_SHEET = ROOT / "docs" / "minke-motion-contact-sheet.png"

FRAME_WIDTH, FRAME_HEIGHT = 384, 320
WORK_WIDTH, WORK_HEIGHT = FRAME_WIDTH * 2, FRAME_HEIGHT * 2
FRAME_COUNT, COLUMNS = 24, 6
VISIBLE_ALPHA = 128


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def reference_fingerprint() -> dict[str, object]:
    atlas = Image.open(ATLAS).convert("RGB")
    cell_width, cell_height = atlas.width // 5, atlas.height // 4
    cell = atlas.crop((2, 2, cell_width - 2, cell_height - 2)).resize((FRAME_WIDTH, FRAME_HEIGHT), Image.Resampling.LANCZOS)
    return {
        "path": ATLAS.relative_to(ROOT).as_posix(),
        "sha256": sha256(ATLAS),
        "cell": [0, 0],
        "extraction": "crop (2,2,cellWidth-2,cellHeight-2), then Lanczos resize to 384x320 RGB",
        "decodedRgbSha256": hashlib.sha256(cell.tobytes()).hexdigest(),
    }


def smoothstep(value: np.ndarray) -> np.ndarray:
    clipped = np.clip(value, 0.0, 1.0)
    return clipped * clipped * (3.0 - 2.0 * clipped)


def largest_component(mask: np.ndarray) -> np.ndarray:
    """Return the largest 4-connected component in a binary foreground mask."""
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


def premultiplied_resize(rgba: Image.Image, size: tuple[int, int]) -> Image.Image:
    """Resize RGBA without letting hidden edge colors bleed into visible pixels."""
    pixels = np.asarray(rgba.convert("RGBA"), dtype=np.float32)
    alpha = pixels[..., 3] / 255.0
    premultiplied = pixels[..., :3] * alpha[..., None]
    resized_premultiplied = np.stack([
        np.asarray(Image.fromarray(premultiplied[..., channel], "F").resize(size, Image.Resampling.LANCZOS), dtype=np.float32)
        for channel in range(3)
    ], axis=2)
    resized_alpha = np.asarray(Image.fromarray(alpha, "F").resize(size, Image.Resampling.LANCZOS), dtype=np.float32)
    resized_alpha = np.clip(resized_alpha, 0.0, 1.0)
    rgb = np.divide(
        resized_premultiplied,
        resized_alpha[..., None],
        out=np.zeros_like(resized_premultiplied),
        where=resized_alpha[..., None] > 0.0,
    )
    output = np.concatenate((np.clip(rgb, 0.0, 255.0), (resized_alpha * 255.0)[..., None]), axis=2).round().astype(np.uint8)
    output[output[..., 3] == 0, :3] = 0
    return Image.fromarray(output, "RGBA")


def prepare_minke() -> Image.Image:
    """Fit the reference-edited whale on a roomy transparent working canvas."""
    source = Image.open(SOURCE).convert("RGBA")
    alpha = source.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise RuntimeError("Minke source has no visible alpha channel")
    trimmed = source.crop(bbox)
    scale = min((WORK_WIDTH * 0.86) / trimmed.width, (WORK_HEIGHT * 0.66) / trimmed.height)
    size = (round(trimmed.width * scale), round(trimmed.height * scale))
    whale = premultiplied_resize(trimmed, size)
    canvas = Image.new("RGBA", (WORK_WIDTH, WORK_HEIGHT))
    x = round((WORK_WIDTH - whale.width) * 0.48)
    y = round((WORK_HEIGHT - whale.height) * 0.50)
    canvas.alpha_composite(whale, (x, y))
    return canvas


def premultiplied_bilinear_warp(rgba: Image.Image, phase: float) -> Image.Image:
    """Move the torso, pectoral fin, tail stock and fluke as one swimming stroke."""
    pixels = np.asarray(rgba, dtype=np.float32)
    height, width, _ = pixels.shape
    rows, columns = np.indices((height, width), dtype=np.float32)
    progress = np.clip((columns - width * 0.07) / (width * 0.86), 0.0, 1.0)

    # The snout and eye remain readable. Motion grows continuously behind the
    # head, travels through the torso, and peaks at the tail stock and fluke.
    torso = smoothstep((progress - 0.16) / 0.58)
    tail = smoothstep((progress - 0.66) / 0.29)
    travelling_wave = phase - progress * math.pi * 1.16
    vertical_offset = (
        7.5 * torso**1.35 * np.sin(travelling_wave)
        + 31.0 * tail**1.62 * np.sin(travelling_wave + 0.12)
    )
    horizontal_offset = 5.5 * tail**1.6 * np.cos(travelling_wave)

    # A restrained pectoral-fin beat is local and fades into the chest instead
    # of detaching the fin from the body.
    fin_region = np.exp(
        -(
            ((columns - width * 0.39) / (width * 0.105)) ** 2
            + ((rows - height * 0.64) / (height * 0.16)) ** 2
        )
        * 3.6
    )
    fin_offset = 8.5 * np.sin(phase + 0.68) * fin_region

    source_x = np.clip(columns - horizontal_offset, 0.0, width - 1.0)
    source_y = np.clip(rows - vertical_offset - fin_offset, 0.0, height - 1.0)
    left = np.floor(source_x).astype(np.int32)
    top = np.floor(source_y).astype(np.int32)
    right = np.minimum(left + 1, width - 1)
    bottom = np.minimum(top + 1, height - 1)
    dx = source_x - left
    dy = source_y - top

    # Sampling premultiplied RGBA prevents dark or bright fringes around the
    # moving alpha edge.
    alpha = pixels[..., 3:4] / 255.0
    premultiplied = np.concatenate((pixels[..., :3] * alpha, pixels[..., 3:4]), axis=2)
    top_mix = premultiplied[top, left] * (1.0 - dx)[..., None] + premultiplied[top, right] * dx[..., None]
    bottom_mix = premultiplied[bottom, left] * (1.0 - dx)[..., None] + premultiplied[bottom, right] * dx[..., None]
    sampled = top_mix * (1.0 - dy)[..., None] + bottom_mix * dy[..., None]
    sampled_alpha = sampled[..., 3:4]
    sampled_rgb = np.divide(
        sampled[..., :3] * 255.0,
        sampled_alpha,
        out=np.zeros_like(sampled[..., :3]),
        where=sampled_alpha > 0.0,
    )
    output = np.clip(np.concatenate((sampled_rgb, sampled_alpha), axis=2), 0, 255).astype(np.uint8)
    output[output[..., 3] == 0, :3] = 0
    return Image.fromarray(output, "RGBA")


def make_ocean_background() -> Image.Image:
    """Deterministic static card background used only for previews and evidence."""
    top = np.array((18, 102, 151), dtype=np.float32)
    bottom = np.array((3, 35, 70), dtype=np.float32)
    rows = np.linspace(0.0, 1.0, FRAME_HEIGHT, dtype=np.float32)[:, None, None]
    gradient = top[None, None, :] * (1.0 - rows) + bottom[None, None, :] * rows
    gradient = np.repeat(gradient, FRAME_WIDTH, axis=1).astype(np.uint8)
    ocean = Image.fromarray(gradient, "RGB")
    draw = ImageDraw.Draw(ocean, "RGBA")
    draw.ellipse((72, 160, 318, 248), outline=(155, 225, 244, 52), width=2)
    draw.ellipse((112, 184, 278, 238), outline=(155, 225, 244, 34), width=2)
    draw.arc((-45, -62, 250, 122), 12, 168, fill=(191, 236, 249, 30), width=3)
    return ocean


def composite(frame: Image.Image, background: Image.Image) -> Image.Image:
    result = background.copy().convert("RGBA")
    result.alpha_composite(frame)
    return result.convert("RGB")


def frame_metrics(frames: list[Image.Image]) -> dict[str, object]:
    arrays = [np.asarray(frame, dtype=np.float32) for frame in frames]
    threshold_masks = [array[..., 3] > VISIBLE_ALPHA for array in arrays]
    component_masks = [largest_component(mask) for mask in threshold_masks]

    def representation(array: np.ndarray, component: np.ndarray) -> np.ndarray:
        alpha = array[..., 3:4] / 255.0
        result = np.concatenate((array[..., :3] * alpha, array[..., 3:4]), axis=2)
        result[~component] = 0.0
        return result

    premultiplied = [representation(array, component) for array, component in zip(arrays, component_masks)]
    adjacent = [float(np.mean(np.abs(premultiplied[(index + 1) % FRAME_COUNT] - premultiplied[index]))) for index in range(FRAME_COUNT)]
    non_loop = adjacent[:-1]
    median = float(np.median(non_loop))
    mask_changes = [float(np.mean(component_masks[(index + 1) % FRAME_COUNT] != component_masks[index])) for index in range(FRAME_COUNT)]
    mask_median = float(np.median(mask_changes[:-1]))

    head_y: list[float] = []
    torso_y: list[float] = []
    tail_y: list[float] = []
    coverage: list[float] = []
    component_share: list[float] = []
    nonzero_alpha_coverage: list[float] = []
    low_alpha_coverage: list[float] = []
    for array, threshold_mask, component in zip(arrays, threshold_masks, component_masks):
        alpha = array[..., 3]
        coverage.append(float(np.mean(component)))
        component_share.append(float(component.sum() / max(1, threshold_mask.sum())))
        nonzero_alpha_coverage.append(float(np.mean(alpha > 0)))
        low_alpha_coverage.append(float(np.mean((alpha > 0) & (alpha <= VISIBLE_ALPHA))))
        for target, x0, x1 in ((head_y, 0.06, 0.36), (torso_y, 0.36, 0.70), (tail_y, 0.70, 0.95)):
            region_component = component[:, round(FRAME_WIDTH * x0):round(FRAME_WIDTH * x1)]
            total = float(region_component.sum())
            if total == 0.0:
                raise RuntimeError("A motion-audit region contains no visible whale pixels")
            y = np.arange(FRAME_HEIGHT, dtype=np.float32)[:, None]
            target.append(float((region_component * y).sum() / total))

    return {
        "uniqueFrames": len({hashlib.sha256(np.clip(frame, 0, 255).round().astype(np.uint8).tobytes()).hexdigest() for frame in premultiplied}),
        "uniqueMasks": len({hashlib.sha256(component.tobytes()).hexdigest() for component in component_masks}),
        "adjacentPremultipliedMad": [round(value, 6) for value in adjacent],
        "medianAdjacentMad": round(median, 6),
        "loopSeamRatio": round(adjacent[-1] / max(median, 1e-9), 6),
        "maxAdjacentRatio": round(max(adjacent) / max(median, 1e-9), 6),
        "adjacentMaskChange": [round(value, 6) for value in mask_changes],
        "medianMaskChange": round(mask_median, 6),
        "maskLoopSeamRatio": round(mask_changes[-1] / max(mask_median, 1e-9), 6),
        "maxMaskChangeRatio": round(max(mask_changes) / max(mask_median, 1e-9), 6),
        "headCentroidYRange": round(max(head_y) - min(head_y), 6),
        "torsoCentroidYRange": round(max(torso_y) - min(torso_y), 6),
        "tailCentroidYRange": round(max(tail_y) - min(tail_y), 6),
        "foregroundCoverageRange": [round(min(coverage), 6), round(max(coverage), 6)],
        "mainComponentShareRange": [round(min(component_share), 6), round(max(component_share), 6)],
        "nonzeroAlphaCoverageRange": [round(min(nonzero_alpha_coverage), 6), round(max(nonzero_alpha_coverage), 6)],
        "lowAlphaCoverageRange": [round(min(low_alpha_coverage), 6), round(max(low_alpha_coverage), 6)],
    }


def make_contact_sheet(frames: list[Image.Image], background: Image.Image) -> Image.Image:
    label_height = 22
    rows = math.ceil(FRAME_COUNT / COLUMNS)
    sheet = Image.new("RGB", (FRAME_WIDTH * COLUMNS, (FRAME_HEIGHT + label_height) * rows), (4, 20, 38))
    font = ImageFont.load_default()
    for index, frame in enumerate(frames):
        x = (index % COLUMNS) * FRAME_WIDTH
        y = (index // COLUMNS) * (FRAME_HEIGHT + label_height)
        sheet.paste(composite(frame, background), (x, y))
        draw = ImageDraw.Draw(sheet)
        draw.text((x + 8, y + FRAME_HEIGHT + 6), f"frame {index + 1:02d}", fill=(214, 239, 248), font=font)
    return sheet


def check_current_outputs(sheet: Image.Image, preview_frames: list[Image.Image], contact_sheet: Image.Image) -> None:
    current_sprite = Image.open(SPRITE).convert("RGBA")
    if current_sprite.size != sheet.size or current_sprite.tobytes() != sheet.tobytes():
        raise SystemExit("minke rebuild check failed: committed sprite pixels do not match the generator")
    generated_preview_buffer = BytesIO()
    preview_frames[0].save(generated_preview_buffer, format="GIF", save_all=True, append_images=preview_frames[1:], duration=70, loop=0, disposal=2, optimize=True)
    generated_preview_buffer.seek(0)
    generated_preview = Image.open(generated_preview_buffer)
    current_preview = Image.open(PREVIEW)
    if current_preview.size != (FRAME_WIDTH, FRAME_HEIGHT) or getattr(current_preview, "n_frames", 1) != FRAME_COUNT:
        raise SystemExit("minke rebuild check failed: committed preview geometry does not match the generator")
    for index in range(FRAME_COUNT):
        current_preview.seek(index)
        generated_preview.seek(index)
        if current_preview.convert("RGB").tobytes() != generated_preview.convert("RGB").tobytes():
            raise SystemExit(f"minke rebuild check failed: preview frame {index + 1} differs from the generator")
    current_contact = Image.open(CONTACT_SHEET).convert("RGB")
    if current_contact.size != contact_sheet.size or current_contact.tobytes() != contact_sheet.tobytes():
        raise SystemExit("minke rebuild check failed: committed contact-sheet pixels do not match the generator")
    print(json.dumps({
        "checked": True,
        "spritePixels": list(sheet.size),
        "previewFrames": len(preview_frames),
        "contactSheetPixels": list(contact_sheet.size),
    }, indent=2))


def main(check: bool = False) -> None:
    minke = prepare_minke()
    frames: list[Image.Image] = []
    for index in range(FRAME_COUNT):
        high_resolution = premultiplied_bilinear_warp(minke, math.tau * index / FRAME_COUNT)
        frame = premultiplied_resize(high_resolution, (FRAME_WIDTH, FRAME_HEIGHT))
        pixels = np.asarray(frame).copy()
        component = largest_component(pixels[..., 3] > VISIBLE_ALPHA)
        # Remove isolated sub-visible resampling speckles. Legitimate alpha is
        # retained only in a four-pixel antialias halo around the whale body.
        pixels[~dilate(component, 4)] = 0
        pixels[pixels[..., 3] == 0, :3] = 0
        frames.append(Image.fromarray(pixels, "RGBA"))

    sheet = Image.new("RGBA", (FRAME_WIDTH * COLUMNS, FRAME_HEIGHT * math.ceil(FRAME_COUNT / COLUMNS)))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, ((index % COLUMNS) * FRAME_WIDTH, (index // COLUMNS) * FRAME_HEIGHT))

    background = make_ocean_background()
    preview_frames = [composite(frame, background) for frame in frames]
    contact_sheet = make_contact_sheet(frames, background)
    if check:
        check_current_outputs(sheet, preview_frames, contact_sheet)
        return

    sheet.save(SPRITE, optimize=True)
    preview_frames[0].save(PREVIEW, save_all=True, append_images=preview_frames[1:], duration=70, loop=0, disposal=2, optimize=True)
    CONTACT_SHEET.parent.mkdir(parents=True, exist_ok=True)
    contact_sheet.save(CONTACT_SHEET, optimize=True)

    report = {
        "schemaVersion": 1,
        "reference": reference_fingerprint(),
        "source": {
            "path": SOURCE.relative_to(ROOT).as_posix(),
            "sha256": sha256(SOURCE),
            "method": "OpenAI built-in image edit using the original atlas cell as the local reference; background removal and style-preserving cleanup only",
        },
        "sprite": {
            "path": SPRITE.relative_to(ROOT).as_posix(),
            "sha256": sha256(SPRITE),
            "size": [sheet.width, sheet.height],
            "mode": sheet.mode,
            "frames": FRAME_COUNT,
            "columns": COLUMNS,
            "frameSize": [FRAME_WIDTH, FRAME_HEIGHT],
        },
        "preview": {
            "path": PREVIEW.relative_to(ROOT).as_posix(),
            "sha256": sha256(PREVIEW),
            "durationMs": 70,
        },
        "contactSheet": {
            "path": CONTACT_SHEET.relative_to(ROOT).as_posix(),
            "sha256": sha256(CONTACT_SHEET),
        },
        "motion": frame_metrics(frames),
        "backgroundContract": "The sprite is transparent RGBA. The card background is a separate static CSS layer and is not warped or repeated in the animation frames.",
    }
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build or verify the common-minke motion assets")
    parser.add_argument("--check", action="store_true", help="compare regenerated pixels with committed assets without writing files")
    main(check=parser.parse_args().check)
