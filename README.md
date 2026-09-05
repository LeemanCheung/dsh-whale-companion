# dsh-whale-companion

English | [中文](README.zh-CN.md)

A local-first DSH whale world. Privacy-safe session metadata becomes a draggable companion, 20 unlockable whale spirits, visible tides, a personal sea cove, gentle expeditions, and opt-in local whale-circle cards.

Version 2.5.0 targets DSH 0.1.2-rc.1. It uses the new UI renderer service while retaining the existing name, appearance, position, progress, collectibles, room presets and ImageGen species atlas. Background write failures cannot interrupt the DSH session; the affected progress update may be missed, and later updates remain accepted. Explicit user saves still report failure. Session flush and plugin shutdown wait for already accepted writes before the domain closes.

The selected minke companion now uses 24 individually generated black-ink poses plus 72 explicitly identified raster in-betweens: 96 frames, 60 fps, a 1.6-second loop. The head stays registered while the torso, fins and tail move. Both system and in-product reduced motion select the matching PNG still. See the [ImageGen prompts and source record](docs/imagegen-20260905-prompts.md).

![Ink whale playback at 240,144 and100 pixels](docs/ink-whale-motion-60fps.gif)

The GIF is a compatibility preview; format and browser timing limits apply. The plugin and [native WebP](packages/dsh-whale-companion/assets/ink-whale-motion.webp) use the accurate 16/17 ms frame timing.

## Screenshots

| Whale Home | Whale atlas |
| --- | --- |
| ![Whale Companion overview](assets/screenshots/overview.png) | ![Whale Companion atlas](assets/screenshots/atlas.png) |

![Whale Companion skins, achievements, and local backup](assets/screenshots/customize.png)

> Unedited captures from a live local DSH Web session. Progress reflects that session; appearance follows the active DSH theme and viewport.

## Features

- **Complete 2.4.0 delivery:** named companion, four adaptive voyage goals, ImageGen raster whale portraits, a raster-sprite common-minke animation, a compact quick card, XP feedback, six cove themes, local PNG/text sharing, and no runtime vector whale art.
- Session dates now prefer the real creation timestamp; late historical events cannot roll streaks backward; every text import is capped at 512 KiB before JSON parsing; durable writes are fully schema-validated.
- CI now mounts the actual built client bundle in a browser-compatible DSH slot/Remote harness and runs desktop, mobile, light-theme, and reduced-motion Playwright visual regression.
- A movable `shell.overlay` whale supports pointer drag, keyboard movement, edge snapping, persisted viewport-safe placement, and one shared five-second local refresh. New tide moments appear in a bounded visible bubble; only milestones are announced to screen readers.
- Quiet, standard, and lively presentation modes stay in browser-local preferences. System reduced-motion always wins, and storage denial falls back safely without affecting progress.
- Whale Home now leads with a seven-day ocean journal, the current whale story beat, a visual cove preview, and a field-backed Privacy Ledger.
- The selected-species card gives the common minke a reference-edited 24-frame swim: the head stays readable, motion travels through the torso, pectoral fin, tail stock, and fluke, and the ocean layer remains static. Reduced-motion mode freezes the first frame.
- 20 whale spirits unlock over Ocean Levels 1–100. Each maps its story and visible tide response to a safe event family, without changing model behavior.
- Live-only `session/created`, `user/message`, and `tool/result` metadata drives bounded local tide moments. Repeated tool results still count toward legacy XP, but cannot farm tide moments, collectibles, or expedition progress.
- The Whale Home provides a tide timeline, local PNG postcard export, a 24-item collectible catalog, eight fixed room slots, three room presets, and a non-punitive expedition.
- Visitor bottles are isolated read-only room previews. They do not merge or overwrite the receiver's progress.
- Whale-circle cards are opt-in and local-file based. They exchange only a preset alias, species, skin, coarse activity buckets, and resonance stars. There is no account, networking, ranking, free text, prompt excerpt, task name, or tool data.
- Six themes adjust cove backgrounds, interface accents and ambient light; whale artwork retains its own colors. All 12 achievements, responsive layouts, keyboard controls, focus handling, and reduced-motion rendering are included.

Turns grant 10 XP, tool results grant 5 XP, and session starts grant 20 XP. Only `user/message` counts as a turn. Levels derive from XP, and streaks use UTC session-start dates. Missing days never remove progress or collectibles.

## Privacy

The Host reads only session id, event sequence, event type, and timestamp. It never reads, stores, exports, or renders prompt text, assistant output, code, paths, tool arguments, or tool results.

New in-memory receipt digests use an HMAC key that never leaves the Host process. The durable receipt window is capped at 4,096 records, so it prevents recent duplicate live delivery, not permanent replay across Host restarts. Backups intentionally contain no receipt digests, session ids, or event data. PNG postcards and community cards are generated locally and contain only the documented safe fields.

## Install

Install directly from GitHub into the DSH Web profile:

```powershell
dsh plugin --profile web add github:LeemanCheung/dsh-whale-companion
```

Restart the existing DSH Web process and refresh its page.

## Model Experience

This plugin adds no model prompt, tools, messages, token usage, or KV-cache content. It observes committed session event metadata on the Host and exposes browser UI only.

## Known limitations

Progress lives in one DSH storage backend and does not synchronize across devices. The overlay polls every five seconds because the current host Remote event allowlist has no package-local whale-state push route. Whale-circle cards are intentionally local import/export only; a hosted community requires a separately owned, authenticated, and moderated transport provider.

## Development

From the repository root run:

```powershell
python -m pip install -r requirements-art.txt
corepack pnpm typecheck
corepack pnpm verify:minke:rebuild
corepack pnpm verify:minke
corepack pnpm verify:species:rebuild
corepack pnpm test
corepack pnpm build
corepack pnpm pack:check
```

The art pipeline is pinned to Python 3.12, NumPy 2.3.3, and Pillow 12.3.0. `corepack pnpm art:minke` rebuilds the transparent sprite; `corepack pnpm art:species` normalizes the checked-in ImageGen 20-species atlas. The production client embeds both raster assets and contains no runtime vector whale drawing.

Visual snapshot baselines are maintained on Ubuntu in CI. Other platforms still run the interaction, motion, reduced-motion, and narrow-layout assertions, but do not create release-candidate screenshot baselines.

MIT. See [LICENSE](LICENSE).
