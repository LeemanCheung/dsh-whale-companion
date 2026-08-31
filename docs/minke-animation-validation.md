# Common minke motion validation

Status: implementation, offline validation, browser-harness validation, and isolated real DSH Shell UAT are complete in `recovery/minke-motion-v2`; this is the 2.3.0 release candidate. The user profile and release remain unchanged.

## Provenance

- Canonical repository base: `fdfb6e6707901ed6a1980fd56b630af64f49d287` (`2.2.0`).
- Original atlas reference: `packages/dsh-whale-companion/assets/whale-species-atlas-minke-reference.webp`, SHA-256 `5b71c91786ececb67214ce4df4f764d89c428275514af80067d5c1caba138e77`.
- The local image-edit reference was the first atlas cell, cropped by the legacy 384×320 pipeline. Its decoded RGB pixels were rechecked byte-for-byte against the repository atlas on 2026-08-30.
- Selected transparent source: `packages/dsh-whale-companion/assets/minke-imagegen-clean.png`, SHA-256 `ae9f40403fca9ab58ed640b64d63f6ad1ea4a12148dc4faf62a930b5f62642ae`.
- The built-in OpenAI image edit received the local atlas cell as its reference. The edit was restricted to background/ripple removal and style-preserving cleanup. It used no API key, model credential, runtime URL, or external package state.
- A first candidate was rejected because it increased realism and redesigned detail. The checked-in source is the one-step style-converged candidate; it retains the muted blue-gray, hand-painted atlas treatment.
- The repository copy was re-encoded without changing any RGBA pixel to remove the generator's C2PA `caBX` timestamp/UUID metadata. The original Codex-generated file remains outside the repository.

## Motion contract

- 24 distinct RGBA frames in a 6×4 sprite, 384×320 per frame.
- The visible foreground is the only animated layer. Ocean color, rings, border, and shadow belong to the static CSS stage.
- The head remains stable while motion grows through the torso, pectoral-fin region, tail stock, and fluke.
- Sampling uses premultiplied bilinear interpolation and two-times working resolution before Lanczos downsampling.
- Motion metrics use only the largest 4-connected component above alpha 128; near-transparent or disconnected pixels cannot satisfy the body-motion gate.
- `prefers-reduced-motion` and the in-product reduced-motion preference both stop playback at the first frame.

## Offline evidence

The independent audit reported:

- unique frames: 24/24
- minimum adjacent premultiplied MAD: 0.580107
- median adjacent premultiplied MAD: 0.835020
- loop seam ratio: 1.257769
- maximum adjacent/median ratio: 1.344648
- head binary-mask centroid range: 0.308731 px
- torso binary-mask centroid range: 3.424438 px
- tail binary-mask centroid range: 22.251480 px
- unique visible frames / binary masks: 24 / 24
- mask loop seam ratio: 1.279022
- main-component share range: 1.0–1.0

The machine-readable report is `packages/dsh-whale-companion/assets/minke-motion-report.json`. The visual 24-frame contact sheet is `docs/minke-motion-contact-sheet.png`.

The source-to-output check regenerates sprite, preview, and contact-sheet pixels in memory with Python 3.12, NumPy 2.3.3, and Pillow 12.3.0; it performs no writes and fails if committed pixels differ. The separate audit then validates full metadata, hashes, timing, motion metrics, alpha/component integrity, exact embed, and the original atlas fingerprint.

## Browser and isolated DSH evidence

- The repository's focused Playwright cases passed animated, reduced-motion, and 390×844 layouts against the built client bundle.
- The exact worktree was linked into `dsh-qa-home` and served at loopback-only `127.0.0.1:3081`; the user's 3080 process stayed online.
- The final client bundle is path-stable and repeatable at SHA-256 `1324dc286234d0dab8f499eefe451506e9781b1c6c43d2314d9f9366a6f32e1a`.
- Real Shell DOM, Remote, console, resource-origin, theme, reduced-motion, desktop, and primary narrow-route checks passed.
- Two final-bundle real Shell card captures differed only inside the whale stage: 9,152 pixels over threshold (3.0131%), difference box `[50,121,348,212]`; the text region and static stage corner remained pixel-identical.
- The primary 390×844 icon → quick card → full Whale Home path produced a 350 px card with no document overflow.
- Real Shell artifacts and detailed evidence live under `dsh-qa-home/output/playwright/` and `dsh-qa-home/UAT_EVIDENCE.md`.

The alternate host Settings sidebar is not responsive at 390 px: its desktop navigation leaves only a 66 px content column for every plugin. This host-level route is recorded as a limitation and is not counted as passing. The primary whale-icon route remains usable.

## Remaining release boundary

Do not switch the active user profile, commit, tag, push, or release without separate authorization. Offline and isolated UAT prove this worktree's implementation; they do not prove a future published package, the current 3080 profile, or long-term production stability.

The dry-run package is 3.6 MB compressed / 5.7 MB unpacked. It deliberately includes the sanitized source, preview, report, contact sheet, and two audit scripts for provenance; the 2.46 MB client source map remains a repository validation artifact but is excluded from the package, and the published client no longer points to it. The `release-2.3.0.yml` workflow runs the Minke rebuild/audit gates before tagging. Python package versions are exact, but wheel hashes and the Python 3.12 patch version are not locked, so this is reproducible at the pixel/audit level rather than a claim of fully hermetic supply-chain bytes.
