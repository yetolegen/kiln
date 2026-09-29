# KILN: final architecture & build plan (v3)

> Goes in the repo as `docs/PLAN.md`, with `types.ts` as `src/types.ts`.
> We both read this file **and** both handoff logs (§13) before every task.
> v3 = the original plan + the revision-2 correctness fixes + scope cuts for 2 people and one day.
> Official deadline: **30 Sep 15:00 Astana**. Target submit: 14:30. Feature freeze: 11:00.

## 1. Product

KILN is a virtual pottery wheel controlled by hands through a normal webcam. The mirrored camera feed fills the screen, a clay pot spins in the middle, and your hands touch it from both sides. Open palms change the pot's radius at the height of your hands, pinched hands moving up pull it taller, fists moving down compress and repair it. Moving too fast, shaping off-center or pulling too thin cause **game-model** damage (tear, wobble, collapse) with a specific explanation of what to change. Then you pick a glaze, fire the pot, and get the finished piece, stats and, in commission mode, a similarity score against a target vase.

Direction C (free). Russian UI first, English optional.
It's a game model, not a physics simulator or a measuring tool. Never claim real centimetres, pressure or wall thickness.

## 2. Scope

**Must ship:** model loading, camera start, calibration of both hands, tutorial (shape → pull up → press down → deliberate speed mistake → correct it → finish), free mode, commission mode with 1 target, 3 glazes, firing, result screen with stats and mistake breakdown, local gallery + local best scores, sound + voice when available (text hint always), gesture navigation for every in-app action, HTTPS deploy, README.

**Integration order:** first one complete route `camera → tutorial → commission → glaze → result`, then free mode and gallery.

**Cut first if late:** English → extra targets → fancy clay textures → phone polish (keep it working) → kiln animation (simple glow).

**Fallback (decided at the 19:30 checkpoint):** if 3D doesn't work well, render a shaded 2.5D silhouette from the same `radii[]`. Core contract doesn't change, only the render adapter.

**Result never depends on** PNG export, speech, audio or localStorage succeeding. If one of them fails, the flow still completes.

## 3. Stack

Vite + TypeScript (vanilla), `three` (OrthographicCamera + LatheGeometry), `@mediapipe/tasks-vision` HandLandmarker, Vitest, Web Audio/howler, speechSynthesis, Vercel.

MediaPipe: `runningMode: 'VIDEO'`, `numHands: 2`, pinned npm version + WASM from jsDelivr with the **same** version, model in `public/models/hand_landmarker.task`, GPU delegate with CPU fallback.

**Inference runs on the main thread**, capped at `INFERENCE_MAX_HZ` (30), driven by `requestVideoFrameCallback` (fallback: check `video.currentTime` changed). At most one inference per new video frame, never per render frame. Move to a Worker **only if** profiling shows visible stutter. Not planned.

## 4. Architecture

```
camera (B) ─► handTracker (A) ─► features (A) ─► gestures + contact (A) ─► clay (A) ─► rules/episodes (A) ─► hints (A)
  video +        raw hands,         persistent ids,     GestureState          ClayState    ClayEvent[]           Hint
  projection     timestamps         px/world coords,                                                        │
                                    velocities, quality                                                      │
                                                   controller (A): phase FSM, session, target, result ──► EngineSnapshot
                                                                                                             │
                             B reads snapshot only: render (pot, overlay), ui (screens, tutorial, dwell, HUD), audio, storage
                             B sends AppCommand via controller.dispatch()
```

### Loops (simplified from revision 2)
- **Observation loop** (rVFC, ≤30 Hz): new frame → `detectForVideo` → `features.compute()` → `controller.observe(frame)`. The engine steps **once per new observation** with `dt = min(dtSampleS, MAX_STEP_S)`. No fixed-step accumulator, no replay queue.
- **Render loop** (rAF): `snapshot = controller.tick(now)` → render + UI. `tick` doesn't advance the clay. It only advances timers (hint expiry, firing), so re-rendering the same observation never deforms or confirms anything.
- **Freshness gate:** if `now − frame.tMs > MAX_INPUT_AGE_MS`, the input is stale: no deformation, no damage, no command confirmation. Immediately, not after the noHands text delay.
- Hold timers (gesture stability, raise, dwell) advance only on new valid observations. Reset on hand loss, stale input or epoch change.
- `epoch` increments on camera restart / resize / orientation change. Reset velocities and holds, and wait for new stable observations.

