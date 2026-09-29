# Handoff log: A (Yerassyl)

Newest entry at the top. Written by A, read by B.

### 2026-09-29 22:45 · A · please record hand data (A can't tonight)
**Done:** nothing new in code. Recording pipeline checked: the dev page loads with the recorder panel.
**Contract changes:** none.
**For you (B):** A can't record tonight (dark room). Every threshold is still a guess, so the recognition gets tuned from YOUR recordings. ~5 minutes:
1. Good light, plain background if possible. `npm run dev`, open `http://127.0.0.1:5173/?dev=1&rec=1`, press Start, allow the camera, pass calibration (hold both hands still).
2. Click the page once so it has keyboard focus. The debug panel's last line shows `○ rec (R) label [n] …`.
3. For EACH label: press its number key, then `R` to start, do it for ~15 s, then `R` to stop. Stopping downloads a `kiln-rec-*.json`. One file per label is ideal.
   - `0` neutral: hands relaxed, moving around, not doing any gesture
   - `1` shape: open flat palms on both sides of the pot, moving in and out slowly
   - `2` pullUp: pinch thumb+index on both hands, move both up slowly
   - `3` pressDown: both fists, move both down slowly
   - `4` point: ONE hand, index finger out, other fingers curled; move it around
   - `5` raise: both open palms above the pot, hold still
   - `6` tooFast: like shape, but move your hands FAST on purpose
4. Bonus if you have time: a second round with a sloppy version of each (loose pinch, half-closed fist), and a second lighting setup.
5. Put the files in `recordings/` in the repo and commit them: `recordings: <who>, <lighting>`. Landmark JSON is fine to commit (PLAN §13); no video is recorded.
6. Write in your handoff: who recorded, lighting, and anything that felt wrong (e.g. "fist often shows as pullUp").
A then runs `notebooks/tuning.ipynb` on them and tunes `config.ts`.
**Blocked / need from you:** the recordings above.
**Known issues:** none new.
**Next:** tune thresholds from the recordings.

### 2026-09-29 22:20 · A · snapshot target + glazeId (B4 request)
**Done:** `EngineSnapshot.target` and `EngineSnapshot.glazeId`, filled by the controller. Test added, 116/116.
**Contract changes:** `types.ts`: `EngineSnapshot` gets `target: TargetProfile | null` (the commission target while a commission session is on screen, else null) and `glazeId: string | null` (set by `selectGlaze`, null in the menu).
**For you (B):** **`npm run typecheck` fails until you add the two fields to your mock**, in `src/dev/mockCore.ts` line ~151, in the snapshot you return:
```ts
      stats: this.stats, result: this.result,
      target: null, glazeId: null };   // or your mock's own values
```
Target radii are `target.radii` (48 values, bottom → top, same units as `clay.radii`) and `target.height`. Draw the silhouette with the same projection as the pot.
**Blocked / need from you:** none.
**Known issues:** none new.
**Next:** real-hand recording + tuning (B2 is live).

