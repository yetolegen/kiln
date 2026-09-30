# KILN verification — Avivengers

Last updated: 30 September 2026, Asia/Tashkent. This report distinguishes synthetic tests from physical hand testing.

## Automated checks

### V7.0 production verification (30 September)

- `b0f7ca4` deployed to https://kiln-delta-rose.vercel.app; deployment `dpl_8eoEkAJCUJwn2dBayNLxA2r7dErx` READY.
- Public Chromium real-model/simulated-camera smoke passes startup, V7.0 footer, mirrored video and phone resize. Together with 12 local browser checks and 288 unit/integration tests, all release checks pass.
- Physical-hand acceptance is still pending the user. No synthetic test is reported as a real-hand result.

### V7.0 release integration (30 September 17:21)

- Integrated A's V7 `f9a60c9` and V6 `967c248`; **288/288 unit/integration tests pass**, including all previously failing V6/V7 cases. Typecheck/build pass; existing bundle-size warning only. Production excludes mock/debug hooks.
- Added storage checks for schema-2/3 pancakes at .24 and local tear persistence. Reviewed new speed-hint translations. Replaced the broad rounded dent-depth assertion with the actual lesson tolerance <=.025.
- Fixed outdated outward-widening advice and .65 mock pancake. README and V7.0 footer now reflect release behavior.
- **12 Chromium checks pass:** layout/export, two finish/storage variants, both studio locks, terminal restart, Free Done, geometry lessons, palm retry, damage presentation, dwell/HUD, and real-core camera-order/geometry integration. Pancake screenshot inspected; distinct flat geometry and disabled Done are visible.
- No remaining automated regression failures. All assistant hand inputs are synthetic. Physical camera retest remains required; model still does not conserve clay volume exactly.

### Lift stability clarification (30 September, after V7 handoff)

- User confirms current placement is acceptable; do not tighten the accepted base zone/pose. Changed the y=.25 rejection case to a preservation control; it passes in both modes/roles.
- Added 12 failing real-controller synthetic cases: one-frame 48→52→48 degree orientation fluctuation resets progress (4); .36 palm/s one-frame speed fluctuation resets hold (4); fully armed .05 palm/s rise produces no height change over ~6 s (4).
- Revised V7: **10 pass / 22 fail / 32 cases**. Full suite **251 pass / 32 fail / 283 cases**, failures only unresolved V7/V6 core acceptance cases. Tests/docs only changed this turn; UI/runtime and production remain unchanged.
- A's revised task is bounded jitter tolerance, retained hold progress and reliable slow displacement, with no deformation on stale/questionable frames. Genuine release/support loss must still stop the interaction. Pancake/wall-tear/UI requirements unchanged.

### V7 studio follow-up (30 September 16:38, not deployed)

- B implemented interaction-time Done/restart disabling with a 400 ms fresh release delay, dwell reset and dispatch guards. Navigation stays available. Terminal failure exposes restart and keeps Done disabled.
- 14 new synthetic core failures: above-base lift false acquisition (4 mode/role cases), armed lift after sideways withdrawal (4), premature pancake freeze at .695833 vs .24 (4), unreachable 10% opening-wall tear (1), recoverable sag instead of terminal local tear (1). Four valid under-base lift controls and two permanent-failure freeze cases pass. See `studioV7.test.ts` and `GESTURES_V7.md`.
- Full suite: **247 pass / 24 fail / 271 total**. Failures exclusively 14 new V7 plus 10 known V6 cases. Build/typecheck pass. Four lock unit tests and ten renderer tests pass, including distinct real mesh geometry for local rupture and 20% pancake.
- Eight relevant Chromium checks pass across the runs: free/commission lock, terminal restart, Free Done, both finishing/storage variants, lesson completion and palm retry. Inspected lock screenshot. Fixed a browser-test sampling race by measuring the unlock transition with animation frames.
- Physical V5.3 failures are reported by the user; assistant tests remain synthetic. Production remains V5.3, awaiting A's core changes before V7 deployment.

### V5.3 production verification (30 September 15:05)