### Rule
`tracking/*` (except `handTracker.ts`) and `engine/*` never import three.js or touch the DOM, `Date.now()`, localStorage or audio. Time is passed in. Pure, unit-testable.

### Files and ownership
```
src/
  types.ts                 A  contract (attached). B requests changes, never edits
  config.ts                A  all constants with units (§10)
  main.ts                  B  bootstrap, both loops, wiring
  i18n.ts                  B  RU/EN strings; hint templates keyed by Hint.id (+ cause)
  tracking/
    handTracker.ts         A  MediaPipe wrapper, rVFC throttling, timestamps
    coordinates.ts         A  source → mirrored viewport px → world (pure)
    filters.ts             A  One Euro filter per trackId
    features.ts            A  hand association, calibration, features, quality → FrameInput
    gestures.ts            A  candidates, exclusivity, hysteresis, holds, near-miss
    recorder.ts            A  dev: record FrameInput sequences to JSON
  engine/
    controller.ts          A  implements CoreController: phase FSM, freshness gate, wiring
    contact.ts             A  two-wall contact check
    clay.ts                A  clay model, invariants, collapse/recovery
    rules.ts               A  rule conditions + episodes (begin/update/end)
    hints.ts               A  one current hint: priority, TTL, cooldown
    target.ts              A  target profile + similarity
    session.ts             A  stats, finalization → SessionResult
  browser/
    camera.ts              B  getUserMedia, video element, ProjectionParams from layout
    storage.ts             B  localStorage (schemaVersion 1, validate on load, try/catch)
  render/
    scene.ts, pot.ts       B  ortho camera, wheel, LatheGeometry from ClayState, band highlight, FX
    overlay.ts             B  mirrored video, hand landmarks from snapshot.input, cursor + dwell ring
    kiln.ts                B  glaze materials, firing animation
  ui/
    screens.ts             B  shows snapshot.phase (no second game state machine)
    tutorial.ts            B  step script: text, demo, sends `tutorialStep`, advances on snapshot events
    dwell.ts               B  pointing cursor + DwellTarget rects → AppCommand (one-shot)
    hud.ts, result.ts, gallery.ts  B
  audio/sound.ts, voice.ts B  best effort, never block the flow
  dev/
    mockCore.ts            B  fake CoreController (keys → snapshots) so B never waits for A
    debug.ts               A  feature/gesture/fps panel
tests/                     A  engine + coordinates tests
notebooks/tuning.ipynb     A  thresholds from recordings
docs/PLAN.md, docs/handoff/A.md, docs/handoff/B.md
```

## 5. Coordinates

MediaPipe normalizes x by image width and y by image height, so distances in those units are distorted. **Always convert to CSS pixels first**, then compute distances.

Source frame `Vw×Vh`, viewport `W×H`, MediaPipe point `(u, v)`:
```
s  = max(W/Vw, H/Vh)            // 'cover' (video fills the screen)
ox = (W − s·Vw)/2 ; oy = (H − s·Vh)/2
um = mirrored ? 1 − u : u        // mirror exactly once, here
xPx = ox + s·Vw·um ; yPx = oy + s·Vh·v
```
Screen → clay (shared `ProjectionParams`, B computes from layout, A consumes):
```
xWorld = (xPx − axisXPx) / pixelsPerWorldUnit
yWorld = (bottomYPx − yPx) / pixelsPerWorldUnit      // y up
currentTopPx = bottomYPx − clay.height · pixelsPerWorldUnit
```
B renders the pot with an OrthographicCamera set up so these exact numbers match on screen. Round-trip must match within 0.5 px (test T01).

**Palm size** = |wrist − middleMCP| in px. Calibration takes the median over ~0.8 s of both hands held still → `referencePalmSizePx`. It's a relative unit only: speeds in palms/s, pinch ratio in palms. No centimetres anywhere.

