# V7 studio follow-up — Free Mode and reference/commission mode

**Current status:** implemented by A in `f9a60c9` with V6 follow-up `967c248`, integrated/deployed by B as **V7.0** (`b0f7ca4`). All 32 tests in `studioV7.test.ts` now pass. The failure counts below describe the original reproductions before those fixes. Physical-hand retest remains pending.

User confirmed V5.3, then reported inconsistent under-base lift, insufficient flattening, sagging instead of a wall rupture, and accidental confirmation controls. Core stays with A. B implements UI gating and tests; no core source edits.

## A: stable supported lift — revised after user's clarification

- **Latest user correction:** current hand placement is acceptable. Preserve the accepted palm orientation/placement; do not tighten the base zone or remove the currently accepted y=.25 placement. The reported problem is small fluctuations resetting the action, and an initialized action sometimes producing no deformation. This supersedes the original strict under-base acquisition request below and the previous y=.25 rejection test.
- One hand supports either side wall and the other holds the currently accepted horizontal base pose. Either hand assignment works.
- Retain the previously requested 3-second still hold and visible activation progress; the latest report does not revoke that requirement. Then slow upward travel increases height continuously.
- Current orientation cutoff is 50 degrees with no separate continuation threshold. A 48→52→48 degree one-frame fluctuation erases ~2 seconds of arming progress. Add continuation hysteresis/bounded pause for minor fluctuations rather than tightening acquisition. Preserve existing foreshortened-hand support.
- Arming resets the entire timer whenever speed reaches .35 palm/s. One 33 ms .36 palm/s fluctuation resets progress from ~70% to ~1%. Pause accumulation on isolated questionable samples; cancel/re-arm on sustained motion, clear departure, genuine tracking loss, changed roles or missing support. Grace must be bounded and must not accumulate hold or deform clay from stale/uncertain input.
- After full arming, `LIFT_MIN_PALM_PER_S=.15` discards steady .05 palm/s upward travel: after ~6 s the hand has risen ~.165 world but height remains 1.2. Use reliable cumulative displacement/jitter handling to recognize sustained slow upward motion; do not blindly integrate position noise or add a visual lift. Test stationary jitter for no net growth and actual slow displacement for positive geometry change. Rebase displacement after any gap so resuming cannot jump.
- An already armed lift checks its lower Y bound but not horizontal overlap with the clay. An active hand at x=3 still lifts a radius-1 pot. Cancel on sideways withdrawal, bad orientation, lost support/input, or changed roles; fresh arming is required after cancellation.
- Keep current palm-size scaling and recognition positions. B's screenshot request is optional now: user explicitly confirms placement is acceptable. The synthetic cases identify code failure mechanisms, not a measured calibration of the user's camera.

## A: terminal flattening at 20%

- Reference height is the valid session's initial normalized clay height, fixed across lifting/compression. Current initial height is 1.2, so 20% is .24 world. A custom initial height must scale the threshold instead of using current height as its own denominator.
- Allow smooth pressure down to that threshold. Current `MIN_HEIGHT=.6` and terminal `PANCAKE_HEIGHT_WORLD=.7` prevent it: the test freezes at .695833 (~58%). Update both compatible bounds and relevant rules/tests; preserve safe finite geometry.
- At or below 20%: terminal `pancake`, almost flat geometry with a closed cavity, no further sculpting/recovery, cause preserved, restart clears the failure. Redistribution should remain in the shared clay model.

## A: terminal local wall tear at 10%

- Use a fixed original valid wall-thickness reference, not the changing current wall as its own denominator. Acceptance fixtures use the default session's initial normalized thickness (1.0), hence .10 world. If a different reference is needed for custom initial pots, expose/document it and preserve consistency with the UI.
- Increasing cavity radius decreases actual wall thickness. Permit the 10% threshold to be reached: the current `OPEN_MIN_WALL_WORLD=.12` prevents normal opening from reaching it.
- At or below 10%, fail as `wallTorn`, mark the critically thin cavity band/neighborhood with rupture damage, preserve height/profile except actual deformation, and freeze permanently. Do not route through recoverable `thinWall` plus `sag()` (currently multiplies height by .7).
- Keep existing time-based stretching warning/damage behavior, but a geometric tear may occur first. The first permanent cause wins. No unrelated whole-object downward animation; do not mark every band as torn when only a local band is critically thin.
- Existing renderer already removes triangles in damaged cavity bands at damage >= .65. B's new renderer checks prove a local tear preserves vertex height, and .24-height pancake geometry is distinct. Supply real core geometry/damage, not a cosmetic deformation.

## B: completed interaction-time UI lock

- Free/commission Done and restart disabled during fresh usable contact, deformation, or active one-hand arming/engagement. Stationary contact remains active.
- Disabled buttons are excluded from dwell targets and guarded against queued/programmatic activation. Target revision changes reset accumulated dwell.
- Re-enable after 400 ms of fresh, distinct disengaged observations, including reliably observed hand absence. Stale/ambiguous input cannot unlock; brief gaps do not flash buttons back on. Session/phase changes reset state.
- Menu and sound controls stay available. Terminal damage exposes restart immediately and keeps Done disabled. Working palm/index navigation remains unchanged.
- This UI state consumes core interaction state: A must reliably clear engagement on physical release. It does not fix the pending V6 deformation-during-withdrawal bug.

## Reproduction and verification

`npm test -- src/ui/studioV7.test.ts`: revised 32 cases, 10 pass / 22 fail before A's fix.

- Passing: supported horizontal hand at y=-.15 and the existing y=.25 placement, full hold/rise, both modes/roles (8); existing permanent freeze for every shaping action, pancake and wallTorn (2).
- Failing: one-frame 4-degree orientation fluctuation erases progress (4); one-frame .36 palm/s speed fluctuation resets hold (4); fully armed slow rise .05 palm/s produces no height change (4); armed hand moves to x=3 and still lifts (4); pressure freezes at .695833 instead of <=.24 (4); opening clamp prevents threshold tear (1); thin wall becomes recoverable sag instead of wallTorn (1).
- Lift/flattening cases use the real controller and synthetic HandFeatures; thickness cases isolate the actual pure clay model. Renderer tests inspect real mesh topology/coordinates. None are physical-camera acceptance.
- Run `npm test -- src/ui/sculptingLock.test.ts src/render/scene.test.ts` for B's UI lock/visual geometry checks. Existing V6 regressions remain in `src/ui/interactionV6.test.ts`.
- After core integration: verify both modes/roles, threshold boundaries, local damage, every post-failure action, restart, save/bounds compatibility, and continuous supported shaping → release → fresh Done dwell. Then deploy and perform physical-camera retest.