- Deployed `0cd501d`, including A's gate fix `2242d15`, to https://kiln-delta-rose.vercel.app; deployment `dpl_DcH3kKdZw4XMxfkSCjHqYip9Qfu2` READY.
- Public Chromium smoke passes real-model loading, simulated-camera startup, V5.3 footer, mirrored video and phone resize. This is not physical-hand verification.
- Completed-lesson/Done controls are live. Ten known V6 core acceptance failures remain documented below and with A.

### A's Done gate integration (30 September 15:03)

- Pulled `2242d15`; real-controller `studioFlow` now **8/8 passing**. Raised hands cannot finish free/commission pots; explicit finishShaping unlocks glazing, and firing requires a glaze.
- Full suite **235 passed / 10 failed / 245 total**. Only the ten previously documented V6 core acceptance cases fail; no new regression. Build/typecheck pass, production assets exclude mock/debug markers.
- Six Chromium checks pass: both B8 finishing/storage variants, Free Mode Done, tutorial geometry/completion, palm retry and dwell/HUD. These use synthetic input; real-hand retest remains necessary.
- V5.3 release includes the completed lesson screen, advice above heading, actual cavity section and explicit Done gate. V6 thumb depth, withdrawal, slow pressing and cross-action core fixes remain pending A.

### Completed lesson and explicit Done gate (30 September 15:00, not deployed)

- Final compression still requires deformation and geometry confirmation. It now enters completed 6/6 immediately, with «Обучение окончено» instead of a raised-hands task. Completion survives tracking loss; restart resets it. Advice stays above the heading.
- «Готово» is available in free/commission through existing palm dwell or click. Mock browser flows hide glazing/firing until it is selected and disable firing until a glaze is selected.
- Real-core parity: all five pottery actions produce asserted geometry changes in free/commission with either hand assignment (4 passing cases); explicit finish/glaze/fire command guards pass in both modes (2 cases).
- **New blocker, 2 failing cases:** real core still automatically enters glazing after raised hands, bypassing Done. Reproduce with `npm test -- src/ui/studioFlow.test.ts`. A owns the correction in `controller.checkRaise`.
- Full suite: **233 passed / 12 failed / 245 total**. Remaining 10 failures are documented V6 thumb-depth, release, slow-compression and cross-action-state regressions. Build/typecheck pass. Seven Chromium checks pass, including both finishing/storage flows, Free Mode Done, geometry lesson completion, retry, dwell and responsive layout. Completion screenshot visually inspected.
- Found/fixed stale mock test setup: it fired from menu without finishing/selecting glaze. Mock now mirrors the actual command guards.
- These checks use synthetic hands or mock camera input. No assistant physical-hand verification. Deployment held; production remains V5.2.

### Screenshot correction and V5.3 frontend verification (30 September 14:46)

- **Physical evidence corrected:** supplied screenshot shows target **6/6** and tracking lost. User confirms compression works. The lesson has passed compression and awaits a raised-hands finish; no further press is intended.
- Fixed final-step feedback that could incorrectly request downward motion after raise recognition. Advice now appears above the heading, finish guidance also appears above the pot, and dwell rectangles refresh after banner layout changes.
- Browser test caught a landscape card extending to 405 px in a 390 px viewport. Removed duplicate tracking/final feedback; retest verifies both cards fit and advice is above the title. Four Chromium lesson/retry/dwell/camera-order tests pass; screenshots reviewed.
- Unit run: **227 passed / 10 failed**, exclusively the known V6 core acceptance cases introduced before this task. Build/typecheck pass. V5.3 is a frontend release with unchanged V5.2 core; V6 interaction improvements remain pending A.

### V6 follow-up investigation (30 September 14:30, not deployed)

