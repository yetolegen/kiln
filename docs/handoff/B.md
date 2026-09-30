### 2026-09-30 · B · V8.1 LIVE; realistic clay pass verified
**Done:** integrated visual commit `b57755b` on top of A's `f1292dc`, then compatibility correction `e9b04ae`. Final deployment `dpl_AZ3EV8MFdqHuMaPmXDxpdBoLVXSj` READY at https://kiln-delta-rose.vercel.app. Public real-model/simulated-camera startup, V8.1 footer, mirrored video and resize pass. No A-owned files edited; remote rewritten history was preserved via a single-commit rebase, no force push.
**Verification:** 294/294 unit/integration; six final browser feature checks, plus the corrected motion test with Three warnings treated as failures. Typecheck/build and public smoke green. Fixed reflected-light washout, exact texture seam rounding and deprecated shadow-filter selection. The renderer's actual surface pixels move during spin and freeze under reduced motion; the core dimensions stay fixed.
**Contract / For A / Blocked:** no changes or requests. Read below for rendering details. Physical GPU performance and physical hands remain for user testing.
**Next:** user refreshes for V8.1 and checks raw-clay rotation, cavity/tear appearance, inspection and glaze. Continue core/debug work independently.

### 2026-09-30 · B · V8.1 runtime warning correction
**Done:** final dev-server log exposed Three r186 replacing deprecated PCFSoftShadowMap with PCFShadowMap. Select PCFShadowMap explicitly; the rendered filter is identical to the successful screenshot tests. Browser motion test now also rejects Three.js console warnings. No core changes. Preparing final deployment of this correction on top of the visual release.

### 2026-09-30 · B · V8.1 clay appearance and readable wheel rotation
**Done:** user requested a more realistic, visibly spinning clay model while A integrates debugging. Isolated worktree/branch `b/clay-visuals`. Renderer-only appearance: seamless baked slip/pigment/bump/roughness maps, subtle wet clearcoat, procedural room reflections, cavity/contact shadows, and clay smears on the wheel. Clay and wheel share a smoothly accelerated ~3.2 rad/s studio rotation (slower display turntable). Textures move with the pot; they never swim independently or deform the geometry. Reduced motion, inspection, firing and permanent failures stop spinning immediately. Glazes soften the surface relief and gain a smoother finish.
**Contract changes:** none. Core, tracking, gesture thresholds, clay radii/height, cavity/tear geometry, target matching and working palm UI are unchanged. Three textures generated once; mesh/materials reused; textures, shadow map and environment are disposed with the scene.
**Bugs found / fixed:** initial room reflections washed out raw clay (lower exposure/environment intensity); periodic texture endpoints differed by one byte due to floating-point rounding (exact wrap endpoints). Test nullability corrected. Build remains below 500 KB per chunk, no warning.
**Verification:** 294/294 tests, typecheck/build; six final Chromium checks cover actual changing pixels on the clay's front wall, motion freeze, inspection, touch rotation, rim tear, WebGL fallback, glaze/fire/PNG/gallery with and without storage. Four initial V8 browser checks also passed. Surface/rotation unit checks preserve all mesh positions and core dimensions. Final raw clay, successive spin frames, cavity, glaze and torn-wall screenshots reviewed. Synthetic inputs only; physical-hand performance still needs the user.
**For you (A):** remote main was rewritten to `f1292dc`; its tree differs from my prior base only in your new handoff confirmation. I am applying this one visual pass on top of your current history, without force pushing or editing your files. No integration request from core.
**Blocked / known limits:** real GPU/device performance not measured; automated Chromium uses its test renderer. Exact physics/volume model remains unchanged.
**Next:** integrate the isolated commit, deploy V8.1 and verify public startup.

### 2026-09-30 · B · V8.0 LIVE; public verification passed
**Done:** deployed code `3e1fb16` (frontend `ac56066`) to https://kiln-delta-rose.vercel.app. Deployment `dpl_FJcpgxbjC4EFRvGNdsNTKvvoAMYU` READY and production alias updated. Cloud typecheck/build pass without the large-chunk or unbounded-Node-major warning. Public Chromium smoke passes split asset/model loading, V8.0 footer, mirrored simulated camera and phone resize. Final Word proposal is uploaded in the GitHub repository and delivered to the user.
**Contract changes / For A / Blocked:** none; no A-owned source edits. 291 unit/integration + 22 Chromium + 3 applicable WebKit checks passed locally. Firefox harness failure is recorded below. This is not a physical-hand certification.
**Next physical retest:** refresh for V8.0; verify palm menu selection, all shaping actions and release, then «Осмотреть в 3D» → freely drag/zoom, look underneath, return to the calibrated view, Done → glaze → fire. Confirm wall tearing opens from the rim and the old interaction/damage behavior stays intact. No permission requested again; awaiting the user's observations.

### 2026-09-30 · B · deployment warning and CLI scope corrected
**Done:** V8 code `ac56066` uploaded and built on Vercel. Its cloud log exposed a separate unbounded Node major-range warning; package/lock now pin the already-used Node 24.x. No dependency or frontend runtime change. Unscoped CLI deploy returned Not authorized despite valid access; explicit `--scope mansurertaj5-4014` succeeds. README deploy command corrected.
**Contract changes / For A / Blocked:** none. Preparing the final pinned-runtime deployment and public smoke. Previous local gates remain green.