**Hand identity:** array order from MediaPipe is not identity. With 2 hands, compare both assignments to the previous palm positions and pick the smaller total movement. On a jump, overlap or re-detection: status `reacquiring`, velocity reset, `velocityValid = false` for the first frame back. Sort into `screenLeft/screenRight` **after** association. Don't use the handedness label for side or quality.

## 6. Gestures and contact

**Finger extension** (per index/middle/ring/pinky): `extension = clamp((min(anglePIP, angleDIP) − 90°) / 70°, 0, 1)`. Seed value, tune later. Fist = **all four** fingers below `FINGER_CURLED_ON`, not average openness.

**Decision order** (first match wins, with hysteresis): invalid/stale input → phase context → raise → point (only where UI is enabled) → both pinch → both fist → both open → none / justified near-miss. A new gesture must be stable for `GESTURE_STABLE_MS` before it takes effect.

| Gesture | Condition | Effect |
|---|---|---|
| shape | both hands open, not pinching/pointing, valid two-wall contact | local radii move toward target radius |
| pullUp | both pinch, **both** moving up | height up, walls thinner |
| pressDown | both fists (all 4 fingers curled), **both** moving down | height down, repair |
| raise | studio / final tutorial step only; both open above current top; held `HOLD_FIRE_MS` | one `finishShaping` command |
| point | index extended, others curled, not pinch; UI context | cursor; no shaping |

`motionStrength` = the **smaller** of the two hands' vertical speeds in the required direction, normalized by `FULL_MOTION_PALM_PER_S`, clamped 0..1. Zero if either hand isn't moving that way.

**Two-wall contact** (in world coordinates):
1. Both hands fresh and valid, and `left.xWorld < 0 < right.xWorld`.
2. `|left.yWorld − right.yWorld| ≤ HAND_LEVEL_TOL_WORLD`.
3. `yMean` is within the real pot height ± `VERTICAL_CONTACT_MARGIN_WORLD`. **Don't clamp first**, or a hand above the pot would shape the top band.
4. `bandY = clamp(yMean / height, 0, 1)`, `r = radii[band]`.
5. `|left.xWorld + r| < reach` and `|right.xWorld − r| < reach` (reach = `REACH_ON_WORLD` to enter, `REACH_OFF_WORLD` to stay).

Then `targetRadiusWorld = (right.xWorld − left.xWorld)/2`, `centerOffsetPalm = ((left.xWorld + right.xWorld)/2) · pixelsPerWorldUnit / referencePalmSizePx`.
Must-pass test: pot r=1, hands at x=0.1 and x=2.1 → **no contact**.

**Near-miss** only when there's evidence of an attempt: the tutorial's expected gesture, or e.g. one hand pinching, the other close to threshold, both moving up near the pot. Never suggest a gesture from a neutral pose. `notMoving` only during an explicit attempt.

**Commands:** raise and dwell each fire **once**, then require release (or a new screen) before firing again. Dwell resets when the cursor leaves the target, pointing stops, or tracking is lost.

## 7. Clay model

State: 48 outer radii (bottom → top), height, one thickness, wobble, damage[48], collapsed + cause. A controllable game approximation, nothing more.

**Invariants, enforced after every change** (tests T11):
```
MIN_R ≤ radii[i] ≤ MAX_R ; MIN_HEIGHT ≤ height ≤ MAX_HEIGHT
THICKNESS_FLOOR ≤ thickness ≤ min(MAX_THICKNESS, min(radii) − MIN_INNER_RADIUS)
0 ≤ damage[i] ≤ 1 ; 0 ≤ wobble ≤ 1 ; all finite
```
`THICKNESS_FLOOR` < `MIN_THICKNESS`, so the collapse threshold stays reachable.

**Shape** (valid contact only):
```
i = round(bandY·(N−1)) ; R = clamp(targetRadiusWorld, MIN_R, MAX_R)
w = exp(−0.5·((j−i)/SIGMA_BANDS)²) ; a = 1 − exp(−SHAPE_GAIN·w·dt)
radii[j] += clamp((R − radii[j])·a, −MAX_DR_PER_S·dt, MAX_DR_PER_S·dt)
```