- **Human evidence:** user reports vertical compression, old-step hints, thumb depth and hand-withdrawal problems after V5.2. Clarifies step 5/6 activation circle never fills with rim/support hand placement. Screenshot/landmark evidence requested; not yet received.
- **Core reproduction:** 10 new failed acceptance cases (both-role thumb-tip-only insertion; .12 first-depth jump; both-role withdrawal expansion; both-role slow compression dead zone; cross-step lift coaching; both-role retained opening blocking rim arming). Two controls pass: cavity expansion decreases core wall/floor thickness and actual mesh wall width.
- **B fixes:** current-step hint filtering, transition speech cancellation/message reset, explicit one-phalanx depth marker, and actual-geometry cavity/wall cross-section. Working palm UI unchanged. Tests for the frontend fixes pass.
- Full suite **226 passed / 10 failed**, exclusively pending core cases in `src/ui/interactionV6.test.ts`. Build/typecheck pass. Three targeted Chromium browser checks pass; desktop/phone/landscape screenshots inspected. Screenshot test now waits for resize projection before capture.
- **Not fixed/deployed yet:** core arming, finger-depth/speed and release behavior. A handoff at top of `docs/handoff/B.md`; specification in `docs/GESTURES_V6.md`. Automated input is synthetic and does not establish physical camera acceptance. Production remains V5.2.

### V5.2 live verification (30 September 13:53)

- Deployed `b63f4a4`, including core fix `5dfaa50`, to https://kiln-delta-rose.vercel.app. Deployment `dpl_2pF7P8xYe8mkmqB7nKX7Kt9TNXRc` READY; remote build/typecheck passed.
- Verification rerun: 221/221 unit tests, production build, and four targeted Chromium browser checks pass. Public Chromium smoke passes with the real hand model and simulated camera, confirming footer **V5.2**, startup, mirroring and resize.
- Working UI interaction implementation unchanged. User's physical-hand compression retest is pending; synthetic input and camera startup checks do not establish that acceptance.

### External compression core fix (30 September 13:48, not yet deployed)

- Replaced absolute palm-spacing radius targets with signed travel applied to the current outer profile. Inward movement narrows, outward movement widens, stationary contact adds no deformation. New contact and tracking/context changes establish a fresh reference.
- Original B regression: **6/6 pass**, including free/tutorial with both hand assignments and separate internal pinch-spread controls. Full unit suite: **221/221 pass**. Production build/typecheck pass, with the existing bundle-size warning.
- New core coverage verifies acquisition/hold, sign reversal, nonuniform profiles, duplicates, missing/stale input and contact/context resets. Updated old fixed-position motion fixtures in core and B integration tests; no UI interaction or renderer implementation was changed.
- Chromium camera-order test passes palm menu dwell and first lesson geometry confirmation through real feature extraction/controller/UI with synthetic landmarks. Both-hand complete lesson/commission/firing/storage tests pass. **No post-fix physical-hand test and no deployment in this task.**

### V5.1 external compression report (30 September 13:38)

- **Human report:** user confirms UI palm selection now works and must be preserved. External two-palm inward movement still widens the clay on the previously identified Chrome / Acer Nitro 5 AN515-58 setup.
- **Reproduced in real core using synthetic HandFeatures:** initial radius 1.0; half-gap decreases from 1.4 to 1.103. Radius grows to 1.265 at frame 30 and finishes at 1.1484. Four cases fail (free/tutorial, either track assignment). Cavity remains solid; separate internal pinch-spread controls pass for either active hand and leave outer radii unchanged.
- Root cause: valid outside-wall contact forwards absolute half-gap as the clay target, which initially exceeds the clay radius despite inward movement. Core correction and reset requirements are at the top of `docs/handoff/B.md` for A.
- `npm test`: 199 passed, 4 failed, all failures in the new `src/ui/externalCompression.test.ts`. Typecheck passes. No runtime edits or deployment; UI interaction remains unchanged. Core fix and physical retest remain pending.

### V5.1 live verification (30 September 13:25)

- Deployed `a0f09fd` to https://kiln-delta-rose.vercel.app; deployment `dpl_Q8gjZQtmcgF71bkyUA9Cz3g6gbkD` READY, remote build/typecheck passed.
- Public Chromium real-model/simulated-camera test passed, explicitly confirming **V5.1** in the footer, startup, mirroring and phone resize. Production assets exclude mock/debug/synthetic-camera hooks.
- The clock regression failed before the fix and passes after it through real features/controller/UI with synthetic raw landmarks. All 197 unit tests, the five targeted Chromium checks and six cross-browser lesson/retry checks pass. Physical V5.1 acceptance is still pending.

### V5.1 continuing physical report and timing fix (30 September 13:23)