### 2026-09-30 · B · V8.0 frontend and final Word proposal; release verified locally
**Done:** pulled through `67516c6` and preserved A's V7.1/V7.2 contact/jitter corrections, voice removal and session-button lock. Implemented the approved mineral studio design, responsive lesson/action panels (including the 800 px overlap fix), camera-preview toggle, shared wheel/pot rotation, bounded outward splatter and rim-origin tears through the outer wall/lip/inner wall. Delivered and visually reviewed all 13 pages of `docs/KILN Frontend Design Final.docx`.
**Free viewing:** user clarified arbitrary rotation, not a preset-only viewer. «Осмотреть в 3D» supports mouse/touch drag, all azimuths, top/underside, wheel/pinch zoom, arrow/dwell controls and reset. Inspection pauses the controller and lesson progression, removes the wheel obstruction, and restores the calibrated orthographic view on exit. Same snapshot geometry/material in studio/tutorial/glaze/result. No A-owned source edits or new pottery gestures.
**Contract changes:** none. `CoreController.setPaused` is reused. Render effects never modify clay state. Existing weak-band damage determines the end of a continuous tear beginning at the rim; permanent failure mechanics remain A's.
**Bugs found and fixed:** underside lacked illumination (inspection camera fill light); opening/closing inspection rebuilt glaze/result controls (separate content vs dwell revisions); phase changes could leave duplicate inspector buttons (explicit cleanup); older camera-order fixture assumed a centered axis (shared projection); WebKit sent fixture keys before setup finished (readiness wait). Reduced-motion disables decorative spin/splatter. WebGL loss exits inspection and leaves the existing 2D fallback.
**User-requested build warning fix:** lazy hand-tracker import and Vite 8 supported chunk groups for Three core/renderer. Former ~850 KB bundle is now ~154 KB app + 156 KB tracker + 189 KB Three core + 352 KB renderer. Default 500 KB warning limit unchanged; no build warning. Production bundle excludes mock/debug hooks.
**Verification:** 291/291 unit/integration, typecheck/build, 22/22 local Chromium browser checks, and real-model/simulated-camera smoke against the actual production build pass. New V8 mouse/touch rotation, pinch, below-base view, reset/exit, particles, reduced motion, inspection reentry/glaze preservation and phase cleanup covered. Rendering screenshots reviewed. Initial MediaPipe failure was sandbox network denial; same test passes with network permission. Firefox test harness failed creating a page (`_page` undefined) before application load; no Firefox claim.
**For you (A):** no core request. Deformation/damage thresholds stay yours. Updated lesson/studio axis is .56 viewport width at desktop, .66 on tablets, .74 short landscape; core and renderer receive the same projection. Inspect pause keeps fresh landmark observations available for dwell, then resets/rebases input on exit. Current physical retest still required.
**Blocked / known issues:** no Chromium release blocker. Physical-hand/physical-mobile testing cannot be performed by the assistant; all hand inputs are synthetic. Existing Windows WebKit landscape capture limitation remains unverified on Safari. Splatter is visual only; original approximate clay model is unchanged.
**Additional browser result:** WebKit V8 rotation/layout/lifecycle checks 3/3 pass; its CDP touch case is intentionally skipped (Chromium passes it).
**Next:** push, deploy V8.0, public smoke and record deployment. User can then retest with physical hands.

### 2026-09-30 · B · V7.0 LIVE; public smoke passed
**Done:** deployed `b0f7ca4` (A core `f9a60c9` + `967c248`) to https://kiln-delta-rose.vercel.app. Deployment `dpl_8eoEkAJCUJwn2dBayNLxA2r7dErx` READY; production alias updated. Public Chromium check passes real-model load, simulated-camera startup/mirroring, **V7.0** footer and phone resize.
**Verified before release:** 288/288 unit/integration, typecheck/build, 12 local Chromium checks; no remaining V6/V7 acceptance failures. B only changed owned frontend/tests/docs. Known limits: synthetic hands only, approximate non-volume-conserving clay model, existing bundle-size warning.
**Next physical retest:** same lift placement with small fluctuations and slow rise; thumb-only insertion plus too-fast push; slow rim compression; outward release of one/both palms; 20% terminal pancake and 10% local wall tear; Done/restart lock during sculpting then return after release; tutorial completion and Done→glaze→fire. Test free/commission with either active-hand assignment. Await user's results, not additional permission.

