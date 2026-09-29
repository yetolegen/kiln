# KILN verification — Avivengers

Last updated: 30 September 2026, Asia/Tashkent. This report distinguishes synthetic tests from physical hand testing.

## Automated checks

- Production build and TypeScript check pass locally. Vercel production build passed after fixing an excluded test-helper dependency.
- 138 Vitest tests pass: A's core/coordinate/recognition tests plus B's camera, epoch, dwell, render, storage, audio, tutorial, visualization and coaching tests.
- A real-controller integration test drives synthetic `HandFeatures` through recognition → tutorial → one-hand dwell → commission → raise → glaze → firing → result → memory storage. It does not bypass recognition by injecting gesture events. This verifies integration with controlled data, not MediaPipe recognition of physical hands.
- Browser matrix: 28 passed, 2 camera tests intentionally skipped; an additional Chromium visual-retention check passes. Chromium's camera test loads the real MediaPipe model but supplies a simulated camera stream; it does not test a person's gestures.
- Viewport checks cover 1440×900, 390×844, 360×740 and 844×390. These are layout tests on Windows, not tests on physical phones.
- Optional failures tested: blocked/unavailable audio and speech, unavailable storage/quota, invalid saved data, failed PNG export, model load failure, camera denial/no device/playback failure, and WebGL context loss with 2D fallback.
- PNG dimensions checked: 1200×1200. Production asset scan excludes mock/debug/recorder markers. Live HTTPS real-model/simulated-camera check passed on 30 September at 00:21 Asia/Tashkent.

## Browser matrix (Windows, Playwright 1.63.0)

| Browser build | Frontend fixtures and failure cases | Real model + simulated camera | Physical hands |
|---|---|---|---|
| Chromium 153.0.8010.12 | 10/10 pass | Local pass | Not verified |
| Firefox 155.0 | 9 pass, 1 camera skip | Not run; fake-camera setup is Chromium-specific | Not verified |
| WebKit 26.6 | 9 pass, 1 camera skip | Not run; fake-camera setup is Chromium-specific | Not verified |

WebKit on Windows is a test engine, not Safari on an iPhone. No physical phone support claim is made. Browser versions come from the installed Playwright browser manifest.

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

## Human report and pending acceptance

The user tested the app with a camera and reported menu dwell failure, disappearing hand drawings, step 1 not advancing, limited pottery actions, and insufficient feedback. No device/browser model was supplied. The report motivated the fixes above; the user has not yet confirmed the fixes with another physical run.

The new [four-action specification](GESTURES_V4.md) requires A's recognizer, cavity state, activation timers, support-hand rules and contract changes. Those features are pending and must not be described as completed. B is ready to connect renderer/tutorial/storage once A publishes the contract. Rim compression/smoothing is the researched fourth action.

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
