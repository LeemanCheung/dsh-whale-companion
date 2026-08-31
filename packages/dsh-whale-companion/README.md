# dsh-whale-companion

English | [中文](README.zh-CN.md)

A local-first DSH whale world with safe tide reactions, 20 whale spirits, 24 collectible cove objects, gentle expeditions, visitor bottles, and opt-in local whale-circle cards.

## Features

- **Complete 2.3.0 delivery:** named companion, four adaptive voyage goals, an animated self-contained SVG whale, a compact quick card, XP feedback, six multi-layer palettes, local PNG/text sharing, and the verified common-minke motion card.
- Session dates now prefer the real creation timestamp; late historical events cannot roll streaks backward; every text import is capped at 512 KiB before JSON parsing; durable writes are fully schema-validated.
- CI now mounts the actual built client bundle in a browser-compatible DSH slot/Remote harness and runs desktop, mobile, light-theme, and reduced-motion Playwright visual regression.
- The `shell.overlay` whale is keyboard-accessible, draggable, edge-snapped, viewport-safe, and refreshed through one shared five-second store. New moments become visible, bounded reaction bubbles; only milestones enter the live region.
- Browser-local quiet, standard, and lively preferences control presentation without entering Host state, backups, or community cards. Whale Home adds a seven-day journal, current story beat, cove preview, and Privacy Ledger.
- A 20-species manifest maps safe live event families to tide effects. It never reads event content or changes model behavior.
- Tides are bounded local moments built from session starts, user turns, and tool results. Tool-result repetition cannot farm collectibles or expeditions.
- Whale Home includes local SVG postcards, eight fixed room slots, three room presets, a 24-item catalog, and a non-punitive expedition.
- Visitor bottles are strict, read-only local room previews. Whale-circle cards are explicit local-file exchanges with no networking or free text.

## Privacy

The Host reads only session id, sequence, type, and timestamp. It never reads or retains prompts, assistant output, source code, paths, tool arguments, or tool results.

The Host creates HMAC-normalized receipt digests for current-process live dedupe. The persisted 4,096-receipt window is bounded and is not a permanent exactly-once claim. Backups omit receipt digests, session ids, and event payloads. Postcards, bottles, and whale-circle cards use strict local schemas with no task or conversation content.

## Install

Build a tarball and add it to the DSH Web profile:

```powershell
npm pack . --pack-destination ../../dist
dsh plugin --profile web add ../../dist/dsh-whale-companion-2.3.0.tgz
```

Restart the existing DSH Web process and refresh its page. See the suite [installation guide](../../INSTALL.md) for prerequisites and validation steps.

## Model Experience

This plugin adds no model prompt, tools, messages, token usage, or KV-cache content. It observes committed session event metadata on the Host and exposes browser UI only.

## Known limitations

Progress stays on one local storage backend. The plugin polls durable state every five seconds because the current host Remote event allowlist has no whale-state push route. Whale-circle cards are local only; a hosted community requires a separately owned transport provider with authentication, retention, deletion, rate limiting, and moderation.

## Development

From the workspace root run `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, and `corepack pnpm pack:check`.

MIT. See [LICENSE](LICENSE).