### 2026-09-29 19:30 · A · bug fixes (speech rule, GPU fallback)
**Done:** "recovered" hint could be spoken twice. Tracker now falls back to CPU if the GPU delegate fails at the first detection (not only at load). Controller warns once in the console if it drops frames because of an epoch mismatch. 87/87.
**Contract changes:** none.
**For you (B):** **speech rule changed, replaces the one in my A3 entry.** Speak when `hint && hint.speak && hint !== lastHint`, then set `lastHint = hint` every frame. The core returns the same Hint object on every tick until something changes. The old rule, dedupe by (id, episodeId), would silence near-miss hints forever after their first time because they have no episodeId. Also: on camera restart / resize always set BOTH `tracker.epoch = n` and `core.resetInput(n)`, otherwise every frame is dropped (you'll see a console warning).
**Blocked / need from you:** B2 camera + main-loop wiring.
**Known issues:** raising open hands just above the pot after a pull and holding still for 1.5 s finishes the pot. That's the plan's raise gesture, but it may trigger by accident. We'll see in testing; `RAISE_MARGIN_WORLD` (0.15) is the knob.
**Next:** real-hand recording + tuning once B2 is in.

### 2026-09-29 19:10 · A · A5 recorder + tuning notebook
**Done:** `tracking/recorder.ts` (labelled FrameInput recordings) built into the debug panel: `?dev=1&rec=1`, keys `0–6` = neutral/shape/pullUp/pressDown/point/raise/tooFast, `R` start/stop → downloads JSON. `notebooks/tuning.ipynb`: per-feature distributions per label, ON/OFF thresholds from the gap, fist-read-as-pinch check, label vs recognizer table, prints suggested `config.ts` lines. Runs end to end on clearly marked synthetic data until real recordings exist. 85/85 tests.
**Contract changes:** none.
**For you (B):** nothing new. Recording only needs the debug panel wired as in my A2 entry (dev build, `?dev=1`), and keyboard focus on the page.
**Blocked / need from you:** B2 camera + main-loop wiring. Recording and all tuning need real hands.
**Known issues:** no real recordings yet, so no thresholds are tuned.
**Next:** once B2 is in: record both of us (correct + sloppy, 2 lighting setups) into `recordings/`, run the notebook, tune config.

### 2026-09-29 18:30 · A · A4 phases, target, session, result
**Done:** controller owns the whole flow `loading → permission → calibrate → menu → tutorial | studio → glaze → firing → result → gallery / menu`. One-shot raise → finishShaping. Target «Ваза» + similarity (signed deltas), `targetMismatch` coaching (tooWide/tooNarrow/tooLow/tooHigh). Session stats (execution vs tracking episodes, gestureMs, activeMs), one `SessionResult` per session with copied arrays. Also fixed: two visible hands in a bad frame no longer read as `oneHand`; in studio/tutorial pointing needs one hand only (no accidental "start over" mid-press). Tests T15–T18 + flow: 84/84, typecheck + build pass.
**Contract changes:** `types.ts`: added `AppCommand { type: 'modelReady' }`. The core can't know when the model finished loading; that's the only way to leave `loading`.
**For you (B):**
- **Boot:** `HandTracker.create()` resolved → `core.dispatch({ type: 'modelReady' }, now)` (`loading → permission`). Call `core.updateProjection()` **only once the camera is running**: the first call moves to `calibrate`. Calibration = both hands visible and still for 0.8 s, `snap.calibrationProgress` 0..1, then `menu` automatically.
- **Controller:** `createController({ nowIso: () => new Date().toISOString() })` so `result.completedAtIso` is set (the core never reads the clock).
- **Commands per phase** (others are ignored, so a late dwell can't skip a screen): menu: `start` (tutorial/free/commission; commission `targetId` optional, default «Ваза»), `openGallery` · tutorial: `tutorialStep`, `restart` (keeps the step), `backToMenu` · studio: `finishShaping` (raise does it too), `restart`, `backToMenu` · glaze: `selectGlaze` then `confirmGlaze` (confirm is ignored until a glaze is selected), `backToMenu` · result: `openGallery`, `backToMenu` · gallery: `backToMenu`.
- **Firing** lasts `CONFIG.FIRING_MS` (4 s), then `phase = 'result'` and `snap.result` is set. Save it once (check `result.id`); the same object comes back on every tick.
- **Tutorial:** send `tutorialStep` with `expectedGesture` for each step. Shaping/pull/press only act on the step that expects them. On the final step (`expectedGesture: 'raise'`), holding raise 1.5 s ends the tutorial and returns to `menu`. For the tear step, watch `snap.events` for `tear` `begin` then `end`.
- **Best scores:** `stats.targetId` is `'vase@1'` (id@version); compare scores only for the same string. Score = `result.stats.similarity.score` (0..100, float).
- **Studio "start over":** point with ONE hand (other hand out of frame or down).
**Blocked / need from you:** B2 camera + `ProjectionParams`, then the main-loop wiring (A2 entry + boot steps above).
**Known issues:** all thresholds untested on real hands. `targetMismatch` tolerance (0.05) is tight, so the coaching hint is almost always on in commission (lowest priority, shows only when nothing else does). Tutorial result isn't a result screen; the tutorial goes back to menu.
**Next:** A5: `tracking/recorder.ts` (dev recordings), `notebooks/tuning.ipynb`. Then real-hand tuning once B2 is wired.

### 2026-09-29 17:10 · A · A3 pull/press, error mode, hints
**Done:** gestures pullUp / pressDown (motionStrength = slower hand), raise, point (cursor), near-miss with evidence only. Clay: pull/press, repair, tear damage, wobble, overhang smoothing, collapse once + recovery by pressing. `engine/rules.ts`: episodes (begin/update/end, categories). `engine/hints.ts`: one hint, priority, speech cooldown. Controller wires it all: `snap.events`, `snap.activeIssues`, `snap.hint` are live. Fixes from review: per-track velocity dt after brief hand loss (was a fake-tear source), tracker no longer swallows core errors. Tests T10, T12, T13 + 30 more: 64/64, typecheck + build pass.
**Contract changes:** none.
**For you (B):**
- **Hint texts (i18n), keyed by `hint.id`, with `hint.params`:** `tear` {speedRatio} · `wobble` {dir: 'left'|'right' = where to move both hands, offsetPalm} · `tooThin` · `collapse` {cause: 'thinWall'|'tooTall'} · `overhang` (use `hint.band`) · `handsTooFar` {side: 'left'|'right', dir: 'in'|'out'} · `oneHand` {missing: 'left'|'right'} · `noHands` · `trackingUncertain` {status} · `pinchLoose` / `fistLoose` {side} · `handsTooLow` · `handsUneven` {raise: side of the lower hand} · `handsNotOpposite` · `notMoving` · `atLimit` · `recovered`. RU texts are in PLAN §8.
- **Speech:** speak when `hint.speak` is true and (`hint.id`, `hint.episodeId`) differ from the last spoken pair. Replace, don't queue.
- **Sounds:** play on `snap.events` with `phase === 'begin'` (tear → crack, collapse → thud). `snap.events` holds each transition exactly once; don't replay.
- **Visuals:** `clay.damage[]` (crack marks), `clay.wobble` (shake amount), `clay.collapsed`, `hint.band` (highlight). `clay.revision` bumps on any of these.
- **Dwell:** `snap.gesture.cursorPx` is set only while the gesture is `point` (menu/glaze/result/gallery, and the studio "start over" button).
**Blocked / need from you:** still B2 camera + `ProjectionParams` and the main-loop wiring from my A2 entry. Nothing in A3 depends on it.
**Known issues:** `THIN_PER_HEIGHT` changed 0.1 → 0.15 (with 0.1 "pulled too thin" was unreachable). All thresholds untested on real hands. `targetMismatch` comes with the target in A4. Rules only run in studio/tutorial.
**Next:** A4: phase FSM, one-shot raise → finishShaping, target «Ваза» + similarity, session stats + result.

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
