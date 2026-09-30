# KILN verification — Avivengers

Last updated: 30 September 2026, Asia/Tashkent. This report distinguishes synthetic tests from physical hand testing.

## Automated checks

- Production build and TypeScript check pass locally. Vercel production build passed after fixing an excluded test-helper dependency.
- 166 Vitest tests pass: A's core/coordinate/recognition tests plus B's camera, epoch, dwell, render, storage, audio, tutorial, visualization and coaching tests. One concurrent run hit the core stress test's 5s timeout under browser load; the isolated full rerun passed in 2.26s without changing that test or its timeout.
- A real-controller integration test drives synthetic landmark-bearing `HandFeatures` through all six v4 lessons with **each active-hand assignment**, then one-hand dwell → commission → raise → glaze → firing → result → memory storage. It does not bypass recognition by injecting gesture events. This verifies integration with controlled data, not MediaPipe recognition of physical hands.
- Browser matrix: 31 passed, 2 camera tests intentionally skipped. The updated landscape lesson/warning test also passes in all three engines. Chromium's camera test loads the real MediaPipe model but supplies a simulated camera stream; it does not test a person's gestures. See the WebKit screenshot limitation below: passing DOM checks do not prove every rendered surface is visible.
- Viewport checks cover 1440×900, 390×844, 360×740 and 844×390. These are layout tests on Windows, not tests on physical phones.
- Optional failures tested: blocked/unavailable audio and speech, unavailable storage/quota, invalid saved data, failed PNG export, model load failure, camera denial/no device/playback failure, and WebGL context loss with 2D fallback.
- PNG dimensions checked: 1200×1200. Production asset scan excludes mock/debug/recorder markers. The previous live HTTPS real-model/simulated-camera check passed on 30 September at 00:21 Asia/Tashkent; the v4 production check is recorded in B's newest handoff after deployment.

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

## Human report and pending acceptance

The user tested the app with a camera and reported menu dwell failure, disappearing hand drawings, step 1 not advancing, limited pottery actions, and insufficient feedback. No device/browser model was supplied. The report motivated the fixes above; the user has not yet confirmed the fixes with another physical run.

The new [four-action specification](GESTURES_V4.md) is integrated with A's `6e53ff9` contract. Supported lift, shallow indentation, pinch-spread opening and rim compression are wired to geometry, activation/support overlays, six lessons, coaching, optional voice and saved results. Rim compression/smoothing is the researched fourth action. Real-hand angle/speed thresholds remain untuned, so automated success does not establish physical recognition reliability. A's development recorder still has the old gesture label list and needs an A-owned update before v4-labelled recording sessions.

**Still required:** both participants complete T22 on the deployed URL without the mouse after camera permission; test both active/support hand assignments for every new function; test a brief interruption, sustained loss, excessive lift speed, missing support, wrong thumb direction, initial pinch, each lesson release gate, and actual speaker/Russian voice behavior. Save real landmark recordings via `?dev=1&rec=1` for A's threshold tuning. Do not substitute generated data for those recordings.

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