- **Human report:** user confirmed the refreshed public URL, Chrome on Acer Nitro 5 AN515-58, and visible cyan targets/“Форма” percentages. Palm dwell and weak/stuck lesson response therefore concern V5, not merely the previous deployment. No numerical landmark recordings were supplied.
- **Reproduced B clock bug:** main passed requestAnimationFrame's timestamp to UI freshness checks, while camera observations use performance.now(). A camera callback earlier in the same rendering cycle can have a newer capture time than that animation timestamp. Dwell resets on the apparent future frame; lesson matching also repeatedly resets its confirmation timer after freezing clay at the target. The fix samples performance.now() at render callback entry. Freshness checks remain strict.
- New `src/browser/timing.pw.ts` supplies synthetic raw camera landmarks before the render callback, using the real feature extractor/controller/dwell/tutorial. Before the fix it calibrated and stayed in the menu despite a palm over the button. After the fix it selects the lesson without mouse input after Start and reaches/holds the first real geometry target. The test explicitly verifies newer camera timestamps. This is a controlled callback-order regression, not a physical-hand or MediaPipe-recognition test.
- **Cursor visibility:** the old cursor canvas lived behind opaque UI buttons. Its progress ring now uses a separate fixed SVG layer above the buttons, with pointer events disabled. Fresh palm-centre dots aid alignment. Lost/stale input hides the cursor. Screenshot inspected: ring and button progress both visible. Footer shows V5.1 for version identification.
- Checks: 197/197 unit tests; build/typecheck pass; 5 targeted Chromium checks pass (timing, dwell, geometry lessons, retry and retained hand display); all 6 lesson/retry checks pass across Chromium/Firefox/WebKit. The display-retention test was corrected to exclude V5's persistent height-ceiling line from its hand-pixel region.
- No A-owned files changed. New physical acceptance remains pending after deployment; previous device evidence is not a claim that V5.1 works with real hands.

### V5 production verified (30 September 12:53)

- **Live:** https://kiln-delta-rose.vercel.app, deployed code `5e502a7` including A's `f95ff07`; deployment `dpl_5SaXQBcgRRPB1kXryP6YtjpWmrKY` READY. Remote build/typecheck passed.
- Public Chromium real-MediaPipe/simulated-camera startup, mirrored-video and resize test passed. The sandbox initially denied network access; the approved outside-sandbox run passed. No real-hand recognition claim follows from this test.
- Final local gate: **197/197 unit/integration tests pass**; production build/typecheck pass. The preceding 15 updated browser checks cover the V5 frontend across Chromium/Firefox/WebKit. Production bundle scan found no mock/debug/recorder markers.
- The deployment blocker described in the historical sections below is resolved. Human camera acceptance and the Windows WebKit landscape screenshot caveat remain outstanding.

### V5 deployment gate cleared (30 September 12:51)

- Pulled A's `f95ff07`. Permanent failures now freeze their geometry and preserve the first failure cause; recoverable rim compression is unchanged.
- **197/197 unit and integration tests pass**, including the two previously failing real-controller permanent-hole regressions. Typecheck and production build pass.
- The 15 updated Chromium/Firefox/WebKit browser checks recorded below remain the frontend verification. No frontend behavior changed for this core fix. Production deployment and public camera-startup verification follow this green gate.
- Physical-hand acceptance and the previously documented Windows WebKit landscape screenshot limitation remain outstanding.

### V5 core integration (30 September 12:40, deployment held)