### 2026-09-30 17:21 · B · V6/V7 integrated, all gates green, preparing V7.0 deployment
**Done:** pulled A's `f9a60c9` and `967c248`; reviewed both handoff entries. Preserved the two new Russian hints. Tightened the changed flow assertion to the actual first-dent tolerance (absolute error <=.025, rather than decimal rounding). Updated mock pancake to CONFIG.PANCAKE_HEIGHT_WORLD, lesson advice to inward shaping/outward release, README to the actual mechanics, and footer/public smoke to **V7.0**. No A-owned source edits.
**Integration verification:** **288/288 unit/integration tests pass**, including all V6/V7 acceptance cases, both-role full lesson flow, all five actions in free/commission, Done gate and UI lock. Added schema-2/3 .24 pancake migration/round-trip cases and localized tear persistence; all pass. Typecheck/build pass (existing chunk-size warning only). Production assets exclude mock/debug hooks.
**Browser verification:** 12 Chromium checks pass: responsive layout/export; both finishing/storage paths; free/commission action locks and fresh dwell after release; terminal restart; Free Done; lesson completion; palm retry; permanent damage; dwell/HUD; real-core camera-order/geometry confirmation. Reviewed pancake screenshot: actual flat disk, visible failure/restart, Done disabled, V7.0 footer.
**Bug review:** stale B instruction still advertised outward widening and mock pancake still used .65; corrected both. No remaining automated acceptance failures found. New hint text is actionable and routes through existing voice/lesson filtering. Core model still does not conserve volume exactly.
**Release:** user authorized integration/deployment; preparing V7.0 with unchanged accepted lift placement, brief-jitter pause, slow lift/press, continuous thumb-tip depth, outward release, terminal pancake/local wall tear and studio button lock. All assistant hand verification remains synthetic. Next: deploy, public real-model/simulated-camera smoke, then user's physical-hand retest.

### 2026-09-30 · B · lift clarification: PRESERVE placement, fix jitter resets and armed no-op
**User correction:** current hand placement is okay. Camera fluctuations reset lifting; sometimes activation starts/completes but height does not change. This supersedes the prior instruction to tighten under-base acquisition. Preserve current accepted orientations and base zone. Screenshot is optional, not a prerequisite.
**For A:** read the REVISED lift section in `docs/GESTURES_V7.md`. In `studioV7.test.ts`, y=.25 is now a passing preservation control, not a rejection requirement. New real-controller cases reproduce 48→52→48 degree one-frame orientation jitter erasing ~2 s progress; one 33 ms .36 palm/s fluctuation erasing hold; fully armed .05 palm/s upward movement over ~6 s adding zero height. Each reproduces in free/commission with either role. Use continuation hysteresis/bounded pause, preserve progress only across minor brief fluctuations, count only reliable hold time, and detect sustained slow displacement. Pause deformation on questionable/stale frames; no displacement jump on reacquisition; clear sustained departure/support loss/track-role change still cancels. Do not globally widen zones or use a renderer workaround.
**Unchanged scope:** sideways disengagement, 20% terminal pancake, 10% local terminal wall tear, V6 issues and B's completed button lock. Core remains yours; B edited tests/docs only this turn.
**Verification:** revised studioV7 **10 pass / 22 fail / 32 cases**. Full suite **251 pass / 32 fail / 283 cases** (22 V7 + 10 V6 expected unresolved core cases). Additional failures reflect newly added acceptance cases, not runtime changes. Existing placement, UI lock and renderer tests pass. Production remains V5.3; no deployment.
**Fixture follow-up:** cloned the readonly landmark array before adjusting the synthetic orientation. Typecheck passes after this test-only correction; runtime unchanged.
**Next:** implement revised stability requirements and return core commit for B integration/testing/deployment.

### 2026-09-30 16:38 · B · studio V7 button lock implemented; 14 new core regressions for A
**User request:** Free/commission under-base edge-palm lift; terminal pancake at <=20% initial height; terminal local cavity-wall rupture at <=10% original thickness without sag; disable accidental-action controls while sculpting. Full concrete specification and threshold interpretation in `docs/GESTURES_V7.md`.
**Done (B):** Done/restart lock during contact, deformation and arming; stationary contact and brief tracking interruptions preserve the lock. 400 ms fresh disengagement re-enables actions and resets dwell from zero. Disabled entries cannot dispatch and are removed from targets. Menu/sound remain usable. Permanent failure disables Done but exposes restart. Working palm navigation unchanged. No A-owned files edited.
**For A:** run `npm test -- src/ui/studioV7.test.ts` (**6 pass / 14 fail**). Above-base flat hand y=.25 arms lift and increases height 1.2→1.429 (both modes/roles); after valid arming, x=3 hand still lifts to 1.429 (both modes/roles); pressure freezes .695833 instead of <=.24 (both modes/roles); .12 opening-wall clamp prevents 10% tear; critically thin cavity calls thinWall sag instead of permanent wallTorn. Inspect actual QUALIFIES/STEP.pullUp, isHorizontal/inLiftZone, MIN_HEIGHT/PANCAKE_HEIGHT, open/updateCollapse. Preserve 3-second hold, either role, no stale deformation, Done gate and permanent freeze. See V7 spec for localized damage and baseline definitions. Return fix commit; B integrates final contracts and deploys.
**Verification:** full suite 247 passed / 24 failed / 271 total: 14 new V7 cases + the 10 known V6 cases. B lock unit tests and renderer checks pass; real mesh supports local rupture without changing height and a genuinely flat 20% pancake. Build/typecheck pass. Eight relevant Chromium checks pass across the runs: both studio locks, terminal restart, Free Done, both B8 finishing/storage variants, lesson completion and palm retry. Lock screenshot inspected. A browser test initially sampled progress too late after unlock; replaced timing-sensitive polling with frame-by-frame observation of the unlock transition; retest passes.
**Physical evidence:** user's V5.3 report is real-camera evidence; assistant verification is synthetic. Requested under-base pose screenshot/recording; none received yet. No claim that lift physical recognition is fixed.
**Release:** not deployed. Production stays V5.3. Await A's core V7/V6 work, integrate/verify thresholds and storage/lesson implications, then deploy. The 20% and 10% requests supersede the earlier absolute pancake and recoverable thin-wall behavior in these modes.

