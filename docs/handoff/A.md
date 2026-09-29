# Handoff log: A (Yerassyl)

Newest entry at the top. Written by A, read by B.

### 2026-09-29 15:00 · A · A1 contract + config + coordinates
**Done:** `src/types.ts` (rev. 3, as agreed), `src/config.ts` (PLAN §10, one `CONFIG` object `as const`), `src/tracking/coordinates.ts` (`sourceToPx`, `pxToSource`, `pxToWorld`, `worldToPx`, `potTopPx`, `distPx`). Tests T01 and T02 pass (8/8).
**Contract changes:** none.
**For you (B):** in the Vite scaffold please add `vitest` to devDependencies and `"test": "vitest run"` to scripts, so `npm test` runs `tests/`. For `ProjectionParams`, use `fit: 'cover'` and `mirrored: true` to match the video. Your ortho camera needs to agree with `worldToPx`: world (0,0) = (`axisXPx`, `bottomYPx`), y up, `pixelsPerWorldUnit` px per unit.
**Blocked / need from you:** the scaffold (`package.json`, `index.html`, Vite config) before I can start `handTracker.ts`.
**Known issues:** none.
**Next:** A2: handTracker, filters, features, gestures (shape), contact, clay shape, controller skeleton.
