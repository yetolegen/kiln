# V7 studio follow-up — Free Mode and reference/commission mode

User confirmed V5.3, then reported inconsistent under-base lift, insufficient flattening, sagging instead of a wall rupture, and accidental confirmation controls. Core stays with A. B implements UI gating and tests; no core source edits.

## A: supported under-base lift

- One hand supports either side wall. The active hand begins horizontally underneath the base, with its edge under the clay. Either hand assignment works.
- Retain the previously requested 3-second still hold and visible activation progress; the latest report does not revoke that requirement. Then slow upward travel increases height continuously.
- Inspect actual palm/landmark geometry. Current `isHorizontal` accepts either a wrist→middle-MCP angle within 50 degrees of horizontal OR a shortened vector (< .55 palm size), and `inLiftZone` accepts a palm centre up to .3 world ABOVE the base (larger for large hands). Those permissive checks do not establish an edge underneath the base.
- An already armed lift checks its lower Y bound but not horizontal overlap with the clay. An active hand at x=3 still lifts a radius-1 pot. Cancel on sideways withdrawal, bad orientation, lost support/input, or changed roles; fresh arming is required after cancellation.
- Keep palm-size scaling without permitting unrelated near-object movement. Do not use rendering offsets as a recognition fix. B requested a real screenshot/recording because 2-D synthetic landmarks cannot establish which physical palm-edge view the user presents.

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

`npm test -- src/ui/studioV7.test.ts`: 20 cases, 6 pass / 14 fail before A's fix.

- Passing: supported horizontal hand at y=-.15, full hold and rise, both modes/roles (4); existing permanent freeze for every shaping action, pancake and wallTorn (2).
- Failing: flat hand starts above base y=.25 and still raises 1.2→1.429 (4); armed hand moves to x=3 and still raises 1.2→1.429 (4); pressure freezes at .695833 instead of <=.24 (4); opening clamp prevents threshold tear (1); thin-wall state becomes recoverable sag instead of wallTorn (1).
- Lift/flattening cases use the real controller and synthetic HandFeatures; thickness cases isolate the actual pure clay model. Renderer tests inspect real mesh topology/coordinates. None are physical-camera acceptance.
- Run `npm test -- src/ui/sculptingLock.test.ts src/render/scene.test.ts` for B's UI lock/visual geometry checks. Existing V6 regressions remain in `src/ui/interactionV6.test.ts`.
- After core integration: verify both modes/roles, threshold boundaries, local damage, every post-failure action, restart, save/bounds compatibility, and continuous supported shaping → release → fresh Done dwell. Then deploy and perform physical-camera retest.
