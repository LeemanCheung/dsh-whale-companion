# dsh-whale-companion

English | [中文](README.zh-CN.md)

A local-first DSH companion that turns privacy-safe session activity metadata into a draggable whale, levels, streaks, statistics, twelve achievements, and six skins.

## Features

- `shell.overlay` whale with persisted normalized position, viewport clamping, edge snapping, pointer drag, keyboard movement (arrow keys; Shift accelerates), and five-second live refresh.
- Settings → **Whale Home** offers Chinese-localized level progress, statistics, all twelve locked/unlocked achievements, six skin swatches, clear busy/error notices, export, strict import, and reset.
- Durable `storageDomain` state with serialized mutations and bounded idempotency checkpoints.
- Six visual skins: `ocean`, `coral`, `midnight`, `aurora`, `sunset`, and `nebula`.
- Semantic DSH theme tokens, reduced-motion support, and local packaged assets only.

Turns grant 10 XP, tool results grant 5 XP, and session starts grant 20 XP. Only `user/message` counts as a turn. Levels derive from XP and streaks from UTC session-start dates; **Early Bird** is earned before 06:00 UTC (not on a particular day of the month).

## Privacy

The Host reads only session id, sequence, event type, and timestamp. It never reads, stores, exports, or renders prompt text, assistant output, code, paths, tool arguments, or tool results. Exported backups contain only the validated `whale/v1` progress record.

## Install

Build a tarball and add it to the DSH Web profile:

```powershell
npm pack . --pack-destination ../../dist
dsh plugin --profile web add ../../dist/dsh-whale-companion-1.0.0.tgz
```

Restart the existing DSH Web process and refresh its page. See the suite [installation guide](../../INSTALL.md) for prerequisites and validation steps.

## Model Experience

This plugin adds no model prompt, tools, messages, token usage, or KV-cache content. It observes committed session event metadata on the Host and exposes browser UI only.

## Known limitations

Progress is local to one DSH storage backend and is not synchronized between devices. The overlay polls every five seconds rather than receiving a dedicated progress event.

## Development

From the workspace root run `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build`, and `corepack pnpm pack:check`.

MIT. See [LICENSE](LICENSE).
