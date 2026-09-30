# Updated interaction specification — user request, 29 September 2026

This specification supersedes the old two-pinch pull and two-fist press controls in PLAN v3. Exactly five pottery functions are available: basic side shaping plus the four actions below. Point/dwell and finishing are navigation, not pottery functions.

## Action definitions before implementation

All asymmetric actions support either active hand. Role assignment follows persistent track identity, never MediaPipe array order or a fixed left/right label. The supporting palm must remain near either real side wall and within the pot's current height. Reliable fresh observations of both hands are required for deformation.

1. **Lift:** open horizontal active hand near the base, support hand at a side wall. Accumulate 3 seconds of distinct valid still observations; show the hold ring and countdown. Only then permit very slow upward active-hand motion to increase height. A brief pass, early upward motion, excessive speed, changed active hand, lost support, stale input or tracking loss never raises the pot. Breaking activation conditions resets the hold. Release re-arms a new lift.
2. **Initial indentation:** support at a side wall; active thumb points downward with its tip at the center of the top surface. A short downward thumb movement creates one shallow, narrow indentation, bounded independently of opening/deepening. Holding or re-entering cannot turn it into a deep cavity.
3. **Widen/deepen:** requires an existing indentation. Support at a side wall; active thumb and index begin pinched inside the opening. After the pinch is acquired, slowly separate them; increasing span smoothly increases cavity radius and depth within limits that preserve a floor and wall thickness. Starting with spread fingers, thumb-down poking, unsupported gestures, stale positions and abrupt spreading do not open the pot. Release/disengagement stops the action and requires a fresh pinch.
4. **Compress/smooth rim:** supporting hand at a side wall; active open horizontal hand just above the rim, fingers extended (not thumb-down or a pinch). Hold for 0.5 seconds to establish intent, then move slowly down. Smooth and strengthen the upper profile and reduce local damage gently, with bounded vertical compression. Stop on release, upward/fast motion, leaving the rim, support loss or unreliable tracking. This replaces the old generic two-fist press. The final duration follows A's `COMPRESS_HOLD_MS` contract.

**Research:** [Clayground: Beginnings on the Wheel Part 1](https://www.clayground.net/post/beginnings-on-the-wheel-part-1-how-to-center-open-your-clay), cylinder instructions 4 and 11, describe rim compression and smoothing. The selected camera gesture is an interaction design adaptation, not a claim to measure physical pressure. [Saturday AM Pottery: Opening Tutorial](https://saturdayampottery.com/opentut.htm) also describes supporting the outside while opening and compressing the top edge. The user's shallow initial indentation remains intentionally shallower than a full physical opening.

## Tracking, feedback and lessons

- Index fingertip is the dwell pointer. A trusted one-hand pointer is valid even though `inputUsable` currently denotes two-hand shaping validity. Freshness and source-frame checks remain mandatory; latch until leave/release/screen change.
- Smooth only the displayed landmarks. Retain/fade the last stable drawing briefly on interrupted tracking; never send cached landmarks back into deformation. Indicate that clay is paused, then ask the user to reposition.
- Display one prominent instruction explaining the missing condition (pose, support, activation hold, location or speed). Distinguish tracking failure from technique. Optional voice uses the same message and replacement/cooldown behavior.
- Six tutorial steps: basic shaping, lift, shallow indentation, opening/deepening, rim compression, finish. Completion requires accepted action and its relevant shape change. Require a release between steps; update counter, text, demo and completion feedback together. Deliberate wrong gestures remain test cases, not additional pottery functions.
- Explicit cavity radius/depth in the clay/result contract; initial clay is solid. Renderer, PNG and gallery depict the same cylindrical cavity used by the core. Validate old saves and migrate schema 1 as solid (0/0), deriving thickness from the silhouette, as specified by A.

## Core handoff (A remains the owner, confirmed by user)

A implemented the contract in `6e53ff9`; B now consumes these fields in rendering, tutorial, coaching and storage. Recognition thresholds remain untuned on real hands. The agreed interface is:

- Reuse `pullUp` for the new armed lift; introduce `indent`, `open`, `compressRim` gestures. Retire old two-pinch/two-fist activation. Extend tutorial expectedGesture and gesture statistics accordingly.
- Add explicit `cavityRadiusWorld` and `cavityDepthWorld` to ClayState and SessionResult; initial clay has 0/0. Core owns all bounds and deformation. B can migrate legacy stored profiles that lack these fields.
- Expose active/support track ids and 0..1 activation progress on GestureState. Preserve both hand assignments.
- Emit actionable Hint/NearMiss reasons for missing support, 3-second base hold, lifting too fast, horizontal pose, thumb-down/top contact, missing indentation, initial pinch, spreading too fast and rim placement. B will add the Russian text and use the existing stable-hint speech contract.
- Send accepted action/progress in snapshots, not fake tutorial events. B's revised six-step lesson will require actual shape change and release between steps.
- Keep stale/reacquiring/ambiguous input from deforming. B's 350ms visual retention is strictly in render/handVisuals.ts; it is never fed to the core.

## Verification

Tests must cover both active-hand assignments, short versus 3-second holds, duplicate observations, stale data, interrupted support, pose conflicts, bounded cavity changes, lesson release gates, actionable coaching, dwell one-shot behavior and persistence/rendering. Automated synthetic inputs and simulated cameras must be labelled separately from a real-camera, mouse-free human run. Real hand recognition quality still needs physical testing.