**Pull / press** (only real movement counts):
```
newH = clamp(h + sign·RATE·motionStrength·dt, MIN_HEIGHT, MAX_HEIGHT); dH = newH − h
thickness −= THIN_PER_HEIGHT·dH ; radii[j] *= exp(−RADIAL_STRAIN_PER_HEIGHT·dH) ; h = newH
```
At the height limit, dH = 0, so pulling no longer thins the walls (T10). Press additionally repairs: thickness += `REPAIR_THICKNESS_PER_S·motionStrength·dt`, damage −= `REPAIR_DAMAGE_PER_S·motionStrength·dt`, wobble decays. This works even at MIN_HEIGHT.

**All rates are per second** (`exp(−k·dt)` decay). Nothing per frame.

**Collapse:** `maxStableHeight = min(MAX_HEIGHT, STABILITY_FACTOR · mean(bottom third of radii))`. Enters **once** when thickness < MIN_THICKNESS (`thinWall`) or height > maxStableHeight (`tooTall`). One-time sag: height → max(MIN_HEIGHT, 0.7·height), upper half smoothed. While collapsed, only pressDown and restart act. It clears when thickness ≥ MIN_THICKNESS + margin, height ≤ maxStableHeight − margin, wobble ≤ max, and ≥ `RECOVERY_ACTIVE_MS` of real pressing has accumulated (T12).

**Overhang:** `slope[j] = (radii[j] − radii[j−1]) / (height/(N−1))` > `OVERHANG_SLOPE_WORLD` → smooth that transition, rate-limited. Never push it further outward.

**Renderer boundary:** spin, highlights, particles, crack decals and shake are visual. Anything that changes radii/height/thickness/collapsed happens in the core, so the score always judges what the user sees.

## 8. Error mode (20 points)

**Categories:**
- `execution`: user's mistake with valid input (tear, wobble, tooThin, collapse, overhang). These are counted and shown in the result.
- `tracking`: noHands, oneHand, trackingUncertain. Deformation is paused. **Not the user's fault**, counted separately.
- `coaching`: targetMismatch, handsTooFar/offWheel, near-miss. Guidance only, no damage.

**Episodes, not frames:** every rule runs `inactive → pending (enter delay) → active → clearing (RULE_CLEAR_MS) → inactive`, emitting `begin` / `update` / `end` with a stable `episodeId`. Stats count **begins only**. 3 s of continuous wobble = 1 episode (T13). Sounds play on `begin`. One-time consequences (collapse sag) apply on `begin`, continuous ones with dt.

| Type | Condition | Consequence | Hint (RU) |
|---|---|---|---|
| tear | valid deformation and speed > TEAR_SPEED for TEAR_ENTER_MS | damage + small thinning, per second | «Слишком быстро на отмеченном участке — веди руки медленнее, держи их у стенок» |
| wobble | contact and \|centerOffsetPalm\| > WOBBLE_TOL for WOBBLE_ENTER_MS | wobble grows per second | center right: «Смести обе руки влево — середина между ними должна совпасть с осью круга» (mirror text for left) |
| tooThin | pulling, thickness within TOO_THIN_MARGIN of MIN_THICKNESS | warning glow | «Стенка стала слишком тонкой — хватит тянуть вверх, сожми кулаки и веди руки вниз» |
| collapse/thinWall | thickness < MIN_THICKNESS | one-time sag | «Сосуд осел из-за тонкой стенки — сожми кулаки и веди руки вниз, чтобы восстановить» |
| collapse/tooTall | height > maxStableHeight | one-time sag | «Сосуд слишком высокий для такого основания — опусти его кулаками вниз» |
| overhang | slope too steep at a band | limited smoothing | «На отмеченном участке стенка слишком резко расширяется — сузь его или расширь участок ниже» |
| handsTooFar | shaping attempt, a specific hand not at its wall | none | «Поднеси правую руку к правой стенке» (only the wrong side) |
| oneHand | two-hand action, one hand missing > 700 ms | pause | «Не вижу вторую руку — разведи кисти, чтобы камера видела обе» |
| noHands | no hands > 1500 ms | pause | «Покажи обе руки камере» |
| targetMismatch/tooWide/tooNarrow | signed radius delta beyond tol at worst band | none | «На отмеченной высоте сосуд шире образца — сведи руки» / «…уже образца — разведи руки шире» |
| targetMismatch/tooLow | height below target | none | «Сосуд ниже образца — щипком обеими руками потяни вверх» |
| pinchLoose / fistLoose | justified attempt, grip not closed | gesture not accepted | «Сведи большой и указательный пальцы плотнее на отмеченной руке» / «Сожми пальцы в кулак на отмеченной руке» |
| handsTooLow | finish attempt, palms below the current top | not finished | «Подними обе открытые ладони выше сосуда и удерживай» |

