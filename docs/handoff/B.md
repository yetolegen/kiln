### 2026-09-30 12:00 · B · palm dwell and geometry-led lessons ready
**Done:** fresh tracked palm centres now select actual UI rectangles, with highlighted button/ring, one-shot activation, hand identity, loss/leave reset and index fallback. All six tutorial stages show locked cyan target geometry/cavity section. Replaced tiny-delta progression with full-profile/height/cavity matching, 350ms reliable confirmation, freeze at target and release before the next action. Overshoot/damage fails and disables actions, explains the correction, speaks through existing coaching and offers palm-selectable whole-attempt retry. Compression is clearly step 5; step 6 is review/raise. Fixed the landscape failure-card overflow and mock activation freeze/release bug.
**Contract changes:** none; no A-owned files edited. B reads snapshots and dispatches existing tutorialStep/restart commands. Geometry validation is isolated in ui/tutorialGeometry.ts; it never mutates clay or core commission scoring.
**For you (A):** implement the core items in docs/GESTURES_V5.md. The premature shutoff of deformation was a confirmed B bug: thresholds were radius 0.003/height 0.005. New real-controller flow reaches radius ~-0.20, height ~+0.30, cavity +0.26/+0.468 and compression ~-0.22 goals with either hand. These are controlled feature inputs, not physical recordings. Do not treat them as camera-threshold evidence.
**Blocked / need from you:** all-mode over-height failure, excess-thumb penetration/actual bottom hole, ~7s stretching danger/tear, sustained compression/pancake and final fields/events/save schema. Current v4 engine still clamps these effects; user requirements remain incomplete until your contract arrives. B will integrate geometry rendering, persistence and feedback after that.
**Known issues:** 182 unit/integration tests pass; 34 browser checks pass/2 camera skips; build/typecheck pass. Final tolerance-boundary adjustment verified by unit/integration tests. A transient Firefox pre-page launch error passed on full rerun. Windows WebKit landscape screenshot caveat and physical-camera acceptance remain outstanding. Failure restarts the whole attempt, explicitly labelled.
**Next:** push/deploy the tested frontend; integrate A's forthcoming core changes. Human retest: palm dwell → align each target/release → deliberately overshoot → Try Again. No assistant-performed physical test is claimed.

### 2026-09-30 · B · new user report: palm navigation, geometry targets, failure mechanics
**Done:** diagnosed tiny tutorial completion thresholds (radius 0.003 / height 0.005) that switch the expected gesture almost immediately and stop that action. Current UI requires index pointing, while the new request explicitly expects palm-centre dwell. Full new specification and proposed division are in docs/GESTURES_V5.md.
**Contract changes:** requested from A only; no A-owned files edited.
**For you (A):** please implement V5 core damage/response changes: screen-height instability; excessive thumb penetration → thin floor → real bottom hole; ~7s engaged opening → thin walls → tear; sustained rim compression → pancake. These intentionally replace v4's shallow-only indent and permanent floor/compression clamps. Preserve support/role/freshness rules. Expose geometry, duration, failure causes and hints, and coordinate result schema. B handles palm hit-testing, visible tutorial targets, geometry validation and fail/retry using existing snapshots/commands now.
**Blocked / need from you:** final fields/events/result schema for holes, stretching and pancake; reply with commit when ready. Until then B cannot claim those all-mode physical consequences are implemented. Existing `tutorialStep` without expectedGesture disables actions for matched/failed lesson states, so no extra pause command is needed for the initial B changes.
**Known issues:** user says step 5/6 pressing fails; actual sequence is compression at 5 then final raise at 6. B will clarify labels and require visibly changed target geometry. No new numerical real-hand recordings supplied; do not fabricate them.
**Next:** B frontend implementation/tests; A core contract; integration and deployment after green checks.

### 2026-09-30 10:53 · B · A's real-hand fixes redeployed and public startup verified
**Done:** deployed `d72bfc4` (includes A through `3e2c208`) to https://kiln-delta-rose.vercel.app; Vercel `dpl_2BdBkA13BspgMgFsLuiEyygocvwD` READY. Remote build/typecheck pass. Public Chromium real-model/simulated-camera startup/resize check passes. Local full suite: 171 tests. Local dev server is running at http://127.0.0.1:5173/?dev=1 for the human tester.
**Contract changes:** none.
**For you (A):** your three physical-report fixes are now live; recorder label update is documented. New B regression verifies your reported finger readings reach the dwell adapter and trigger exactly once with either hand despite brief pose dropouts.
**Blocked / need from you:** no fabricated physical results: B's assistant cannot physically make hand poses. Awaiting a human's failing-step description and 2–3 debug-panel captures per pose; these will be appended here for A's threshold work.
**Known issues:** only A's single participant has supplied physical measurements; full post-fix human lesson acceptance, pinch/speed tuning and the previously documented WebKit landscape issue remain pending.
**Next:** refresh the deployed site before retesting; for numbers use the local debug URL above and A's console copy command.

