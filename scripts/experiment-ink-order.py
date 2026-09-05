#!/usr/bin/env python3
"""Isolated, reproducible sequence/optical-flow study. Never edits runtime art.

The source sheet contains 24 independently generated poses. Reordering can make
their outline progress more evenly; it does not turn them into true sequential
drawings. The 96-frame candidate contains these 24 anchors and 72 explicitly
labelled optical-flow in-betweens. Review the playable output, not only numbers.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "packages/dsh-whale-companion/assets/ink-whale-sprite.png"
OUT = ROOT / ".artifacts/ink-order-experiment"
W, H = 384, 320


def canonical(order):
    route = list(order)
    zero = route.index(0)
    route = route[zero:] + route[:zero]
    reverse = [route[0]] + route[1:][::-1]
    return min(route, reverse)


def save_contact(frames, order):
    contact = Image.new("RGB", (1536, 1024), "#edf1f6")
    draw = ImageDraw.Draw(contact)
    draw.text((16, 14), "REORDERED 24 IMAGEGEN ANCHORS / NO NEW DRAWING / 240 PX", fill="#102333")
    for idx, source_id in enumerate(order):
        x, y = idx % 6 * 256 + 8, idx // 6 * 240 + 46
        tile = Image.new("RGBA", (240, 200), "white")
        tile.alpha_composite(frames[source_id].resize((240, 200), Image.Resampling.LANCZOS))
        contact.paste(tile.convert("RGB"), (x, y + 24))
        draw.text((x, y + 5), f"{idx + 1:02d} <- source {source_id + 1:02d}", fill="#102333")
    contact.save(OUT / "order-contact-sheet.png")


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


def durations(count, total, quantum):
    return [round((n + 1) * total / count / quantum) * quantum - round(n * total / count / quantum) * quantum for n in range(count)]


def metrics(order, distances, tail):
    route = np.asarray(order)
    edge = distances[route, np.roll(route, -1)]
    y = tail[route]
    dy = np.roll(y, -1) - y
    # Ignore subpixel differences; they cannot be judged as purposeful reversal.
    signs = np.sign(dy[np.abs(dy) > 1.5])
    reversals = int(np.sum(signs != np.roll(signs, -1))) if len(signs) else 0
    jerk = float(np.sqrt(np.mean((np.roll(y, -1) - 2 * y + np.roll(y, 1)) ** 2)))
    return {
        "order": [int(n + 1) for n in order],
        "meanMad": round(float(edge.mean()), 6),
        "maxMad": round(float(edge.max()), 6),
        "minMad": round(float(edge.min()), 6),
        "seamMad": round(float(edge[-1]), 6),
        "stepMad": edge.round(6).tolist(),
        "tailCentroidY": y.round(5).tolist(),
        "tailDirectionReversals": reversals,
        "tailSecondDifferenceRmsPx": round(jerk, 6),
        "nearDuplicateStepsBelowMad07": int((edge < 0.7).sum()),
    }


def optimize(seeds, d, tail, single_sweep):
    def score(route):
        a = np.asarray(route)
        edge = d[a, np.roll(a, -1)]
        value = float(np.mean(edge * edge) + 0.7 * edge.max() ** 2)
        if single_sweep:
            y = tail[a]
            delta = np.roll(y, -1) - y
            signs = np.sign(delta[np.abs(delta) > 1.5])
            reversals = np.sum(signs != np.roll(signs, -1)) if len(signs) else 0
            value += max(0, int(reversals) - 2) * 4
            value += float(np.mean((np.roll(y, -1) - 2 * y + np.roll(y, 1)) ** 2)) / 120
        value += float(np.maximum(0, 0.7 - edge).sum())
        return value
    best, best_value = None, float("inf")
    for seed in seeds:
        route = list(seed)
        value = score(route)
        for _ in range(24):
            proposal, proposal_value = None, value
            for i in range(1, 22):
                for j in range(i + 1, 24):
                    candidate = route[:i] + route[i:j + 1][::-1] + route[j + 1:]
                    candidate_value = score(candidate)
                    if candidate_value < proposal_value - 1e-9:
                        proposal, proposal_value = candidate, candidate_value
            if proposal is None:
                break
            route, value = proposal, proposal_value
        if value < best_value:
            best, best_value = canonical(route), value
    return best


def premultiply(rgba):
    a = rgba[..., 3:] / 255.0
    return np.concatenate([rgba[..., :3] * a, rgba[..., 3:]], axis=2).astype(np.float32)


def unpremultiply(array):
    alpha = np.clip(array[..., 3:], 0, 255)
    color = np.divide(array[..., :3] * 255, alpha, out=np.zeros_like(array[..., :3]), where=alpha > 0.5)
    result = np.concatenate([np.clip(color, 0, 255), alpha], axis=2).round().astype(np.uint8)
    result[result[..., 3] == 0, :3] = 0
    return Image.fromarray(result, "RGBA")


def motion_image(rgba):
    # Smooth signed distance carries motion through the textureless black body.
    mask = (rgba[..., 3] > 127).astype(np.uint8)
    sdf = cv2.distanceTransform(mask, cv2.DIST_L2, 5) - cv2.distanceTransform(1 - mask, cv2.DIST_L2, 5)
    signed = np.clip(127 + sdf * 3, 0, 255)
    alpha = rgba[..., 3].astype(np.float32)
    return (signed * 0.65 + alpha * 0.35).round().astype(np.uint8)


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


def render_review():
    report = json.loads((OUT / "order-and-motion-report.json").read_text(encoding="utf-8"))
    webp = Image.open(OUT / "candidate.webp")
    decoded, milliseconds = [], []
    for n in range(webp.n_frames):
        webp.seek(n)
        decoded.append(webp.convert("RGBA"))
        milliseconds.append(webp.info.get("duration", 0))
    original = Image.open(INPUT).convert("RGBA")
    anchors = [original.crop((n % 6 * W, n // 6 * H, (n % 6 + 1) * W, (n // 6 + 1) * H)) for n in range(24)]
    source_order = report["candidate"]["sourceOrder"]
    exact = True
    for n, source in enumerate(source_order):
        first, second = np.asarray(decoded[n * 4]), np.asarray(anchors[source - 1])
        # The codec is free to normalize RGB under completely transparent alpha.
        visible = np.maximum(first[..., 3], second[..., 3]) > 0
        exact = exact and np.array_equal(first[visible], second[visible])
    report["encodedWebpChecks"] = {"frameCount": webp.n_frames, "totalDurationMs": sum(milliseconds), "durationCounts": {str(value): milliseconds.count(value) for value in sorted(set(milliseconds))}, "allAnchorVisibleRgbaExact": bool(exact), "sha256": hashlib.sha256((OUT / "candidate.webp").read_bytes()).hexdigest()}
    edges = report["comparison"]["single_tail_sweep"]["stepMad"]
    pairs = sorted(range(24), key=lambda n: edges[n], reverse=True)[:5]
    canvas = Image.new("RGB", (1600, 1190), "#edf1f6")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), "5 LARGEST ANCHOR CHANGES - 3 OPTICAL-FLOW IN-BETWEENS - BLACK BODY, WHITE EYE, TAIL ROOT REVIEW", fill="#162637")
    for row, pair in enumerate(pairs):
        for phase in range(5):
            frame_id = (pair * 4 + phase) % 96
            x, y = phase * 320, row * 230 + 42
            shown = decoded[frame_id].resize((288, 240), Image.Resampling.LANCZOS)
            # The full frame has deliberate headroom; trim only review whitespace.
            shown = shown.crop((0, 25, 288, 215))
            paper = Image.new("RGBA", shown.size, "white")
            paper.alpha_composite(shown)
            canvas.paste(paper.convert("RGB"), (x + 16, y + 23))
            label = f"{source_order[pair]:02d}->{source_order[(pair + 1) % 24]:02d} / t={phase / 4:.2f} / frame {frame_id + 1:02d}"
            draw.text((x + 12, y + 5), label, fill="#162637")
    canvas.save(OUT / "flow-transition-contact-sheet.png")
    (OUT / "order-and-motion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["encodedWebpChecks"], indent=2))


def contour_variant():
    """One targeted revision of the diagnosed ghost edge, in-between poses only."""
    report = json.loads((OUT / "order-and-motion-report.json").read_text(encoding="utf-8"))
    order = [source - 1 for source in report["candidate"]["sourceOrder"]]
    sheet = Image.open(INPUT).convert("RGBA")
    anchors = [sheet.crop((n % 6 * W, n // 6 * H, (n % 6 + 1) * W, (n // 6 + 1) * H)) for n in range(24)]
    rgba = [np.asarray(frame).astype(np.float32) for frame in anchors]
    premult = [premultiply(frame) for frame in rgba]
    sdf = []
    for frame in rgba:
        mask = (frame[..., 3] > 127).astype(np.uint8)
        sdf.append(cv2.distanceTransform(mask, cv2.DIST_L2, 5) - cv2.distanceTransform(1 - mask, cv2.DIST_L2, 5))
    gx, gy = np.meshgrid(np.arange(W), np.arange(H))
    # The eyes were already aligned during extraction. Stabilizing RGB sampling
    # here retains the original white eye pixels without drawing a replacement.
    eye_guard = (1 - np.exp(-((gx - 287) ** 2 + (gy - 149) ** 2) / (2 * 9 ** 2))).astype(np.float32)[..., None]
    candidate = []
    for n, first in enumerate(order):
        second = order[(n + 1) % 24]
        forward = optical_flow(motion_image(rgba[first]), motion_image(rgba[second]))
        backward = optical_flow(motion_image(rgba[second]), motion_image(rgba[first]))
        for subframe in range(4):
            t = subframe / 4
            if subframe == 0:
                candidate.append(anchors[first].copy())
                continue
            contour = inverse_warp(sdf[first], forward, t) * (1 - t) + inverse_warp(sdf[second], backward, 1 - t) * t
            coverage = np.clip(contour / 2 + 0.5, 0, 1)
            sampled = inverse_warp(premult[first], forward * eye_guard, t) * (1 - t) + inverse_warp(premult[second], backward * eye_guard, 1 - t) * t
            colors = np.asarray(unpremultiply(sampled)).copy()
            colors[..., 3] = (coverage * 255).round().astype(np.uint8)
            colors[colors[..., 3] == 0, :3] = 0
            candidate.append(Image.fromarray(colors, "RGBA"))
    candidate[0].save(OUT / "candidate-v2.webp", format="WEBP", save_all=True, append_images=candidate[1:], duration=durations(96, 1600, 1), loop=0, lossless=True, method=6, minimize_size=False)
    original_v1 = Image.open(OUT / "candidate.webp")
    v1 = []
    for n in range(96):
        original_v1.seek(n)
        v1.append(original_v1.convert("RGBA"))
    previews = []
    for n, frame in enumerate(candidate):
        canvas = Image.new("RGB", (620, 510))
        canvas.paste(render_preview(v1[n], "V1 / ALPHA BLEND / 60fps / 1.6s"), (0, 0))
        canvas.paste(render_preview(frame, "V2 / ONE SDF CONTOUR / 60fps / 1.6s"), (0, 255))
        previews.append(canvas)
    previews[0].save(OUT / "candidate-v2.gif", save_all=True, append_images=previews[1:], duration=durations(96, 1600, 10), loop=0, disposal=2, optimize=False)
    packed = Image.new("RGBA", (W * 12, H * 8))
    for n, frame in enumerate(candidate):
        packed.alpha_composite(frame, ((n % 12) * W, (n // 12) * H))
    packed.save(OUT / "candidate-v2-sprite.png", compress_level=9)
    edges = report["comparison"]["single_tail_sweep"]["stepMad"]
    pairs = sorted(range(24), key=lambda n: edges[n], reverse=True)[:5]
    canvas = Image.new("RGB", (1600, 1190), "#edf1f6")
    draw = ImageDraw.Draw(canvas)
    draw.text((12, 12), "V2 - SINGLE WARPED SDF CONTOUR - SOURCE EYE PIXELS - ALL 24 ANCHORS UNTOUCHED", fill="#162637")
    for row, pair in enumerate(pairs):
        for phase in range(5):
            frame_id = (pair * 4 + phase) % 96
            x, y = phase * 320, row * 230 + 42
            shown = candidate[frame_id].resize((288, 240), Image.Resampling.LANCZOS).crop((0, 25, 288, 215))
            paper = Image.new("RGBA", shown.size, "white")
            paper.alpha_composite(shown)
            canvas.paste(paper.convert("RGB"), (x + 16, y + 23))
            draw.text((x + 12, y + 5), f"{order[pair] + 1:02d}->{order[(pair + 1) % 24] + 1:02d} / t={phase / 4:.2f} / frame {frame_id + 1:02d}", fill="#162637")
    canvas.save(OUT / "flow-transition-contact-sheet-v2.png")
    def quality(frames):
        arrays = [premultiply(np.asarray(frame).astype(np.float32)) for frame in frames]
        delta = [float(np.abs(arrays[n] - arrays[(n + 1) % 96]).mean()) for n in range(96)]
        semi, components = [], []
        for frame in frames:
            alpha = np.asarray(frame)[..., 3]
            semi.append(float(((alpha > 15) & (alpha < 240)).sum() / max(1, (alpha > 15).sum())))
            count, _, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
            components.append(sum(int(stats[n, cv2.CC_STAT_AREA]) > 100 for n in range(1, count)))
        return {"meanMad": round(float(np.mean(delta)), 6), "maxMad": round(max(delta), 6), "seamMad": round(delta[-1], 6), "semiTransparentMean": round(float(np.mean(semi)), 6), "semiTransparentRange": [round(min(semi), 6), round(max(semi), 6)], "maxLargeConnectedBodies": max(components), "allBordersTransparent": all(not np.any(np.asarray(frame)[[0, -1], :, 3]) and not np.any(np.asarray(frame)[:, [0, -1], 3]) for frame in frames)}
    v2 = Image.open(OUT / "candidate-v2.webp")
    encoded_duration, visible_anchor_exact = 0, True
    for n in range(v2.n_frames):
        v2.seek(n)
        data = np.asarray(v2.convert("RGBA"))
        encoded_duration += v2.info.get("duration", 0)
        if n % 4 == 0:
            source = np.asarray(anchors[order[n // 4]])
            visible = np.maximum(data[..., 3], source[..., 3]) > 0
            visible_anchor_exact = visible_anchor_exact and np.array_equal(data[visible], source[visible])
    revision = {"inputSha256": hashlib.sha256(INPUT.read_bytes()).hexdigest(), "sourceOrder": [n + 1 for n in order], "method": "Same bidirectional flow and sequence as V1. Only 72 in-betweens use warped signed-distance contour alpha. Premultiplied source RGB samples retain the source eye with a 9px stationary sampling guard. No new eyes or character shapes drawn.", "frameCount": 96, "ImageGenAnchors": 24, "interpolatedFrames": 72, "durationMs": encoded_duration, "fps": 60, "allAnchorsExactInMemory": all(np.array_equal(np.asarray(candidate[n * 4]), np.asarray(anchors[source])) for n, source in enumerate(order)), "allEncodedAnchorVisibleRgbaExact": bool(visible_anchor_exact), "v1": quality(v1), "v2": quality(candidate), "outputSha256": hashlib.sha256((OUT / "candidate-v2.webp").read_bytes()).hexdigest(), "visualStatus": "REQUIRES_COMPARATIVE_PLAYBACK_REVIEW", "focus": ["Verify tail tip gray ghosts in source 02 to 21 and 24 to 02 are removed.", "Verify the sharper intermediate edge does not flicker when returning to an unmodified anchor.", "Verify source eye remains a single readable point at 100, 144 and 240px."]}
    (OUT / "candidate-v2-report.json").write_text(json.dumps(revision, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(revision, indent=2))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(INPUT).convert("RGBA")
    frames = [sheet.crop((n % 6 * W, n // 6 * H, (n % 6 + 1) * W, (n // 6 + 1) * H)) for n in range(24)]
    rgba = [np.asarray(frame).astype(np.float32) for frame in frames]
    premult = np.asarray([premultiply(frame) for frame in rgba])
    d = np.zeros((24, 24), dtype=np.float64)
    for i in range(24):
        for j in range(i + 1, 24):
            d[i, j] = d[j, i] = np.abs(premult[i] - premult[j]).mean()
    tail = []
    for image in rgba:
        mask = image[:, :140, 3] / 255
        tail.append(float((mask * np.arange(H)[:, None]).sum() / mask.sum()))
    tail = np.asarray(tail)
    seeds = [list(range(24))]
    for start in range(24):
        route = [start]
        while len(route) < 24:
            route.append(min((n for n in range(24) if n not in route), key=lambda n: (d[route[-1], n], n)))
        seeds.append(route)
    by_tail = np.argsort(tail).tolist()
    seeds.append(by_tail[::2] + by_tail[1::2][::-1])
    for seed in range(8):
        random = np.random.default_rng(seed)
        choices = random.integers(0, 2, 22).tolist()
        outbound = [by_tail[0]] + [by_tail[n + 1] for n, choice in enumerate(choices) if choice == 0] + [by_tail[-1]]
        inbound = [by_tail[n + 1] for n, choice in enumerate(choices) if choice == 1][::-1]
        seeds.append(outbound + inbound)
    shortest = optimize(seeds, d, tail, False)
    smooth = optimize(seeds + [shortest], d, tail, True)
    original = list(range(24))
    candidates = {"original": metrics(original, d, tail), "shorter_edges": metrics(shortest, d, tail), "single_tail_sweep": metrics(smooth, d, tail)}
    order = smooth
    save_contact(frames, order)
    compare = []
    for n in range(24):
        canvas = Image.new("RGB", (620, 510))
        canvas.paste(render_preview(frames[n], f"ORIGINAL / 24fps / source {n + 1:02d}"), (0, 0))
        canvas.paste(render_preview(frames[order[n]], f"REORDERED / 24fps / source {order[n] + 1:02d}"), (0, 255))
        compare.append(canvas)
    compare[0].save(OUT / "order-comparison-24fps.gif", save_all=True, append_images=compare[1:], duration=durations(24, 1000, 10), loop=0, disposal=2, optimize=False)

    interpolated, mapping, flow_records = [], [], []
    for n, source_id in enumerate(order):
        next_id = order[(n + 1) % 24]
        first, second = motion_image(rgba[source_id]), motion_image(rgba[next_id])
        forward, backward = optical_flow(first, second), optical_flow(second, first)
        flow_records.append({"fromSourceFrame": source_id + 1, "toSourceFrame": next_id + 1, "maxFlowPx": round(float(np.linalg.norm(forward, axis=2).max()), 6)})
        for subframe in range(4):
            fraction = subframe / 4
            if subframe == 0:
                result = frames[source_id].copy()
            else:
                first_warped = inverse_warp(premult[source_id], forward, fraction)
                second_warped = inverse_warp(premult[next_id], backward, 1 - fraction)
                result = unpremultiply(first_warped * (1 - fraction) + second_warped * fraction)
            interpolated.append(result)
            mapping.append({"outputFrame": len(interpolated), "kind": "ImageGen-anchor" if subframe == 0 else "optical-flow-interpolation", "sourceFrom": source_id + 1, "sourceTo": next_id + 1, "fraction": fraction})
    interpolated[0].save(OUT / "candidate.webp", format="WEBP", save_all=True, append_images=interpolated[1:], duration=durations(96, 1600, 1), loop=0, lossless=True, method=6, minimize_size=False)
    previews = []
    for n, frame in enumerate(interpolated):
        canvas = Image.new("RGB", (620, 510))
        source = order[n // 4]
        canvas.paste(render_preview(frames[source], f"24 ANCHORS / 1.6s / source {source + 1:02d}"), (0, 0))
        canvas.paste(render_preview(frame, f"96 FRAMES / 60fps / 1.6s / {mapping[n]['kind']}"), (0, 255))
        previews.append(canvas)
    previews[0].save(OUT / "candidate.gif", save_all=True, append_images=previews[1:], duration=durations(96, 1600, 10), loop=0, disposal=2, optimize=False)
    # A packed candidate makes every anchor/in-between directly inspectable.
    packed = Image.new("RGBA", (W * 12, H * 8))
    for n, frame in enumerate(interpolated):
        packed.alpha_composite(frame, ((n % 12) * W, (n // 12) * H))
    packed.save(OUT / "candidate-sprite.png", compress_level=9)
    ca = np.asarray([premultiply(np.asarray(frame).astype(np.float32)) for frame in interpolated])
    deltas = [float(np.abs(ca[n] - ca[(n + 1) % 96]).mean()) for n in range(96)]
    components = []
    semi = []
    for frame in interpolated:
        alpha = np.asarray(frame)[..., 3]
        count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 127).astype(np.uint8), 8)
        components.append(sum(int(stats[n, cv2.CC_STAT_AREA]) > 100 for n in range(1, count)))
        semi.append(float(((alpha > 15) & (alpha < 240)).sum() / max(1, (alpha > 15).sum())))
    report = {
        "input": str(INPUT.relative_to(ROOT)), "inputSha256": hashlib.sha256(INPUT.read_bytes()).hexdigest(),
        "environment": {"numpy": np.__version__, "opencv": cv2.__version__},
        "method": "Deterministic multi-seed 2-opt; penalize very small steps, extreme jumps, repeated tail reversals and tail acceleration. Then 3 double-warp premultiplied-alpha optical-flow in-betweens per pair. No generated pose was redrawn or omitted.",
        "selectedCandidate": "single_tail_sweep", "comparison": candidates,
        "candidate": {"frameCount": 96, "ImageGenAnchors": 24, "interpolatedFrames": 72, "durationMs": 1600, "fps": 60, "sourceOrder": [n + 1 for n in order], "allAnchorsExactRgba": all(np.array_equal(np.asarray(interpolated[n * 4]), np.asarray(frames[source])) for n, source in enumerate(order)), "meanMad": round(float(np.mean(deltas)), 6), "maxMad": round(max(deltas), 6), "seamMad": round(deltas[-1], 6), "largestConnectedBodiesPerFrame": max(components), "semiTransparentPixelFractionRange": [round(min(semi), 6), round(max(semi), 6)]},
        "flowPairs": flow_records,
        "frameMapping": mapping,
        "visualStatus": "EXPERIMENT_REQUIRES_PLAYBACK_REVIEW",
        "limitations": ["Sorting reduces discontinuities but cannot repair independently changing anatomy.", "A low mean MAD can describe a smooth-looking blur; it does not prove character quality.", "Optical-flow interiors can look elastic; inspect head, eye, tail roots and fin at 240px.", "A single connected body excludes detached fragments, not ghost contours or double tail lobes.", "GIF timing is quantized to 10ms (alternating 10/20ms); WebP retains the 16/17ms 60fps schedule."]
    }
    (OUT / "order-and-motion-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(OUT), "comparison": candidates, "candidate": report["candidate"]}, indent=2))
    render_review()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--review-only", action="store_true", help="Inspect existing encoded candidate without rerunning optimization")
    parser.add_argument("--contour-variant", action="store_true", help="One targeted SDF-edge revision of the frozen sequence")
    arguments = parser.parse_args()
    if arguments.contour_variant:
        contour_variant()
    elif arguments.review_only:
        render_review()
    else:
        main()
