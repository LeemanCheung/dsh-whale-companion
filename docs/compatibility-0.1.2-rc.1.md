# DSH 0.1.2-rc.1 compatibility check

Checked on 2026-09-05 for the Whale Companion 2.5.0 compatibility changes.

The installed DSH runtime supplies Cordis 4.0.2 and version 0.1.2-rc.1 of the Remote API, UI renderer, layout, settings, theme, session, storage-domain and Typert protocol packages. The retired `dsh-client-runtime` package is absent. The plugin now imports the renderer and Remote client declarations and lists the renderer in its browser dependencies. The slots package is a build-time type dependency, not an additional runtime service.

The lockfile resolves all DSH packages to the target prerelease. The scope, storage and invariants build dependencies are explicit so peer resolution does not retain an incompatible older release.

## Persistence behavior

- Session-created and session-event observers return an awaited, contained operation. Both rejected storage writes and synchronous metadata conversion errors are handled.
- Observer diagnostics contain one fixed message. They do not stringify errors or include session identifiers, event content or storage paths.
- A failed background update does not poison the write queue or alter already stored personalization. That failed progress update is not automatically replayed; future live events can be saved after storage recovers.
- Explicit user saves still reject on failure so the UI can report them.
- Session flush waits for all writes accepted before that checkpoint. Shutdown stops accepting new writes, drains previously accepted writes, then closes the domain.

The persistent state schemas and v1–v5 migrations are unchanged. The existing ImageGen atlas and historical minke assets retain their provenance. New ink-whale motion is verified separately by the image-source and playback checks.

## Verification

| Check | Result |
| --- | --- |
| `corepack pnpm install --frozen-lockfile` | Passed |
| `corepack pnpm peers check` | No peer dependency issues |
| `corepack pnpm typecheck` | Passed |
| `corepack pnpm test` | 14 files, 62 tests passed |
| New service regressions | 7 tests: three event failure/recovery paths, malformed metadata, shutdown drain, session flush, explicit save failure/recovery |
| `corepack pnpm build:host` / `build:client` | Passed |
| Browser tests | 10 passed, including both PNG exports for ink/atlas species, 488 px content inside a desktop viewport, native motion and both system/in-product reduced motion |
| `corepack pnpm pack:check` | Passed; 59 files, 11.5 MB including source art, history and validation previews; runtime client 2.60 MB |
| Release and planned-feature checks | Passed |
| Raster asset/provenance gate | Passed; no vector whale art in the client |
| Ink playback gate | 24 exact source poses, 72 in-betweens, 96 frames, 16/17 ms timing, 1.6 seconds; exact accepted WebP embedded in client |
| `git diff --check` | Passed |

The browser tests mount the actual built plugin in its existing DSH-compatible test host. Final installation in the upgraded DSH profile is a separate deployment check owned by the coordinating task.

The 488 px settings-pane check keeps the browser at 1280×720: the four-character title stays on one line, the description is wider than 200 px, and the image remains 140 px wide. Container queries adjust the plugin content without expanding the host dialog. The actual capture is `docs/ink-whale-settings-488px.png`.

Both PNG outlets now composite only the selected ImageGen raster art. Common minke uses the matching ink still on a pale field; other species use their atlas cell. `drawWhale` and its procedural silhouette were removed. Export captures are `docs/whale-share-card-common-minke.png`, `docs/whale-postcard-common-minke.png` and the corresponding humpback files. The six theme options are described as cove backgrounds, interface accents and ambient light, which matches their actual effect.

The manual release workflow uses the requested immutable tag and package version, rather than a hard-coded old version. It still neither creates tags nor runs on push.