A speed ratio like "×2 faster than allowed" is fine to show. Never present it as real-world advice.

**Hint priority:** invalid input → collapse recovery → tear → wobble → tooThin/overhang → near-miss → target coaching. One hint at a time. It expires (`HINT_TTL_MS`) or disappears when its cause clears. Cooldown only limits repeated speech, never hides a more important new hint. Speech is replaced, not queued.

**Tutorial:** same recognizer, same rules, same thresholds. The step completes only on `valid calm contact → real speed mistake → real begin(tear) → slow down → end(tear)`. No fake tears, no easier thresholds. Tutorial mistakes stay in the tutorial session: a new sessionId for the next mode (T17).

## 9. Target, similarity, result

Target «Ваза»: height 1.8, radii linearly interpolated over relative height u: `0.0→0.95, 0.2→1.10, 0.6→0.90, 1.0→0.65`. Validate it, and check it's actually reachable with the controls.

```
resample both on the same u grid (u = y/height); radii are NOT divided by height
radialError  = Σ|r−t| / Σt
heightError  = |h − h_t| / h_t
score = clamp(100·(1 − radialError) − 100·HEIGHT_SCORE_WEIGHT·heightError, 0, 100)
```
Also return `signedRadiusDeltaWorld` (+ = too wide) and `signedHeightDeltaWorld` for hint direction (T15). Damage isn't a hidden score penalty. It's shown separately.

**Finalization:** on `finishShaping`, freeze clay, copy the profile and stats. Glaze choice doesn't change the shape. After firing, create one `SessionResult` (copies, not live arrays). `completedAtIso` comes from the browser adapter. Repeated renders, raises or saves don't create new results (T18, T19).

**Storage:** `SessionResult` with `schemaVersion: 1`, Float32Array → plain arrays, validate on load, try/catch, keep working in memory if storage fails. "Best scores" are **local to this browser**, commission only, same target id + version.

## 10. `config.ts` (starting values, units in names)

