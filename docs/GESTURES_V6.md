# V6 interaction corrections (2026-09-30)

User's follow-up after V5.2: vertical compression at lesson 5/6 fails, previous-step hints appear, thumb depth lacks a target/control, withdrawal changes the shape, and wall thinning is hard to see. Exactly the existing five pottery functions remain; UI palm dwell must be preserved. A retains core ownership; B's previous authorization to fix external compression was a specific completed task.

**Later physical correction (14:35 screenshot):** user says compression works. Supplied screenshot visibly says **Цель 6/6** with **tracking lost**, proving compression passed and the tutorial is waiting for the finish gesture, not further pressing. This supersedes the earlier physical claim that step 5 could never arm. B found/fixed the final `lessonFeedback` fallthrough that could advise pressing while raise was recognized, made the finish instruction prominent, and moved advice above the heading. The synthetic V6 core failures below remain valid but must not be presented as the diagnosis of that screenshot. Frontend-only V5.3 can ship these presentation corrections with unchanged core; it is not a completed V6 interaction release.

## Evidence and acceptance regressions

Run `npm test -- src/ui/interactionV6.test.ts`.

Ten failures reproduced through the real controller with synthetic HandFeatures (not physical camera verification):

| Case | Current result | Required result |
| --- | --- | --- |
| Thumb tip descends .15 world with stationary palm, either hand | Depth remains 0 | Continuous positive depth |
| Slow whole-hand thumb insertion, first deformation | Instant .12 depth jump | Small continuous increments; no jump to a fixed depth |
| Shape radius to .85 then withdraw outside palms, either assignment | Radius increases to ~1.45 | No geometry changes during withdrawal |
| Rim armed, descend .05 palm/s for ~6 seconds, either hand | Height remains 1.2 | Height decreases by >.1 in this stroke |
| Lesson expects compressRim, hand at base | Core nearMiss intended pullUp / holdStill | Only current-step technique coaching |
| Switch opening to rim lesson; flat palm keeps the same .7 thumb/index span, either hand | Old open engagement persists | Rim hold arms compressRim |

Two additional controls pass: supported pinch-spread increases the cavity, decreases both actual wall/floor thickness, and reduces the real lathe-profile wall width while keeping outer radii stable. This relationship already exists; preserve it. **User clarified: in step 5/6 the activation circle never fills**, while holding the flat palm above the rim and a support hand at the side. This is a pre-arming failure; the low-speed reproduction alone does not explain it. B requested a screenshot with hands/current hint to distinguish orientation, rim-zone, support and retained-engagement failures. No numerical real-hand capture received yet.

## A: core corrections

### 1. Vertical compression

Keep a flat active palm over the rim, support at a side wall, either assignment, brief hold. Then actual downward travel reduces height and redistributes the same clay geometry. Stationary palm stops movement; no simulated force from a held pose. Camera movement is the pressure proxy, not measured physical pressure.

`STEP.compressRim` currently drops all descent below `COMPRESS_MIN_PALM_PER_S = .1`; controlled .05 palm/s never acts. Use filtered positional descent with an accumulated jitter threshold so slow real movement eventually acts without drift from still hands. Preserve deliberate arming, support and freshness gates. Fast movement should produce an actionable compression-specific warning rather than silently resetting. Rebase on release, role/context change, stale input and reacquisition. The visible geometry must stop when the lesson freezes at its target; retain overshoot and pancake failures.

Test arming, .05 palm/s and ordinary-speed descent, stopping/reversing, lost support/tracking, previous `open` engagement followed by `compressRim`, and both roles. Do not let a retained opening engagement swallow a flat-palm compression attempt after a tutorial transition. B's existing full-flow test works at .5 palm/s and already validates compression geometry.

### 2. Continuous thumb-tip insertion and speed

`STEP.indent` currently integrates **palm** velocity, not landmark 4 travel. `stepClay` initially assigns fixed `INDENT_DEPTH_WORLD = .12`. Replace this with thumb-tip world displacement relative to contact and its maximum insertion during the engagement. Finger flexion with a stationary palm must act. No phantom deepening from wrist/palm movement while the tip is still; no repeated deepening from withdrawing and returning to the same deepest point. Jitter filtering must not become an .08 dead zone followed by a .12 jump.