- Pulled A's 9dbaca1. Typecheck/build pass. B integrated the new clay/gesture fields, danger and permanent-failure coaching, schema-3 migration/validation, actual perforated mesh, damaged-wall gaps, ceiling line and explanatory cutaway. Legacy v1/v2 pots and scores are retained. Saved holes must have a zero floor, full-height cavity and collapsed state; inconsistent records are rejected.
- 193 tests passed before the deeper permanent-failure regression. Added four real-controller tests for both active-hand assignments: deep-thumb hole, prolonged compression/pancake, 7-second stretching warning/10-second tear, and tracking-loss cancellation of the stretch clock. The extended tests exposed the core bug below (2 fail/2 pass); this is a deployment gate, not waived.
- Updated Chromium lesson/failed-step/palm/result/storage/damage browser checks: 5 pass. Corresponding Firefox/WebKit checks: 10 pass outside the sandbox. Firefox repeatedly failed before opening a page inside the sandbox (`browserContext.newPage` internal `_page` error); the approved run outside it passed. The earlier full 34-pass/2-skip matrix remains separate from these 15 V5 checks.
- Browser fixture bug fixed: the new test moved its cursor away before menu dwell completed. It now awaits the actual studio phase and restart effect. This was a test setup error, not an application failure.
- **Confirmed A-core blocker:** puncture the floor, then keep pressing the rim for 4 seconds. Both hand assignments produce `bottomHole: true`, `cavityRadiusWorld: 0`, `cavityDepthWorld: 0.6`, `height: 0.6`, `collapseCause: pancake`. Permanent failures still deform and overwrite their cause. This is invalid geometry/storage. Reproduction is committed in `src/ui/damageFlow.test.ts` and the newest B handoff; A was asked to fix it before deployment.
- All gesture evidence above is synthetic. The screenshots verify UI/geometry display, not camera recognition of real hands.
- Final local gate at 12:42: **195 passed, 2 failed** (both the permanent-hole regression), build/typecheck pass. All 15 updated browser checks pass. Production deployment is held until A fixes the core regression; V5 is not yet live.

### Geometry-led lesson revision (V5 frontend, 30 September 12:00)

- 182 unit/integration tests pass; production build and typecheck pass. Both active-hand roles reach actual geometry targets through A's real controller. Unchanged/tiny geometry changes cannot pass; overshoot, damage, wrong profile, lost tracking, replayed input, release and whole-attempt restart are covered.
- Updated browser matrix: **34 passed, 2 intentionally skipped** across Chromium, Firefox and WebKit. Includes palm-only fixture navigation with visible dwell progress, all five geometry actions, release gating, failure/retry, portrait/landscape controls, optional API failures and camera startup. The final tolerance-boundary adjustment has separate passing unit/integration coverage.
- Browser counts: Chromium 12 passed; Firefox 11 passed/1 camera skip; WebKit 11 passed/1 camera skip. The WebKit visual caveat below still applies. A first Firefox launch failed inside Playwright before a page opened; the subsequent full matrix passed without application changes for that error.
- New bugs found/fixed: index-only UI did not accept the requested palm centre; tiny old lesson deltas disabled deformation prematurely; no target profile or cavity-depth guide; no latched failure/retry; mock activation incorrectly reset after tutorial freeze; failure card overflowed a 390px landscape viewport. Irreversible target overshoot now fails immediately outside the accepted tolerance, rather than leaving an uncorrectable stage active. Displayed 90% cannot be rounded up from a failing geometry score.
- The cyan target locks on phase entry. Height, every outer-profile band, cavity radius and cavity depth must all be in tolerance; recognizing a gesture or changing just one dimension is insufficient. Clay freezes at an accepted target and requires release to advance. Retry resets the whole attempt; compression is step 5, final review/raise is step 6.
- **Status at this earlier checkpoint:** A-owned V5 core mechanics were pending. They subsequently arrived as 9dbaca1; see the integration section above for the remaining regression. No new physical-camera acceptance or fabricated landmark measurements.

### Previous deployed revision

- Production build and TypeScript check pass locally. Vercel production build passed after fixing an excluded test-helper dependency.
- 171 Vitest tests pass after A's real-hand fixes, including both-hand-role lessons and B's new measured-feature dwell regression. An earlier concurrent run hit the core stress test's 5s timeout under browser load; isolated full runs pass without changing that test or its timeout.
- A real-controller integration test drives synthetic landmark-bearing `HandFeatures` through all six v4 lessons with **each active-hand assignment**, then one-hand dwell → commission → raise → glaze → firing → result → memory storage. It does not bypass recognition by injecting gesture events. This verifies integration with controlled data, not MediaPipe recognition of physical hands.
- Frontend browser matrix from the preceding v4 integration: 31 passed, 2 camera tests intentionally skipped. The updated landscape lesson/warning test also passes in all three engines. Chromium's camera test loads the real MediaPipe model but supplies a simulated camera stream; it does not test a person's gestures. See the WebKit screenshot limitation below: passing DOM checks do not prove every rendered surface is visible.
- Viewport checks cover 1440×900, 390×844, 360×740 and 844×390. These are layout tests on Windows, not tests on physical phones.
- Optional failures tested: blocked/unavailable audio and speech, unavailable storage/quota, invalid saved data, failed PNG export, model load failure, camera denial/no device/playback failure, and WebGL context loss with 2D fallback.
- PNG dimensions checked: 1200×1200. Production asset scan excludes mock/debug/recorder markers. After A's real-hand fixes, the live HTTPS real-model/simulated-camera startup/resize check passed on 30 September at 10:53 Asia/Tashkent. Code `d72bfc4` (A through `3e2c208`) is deployed as `dpl_2BdBkA13BspgMgFsLuiEyygocvwD`.