```
// geometry (game units)
N_BANDS 48 · MIN_R 0.25 · MAX_R 1.6 · MIN_HEIGHT 0.6 · MAX_HEIGHT 3.2
INIT_HEIGHT 1.2 · INIT_RADIUS 1.0 · INIT_THICKNESS 0.35 · MAX_THICKNESS 0.35
MIN_THICKNESS 0.08 · THICKNESS_FLOOR 0.02 · MIN_INNER_RADIUS 0.02
// contact
REACH_ON_WORLD 0.50 · REACH_OFF_WORLD 0.65 · HAND_LEVEL_TOL_WORLD 0.30
VERTICAL_CONTACT_MARGIN_WORLD 0.10 · RAISE_MARGIN_WORLD 0.15
// rates (per second, or per unit of actual height change)
SHAPE_GAIN 3.0 · SIGMA_BANDS 4 · MAX_DR_PER_S 0.8 · PULL_RATE 0.6 · PRESS_RATE 0.6
THIN_PER_HEIGHT 0.1 · RADIAL_STRAIN_PER_HEIGHT 0.08
WOBBLE_GROWTH_PER_S 0.5 · WOBBLE_DAMPING_PER_S 4.0
DAMAGE_PER_S 0.25 · TEAR_THICKNESS_LOSS_PER_S 0.03
REPAIR_THICKNESS_PER_S 0.05 · REPAIR_DAMAGE_PER_S 0.40
// stability (game values)
STABILITY_FACTOR 3.0 · OVERHANG_SLOPE_WORLD 3.13 · TOO_THIN_MARGIN 0.03
RECOVERY_THICKNESS_MARGIN 0.03 · RECOVERY_HEIGHT_MARGIN 0.10 · RECOVERY_WOBBLE_MAX 0.25 · RECOVERY_ACTIVE_MS 500
// hand features (tune from recordings)
PINCH_ON 0.35 · PINCH_OFF 0.45 · FINGER_CURLED_ON 0.35 · FINGER_CURLED_OFF 0.45
FINGER_OPEN_ON 0.60 · FINGER_OPEN_OFF 0.50
MOTION_ON_PALM_PER_S 0.40 · MOTION_OFF_PALM_PER_S 0.15 · FULL_MOTION_PALM_PER_S 1.5
TEAR_SPEED_PALM_PER_S 6.0 · WOBBLE_TOL_PALM 0.35 · WOBBLE_CLEAR_TOL_PALM 0.25
// time
INFERENCE_MAX_HZ 30 · MAX_STEP_S 0.05 · MAX_INPUT_AGE_MS 200 · GESTURE_STABLE_MS 120
REACQUIRE_MS 150 · CALIBRATION_STILL_MS 800 · HOLD_FIRE_MS 1500 · DWELL_MS 900
TEAR_ENTER_MS 120 · WOBBLE_ENTER_MS 500 · RULE_CLEAR_MS 250
HINT_COOLDOWN_MS 3500 · HINT_TTL_MS 4000 · TARGET_HINT_INTERVAL_MS 3000
// score
HEIGHT_SCORE_WEIGHT 0.35 · TARGET_RADIUS_TOL_WORLD 0.05 · TARGET_HEIGHT_TOL_WORLD 0.08
// filter
ONE_EURO { minCutoff 1.0, beta 0.02, dCutoff 1.0 }
```
Change thresholds only after looking at recordings. Never loosen the stale-input gate to hide slow inference.

## 11. Phases (core-owned) and UI

```
loading → permission → calibrate → menu
menu → tutorial → menu
menu → studio(free|commission) → glaze → firing → result → gallery / menu
```
| Phase | Shaping | Point/dwell | Raise | Core changes |
|---|:-:|:-:|:-:|---|
| menu | no | yes | no | starts a session |
| tutorial | only in the matching step | allowed actions | final step only | tutorial progress, separate stats |
| studio | yes, with valid contact | "start over" button | one finishShaping | clay + stats |
| glaze | no | yes | no | glazeId only |
| firing | no | no | no | timer → result |
| result / gallery | no | yes | no | nothing is deformed |

The controller owns phases. `ui/screens.ts` only **shows** `snapshot.phase`. The tutorial script (B) owns texts and demos, sends `tutorialStep` with the expected gesture, and advances on snapshot events.

**Permission and audio:** the browser's camera prompt can't be answered by a gesture. The permission screen has **one real "Start" button**, clicked before tracking exists. That click also unlocks audio and speech. README wording: "After the system camera permission, the whole scenario and in-app navigation are controlled by gestures." Voices come from `getVoices`/`voiceschanged`. If there's no ru-RU voice, text hints still work.

## 12. Build order, gates and tests

| When | A (Yerassyl) | B (teammate) | Gate |
|---|---|---|---|
| now–16:00 | `types.ts`, `config.ts`, `coordinates.ts` + T01/T02 | Vite scaffold, Vercel deploy, `camera.ts` + ProjectionParams, `mockCore.ts` | **M0:** prod URL shows camera, mirror/crop correct |
| 16:00–19:30 | handTracker, features (association, calibration), gestures (shape), contact, clay shape, controller skeleton | ortho scene, pot from ClayState, overlay (video + landmarks), band highlight, everything driven by mockCore | **M1 checkpoint 19:30:** real hands shape the pot; same gap with both hands on one side does nothing; hand loss stops shaping instantly. **3D vs 2.5D decided here** |
| 19:30–23:00 | pull/press, invariants, rules + episodes, collapse/recovery, hints, near-miss | screens, dwell, HUD hint banner, i18n hint texts, sound + voice, tutorial script | **M2+M3:** 3 gestures distinct; tear/wobble/collapse can be caused, fixed, and end; 3 s wobble = 1 episode |
| 23:00–02:00 | phases in controller, target + similarity, session + finalization | glaze, firing, result screen, storage, gallery | **M4:** full `tutorial → commission → glaze → result` on the deployed URL |
| 02:00–08:00 | sleep | sleep | |
| 08:00–11:00 | recordings, threshold tuning, fixes | free mode wiring, polish, phone check, PNG export | **11:00 feature freeze** |
| 11:00–13:00 | README recognition + error sections, unit tests green | README top, GIF, test 3+ devices | |
| 13:00–14:30 | fixes only | fixes only | **submit by 14:30** |