Use `safeIndentDepthWorld` as the explicitly communicated, calibrated approximately-one-phalanx depth. Increase cavity depth smoothly with real insertion; derive floor from height minus depth. Slow insertion reaches any intermediate depth. Past the safe reference -> thin-floor warning; continued excessive insertion -> permanent through-hole with zero floor. Apply in every mode. Deeper cup cavities should remain available through supported opening/deepening; the initial thumb dent's safe reference is not a global cap on all cavity depth.

Measure thumb-tip speed, including relative motion with a stationary wrist. Reject a fast insertion before applying a large depth jump, latch a clear slowdown/re-arm hint, and require a fresh controlled contact. Please expose a distinct typed reason such as `indentTooFast` (and compression-specific equivalent) rather than reusing lift instructions. B will integrate final names once pushed. Test slow/still/fast, half/full phalanx, over-depth/hole, withdrawal/re-insertion, repeated frames and both roles.

### 3. Explicit release for exterior palms

New user priority supersedes the earlier OPTIONAL outward-widening behavior. The same outward movement cannot unambiguously mean both widening and withdrawal. Choose exterior palms as **inward pressure only**, with outward withdrawal releasing immediately. Internal pinch-spread remains the cavity expansion action, so no sixth function is added.

On outward movement beyond filtered numerical jitter, stop shape deformation on that observation and latch release while hands depart. Do not widen the profile while waiting to exceed `REACH_OFF`; the current moving wall chases the withdrawing palms. A new stable contact followed by inward travel starts a new stroke. Require an actual disengagement/re-arm condition so hovering or oscillating outside does not resume accidentally; no clay changes during approach/acquisition. Support one-hand withdrawal as release too. Missing tracking, wrong pose and leaving the height band stop shaping. Rebase the motion reference each new engagement.

Update the earlier outward-widening expectations in `tests/externalCompression.test.ts` to this new requirement; keep `src/ui/externalCompression.test.ts` inward/cavity regressions green. Test single/both-hand withdrawal, early and late release, reacquisition, duplicate frames and loss.

### 4. Lesson context and geometry

`runAction` currently tries/continues every action even when the tutorial requests another, and `findNearMiss` returns latched/active-action guidance before checking the expected step. `tutorialStep` resets only the shape reference. Clear action engagement, latched near-misses and technique hint state at actual step/context changes; only recognize/coach the expected tutorial action. Preserve live tracking and physical damage warnings. B now filters displayed technique by the current step and cancels old speech, but the core should stop generating wrong-step instructions too.

Preserve the actual wall formula: minimum outer radius around the cavity minus inner radius. Floor = height minus cavity depth. Opening speed/duration must still produce too-thin/tear consequences; tutorial width overshoot must fail. The current game model is **not volume-conserving**. If improving material redistribution for height/cavity changes, define the approximation explicitly and report revised geometry equations to B so intermediate targets match achievable shapes. Do not add cosmetic wall thinning independent of those dimensions.

## B: implemented in this handoff

- `LessonHints`: scopes technique coaching to session/step and current nearMiss intended action; drops previous-step/unscoped technique, preserves tracking/damage conditions. Context changes cancel old speech. Generic notMoving speech uses only current-step instructions.
- Tutorial feedback/speech caches clear at step/session changes; hiding/re-entering a lesson resets its display context.
- Thumb lesson explains the cyan target floor and yellow one-phalanx safe limit. Overlay draws that limit from `safeIndentDepthWorld`.
- Actual cavity cross-section now shown in tutorial AND studio, with wall fill bounded by the actual inner/outer profiles and live cavity-depth / wall-width proportions. No clay state or mesh dimensions are fabricated.
- New real-controller core acceptance tests plus hint/speech regression tests. Working UI dwell untouched.

## Integration / verification

Core acceptance tests intentionally remain red until A implements the changes. B must not describe the physical interactions as fixed or deploy a complete V6 before they pass. Then update affected mock/tutorial targets to A's confirmed contract, run full tests/build and browser lesson/voice/geometry checks, deploy an identifiable version, and request physical testing on the user's Chrome / Acer Nitro 5 AN515-58. Physical test must cover both assignments, safe withdrawal, thumb-only motion, very slow press and dangerous speed/depth.