## Browser matrix (Windows, Playwright 1.63.0)

| Browser build | Frontend fixtures and failure cases | Real model + simulated camera | Physical hands |
|---|---|---|---|
| Chromium 153.0.8010.12 | 11/11 pass | Local pass | Not verified |
| Firefox 155.0 | 10 pass, 1 camera skip | Not run; fake-camera setup is Chromium-specific | Not verified |
| WebKit 26.6 | 10 pass, 1 camera skip; landscape screenshot caveat below | Not run; fake-camera setup is Chromium-specific | Not verified |

WebKit on Windows is a test engine, not Safari on an iPhone. No physical phone support claim is made. Browser versions come from the installed Playwright browser manifest.

**Unresolved rendering limitation:** after resizing portrait → landscape in Windows Playwright WebKit, a screenshot can omit the pot even while the WebGL context is valid and `readPixels` sees about 39,800 nontransparent pixels. Chromium's corresponding screenshot shows the pot. Waiting, preserving the drawing buffer, changing stacking order and forcing layer recreation did not fix this; those experiments were reverted. It remains unclear whether this is limited to headless screenshot/compositing or affects a physical browser. Physical Safari must be checked before claiming support. Chromium is the currently verified camera test path.

## Bugs found and addressed

| Area | Finding | Fix / evidence |
|---|---|---|
| B2 | Orientation changes could retain old holds when dimensions stayed the same | Force a synchronized tracker/core epoch reset on orientation change |
| B3/B4 | Unstable mock hint identity, a visible mesh seam, closed-looking fallback rim, unrealistic hand outlines | Stable hint references, seam normals, explicit inner rim, hand landmark fixture improvements |
| B5 | Holding restart could continuously create new sessions | Keep the dwell latch across session-id changes; regression test |
| B8 | Trimming a 24-pot shelf could discard the best score | Preserve target-version best scores independently in the persisted payload |
| B9 | Result pot could overlap phone statistics; landscape controls lacked room | Shared responsive projection and separate control/stat areas; viewport screenshots |
| Camera report | Real one-hand pointing was rejected because B treated `inputUsable` as pointer validity | Accept fresh `ready`/`oneHand` point input and matching frame ID; real-core flow and dwell tests |
| Camera report | Hand drawings disappeared immediately on a transient interruption | Smooth display landmarks, retain/fade up to 350ms, never return cached positions to core |
| Tracking continuity | Every phase change reset input even when the projection was identical | Compare actual projection fields and reset only for a changed layout; orientation still explicitly resets |
| Camera report | Tracking failure and missing lesson requirements were not prominent | Immediate tracking banner, explicit lesson requirement text, same optional voice coaching with deduplication |
| B10 verification | Mock tear events arrived before the next observation | Emit fixture issue events with the next distinct observation, matching core behavior |
| B10 verification | PNG assertion spread a large byte chunk onto the call stack | Read only the PNG header bytes iteratively |
| Deployment | A test helper was excluded from the remote typecheck inputs | Include the tests directory in Vercel's build upload; deployed build passed |
| v4 contract | B mock, coaching and lessons still used retired gestures | Updated to lift/indent/open/compressRim; typecheck and real-controller integration pass |
| v4 lesson completion | Old contact gate would reject supported actions because their two-wall contact is false | Match expected gesture + deformation + actual radius/height/cavity change; release gate; no duplicate-frame or tracking-loss advancement |
| v4 geometry | Renderer always derived a hollow shell from thickness | Explicit cylindrical cavity radius/depth in WebGL, 2D fallback, PNG source and gallery; solid initial top |
| v4 storage | Old thickness ceiling rejected solid pots; version-2 saves were unsupported | Validate cavity floor/wall/derived thickness, persist schema 2, migrate schema 1 as solid, preserve best scores |
| v4 feedback | Retired fist instructions remained in recovery/result tips | All new hints translated with hand/direction/hold params; voice tests verify the same messages and deduplication |
| Browser test | Firefox round trips exceeded the 350ms visual-retention window | Sample warning and canvas together in the page; keep the application's fade timing unchanged |
| Phone lesson | Duplicate instructions appeared in the card, feedback and HUD, obscuring the pot | Suppress identical card text and duplicated lesson banner; keep technique/tracking warnings and voice |
| Landscape lesson | A CSS rule hid the entire tutorial HUD, including warnings | Hide only status chips, keep warning banner visible; all three engines test tracking/technique warnings and card bounds |
| v4 mock | Support track id referenced no mock hand, hiding its highlight | Match the actual mock track id; regression test and refreshed labelled GIF |
| A physical report | Naturally curled fingers exceeded the absolute pointing threshold | A's relative index/other-finger margin; B's measured-feature dwell test activates once for either hand |
| A physical report | One-frame pointing-pose dropouts reset dwell | A retains the current hand/fresh fingertip through the 120ms pose grace; B tests uninterrupted dwell without repeated activation |
| A physical report | A nearby palm exceeded the pot radius, making fixed action zones impractical | A scales contact/support/base/rim/opening zones by palm size and broadens flat/thumb-down poses; post-fix physical lesson acceptance remains pending |

