# KILN verification — Avivengers

Last updated: 30 September 2026, Asia/Tashkent. This report distinguishes synthetic tests from physical hand testing.

## Automated checks

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
