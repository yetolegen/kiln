# Handoff log: A (Yerassyl)

Newest entry at the top. Written by A, read by B.

### 2026-09-30 17:30 · A · V7 core: stable lift, 20 % pancake, 10 % local wall tear
**Done:** all 22 failing `src/ui/studioV7.test.ts` cases pass (32/32), following your REVISED lift section. Placement untouched: same zones, the y=.25 near-base pose and foreshortened hands are still accepted, and palm-size scaling is unchanged. Full suite **274 pass / 10 fail / 284**, and all 10 failures are the known `interactionV6.test.ts` cases. Build/typecheck green.
- **Lift grace:** one-frame glitches (orientation past 50°, loose fingers or pinch, leaving the base zone before arming, a speed spike during the hold) now *pause* the lift for up to `LIFT_GRACE_MS` (250) instead of cancelling it. Paused frames add no hold time and no deformation. Sustained motion restarts the hold; a glitch that persists past the grace cancels.
- **Slow rise:** once armed, height follows the palm's actual rise above a ratchet (arming height + `LIFT_DEADBAND_PALM` × palm ≈ 1 px on a 100 px palm, ≈ 4 px on a 215 px real palm). Speed floor `LIFT_MIN_PALM_PER_S` removed: 0.05 palm/s now lifts. Stationary jitter can't pump it (new test in `tests/gestures.test.ts`). After a pause or a >200 ms observation gap it rebases, so resuming never jumps.
- **Cancel:** an armed hand that leaves the base horizontally (|x| > base radius + margin) cancels immediately and must re-arm. The existing cancels still apply: lost support or input, role change, below the zone, and rising too fast.
- **Pancake:** `PANCAKE_HEIGHT_WORLD` 0.7 → **0.24** (20 % of `INIT_HEIGHT` 1.2; the reference is the fixed initial height). `MIN_HEIGHT` 0.6 → **0.2**. At pancake the cavity closes (depth/radius 0). `TOO_FLAT_HEIGHT_WORLD` warning 0.9 → **0.4**.
- **Wall tear:** `MIN_THICKNESS` 0.08 → **0.1** (10 % of `INIT_RADIUS` 1.0). `OPEN_MIN_WALL_WORLD` is removed: opening now reaches 0.1 exactly. Any cavity wall ≤ 0.1, whether from opening, lifting, shaping inward or stretch thinning, now ends as permanent **`wallTorn`**. Height is kept (no sag) and damage 0.8 goes on the thin band(s), with a Gaussian falloff inside the cavity only. `tooThin` now warns below 0.15 (`TOO_THIN_MARGIN` 0.05). The time-based 10 s stretch tear is unchanged; the first permanent cause wins.
**Contract changes:** none in `types.ts`. **The core no longer produces `collapseCause: 'thinWall'`**; the only recoverable collapse left is `tooTall`. The type still has `thinWall`, so your i18n and mock stay valid.
**For you (B):**
- `storage.ts` validates `height ≥ CONFIG.MIN_HEIGHT`. It now accepts the 0.24 pancake saves; with the old 0.6 they would have been rejected. Check the schema-2 migration path too.
- Renderer: a pancake at 0.24 with a closed cavity; `wallTorn` damage covers only the thin bands.
- Any lesson or target geometry that assumed height ≥ 0.6 or an opening clamp at 0.12.
**Test changes (mine):** clay/rules/gestures tests updated to the new rules (tear instead of thinWall sag, the grace, a support hand that follows the wall down in the pancake fixture). No B-owned files edited.
**Known issues:** all values are synthetic; there's no physical retest yet. The 10 V6 cases are still open and are next.
**Next:** V6 (thumb-tip depth/jump, outward-withdrawal release, very slow press, action/hint reset at lesson boundaries).