## Human report and pending acceptance

The user tested the app with a camera and reported menu dwell failure, disappearing hand drawings, step 1 not advancing, limited pottery actions, and insufficient feedback. No device/browser model was supplied. The report motivated the fixes above; the user has not yet confirmed the fixes with another physical run.

The new [four-action specification](GESTURES_V4.md) is integrated with A's contract. Supported lift, shallow indentation, pinch-spread opening and rim compression are wired to geometry, activation/support overlays, six lessons, coaching, optional voice and saved results. Rim compression/smoothing is the researched fourth action.

**New physical evidence from A (`3e2c208` handoff):** Yerassyl tested an Acer Aspire A715-76G built-in webcam in daylight, using Edge and Chrome. Naturally curled fingers measured 0.36–0.66, so the old absolute pointing cutoff rejected them. A replaced it with an index-versus-other-fingers margin, retained the same fingertip through a brief pose dropout, and scaled contact/action zones by palm size after observing a ~215px palm against a ~100px pot radius. Flat-palm and thumb-down classification were also relaxed. These are A's reported physical observations, not B-performed physical tests or proof that the complete post-fix lesson passes.

A also updated recorder labels for v4 (keys 0–8). Only one person's measurements inform these changes; pinch and lift/rim speed thresholds remain unmeasured. B added a core-to-dwell regression using A's reported finger readings on either screen side with short synthetic pose dropouts. This replays numerical features, not camera video.

**Still required:** a human completes T22 on the deployed URL without the mouse after camera permission; test both active/support hand assignments for every new function; test a brief interruption, sustained loss, excessive lift speed, missing support, wrong thumb direction, initial pinch, each lesson release gate, and actual speaker/Russian voice behavior. B's assistant cannot physically pose hands. For each failing step, capture the local `?dev=1` panel two or three times while holding the pose, with step, attempted action, device/browser and lighting. Save real landmark recordings via `?dev=1&rec=1` for A's threshold tuning. Do not substitute generated data for those recordings.

## Reproduce

```sh
npm install
npx playwright install chromium firefox webkit
npm run build
npm test
npm run test:browser
```

Production smoke test in PowerShell:

```powershell
$env:PLAYWRIGHT_BASE_URL='https://kiln-delta-rose.vercel.app'
npm run test:browser -- --project=chromium --grep 'loads the real model'
```

The README GIF can be regenerated with `node src/browser/capture-demo.mjs`, then `python src/browser/make_demo.py` (Pillow required). Its visible label states that the input is synthetic.