### 2026-09-30 15:05 · B · V5.3 live; public startup/version verified
**Done:** deployed `0cd501d` (includes A's `2242d15`) to https://kiln-delta-rose.vercel.app. Deployment `dpl_DcH3kKdZw4XMxfkSCjHqYip9Qfu2` READY, production alias updated. Public Chromium smoke passes real-model loading, simulated-camera startup/mirroring, footer **V5.3** and phone resize.
**User-facing changes live:** automatic «Обучение окончено» after final geometry confirmation; advice above heading; explicit palm/click «Готово» in free/commission before glazing; chosen glaze required for firing. Raised hands no longer bypass Done. Existing UI palm interaction preserved.
**Verification/limitations:** studioFlow 8/8; full suite 235 pass / 10 known V6 failures; build and six local browser checks pass, plus public startup smoke. All assistant hand input is synthetic. No claim of physical-hand acceptance or resolution of pending V6 depth/release/slow-press/transition cases. Core remains A-owned, untouched by B this turn.
**Next:** user's physical-hand retest of completed lesson and Done → glaze → firing; A continues the ten V6 core regressions separately.

### 2026-09-30 15:03 · B · A's Done gate verified; V5.3 deployment proceeding
**Done:** pulled/reviewed A's `2242d15`. Studio raised hands no longer invoke finishShaping; the explicit command alone unlocks glazing. No A-owned files edited by B. Updated README to describe the verified control.
**Verification:** `studioFlow` **8/8** passes, including raised-hand bypass prevention, command guards and all five nominal pottery actions in free/commission with either hand. Full suite **235 passed / 10 failed / 245 total**, failures exclusively the existing V6 acceptance cases. Build/typecheck pass; production bundle excludes mock/debug hooks. Six targeted Chromium checks pass: both finishing/storage flows, Free Mode Done, lesson completion, palm retry and dwell/HUD.
**Release decision:** the new lesson-completion/Done flow passes its gates and will deploy as V5.3. This resolves the 15:00 deployment hold for the Done bypass. The ten V6 cases remain separate known core work for A; this release does not claim to resolve them. Existing working palm navigation is preserved. All assistant hand verification is synthetic.
**For A:** user reiterated core ownership; B will send further core changes through handoff. Please continue `src/ui/interactionV6.test.ts`/`docs/GESTURES_V6.md`: thumb-tip depth/jump, outward release, very slow press and action/hint reset. Return a fix commit separately.
**Next:** deploy, verify public V5.3 startup, tell user to perform the physical-hand retest.

### 2026-09-30 15:00 · B · completed lesson + explicit Done UI; deployment held for A's core gate
**User's latest requirement supersedes the 14:46 release plan:** show «Обучение окончено» once final compression reaches the lesson target. In Free Mode and commissions, only explicit «Готово» selection may unlock glazing, then glaze selection unlocks firing. Preserve working palm dwell and all five pottery actions in those modes.
**Done (B):** tutorial enters completed 6/6 immediately after the existing geometry confirmation, freezes clay with no expected gesture, shows completion heading/card/overlay/voice, and remains complete during tracking loss. No final raise or additional release is required. Restart and menu remain usable. Added «Готово» via the existing dwell/click action path in both studio modes; updated instructions/mock/flow tests. Advice remains above the heading. No A-owned files edited.
**For you (A), concrete blocker:** `npm test -- src/ui/studioFlow.test.ts` has **6 passing / 2 failing** cases. Both failures: hold raised hands for 2.5 s in free/commission without dispatching `finishShaping` → core enters `glaze`. Remove the automatic studio `finishShaping(tMs)` path in `src/engine/controller.ts::checkRaise`; studio → glaze must require the existing explicit `finishShaping` command. Preserve guards on selectGlaze/confirmGlaze and fresh tracking/deformation. Update your core tests that expect raise-to-finish. B no longer sends `expectedGesture: 'raise'` for the final lesson. No contract change is needed. Return the fix commit.
**Parity verified:** four real-controller cases run all five actions sequentially in free and commission with each active-hand assignment: outer narrowing, height increase, indentation, cavity widening/deepening with thinner walls, and vertical compression. Geometry changes are asserted. Two command-gate cases confirm selectGlaze/confirmGlaze cannot skip shaping, and firing requires a chosen glaze. These controlled nominal trajectories pass; they do not fix the ten V6 edge cases in `src/ui/interactionV6.test.ts`.
**Verification:** full suite **233 passed / 12 failed / 245 total**. Failures are the two new core gate cases plus the ten known V6 cases. Build/typecheck pass. Seven Chromium checks pass: layout/export, both B8 finishing/storage flows via palm Done, lesson completion, palm retry, dwell/HUD, and Free Mode Done gate. Completion landscape screenshot inspected. Fixed a stale mock unit fixture that attempted firing straight from menu after the mock guards were corrected. All assistant hand inputs are synthetic; no new physical-camera verification.
**Release:** DO NOT deploy the current button-only claim with the real-core raised-hands bypass. Local version remains V5.3 prepared; production remains V5.2. Earlier 14:46 permission to ship the frontend-only changes is superseded by this user's new flow requirement. Await A's gate/V6 integration, rerun affected tests, deploy and request physical retest.

### 2026-09-30 14:46 · B · screenshot correction + V5.3 frontend release prepared
**Done:** user supplied local screenshot `Screenshot 2026-09-30 143552.png` and corrected the report: vertical compression works. Screenshot visibly shows **Цель 6/6**, plus **tracking lost**. Compression has already passed; pressing is intentionally disabled on final review. Finishing requires both open palms raised above the pot for 1.5 s with reliable tracking. Do not diagnose this screenshot as a pre-arming failure.
**Frontend fix:** `lessonFeedback` fell through to “lower the palm” when step 6's raise gesture was already recognized. It now always gives the finish instruction. Final guidance is prominent above the heading and beside the silhouette. All advice banners now sit before the heading in document flow; action hit rectangles refresh after the layout changes. Tutorial card follows the controls. Testing found landscape overflow from duplicate tracking/final feedback; duplicates removed and final/failed cards verified inside the viewport. Palm dwell logic unchanged.
**For you (A):** this correction supersedes the physical “circle never fills” claim below. The ten synthetic V6 regressions remain real specification gaps, but are not established as this screenshot's cause. Continue core V6 work separately; no A-owned source files edited here.
**Verification:** full run 227 passed / 10 failed, all failures the previously documented pending V6 core acceptance cases. Existing and new B tests pass; typecheck/build pass. Four targeted Chromium checks pass (lessons, palm retry, dwell/HUD, real-core camera-order confirmation); final lesson rerun passes after the landscape fix. Screenshots inspected. Production assets exclude mock/debug hooks.
**Release scope:** publish these verified frontend corrections as **V5.3**, retaining the exact V5.2 core. This does not claim V6 thumb depth, release or slow-pressure core behavior is fixed. User's prior production deployment authorization persists.
**Next:** deploy V5.3, verify public version/startup, tell user to raise both hands at 6/6; A's separate V6 changes still await integration.

### 2026-09-30 14:30 · B · V6 frontend fixes + ten core regressions; A needed
**Done:** investigated user's post-V5.2 report; frontend technique hints are scoped to current lesson/session and intended action, old speech cancels at transition, tutorial message caches reset. Added thumb safe-depth instructions and a yellow limit from `safeIndentDepthWorld`; actual cavity cross-section, wall-width and depth proportions visible in studio/tutorial. These read existing clay geometry, never deform it. UI dwell untouched; no A-owned files edited in this task. Detailed specification: `docs/GESTURES_V6.md`.
**Contract changes:** none yet. Core needs continuous thumb-tip motion/speed, vertical compression activation/slow motion, clear outward release, and action/hint reset at tutorial boundaries. Proposed new speed hint reasons are in V6 spec; report final names before B integration.
**For you (A):** run `npm test -- src/ui/interactionV6.test.ts`. **10 fail, 2 pass.** Reproduced: stationary-palm thumb-tip insertion produces zero depth (both roles); first indentation jumps .12; withdrawal increases radius .85→~1.45 (both assignments); .05 palm/s downward press never reduces height (both roles); compress step receives lift coaching; opening engagement can persist into compression and prevent rim arming (both roles). Two passing controls prove cavity expansion already decreases actual wall/floor thickness and real mesh wall width. Do not implement fake thinning or conflate these interactions.
**Latest physical clarification:** user says lesson 5/6 activation circle **never fills**, with flat palm above rim/support at side. This fails BEFORE pressure motion, so the low-speed cutoff alone is not the physical diagnosis. B requested screenshot including hands/current hint; none received yet. Check expected-action filtering, previous opening engagement and all pre-arming predicates; do not merely increase deformation gain. No real landmark recordings supplied.
**Blocked / need from you:** user keeps core with A; prior direct authorization for the external compression fix was completed separately. Please pull, implement V6 core requirements, update the old OPTIONAL outward-widening tests to the new withdrawal-release requirement, and return a fix commit. B will integrate final reasons/geometry targets, verify and deploy. New regressions intentionally leave main's suite red; do not deploy this as a completed V6.
**Known issues / verification:** full suite **226 pass / 10 fail**, failures exclusively new core regressions. Typecheck/build pass. Three targeted Chromium checks pass (lesson geometry/release, palm retry, camera-order real-core confirmation); updated lesson screenshots inspected at desktop, 390×844 and 844×390. Fixed two new test-fixture issues during verification (mock needed projection/distinct sample times; typed-array generic). No runtime bugs found in the completed B fixes. All assistant hand testing remains synthetic. Actual volume conservation is not implemented by existing core; spec calls out geometry/target implications if changed.
**Next:** A core fix + user's pre-arming screenshot; then B integration/full tests and a separately identified deployment. Production remains V5.2 with the reported interaction bugs.

### 2026-09-30 13:53 · B · V5.2 live; public startup/version verified
**Done:** deployed `b63f4a4` (includes core fix `5dfaa50`) to https://kiln-delta-rose.vercel.app. Vercel deployment `dpl_2pF7P8xYe8mkmqB7nKX7Kt9TNXRc` is READY; production alias updated. Public Chromium real-model/simulated-camera test passes startup, footer V5.2, video mirroring and resize. Pre-deploy gate: 221 unit tests, build/typecheck and four targeted Chromium dwell/lesson/camera-order checks pass.
**Contract changes:** none. Working UI interaction preserved.
**For you (A):** external compression fix is live; awaiting user's physical-hand result.
**Blocked / need from you:** none for deployment.
**Known issues:** physical-hand post-fix behavior has not been verified by the assistant. Browser startup used a simulated camera; movement regressions used synthetic hand input. Existing bundle warning/WebKit screenshot limitation remain.
**Next:** user hard-refreshes, confirms V5.2, tests slow inward external palms, stationary hold, outward movement and release/reacquisition; internal pinch-spread should still widen only the opening.

### 2026-09-30 13:51 · B · V5.2 verification passed, deploying compression fix
**Done:** pulled/reviewed `5dfaa50` and its handoff. Re-ran the full suite: 221/221 pass, including all six original external compression/cavity separation regressions and both-hand lesson flows. Typecheck/build pass. Four targeted Chromium browser checks pass: geometry lessons/release, palm retry, dwell/HUD and camera-order real-core first-target confirmation. Production assets exclude mock/debug/synthetic-camera markers. Footer and public smoke assertion now identify V5.2.
**Contract changes:** none from B. Working UI navigation implementation unchanged.
**For you (A):** signed outer-palm motion and reference resets verified; no integration blocker found.
**Blocked / need from you:** none. User explicitly requested deployment after verification.
**Known issues:** existing bundle-size warning only. Automated hand inputs are synthetic; post-deployment physical-hand retest remains for the user.
**Next:** deploy V5.2, verify public real-model/camera startup and version, then report live readiness.

### 2026-09-30 13:48 · external compression core fix, ready for B verification/deployment
**Done:** implemented the core correction following the user's direct follow-up request to fix it and return a commit. External shaping now applies signed changes in palm half-gap to the current outer profile (negative = inward/narrower, positive = outward/wider). Gaussian band falloff and the per-second radial speed cap remain. Acquisition and stationary holds cause no deformation; no absolute palm-spacing target or smoothing backlog remains. Internal cavity expansion and UI interaction code are unchanged.
**Contract changes:** no `types.ts` / snapshot field changes. Internal `ContactResult.targetRadiusWorld` renamed `halfGapWorld` to distinguish a measurement from a clay target. Internal `ActionDelta` adds `shapeWorld`; callers should spread `NO_DELTA`. Snapshot `targetRadiusWorld` now describes the local radius plus this observation's travel and is null when no shaping movement occurs. Removed unused `SHAPE_GAIN` (absolute-target relaxation no longer applies).
**For verification/deploy:** `npm test -- src/ui/externalCompression.test.ts` passes all 6 acceptance cases unchanged. Full suite **221/221** passes; build/typecheck pass (existing bundle-size warning only). Chromium camera-order browser test passes palm dwell, entry into tutorial and real geometry target confirmation with synthetic landmarks. No deployment made, as this request asks for a fix commit for B to verify/deploy.
**Reset coverage:** contact/tracking loss, invalid/stale samples, long observation gaps without a render tick, invalid velocity, pose change, band change, track swap, epoch, projection, pause, restart and tutorial-step changes rebase movement. Duplicate observations/render ticks cannot replay it. Inward/outward/reversal/still-hold checks and a nonuniform-profile test verify signed geometry changes. Permanent-failure tests now supply a real shaping delta and still pass.
**Test fixture changes:** older tests held palms at fixed coordinates while expecting motion, including tear tests with high velocity but stationary positions. Replaced those with moving wall fixtures. Updated B's `src/ui/flow.test.ts` and `src/browser/timing.pw.ts` fixtures to make an inward stroke; both-hand complete lesson/commission/storage flow passes. Production UI, dwell, renderer, lesson validation and thresholds were not edited.
**Blocked / need from you:** none for code integration. B can verify and deploy this commit, then request the physical inward-palm retest.
**Known issues:** all new verification is automated/synthetic; the user's physical report established the pre-fix bug, not post-fix acceptance. The V5.1 production deployment is unchanged until B deploys.
**Next:** physical test after deployment: enter by palm dwell; slowly bring outside palms together and confirm narrowing; hold still; move outward while maintaining contact; release/reacquire. Confirm internal pinch-spread still opens the cavity separately.

### 2026-09-30 13:38 · B · reproduced external compression reversal; core fix needed
**Done:** user confirms V5.1 palm UI buttons work correctly and explicitly requests preserving them. Same user's Chrome / Acer Nitro 5 AN515-58 physical report: two external palms moving inward widen the clay. Inspected actual contact, recognizer and clay code; reproduced through the real controller in `src/ui/externalCompression.test.ts`, in free/tutorial with both track assignments. No runtime/UI files changed.
**Contract changes:** none.
**For you (A):** run `npm test -- src/ui/externalCompression.test.ts`. Four failing external-compression cases, two passing internal-opening cases. With initial radius 1.0 and palm half-gap decreasing 1.4 → 1.103 over 1.98 s, radius grows to 1.265 at frame 30 and ends 1.1484. Contact is valid, gesture is shape, cavity stays 0/0. This is geometry, not the renderer.

Root cause chain:
- `engine/contact.ts` accepts palms outside the wall within palm-scaled reach, then returns `targetRadiusWorld = (rx - lx) / 2`.
- `tracking/gestures.ts` treats valid shape contact as deforming and forwards that absolute target.
- `engine/clay.ts::shape` moves each radius toward that target with `(R - radius) * a`. Target remains larger than clay during the beginning of an inward stroke, so radius INCREASES. The final subtraction's sign is correct for its supplied target; globally negating it would break convergence.
- `open()` is already a separate branch changing cavity radius/depth only. Its two control cases pass and outer radii remain unchanged.

Requested core implementation: establish a contact-relative shape reference when stable external contact starts (current local clay radius and half-gap); decreasing gap must produce a negative radial change, even while palm centres remain outside the wall. For example, derive the shape target from `radiusAtContact + gain * (halfGapNow - halfGapAtContact)`, with gain > 0, rather than absolute palm-centre distance. Gate application by actual fresh inward/outward movement so smoothing toward a former wider target cannot grow the clay during inward motion. No acquisition jump or held-palm inflation. Reset/rebase reference on contact/tracking loss, epoch/restart/phase or gesture changes, track changes, and band changes; never carry displacement across missing samples. Preserve reach accessibility, current UI navigation, all one-hand actions and permanent-failure freeze. Either omit outward widening or allow it only on outward motion while contact is maintained. Keep cavity expansion exclusively in its existing internal pinch-spread path.

Please add your core coverage for contact acquisition/hold, inward stroke, direction reversal if supported, lost/reacquired input and band changes; make these B regressions green too. Existing synthetic browser/tutorial fixtures may need inward motion after this change: notify B rather than retaining absolute-gap inflation to accommodate fixtures.
**Blocked / need from you:** A owns core per user's explicit instruction. Please implement/push the fix and return commit. B will verify integration and deploy after green checks. This handoff deliberately includes failing acceptance regressions; do not mark the issue resolved yet.
**Known issues:** full suite 199 passed / 4 failed (only the new external compression cases), typecheck passes. Synthetic HandFeatures reproduce the reported geometry defect; this is not an assistant-performed physical camera test. No deployment made; working V5.1 UI remains live.
**Next:** A fixes deformation; B runs regression/full suite and browser lesson integration, deploys, then user retests slow inward palms without a mouse.

### 2026-09-30 13:25 · B · V5.1 deployed; public version/camera verified
**Done:** deployed a0f09fd to https://kiln-delta-rose.vercel.app, Vercel dpl_Q8gjZQtmcgF71bkyUA9Cz3g6gbkD READY. Public Chromium real-model/simulated-camera test passes and explicitly checks footer V5.1, mirrored video and resize. Remote build/typecheck passed. Production assets contain no mock/debug/synthetic-camera hooks.
**Contract changes:** none; A-owned files unchanged.
**For you (A):** user's current-V5 Acer Nitro 5/Chrome report and the reproduced B callback-clock bug are documented below. The corrected frame clock and visible UI cursor are now live.
**Blocked / need from you:** none for deployment. Post-fix physical acceptance is pending; no actual hand recording was made by B.
**Known issues:** the controlled raw-landmark regression passes; this does not certify the user's real-hand gesture thresholds. Previous WebKit landscape screenshot caveat remains.
**Next:** user Ctrl+Shift+R, confirm V5.1 footer, retest palm dwell and lesson target/release flow. Any remaining physical recognition failure needs its step and real debug readings for A.

### 2026-09-30 13:23 · B · continuing real-hand report: render-clock and cursor-layer fixes
**Done:** user confirmed public V5 in Chrome on Acer Nitro 5 AN515-58, with cyan targets and geometry percentages. Reproduced a B render-clock mismatch: a fresh camera sample can be newer than the rAF timestamp, so dwell resets and lesson confirmation repeatedly resets after freezing clay at target. Main now samples performance.now() on callback entry. New raw-landmark browser regression fails at menu dwell before the fix, then passes real feature/core/dwell/first-target confirmation after it. Cursor SVG now renders above buttons; fresh palm centres are marked. Footer identifies V5.1.
**Contract changes:** none; no A-owned files edited.
**For you (A):** this report is on current V5 and has no numerical landmark capture yet. The confirmed timing/UI faults are B's, fixed here; no core recognition thresholds were loosened. Existing 197 unit tests, both-hand action/damage flows, and build/typecheck pass.
**Blocked / need from you:** none for this deployment. If a physical action still fails after V5.1, actual panel values are needed for your recognition work; do not substitute the synthetic regression for physical recordings.
**Known issues:** 5 targeted Chromium checks and all 6 cross-browser B7 lesson/retry checks pass. New camera-order test replaces the landmark provider and callback ordering only; real feature/controller/UI run. V5 retained-hand test now excludes the persistent ceiling line. Physical V5.1 acceptance and Windows WebKit screenshot caveat remain pending.
**Next:** deploy V5.1 and verify public startup/version; user retest with the visible footer version.

### 2026-09-30 12:53 · B · V5 deployed and public startup verified
**Done:** deployed code 5e502a7 (includes A's f95ff07) to https://kiln-delta-rose.vercel.app. Vercel dpl_5SaXQBcgRRPB1kXryP6YtjpWmrKY is READY; remote build/typecheck passed. Public Chromium check passed with the real MediaPipe model and simulated camera: startup, mirrored video and phone resize. Local gate: 197/197 tests, build/typecheck pass. Production bundle contains no mock/debug/recorder markers.
**Contract changes:** none.
**For you (A):** the permanent-hole fix and complete V5 frontend are now live. Your core f95ff07 resolves the only failing regression. Both-hand synthetic lessons and damage flows pass.
**Blocked / need from you:** none for deployment. Human camera acceptance remains pending; B has not fabricated physical gestures or recordings.
**Known issues:** Windows WebKit landscape screenshot limitation remains documented. Public test initially hit sandbox ERR_NETWORK_ACCESS_DENIED; approved outside-sandbox run passed.
**Next:** human refresh/retest: palm dwell, each target/release, pressing at step 5, final raise at step 6, incorrect technique/failure/retry. Route numerical tracking failures to A.

### 2026-09-30 12:51 · B · permanent-failure fix verified; V5 deployment proceeding
**Done:** pulled A's f95ff07. Full local suite 197/197 passes, including both active-hand damageFlow regressions; typecheck/build pass. Reviewed freeze guard and first-cause preservation. No A-owned files edited. QA and V5 docs mark the blocker resolved.
**Contract changes:** none.
**For you (A):** your fix resolves the actual zero-radius/cause-overwrite reproduction. Updated frontend browser evidence remains 15 passing Chromium/Firefox/WebKit checks from the preceding integration.
**Blocked / need from you:** none for deployment; user explicitly authorized it.
**Known issues:** physical-hand acceptance not performed by this assistant; Windows WebKit landscape screenshot caveat remains documented.
**Next:** deploy V5, run the public real-model/simulated-camera startup test, record deployment identity and URL.

### 2026-09-30 12:42 · B · verification complete; only core permanence bug blocks deployment
**Done:** all 15 updated B7/B8/V5 browser checks pass across Chromium, Firefox and WebKit; build/typecheck pass. Full current unit suite: 195 pass, 2 fail, both reproducing the permanent-hole corruption described below. Hole/ceiling annotations improved for contrast; screenshots inspected. QA and V5 documentation now reflect the integration and exact outstanding regression.
**Contract changes:** none.
**For you (A):** the repro in 86c43f9 remains the only failing gate. Freeze or preserve geometry/cause after permanent failure; send the commit when pushed.
**Blocked / need from you:** that core fix before production deployment. Live site still serves the previous deployment, not this V5 revision.
**Known issues:** physical-camera acceptance remains unverified by B; Windows WebKit landscape screenshot caveat remains. Firefox pre-page sandbox launch failures were resolved by the approved browser run outside the sandbox.
**Next:** pull A's fix, verify regression/build, deploy, verify public camera startup.

### 2026-09-30 12:38 · B · V5 integrated; permanent-hole regression needs A before deploy
**Done:** pulled 9dbaca1; new mock fields, RU danger/permanent-failure text + voice, schema-3 validation and v1/v2 migration, open-floor mesh, visible torn-wall faces, ceiling/cutaway overlays, gallery/result feedback. Geometry-led lessons still pass both role assignments. Added src/ui/damageFlow.test.ts through the real controller: deep thumb → hole; continuous press → pancake; held opening → 7s warning/10s tear; tracking loss cancels stretching (both active hands).
**Contract changes:** none by B.
**For you (A), confirmed core bug:** after making a bottom hole, keep supporting the wall, arm rim compression, then descend for 4s. Both roles produce `{bottomHole:true,cavityRadiusWorld:0,cavityDepthWorld:0.6,height:0.6,collapseCause:'pancake'}`. This violates permanent failure/cavity invariants and schema-3 storage correctly rejects it. `stepClay` still calls compressRim while permanently failed, and fail('pancake') overwrites bottomHole. Please freeze geometry/deformation for permanent causes (bottomHole/wallTorn/pancake) or otherwise preserve the first cause and a valid nonzero hole; these are restart-only states. Keep recoverable thinWall/tooTall compression working.
**Reproduce:** `npm test -- src/ui/damageFlow.test.ts` — two failures at the permanent-hole assertion, one per active hand. Exact actual fields are in the assertion message. B has not edited your files.
**Blocked / need from you:** core fix commit; deployment held until the regression is green. Earlier 193 tests passed before extending the permanence check; the new 4-test file currently has 2 pass/2 fail. Typecheck passes. Updated Chromium lesson/result/failure browser checks pass; Firefox checks pass outside the sandbox after pre-page launch errors inside it; WebKit checks finishing.
**Known issues:** physical hand acceptance still unavailable to this assistant; no invented recordings. Windows WebKit landscape screenshot limitation persists.
**Next:** pull core fix, run gates, deploy and public-camera smoke test.

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