### 2026-09-30 10:52 · B · reviewed A's physical bug report; redeployment prepared
**Done:** pulled through `3e2c208` and reviewed the three newly reported physical bugs: overly strict pointing, dwell pose dropouts and undersized fixed placement zones. No A-owned files edited. Added real-controller-to-dwell regressions using A's measured finger readings, both screen sides and brief synthetic pose dropouts; each activates once. All 171 tests pass. README now documents A's v4 recorder labels; QA distinguishes A's physical evidence from B's numerical replay.
**Contract changes:** none.
**For you (A):** your handoff does contain new actionable information; those fixes are being redeployed immediately after the green build. B's existing both-role six-step integration also passes with your palm-scaled zones.
**Blocked / need from you:** physical testing cannot be performed by this assistant: it cannot pose hands in front of the webcam. A's instruction assigning it to B does not create that capability. A human must supply each failing step, attempted pose and 2–3 actual debug-panel captures; B will record and route them, without fabricating measurements. The user offered a manual report if needed.
**Known issues:** no new regression found in automated checks. A reports only one measured participant; pinch and lift/rim speed thresholds remain unmeasured. Prior Windows WebKit landscape screenshot issue remains documented.
**Next:** deploy this version, run the public real-model/simulated-camera smoke check, and ask the human tester to retry before reporting failures from the older deployment.

### 2026-09-30 09:40 · B · v4 production deployment verified
**Done:** `1df9220` is pushed and deployed to https://kiln-delta-rose.vercel.app. Vercel deployment `dpl_9RBSP1s9BhykamgwLsRmvBz8oMs9` is READY. Public Chromium startup test passed with the real MediaPipe model and simulated camera. Remote build/typecheck passed; local 166 tests and browser results are recorded below and in QA.md. Working tree was clean before this documentation update.
**Contract changes:** none.
**For you (A):** pull main; B's contract migration is complete and build is green. Recorder labels still need your update; physical recordings and threshold tuning remain your core work.
**Blocked / need from you:** real hands: dwell → all six lessons → commission → glaze → result; both hand roles and deliberate incorrect technique/tracking loss. Simulated camera startup does not satisfy T22.
**Known issues:** unresolved Windows Playwright WebKit landscape/compositing screenshot issue; no physical Safari claim. Initial deployment hit npm sandbox EACCES, then transient Vercel Not authorized; approved network execution and retry after successful whoami completed without new sign-in.
**Next:** user/A physical acceptance, then address concrete recognition findings within A/B ownership. All B implementation phases and v4 frontend adapters are delivered; physical acceptance remains pending.

### 2026-09-30 09:18 · B · v4 frontend integration and regression checks
**Done:** integrated A's `6e53ff9` without editing A-owned files. Mock/i18n use the final gestures; six lessons require matching deformation plus actual shape change and release; cavity geometry drives WebGL, fallback, PNG and gallery; activation ring and support highlight use persistent track ids. Schema-2 storage validates floor/wall/derived thickness and migrates schema 1 as solid. New hint params and recovery tips reach the same optional voice. Fixed duplicate phone instructions, hidden landscape warnings, fixture support id and Firefox fade-test timing. README/GIF updated for Avivengers and all four actions; preview is explicitly synthetic.
**Contract changes:** none; all shared types/core remain A's.
**For you (A):** the build is green again. All 166 tests pass, including real-controller six-step flow with BOTH active-hand assignments and one-hand dwell through result saving. Three-engine browser matrix: 31 pass / 2 deliberate non-Chromium camera skips; revised landscape lesson/warning check passes in all three. Please update `tracking/recorder.ts` labels (still `pressDown`, missing `indent/open/compressRim`) before v4-labelled recordings and tune only from real hands.
**Blocked / need from you:** physical-hand acceptance/T22 and recordings. No real-camera gesture validation has been performed by B.
**Known issues:** Windows Playwright WebKit landscape screenshots can omit the WebGL pot after resize although the valid drawing buffer contains ~39,800 opaque pixels. DOM lesson checks pass, so this is separately documented in QA; physical Safari behavior is unknown. Renderer/compositor experiments did not fix it and were reverted. A concurrent stress-test run timed out under browser load; isolated full run passed in 2.26s without changing the test. Nonfatal bundle-size warning remains.
**Next:** push this green integration, deploy, then verify the public real-model/simulated-camera startup. Human hand testing still required.

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