### 2026-09-30 12:30 · A · V5 core: ceiling, hole, over-stretch, pancake
**Done:** docs/GESTURES_V5.md A-items 2–6. Support hand, either role, 3 s lift arming and fresh-input gates unchanged. All core tests + fuzz pass.
**Contract changes (`types.ts`) — confirmed as proposed:**
- `ClayState` + `floorThicknessWorld` (derived: height − cavityDepth; 0 = hole), `bottomHole` (draw a real hole; cavityDepth = height), `safeIndentDepthWorld` (~one thumb phalanx = 0.3 × user's palm), `maxHeightWorld` (screen ceiling = 0.75 × `bottomYPx` / ppu; draw it as a limit line if you like).
- `CollapseCause` + `bottomHole` | `wallTorn` | `pancake`: **permanent until `restart`** (rim compression can't repair them). `thinWall` / `tooTall` stay recoverable. Past the screen ceiling = `tooTall` collapse (sag), not silent resistance.
- `ClayEventType` + `thinFloor` (indent deeper than safe depth; data {floor, safeDepth}), `overStretch` (opening engaged ≥ 7 s; data {seconds, tearInS}), `tooFlat` (compressing below height 0.9; data {height}). All `execution`, hint priority 85 (above tear), severity error.
- `GestureState.engagedMs`: time the current one-hand action has been ARMED. For `open` it is the stretch clock: starts at pinch acquisition, counts while spreading OR holding, resets on release / tracking loss / support loss / hand switch; replayed frames add nothing. Danger at `CONFIG.STRETCH_DANGER_MS` (7000), tear at `STRETCH_TEAR_MS` (10000).
- `SessionResult` **`schemaVersion: 3`** + `floorThicknessWorld`, `bottomHole`. Migration: v2 → floor = height − cavityDepth, bottomHole false; v1 → solid.
**Behaviour:** indent now deepens with continued thumb push (first dent 0.12, then +1 world per world of thumb travel); past `safeIndentDepthWorld` → `thinFloor`; floor ≤ 0.02 → hole. Opening past 7 s thins the wall visibly, 10 s tears it. Rim compression has no per-engagement cap (gain 1.0) → `tooFlat` at 0.9 → `pancake` at 0.7.
**For you (B), red until you do:** `mockCore` (new ClayState fields + `engagedMs`), `storage.ts` accepts/migrates schema 3 (your `flow.test.ts` fails only at `store.save(result)` because it rejects v3), i18n for `thinFloor` / `overStretch` / `tooFlat` and the three new collapse causes (Try Again, not "press to recover"), renderer hole + ceiling, lesson validators if they assumed a one-shot 0.12 dent.
**Blocked / need from you:** none.
**Known issues:** all v5 numbers are game values, untested by real hands.
**Next:** fix from your physical reports.

### 2026-09-30 10:30 · A · real-hand fixes + B owns physical testing now
**Done:** first real-hand session (Yerassyl: Acer Aspire A715-76G, Edge + Chrome, built-in webcam, daylight) found 3 core bugs, all fixed and pushed (`cdf15f7`, `8299795`), 169/169 tests incl. your flow tests, build green:
1. **Pointing never fired:** curled fingers read 0.36–0.66 on a real webcam, the rule wanted ≤ 0.35. Now relative: index − mean(other three) ≥ 0.35 (0.25 to stay). Measured margin was 0.44–0.56.
2. **Dwell restarted on one-frame dropouts:** pointing is now sticky for the same hand, and the cursor stays on that fingertip during the 120 ms grace.
3. **Lesson 2 (lift) and all one-hand actions couldn't start:** his palm is ~215 px, bigger than the pot radius (~100 px), but placement tolerances were fixed world distances (support within 0.45 ≈ 60 px of the wall: impossible for a palm centre). **All zones now scale with the measured palm size** (support, base, rim, top centre, opening, shape contact). Flat hand also accepts fingers pointing at the camera; thumbs-down no longer needs every finger < 0.35 (and never matches a pinch).
**Contract changes:** none.
**For you (B): the user asked that you do all physical testing from now on. I work from your reports.**
1. **Redeploy now.** Production has none of the fixes above, so menus can't be clicked there.
2. **Test locally for numbers:** `npm run dev`, open `http://127.0.0.1:5173/?dev=1` (Chrome), good light. The green panel shows per hand `ext i m r p`, `pinch`, `POINT`, then `gesture`, `cursor`, `contact … err L R`, `action active/support progress`, `nearMiss`, `cavity`, `hint`.
3. **For each lesson step that fails, send me:** the step, what you did, and a copy of the panel text while holding the pose. Quickest: in DevTools console:
   `copy([...document.querySelectorAll('pre')].find(p=>p.textContent.includes('tracking')).textContent)`
   then paste it into your handoff. Two or three captures per failing pose. The numbers let me fix thresholds exactly instead of guessing.
4. Poses to check, in order: point at a menu card · shape (open palms at both walls) · lift (flat palm under the pot, other hand on a side wall, 3 s still, then slowly up) · indent (thumbs-down at top centre, short push) · open (pinch in the dent, spread slowly) · rim (flat palm just above the rim, hold, slowly down) · raise to finish. Both hand roles if you have time.
5. Optional, best data: `?dev=1&rec=1`, keys 0–8 pick the label, R starts/stops, commit the JSON to `recordings/`.
**Blocked / need from you:** redeploy + the reports above.
**Known issues:** only one person's hands measured so far. Thresholds for pinch and the lift/rim speeds are still unmeasured.
**Next:** fix whatever your reports show, fast.

### 2026-09-30 01:30 · A · GESTURES_V4 contract + core pushed
**Done:** the four v4 actions per docs/GESTURES_V4.md, with your proposed ids: lift (`pullUp`, 3 s armed hold then slow rise), `indent` (thumb down at the top centre, one shallow push), `open` (pinch in the indentation, then slow spread), `compressRim` (flat hand just above the rim, 0.5 s hold, then slowly down). Old two-pinch pull and two-fist press are gone. Either hand can be active; roles are persistent track ids for the whole engagement. Collapse is now recovered by rim compression. 154 core tests pass: both role assignments, short vs 3 s holds, duplicate observations, stale input, lost support, switched hands, pose conflicts, bounded cavity, actionable hints, plus the fuzz now drives the new actions through the real controller. Thresholds are seeds, untuned on real hands.
**Contract changes (`types.ts`):**
- `Gesture`: removed `pressDown`; added `indent`, `open`, `compressRim`. New `ActionGesture = 'shape'|'pullUp'|'indent'|'open'|'compressRim'|'raise'` used by `tutorialStep.expectedGesture`, `GestureContext.expectedGesture`, `NearMiss.intended`.
- `NearMissReason`: removed `fistLoose`; added `noSupport` {side: hand that must go to a wall}, `holdStill` {remainingS}, `liftTooFast`, `notHorizontal` {side}, `thumbNotOnTop` {dx: 'left'|'right'|'', dy: 'up'|'down'|''} (direction to MOVE the thumb), `noIndentation`, `pinchFirst` {side}, `spreadTooFast`, `rimPlacement` {dir: 'lower'|'closer'}. `pinchLoose` now means "pinch tighter to start opening". `notMoving` = armed lift/rim waiting for the slow movement. `liftTooFast`/`spreadTooFast` stay on screen 1.5 s after the cancel.
- `GestureState`: + `activeTrackId`, `supportTrackId` (null unless a one-hand action), `activationProgress` 0..1 (lift hold, indent travel, open pinch acquisition, rim hold; 1 = acting). `deforming` = the clay changed from this action on this observation.
- `ClayState`: + `cavityRadiusWorld`, `cavityDepthWorld` (0/0 = solid, the initial state). Opening = cylinder of that radius from the rim down that depth. `thickness` is now DERIVED: thinnest wall around the opening (solid pot: narrowest radius). Draw the cavity from these two fields, not from thickness.
- `SessionResult`: `schemaVersion: 2`, + `cavityRadiusWorld`, `cavityDepthWorld`. Schema 1 saves have no cavity: migrate as solid (0/0).
- `CONFIG`: removed `INIT_THICKNESS`, `PULL_RATE`, `PRESS_RATE`, `THIN_PER_HEIGHT`, `TEAR_THICKNESS_LOSS_PER_S`, `REPAIR_THICKNESS_PER_S`, `MOTION_*`, `FULL_MOTION_PALM_PER_S`, `FIST_LOOSE_MAX`. Kept `MAX_THICKNESS`, `MIN_INNER_RADIUS`, `THICKNESS_FLOOR` for your renderer. New: `LIFT_HOLD_MS` (3000), `COMPRESS_HOLD_MS`, `OPEN_ACQUIRE_MS`, zones etc.
**For you (B), typecheck is red until you do this:**
- `mockCore.ts`: add `cavityRadiusWorld: 0, cavityDepthWorld: 0` to its clay; add `activeTrackId: null, supportTrackId: null, activationProgress: 0` to its GestureState; `schemaVersion: 2` + cavity fields on its result; replace `pressDown` (e.g. with `compressRim`).
- `i18n.ts`: drop `pressDown`/`fistLoose`; add gesture names for `indent`/`open`/`compressRim` and texts for the new reasons above (use the params).
- `tutorial.ts` + `flow.test.ts`: six steps shape → pullUp → indent → open → compressRim → raise via `tutorialStep.expectedGesture`. In the tutorial only the expected action deforms. Step done = `gesture.deforming` with the step's gesture AND the matching change (height up / cavity depth > 0 / cavity radius up / height down), then require a release (`activationProgress` back to 0 or a different gesture) before the next step.
- Renderer: activation ring from `gesture.activationProgress` at the active hand (`activeTrackId` → `input.screenLeft/Right.trackId`), highlight the support hand. Cavity from the two new fields.
**Blocked / need from you:** none. Tell me if a field doesn't fit.
**Known issues:** all new thresholds are guesses (see `config.ts`, v4 section). Physical testing matters more than ever: the flat-hand and thumb-down detection come from 2-D landmark angles. `targetMismatch` still scores only the outer profile, not the cavity.
**Next:** real-hand recordings (needs a human at the camera) → tune the v4 thresholds.

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
