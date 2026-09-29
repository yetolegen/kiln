### 2026-09-29 22:22 · B · B5 screens, dwell and HUD
**Done:** phase-driven Russian screens, menu/studio navigation, observation-driven dwell, gesture/tracking chips and contextual hints. Build + 119 unit tests + Chromium dwell navigation pass; desktop/390px screenshots reviewed.
**Contract changes:** consumed A's target/glazeId additions; mock updated.
**For you (A):** camera/core integration stays live. Long dwell is one-shot even after session restart.
**Blocked / need from you:** none.
**Known issues:** regression test found repeated restarts while holding the same button; fixed by retaining the latch across sessionId changes. Physical gesture/device tests remain outstanding.
**Next:** B6 optional sound/voice and mute.

### 2026-09-29 22:06 · B · B4 scene + pot + overlay
**Done:** transparent Three.js scene, hollow reusable lathe mesh, wheel, damage tint, wobble and active-band ring; hand outlines/cursor from snapshots. z=0 interaction plane agrees with core within 0.5 px at desktop/portrait/landscape sizes. Automatic shaded 2D fallback on WebGL failure/context loss. Build + 115 unit tests + Chromium render/fallback check pass; screenshots reviewed.
**Contract changes:** none.
**For you (A):** renderer consumes snapshots; no core/clay mutation. B2 production already works with a simulated camera.
**Blocked / need from you:** please add `target: TargetProfile | null` and `glazeId: string | null` to EngineSnapshot and return your existing controller values. Needed for commission target silhouette and selected-glaze preview without frontend game state.
**Known issues:** fixed visible lighting seam, closed-looking fallback rim, unrealistic mock landmarks, and test key timing. Full phase screens follow in B5. Physical hands/device performance still unverified.
**Next:** B5 phase UI, observation-driven dwell, HUD and RU hints.

### 2026-09-29 21:56 · B · B3 keyboard mock
**Done:** typed MockCore with phases, gestures, editable clay, event episodes, hints, stats and copied results. Development `?dev=1&mock=1` uses it without camera/model loading; real `?dev=1` retains A's debug recorder. Build, 111 unit tests and B3 browser check pass; production scan excludes mock/debug/recorder.
**Contract changes:** none.
**For you (A):** mock is explicit opt-in; normal app continues using your core.
**Blocked / need from you:** none.
**Known issues:** fixed exponent syntax caught by build and unstable mock hint identity caught by review. Physical gesture quality remains unverified.
**Next:** B4 transparent 3D scene, hollow pot, overlay and projection tests.

### 2026-09-29 21:48 · B · B2 browser verification
**Done:** user authorized Playwright. Chromium with simulated camera passed local real-model loading, mirrored cover video, phone-size resize and model-failure retry screen (2/2). Real-model/camera test also passed on the public production HTTPS URL (1/1). Build/typecheck pass.
**Contract changes:** none.
**For you (A):** deployed B2 is ready for physical camera testing and recording.
**Blocked / need from you:** physical hands/devices still need testing; synthetic camera cannot validate recognition quality.
**Known issues:** no new bugs in these browser checks.
**Next:** B3 keyboard snapshot fixture, then B4.

### 2026-09-29 17:12 · B · B2 camera + real tracking
**Done:** one Start click requests front camera and unlocks optional audio/speech; mirrored cover video, 640×480 fallback, friendly permission/device/playback/model errors. Real HandTracker → FeatureExtractor → controller wired; modelReady, calibration and dev debug/recording available. Projection uses actual video and viewport sizes; camera/resize/orientation/visibility reset both epochs. Build + 102 tests pass.
**Contract changes:** none.
**For you (A):** real tracking is connected. Dev `?dev=1&rec=1` loads your panel. Projection is computed only after video plays. `createController({ nowIso })` supplies browser timestamps.
**Blocked / need from you:** M0 physical camera/mirror check still needs a browser/device; browser automation is not connected.
**Known issues:** fixed review finding: rotation with unchanged dimensions must still reset input. No physical camera or phone verification yet. Game rendering/navigation are the next phases.
**Next:** B3 mock fixture, then B4 scene; user requested continuous work through B10, testing/reporting/fixing each phase.

### 2026-09-29 15:37 · B · B1 production deployed
**Done:** [Production HTTPS URL](https://kiln-delta-rose.vercel.app). Vercel build and typecheck passed; public unauthenticated HTTP 200 verified for root, `/gallery`, `?dev=1`, favicon, JS and CSS. Deployed JS excludes the dev mock. Earlier local tests: 8/8. Scaffold pushed to `main`.
**Contract changes:** none.
**For you (A):** scaffold and Vitest are ready. MediaPipe npm version is pinned to `1.0.1`; match the WASM version. Manual updates: `npx vercel@61.0.0 deploy --prod` from the linked checkout.
**Blocked / need from you:** none for B1.
**Known issues:** Vercel could not connect GitHub auto-deploy because the account needs a GitHub login connection. Manual deployment works. No browser automation available: visual/device verification remains manual; no phone support claim. Camera and game interactions are not part of B1.
**Next:** stop for B1 testing; then B2 camera + projection.

### 2026-09-29 15:34 · B · B1 scaffold; deployment awaiting login
**Done:** Vite + vanilla TypeScript scaffold, Russian landing, all B-owned module stubs, pinned dependencies/lockfile, Vercel SPA configuration. `npm run build` (including typecheck) and `npm test` pass: 8/8. Production preview returns HTTP 200 for root, assets, `/gallery` and `?dev=1`; compiled output contains no mock module or marker.
**Contract changes:** none.
**For you (A):** `npm install`, `npm run dev`, `npm test` are ready. MediaPipe is pinned to `1.0.1`; use the matching WASM CDN version. `src/main.ts` has only a landing and compile-time DEV import; the mock controller follows in B3. Ready for your tracker/controller work.
**Blocked / need from you:** no core blocker for B1. Vercel CLI is logged out; user authentication requested before production deploy.
**Known issues:** production HTTPS URL is not verified yet. Browser automation is unavailable in this session; visual/device checks remain manual. Camera and game interactions are future milestones.
**Next:** finish production deployment, then stop for B1 browser testing; B2 camera + projection follows.
