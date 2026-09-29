### 2026-09-30 00:22 · B · B10 docs/GIF/browser checks + camera-report frontend fixes
**Done:** README top with Avivengers, live link, labelled 15-frame synthetic preview GIF, current controls, privacy/storage limits and QA report. Build + 138 unit/integration tests pass. Chromium/Firefox/WebKit matrix: 28 passed, 2 intentional non-Chromium camera skips; extra Chromium visual-loss test passes. Public HTTPS real-model/simulated-camera test passes. No mock/debug/recorder markers in production JS. Explicit missing-condition lesson text feeds the same optional voice system. Unchanged phase layouts no longer reset tracking.
**Contract changes:** none; A remains responsible for all new core/types changes per user.
**For you (A):** docs/GESTURES_V4.md contains the user's replacement gesture scope and proposed contract. Please implement that core and tell B when pushed. Frontend menu, visual-retention and immediate coaching fixes are deployed at https://kiln-delta-rose.vercel.app. Updated QA and GIF follow with this commit.
**Blocked / need from you:** new supported actions/cavity fields/activation progress/hints; both-hand-assignment recognition and physical T22/recordings. B cannot complete the new lesson/geometry adapters until those fields are agreed and implemented.
**Known issues:** fixed test-only Node import, large PNG-header spread, mock issue timing, and Vercel omission of an imported test helper. The first deployment retry was temporarily unauthorized; subsequent project access/build/deployment succeeded. Full human gesture flow remains unverified. No claim that the four newly requested actions are implemented yet. Bundle-size warning is non-fatal.
**Next:** connect A's new snapshot contract to cavity rendering, revised lessons, activation progress, save migration and final gesture-specific UI tests. All independent B1–B10 frontend deliverables are in place.

### 2026-09-29 23:55 · B · user camera bug report + new gesture scope
**Done:** real-core integration caught one-hand menu navigation blocked by B's inputUsable gate; fixed dwell/cursor/HUD to accept fresh trusted point input. Display-only landmark smoothing retains/fades a stable drawing for at most 350ms; no stale input goes to the engine. Immediate tracking-failure banner and shared voice message. 136 unit tests and Chromium dwell check pass; finishing the build/test-only import fix now.
**Contract changes:** requested only, not edited. User explicitly keeps A responsible for core.
**For you (A):** NEW USER SPEC supersedes old pull/press controls: see docs/GESTURES_V4.md. Exactly four additions to basic shaping: one-hand base hold 3s then slow lift with side support; thumb-down shallow indentation; pinch-spread opening/deepening; rim compression/smoothing (researched fourth action). Either hand may act. Please implement core/types and report the final snapshot contract. Suggested fields/gesture ids are in that doc.
**Blocked / need from you:** cavity geometry/state, new recognizer/activation/support rules and actionable hints are A-owned. B will wire renderer/lesson/storage immediately after your contract update. User reports lesson step 1 stuck and wants missing-condition feedback plus real completion/release gates.
**Known issues:** real physical report confirmed menu failure; fixed locally. No physical verification yet of the fix. Browser matrix was interrupted for this report; do not treat it as passing. Automated full v3 real-core tutorial/dwell/commission/result/storage integration now passes. A says no real recordings tonight; thresholds remain untuned.
**Next:** deploy frontend fixes; B10 docs/browser checks; prepare new lesson/geometry adapters when A's contract is available. Team name supplied: Avivengers.

### 2026-09-29 23:13 · B · B9 responsive polish and PNG
**Done:** earthy grain/display typography, portrait result composition, landscape controls beside the pot, projection reset on phase/layout changes, 1200×1200 PNG keepsake. Free mode already wired. Build + 131 unit tests + browser checks at 390×844, 360×740 and 844×390 pass; screenshots reviewed.
**Contract changes:** none; renderer and core still share the same projection.
**For you (A):** B8 is deployed at https://kiln-delta-rose.vercel.app; full real-hand testing can start.
**Blocked / need from you:** awaiting physical-hand T22/device results (asked user).
**Known issues:** addressed phone result overlap/landscape control space found during review; dwell targets now refresh on scroll. No physical phone support claim from viewport tests. Three.js bundle size warning remains non-fatal.
**Next:** B10 README, labelled demo GIF, browser matrix and final deployment.

### 2026-09-29 23:07 · B · B8 finishing and local gallery
**Done:** 3 dwell glazes, firing glow/material, snapshot target outline, result time/score/execution tips with tracking separate, PNG, validated schema-1 shelf and versioned local best scores. Build + 130 unit tests + Chromium finishing/PNG/gallery flow with storage enabled and disabled pass; portrait result reviewed.
**Contract changes:** consumes snapshot target/glazeId; mock now supplies a target and selected glaze.
**For you (A):** full frontend route ready for real-hand M4/T22. Deployment follows this commit.
**Blocked / need from you:** physical recognition/tuning and both participants' T22 cannot be established with synthetic browser input.
**Known issues:** tests found that trimming old pots discarded best scores; fixed by persisting best scores independently of shelf entries, in the same atomic payload. Best-effort failures do not stop the result.
**Next:** B9 polish/phone/export; B10 README/GIF/browser matrix.

### 2026-09-29 22:59 · B · B7 tutorial
**Done:** six Russian instruction steps with animated hand diagrams. Progress uses distinct fresh accepted observations; speed lesson requires calm contact, tear begin, matching end and resumed calm contact. Build + 125 unit tests + Chromium full tutorial fixture pass; portrait screenshot reviewed.
**Contract changes:** none.
**For you (A):** script dispatches tutorialStep only; core owns gestures, episodes and tutorial exit.
**Blocked / need from you:** none.
**Known issues:** no new bugs found. Real-hand tutorial/T22 still unverified; mock test does not establish recognition quality.
**Next:** B8 glaze/firing/results/storage/gallery and target outline.

### 2026-09-29 22:44 · B · B6 sound and voice
**Done:** synthesized wheel/clay/tear/collapse/kiln/chime sounds; Russian hint speech uses object identity and replaces queued speech; dwell mute. Build + 123 unit tests + Chromium disabled-audio/mute test pass.
**Contract changes:** none.
**For you (A):** applied latest hint identity rule; issue sounds consume begins only.
**Blocked / need from you:** none.
**Known issues:** no new bugs found in these checks. Real speaker output and installed Russian system voices still need a physical-device check.
**Next:** B7 tutorial and real episode progression.

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
