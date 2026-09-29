# Handoff log: A (Yerassyl)

Newest entry at the top. Written by A, read by B.

### 2026-09-29 16:20 · A · A2 tracking + shape + controller skeleton
**Done:** `tracking/handTracker.ts` (rVFC, ≤30 Hz, GPU→CPU fallback, WASM pinned to 1.0.1, model in `public/models/`), `filters.ts` (One Euro per track), `features.ts` (px conversion, 2-permutation association, reacquire, calibration median, finger extension, pinch, pointing, velocities, status), `gestures.ts` (shape only, hysteresis + 120 ms stability), `engine/contact.ts` (two-wall), `engine/clay.ts` (shape + invariants), `engine/controller.ts` (observe/tick/dispatch, freshness gate, starts in `studio`/`free`), `dev/debug.ts`. Tests T05, T06, T11 + association/reacquire/hand-loss: 30/30, typecheck + build pass.
**Contract changes:** none.
**For you (B):** real core is ready to wire in `main.ts`. Use `performance.now()` everywhere (same clock as the tracker):
```ts
import { HandTracker, HandTrackerError } from './tracking/handTracker';
import { FeatureExtractor } from './tracking/features';
import { createController } from './engine/controller';

const core = createController();
core.updateProjection(projection);              // again on every projection change
const features = new FeatureExtractor();
const tracker = await HandTracker.create();     // throws HandTrackerError { stage: 'wasm' | 'model' }
tracker.start(video, (packet) => core.observe(features.compute(packet, projection)));
// camera restart / resize / rotation: epoch++; tracker.epoch = epoch; core.resetInput(epoch);
// rAF: const snap = core.tick(performance.now());
// dev only (behind import.meta.env.DEV && ?dev=1):
//   const { createDebugPanel } = await import('./dev/debug'); const panel = createDebugPanel();
//   panel.update(snap, now) every frame
```
Draw hands from `snap.input.screenLeft/Right.landmarksPx` (already mirrored, CSS px). Band highlight: `snap.clay.activeBand` (null when not touching). `snap.clay.revision` only changes when the shape changes, so rebuild the LatheGeometry only then.
**Blocked / need from you:** `camera.ts` + `ProjectionParams` (B2) and the main-loop wiring above, so we can hit the 19:30 checkpoint with real hands.
**Known issues:** thresholds are the plan's seed values, untested on real hands. `calibrationProgress` is 0 until the phase FSM (A4); features already exposes `features.calibrationProgress`. No pull/press/raise/point yet.
**Next:** A3: pull/press, collapse/recovery, overhang, rules + episodes, hints, near-miss.

### 2026-09-29 15:00 · A · A1 contract + config + coordinates
**Done:** `src/types.ts` (rev. 3, as agreed), `src/config.ts` (PLAN §10, one `CONFIG` object `as const`), `src/tracking/coordinates.ts` (`sourceToPx`, `pxToSource`, `pxToWorld`, `worldToPx`, `potTopPx`, `distPx`). Tests T01 and T02 pass (8/8).
**Contract changes:** none.
**For you (B):** in the Vite scaffold please add `vitest` to devDependencies and `"test": "vitest run"` to scripts, so `npm test` runs `tests/`. For `ProjectionParams`, use `fit: 'cover'` and `mirrored: true` to match the video. Your ortho camera needs to agree with `worldToPx`: world (0,0) = (`axisXPx`, `bottomYPx`), y up, `pixelsPerWorldUnit` px per unit.
**Blocked / need from you:** the scaffold (`package.json`, `index.html`, Vite config) before I can start `handTracker.ts`.
**Known issues:** none.
**Next:** A2: handTracker, filters, features, gestures (shape), contact, clay shape, controller skeleton.