**Unit tests (A, Vitest), must pass:** T01 coordinate round-trip ≤0.5 px · T02 16:9 vs 4:3 gives the same features for the same pixel geometry · T05 hands at 0.1/2.1 with r=1 → no contact · T06 hands above/below the pot don't shape the edge band · T10 pull at MAX_HEIGHT doesn't thin · T11 1000 random actions → invariants hold, no NaN · T12 collapse once, presses recover it without restart · T13 long wobble = 1 episode, clear + new = 2 · T15 wide vs narrow get opposite advice · T16 identical profile = 100, height change lowers score · T17 tutorial tear doesn't count in the next session · T18 gestures after finishShaping don't change the result.

**Manual checks (both):** hand loss/return causes no tear · pinch isn't read as shape, point isn't read as fist · long raise/dwell fires once · `?dev=1` on production does nothing · no audio/storage → flow still completes · **T22:** each of you completes 3 gestures, a deliberate mistake, the fix and the final result without a mouse on the deployed URL.

## 13. Team rules and handoff notes

**Git:**
- Commit small and often to `main` (the jury reads the history), and `git pull --rebase` before every push.
- Prefix commits with the area: `engine: tear episodes`, `render: band highlight`.
- Edit only files you own. Contract changes go through A. B asks in the handoff log.
- Commit before every big change. Never rewrite a whole file or refactor across ownership.
- No secrets, `.env` or video recordings in the repo. Landmark JSON is fine.
- Dev tools only behind a compile-time gate:
  ```ts
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('dev') === '1') {
    const { installMockCore } = await import('./dev/mockCore'); installMockCore();
  }
  ```

**Handoff logs = how we talk through the repo.** Each person has one file and **only writes to their own**, so there are never merge conflicts:
- `docs/handoff/A.md`: written by A, read by B
- `docs/handoff/B.md`: written by B, read by A

At the **end of every task**, add an entry **at the top** of your file and commit it with the code (`handoff: …`). At the **start of every task**, `git pull` and read the other person's latest entries first.

Entry format:
```md
### 2026-09-29 18:40 · A · M1 contact + shape
**Done:** two-wall contact, shape step, controller.observe wired. Tests T05, T06 pass.
**Contract changes:** none | `types.ts`: added X (why)
**For you (B):** real controller ready: replace mockCore in main.ts with `createController(config)`.
**Blocked / need from you:** ProjectionParams.axisXPx seems off by ~20px on resize. Can you check camera.ts?
**Known issues:** pinch flickers in low light, tuning tomorrow.
**Next:** pull/press + invariants.
```
Keep entries short. Urgent blockers still go by message, but always write them in the log too, so we both see them.

## 14. README / submission checklist
- Team name exactly as registered, public repo, working HTTPS link, `npm i && npm run dev`, GIF at the top.
- KILN explained as a browser game model, not a measurement of real clay.
- Table of the 3 shaping gestures + raise + point/dwell navigation.
- Error-mode table: measured condition → consequence → fix. How to trigger a mistake and fix it. Tutorial uses the real rules.
- Own logic: features, association, two-wall contact, gesture grammar, clay model, episodes, similarity score.
- No server, the camera never leaves the browser.
- Camera permission needs one real click. Audio is best effort.
- Gallery and best scores are local only.
- Only devices/browsers you actually tested. Phone "supported" only if checked.
- `npm run build`, typecheck and tests pass. Production has no mock.
- Libraries and assets listed. Pre-existing code declared honestly.
- No unverified claims (fps, centimetres, "trained on N sessions" unless it's true).
