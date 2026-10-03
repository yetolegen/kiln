# Handoff log: A (Yerassyl)

Newest entry at the top. Written by A, read by B.

### 2026-10-03 · A · your `final/motion-update` reviewed, integrated and fixed (branch `integrate/motion-update`)
**Integrated:** `integrate/motion-update` = `feat/local-widening` (main + yesterday's QA fixes + V9.2 local widening) merged with your `7dfa1f6`. The only textual conflict was README.md (your newer sections taken). Unit 386/387 before fixes (T11 is the known 5 s timing flake), Playwright (Chrome channel, project named `chromium` so your baselines match) **59/59** including your 36 screenshots.
**ECC review of your branch (code, security, silent failures):** nothing blocking. Restore fully resets transient input (a held press cannot re-damage a restored pot), checkpoints are deep copies, restore is limited to safe phases, the gallery accepts all 8 glazes × attachments × stamps through storage and share round trips, share-link decoding is size- and schema-bounded with no injection sink. Nice work.
**Fixed (each with a test that failed first):**
- core `controller.ts`: restore now emits the **end** events of episodes it closes (they were dropped); a new session or input epoch clears `restoredAtMs` (a restarted clock dropped every frame); snapshots hand out a **deep-frozen copy** of `customization` (it was the live object).
- `main.ts`: a `#pot=` link pasted into an open workshop tab now reloads into the viewer (it did nothing). New Playwright test at the end of `final.pw.ts`.
- `shareCodec.ts`: new `ShareUnsupportedError`; browsers without (De)CompressionStream get a Russian "this browser can't open/create KILN links" message instead of a raw ReferenceError or «Ссылка повреждена». Unit test in `shareCodec.test.ts`.
- `recovery.ts`: the restore confirmation names the checkpoint's mode when it differs (restore silently switched free ↔ commission); a snapshot the store rejects gets its own message and a `console.warn` (it blamed the user's hands).
- `toolLessons.ts`: if the training pot cannot be prepared or restored, a modal says so (it returned silently or ran on the wrong pot).
- `vercel.json`: `nosniff`, `Referrer-Policy`, `Permissions-Policy: camera=(self)`. **No CSP / frame-ancestors yet:** verify MediaPipe WASM + CDN under a CSP on a preview deploy first, and frame blocking would break an embedded demo.
**For you (B):** deploy from `integrate/motion-update` once you've looked (it contains your whole branch). Physical-camera checklist from your FINAL_TEST_REPORT still applies, plus V9.2 local widening and the new `widenNotLevel` hint (below).

### 2026-10-03 · A · ECC review pass on `feat/local-widening`
**Ran:** ECC formatter gate (no-op: the repo has no Biome/Prettier), ECC code-reviewer ×3, typescript-reviewer, silent-failure-hunter, pr-test-analyzer. ECC `orch-review` could not run here (its Workflow tool is unavailable).
- `b39eed8` tests: real-scale guards (too fast with its hint, vertical, one-sided) still block with pinch-point contact; `gripPoint`; outside widen placed at `widenBandY`.
- `92bfdd1` refactor (behavior-neutral, reviewed): `ExternalWiden.update` returns `GripResult | null` with `y` always; grip points computed once per frame.
- **fix (contract change):** new `NearMissReason` **`'widenNotLevel'`** (text in `i18n.ts`, priority/severity in `hints.ts`): an armed grip stopped by a vertical move now says so until the pinches open. Pinches held near but off the walls now get a widen near-miss (`handsTooFar` / `handsUneven` with `intended: 'widen'`) instead of silence; its zone grows with the palm. Please make sure your UI shows `widenNotLevel` like `widenTooFast`.
- Playtest note: with the support hand pinched at a wall and the other pinch inside the opening before the opening action arms, the studio may show the widen hint. If seen, exclude pinches inside the opening.
**For you (B), found in your files, not changed by me (you are rewriting saving):**
- `storage.ts` load: `.filter(isSessionResult)` drops invalid pots silently; the next `save()` overwrites the key, so they are lost for good. Same for a raw string over 2,000,000 chars, and a corrupt JSON string is overwritten on the next save without a backup.
- `finishing.ts:15` ignores `store.save()`'s result, and `save()` returns true even when `setItem` threw. The result screen can say «Сохранено на полке…» when nothing was stored.
- Suggestions: count and log rejected pots, keep a `.bak` copy before overwriting, return saved/memory-only/rejected from `save()` and show it, and add a test that runs the validator on the controller's real result pots.

### 2026-10-03 · A · V9.2 local outside widening (branch `feat/local-widening`, Mansur's point 4)
**Changed:** the two-pinch outside widening no longer grows every band. It widens around the grip's height with the same Gaussian as shaping (`shape()` with `widenBandY`). The gesture, 0.5 s hold, release, guards and glitch grace are unchanged; no new gesture (open palms spreading stays the release).
- **Grip point = pinch point** (midpoint of thumb and index tips), not the palm. At real scale the palm sits about a palm above the pinch, so palm-based contact could never grip the upper wall (y=0.9 on a 1.2 pot gave `handsTooFar`). The grip's contact is now judged at the pinch points, and while the grip is active `GestureState.contact` is that grip contact, so your overlay rings work on the upper wall too.
- **Lesson step 2 (index 1):** the target is a local +0.18 bump, accepted at any centre within ±6 bands of band 24 (same search as step 1's narrowing). A whole-body widening now fails it. Title «Расширьте середину», hint and studio/too-narrow copy updated; MockCore `g` makes a local bump.
**Files you also touch on `final/motion-update` (expect small conflicts):** `src/ui/tutorial.ts` (step 2 title/hint only), `src/ui/tutorialGeometry.ts` (steps 1–2 target), `src/dev/mockCore.ts` (one line), `src/i18n.ts` (two strings), `src/browser/app.pw.ts` (B7 title), both READMEs (widening sentences only).
**Verification:** unit 339/339 (new `tests/localWidenReal.test.ts` at real palm scale: peak at the pinch band for y=0.3/0.6/0.9, base and rim unchanged), typecheck and build clean. ECC code review: nothing blocking. Playwright (Chrome) 26/27 after the B7 title fix; B6 still fails on clean source too (see the entry below). Two other failures in the full run passed on rerun (load flakes). Synthetic hands only.
**For you (B):** merge after your branch lands, or rebase onto it; please keep `widenBandY` in your ActionDelta handling.
**Also fixed (same branch): brisk strokes failed lesson steps 1 and 2.** `shape()` clamped the speed cap per band, so a stroke above ~0.75 palm/s (real scale; still under the too-fast limit) became a flat, wide plateau whose flanks overshot the target: step 1 failed «Стенки вышли…», step 2 «Корпус шире образца», 10/10 at 1.0 palm/s. The stroke is now capped first and then spread with the Gaussian, so a fast stroke deforms slower but keeps its shape. Likely part of the earlier physical «too deeply cut» lesson reports. `tests/lessonRealScale.test.ts` drives both steps through the real lesson script at real palm scale with jitter (all fast cases failed before).

### 2026-10-03 · A · QA pass: 8 real-hand bugs fixed (user asked to fix all, including two in B files)
**How found:** a QA agent drove the real controller at test scale and at real scale (215 px palm, 145 px/unit, `tests/realScale.ts`). Every repro is in `tests/qaRegressions.test.ts` and failed on `97bf882`.
- **Outside widening never armed after pinching on the move** (`externalWiden.ts`): pinching while bringing the hands in, or moving them up or down, blocked the grip silently until the pinches opened. Before arming, motion now only restarts the 0.5 s hold. After arming, `widenTooFast` stays shown until release (it used to vanish as soon as the hands slowed).
- **One glitchy frame ended an action** (`gestures.ts` runAction, `externalWiden.ts`): a misread finger, a loose-pinch frame or the support palm flickering off its wall now pauses the action for up to `LIFT_GRACE_MS` (250 ms) instead of ending it. With one glitch per second, rim press went 0.198 → 0.445 of 0.445, inside widen 0.050 → 0.174 of 0.179, outside widen 0.054 → full. A latched too-fast cancel still ends at once. **While paused, `activationProgress` is 0**, so your lesson still sees a release immediately. **Not changed:** losing a hand from tracking still ends everything, as both our specs say.
- **Narrowing lost at a band boundary** (`gestures.ts` shape): every band change rebased the touch, and a band is ~4 px, so 0.18 px of palm noise gave 0 narrowing (clean: 0.378). Moving up to 2 bands per frame now stays continuous. A bigger jump still rebases (your `externalCompression` test passes).
- **Raise in the studio** stole rim presses with a high support palm and top-band shaping, and did nothing. Raise is now only recognised in a lesson step that expects it.
- **Lift zone vs rim zone at real palm size:** they overlapped on any pot under ~1.18, and the rim press (tried first) took every lift. Where they overlap, the nearer of base and rim wins. Pots without overlap keep the old zones.
- **Lesson dent step skipped its window:** a press under `indentTooFast` could deepen ~0.09 in one frame at real scale, past the ±0.025 window, so the lesson failed and restarted. The dent now deepens at most `INDENT_MAX_DEPTH_PER_S` (0.6/s), like `MAX_DR_PER_S` for shaping.
- **B file `src/i18n.ts`:** the `tooNarrow` advice told a solid pot to use its opening. `rules.ts` now passes `opening: 'yes'|'no'`; without an opening the text describes the outside pinch-spread.
- **B file `src/browser/storage.ts`:** gallery validation computed the cavity start band with an algebraically equal formula that rounds differently, and silently rejected about 1 in 70,000 valid pots. It now imports the engine's `cavityStartBand`.
**Verification:** unit 335/335, typecheck and build clean, 40 fuzz seeds with no invariant broken. Playwright (Chrome channel) 26/27. **B6 fails on clean source too:** it expects «Слишком быстро» but your V9 spoiled-clay banner now shows instead. Please update B6. Synthetic hands only.
**For you (B):** please deploy and update B6. A one-frame tracking dropout still re-arms every action (lift needs another 3 s). If physical tests show that hurts, we should agree on a grace for it together.

### 2026-10-02 · A · V9.1 outside widening reviewed: slow height drift ended strokes silently
**Reviewed** your `externalWiden.ts` / `gestures.ts` / `clay.ts` change. Arbitration, radius clamping (`MAX_R`) and release are fine.
**Bug:** the vertical guard compared the grip's height with where it STARTED (limit ≈ 0.2 palm, ~40 px on a real hand). Natural drift while holding still, or a spread that arcs slightly down, used up that budget. The stroke then stopped for good with gesture still `widen`, contact valid and no near-miss: the rings just vanished. A 0.16 palm/s arc stopped at frame 37 of 40; slow long spreads stopped too.
**Fix:** the height anchor now follows slow drift (up to 0.25 palm/s). Only a vertical move faster than that, or a jump, blocks. Your 'vertical' case still passes.
**Tests:** `tests/externalWidenDrift.test.ts` (two cases fail without the fix, plus a withdrawal case that must still block). Unit 324/324, typecheck, build clean. Synthetic hands only.
**For you (B):** please deploy. Optional: a blocked grip still shows no hint unless it was too fast; a near-miss telling the user to open their fingers and re-grip would help.

### 2026-09-30 · A · debugging pass 2: webcam fingertip jitter was cancelling three actions
**Found by simulating realistic landmark jitter (MediaPipe fingertips move ±3–5 px per frame; only the palm is One-Euro filtered):**
- `84be46e` **Pinch-spread (open) almost never worked:** at ±3 px per tip, a slow spread read as >1.5 ratio/s. It cancelled 63 times in 2.5 s and the opening stayed at the dent size (0.12 instead of 0.42). The spread rate is now smoothed over ~100 ms. An abrupt spread still cancels.
- `fa0c157` **Thumb dent:** at ±5 px a slow press was rejected as too fast most of the time and lost half its depth. The tip speed is now smoothed over ~100 ms. A real fast push (≥ ~100 ms) is still rejected.
- `9d80c4a` **Widen (V8.2):** same cause, with half to a quarter of the widening lost. It now uses the filtered palm velocity.
- `3cbf617` **Widen (V8.2) stole rim compression:** a flat rim hand over an opened pot, index tip dipping into the opening, became widen. Widen now needs the index finger pointing down (knuckle → tip within 50° of vertical).
**Verification:** each fix has a test that fails without it. Unit 303/303 on top of your `ee0f93a`, Playwright 24/24 (Chrome, before your commit), build clean. Contracts are unchanged since V8.2. One B test edited: your `studioFlow.test.ts` widen fixture had the index knuckle at the fingertip (a finger with no direction); I added the knuckle 60 px above the tip. The rest of your V8.3 flow passes as written.
**For you (B):** please deploy on top of your V8.3. The pinch-spread fix matters most for the lesson's step 4.

### 2026-09-30 · A · V8.2 core: widen the pot from inside (user request)
**User request:** the pot can only get narrower; add widening "like in real life".
**Gesture `widen` (new `Gesture`/`ActionGesture` value):** needs an opening. The working hand's index finger points down into the opening, with the fingertip as the hand's lowest point. The other palm supports a side wall. Hold ~0.3 s (activationProgress fills), then push the fingertip sideways toward either wall: the wall bulges out at the fingertip's height (the same Gaussian as shaping, gain 0.7). Holding still or pulling back adds nothing. Leaving the opening, pinching or turning the thumb down releases. Pushing faster than 1.5 palm/s cancels with the new near-miss `widenTooFast`. Pinch-spread is still `open`; thumb-down is still `indent`.
**Contract changes (please wire up):**
- `Gesture`/`ActionGesture` gain `'widen'`; `NearMissReason` gains `'widenTooFast'`; `ActionDelta` gains `widenWorld`/`widenBandY`.
- In `src/i18n.ts` (edited by A): gesture label «Расширяем стенку», `widenTooFast` text, and the targetMismatch `tooNarrow` advice now explains the inside push. It used to say «разведи руки шире», which now releases the clay.
- `storage.ts` GESTURES now includes `'widen'`, otherwise saved pots with it failed validation.
- New `noSupport` near-miss with `intended: 'widen'`. In the studio the «pinch first» hint no longer fires for a finger pointing down into the opening.
**Studio/commission only.** Not in the lesson (the tutorial only recognizes its expected gesture). Adding a lesson step, a demo icon, README/help copy and mockCore is yours.
**Tests:** `tests/gestures.test.ts` widen block (arm, local bulge, no jitter pumping, needs opening/support/pose, pinch stays open, too-fast cancel). Unit 298/298, typecheck, build clean.
**Known:** synthetic hands only. The finger-pose discriminator (index tip lowest) needs a physical check.

### 2026-09-30 · A · lesson step 1 no longer needs pixel-exact hand height (user request, B-owned file edited by A)
**User report (physical):** the lesson is very hard to complete; the pot keeps coming out too deeply cut or too slim.
**Cause:** step 1's target dent sits at exactly band 24, compared band by band with a max-error tolerance of 0.045. The engine dents the wall at the hands' height, so hands just 2 bands (~9 px) off could never match at any depth. Pressing harder to fix it overshoots into the «Стенки вышли…» failure, which restarts the lesson.
**Fix (`src/ui/tutorialGeometry.ts`):** step 1 is judged against the same 0.20 narrowing moved to where the user made it, anywhere within ±6 bands of the middle (≈ ±0.15 height). Same depth tolerance and failure rules. The drawn outline is unchanged. Other steps are unchanged.
**Tests:** new case in `tutorialGeometry.test.ts` (fails before the fix). Unit 292/292 plus your V8.1 tests, typecheck clean.
**For you (B):** please deploy. Nothing else required.

### 2026-09-30 21:00 · A · V8 reviewed; debug pass confirmed intact
**Checked:** pulled through `cee46b3`. V8 touches no core files (`src/engine`, `src/tracking`, config, types). My `7af13ca`/`307a8d9`/`0691757` fixes are unchanged. The ≥1000 px side column and hiding the session buttons during sculpting (styles.css) still apply under workshopTheme.css, and hiding now also covers «Осмотреть в 3D». Your tablet layout also fixes the 800 px lesson-card overlap I reported.
**Verification:** unit 291/291, typecheck/build (no chunk warning), Playwright 22/22 (Chrome channel), including B5 release-then-menu and all V8 design checks.
**For you (B):** nothing. The next step is still the physical retest.

### 2026-09-30 21:30 · A · debugging pass + hidden session buttons (user request, remote)
**Done (each with a test that fails without the fix, pushed separately):**
- `7af13ca` **Jitter squeezed a held-still pot (my V7.2 regression):** ±1.5 px fingertip jitter narrowed it ~0.023 per 3 s without bound. Now only pressing deeper than the deepest point of the current touch counts. Leaving the wall by more than the jitter deadband starts a fresh touch.
- `307a8d9` **Noisy velocity flattened the rim under a still hand:** it lost 0.14 height in 5 s. The rim's velocity press now needs 150 ms of steady descent (`COMPRESS_STEADY_MS`). The displacement ratchet still covers slow presses.
- `0691757` **Stale studio hint:** it still coached the old raise-and-hold finish, which does nothing now.
- `20fc441` **Side button column (my V7.1) landed on the right hand's wall at 700–999 px.** It's now only used from 1000 px; narrower screens keep your centred row.
- **Hidden while sculpting (user asked):** Готово / Начать сначала / В мастерскую fade out while `data-sculpting='true'` and come back ~0.4 s after release (CSS at the end of styles.css). `app.pw.ts` B5 now releases (Escape) before selecting the menu.
**Verification:** unit 285/285, Playwright 18/18 (Chrome channel), build green.
**For you (B):**
- At 800 px wide, your lesson card (fixed left, 280 px) covers the pot's left wall and the left hand. It's pre-existing; you may want a breakpoint.
- Please deploy (V7.1 voice removal is still not live) and bump the footer.

### 2026-09-30 20:30 · A · V7.2 core: shaping only where the hands visibly touch, toned down
**User report (physical):** the slightest gesture shapes the clay sharply. Hands visibly not touching the clay still shape it.
**Cause:** shaping contact used the palm CENTRE with a reach of 0.9 palm (REACH_ON_PALM). On the user's 215 px palm that is ~190 px, so a hand about a palm away from the wall shaped the pot, and every bit of inward travel went 1:1 into the clay.
**Fix (`gestures.ts` shape block):**
- Each hand's inner edge = its landmark closest to the axis (what the overlay draws). Only edge travel **inside** the wall presses, scaled by `SHAPE_GAIN` 0.7.
- These never press: hands outside the wall, first contact that already overlaps it, holding still, and withdrawal. The old release latch and min-gap ratchet are gone because the edge rule covers them.
- `MAX_DR_PER_S` 0.8 → 0.5.
- New coaching: palms at the walls but edges not touching for ~0.9 s → `handsTooFar` {side, dir: 'in'} (existing text, no contract change).
- An intermediate "wall follows the hand position" version overshot your real-landmark lesson test (an abducted thumb reaches ~0.9 palm into the pot and pulled the clay). That's why the final version is edge TRAVEL.
**Tests:**
- `tests/helpers.ts` `poseHand('wall')` now has a realistic hand width: thumb tip 45 px (0.45 palm) toward the axis. All of your shaping tests pass unchanged with it.
- `tests/externalCompression.test.ts` is rewritten for the touch rule.
- Unit 282/282, build green. Playwright 18/18 in Chrome, including `timing.pw.ts` (real landmark geometry, lesson step 1 matched).
**For you (B):** nothing required. Lesson copy «Ладони у стенок…» still fits. Please deploy together with V7.1 (voice-over removal is still pending on production). Bump the footer to V7.2 if you like.
**Known issues:** synthetic hands only. Real inner edges depend on how far the thumb sticks out; SHAPE_GAIN is the knob if it still feels sharp.

### 2026-09-30 19:30 · A · V7.1 (user request, B-owned UI edited by A): no voice-over, side buttons, stronger button lock
**User report (physical):** while sculpting, palm dwell kept pressing «Начать сначала» / «В мастерскую»; gestures feel over-sensitive. The user wants the robot voice-over removed, buttons moved to one side and instructions to the other. The user asked A to do this directly.
**Done:**
- **Voice-over removed:** `src/audio/voice.ts` + test deleted; main.ts no longer speaks. Synthesized sound effects and the mute button stay.
- **Layout (≥ 601 px wide, studio + tutorial):** heading/description/lesson card on the left; Готово / Начать сначала / В мастерскую stacked on the right edge, vertically centred (the CSS block at the end of styles.css). Screenshot check: the buttons were directly above the rim, where rim/indent/lift hands pass. Phone portrait layout is unchanged. `hud.ts` places the lesson card under the description when the buttons are pinned to the side.
- **Lock:** `SculptingLock` now also runs in the **tutorial** (before, it only ran in studio). It also covers **«В мастерскую»**. `SESSION_ACTIONS` in screens.ts = done/restart/menu.
- **Slower dwell for those buttons while shaping:** `CONFIG.DWELL_CONFIRM_MS` 1800 (menus keep 900), via optional `DwellRegion.dwellMs`.
- Footer → **V7.1**.
**Tests:** 281/281 unit (7 fewer = deleted voice tests), build green. **Playwright 18/18 in the installed Chrome** (`channel: 'chrome'` temp config; Playwright's own browsers aren't installed on A's laptop).
**Test edits in `app.pw.ts`:**
- The studio lock test now expects the menu button disabled while sculpting.
- B10 was already failing on V7.0: its lower-half pixel sample included your persistent V6 «Предел ≈ 1 фаланга» line, so it never reached 0. Sampling now starts at 62 % height.
- Footer assertion → V7.1.
**Deploy:** NOT deployed. The Vercel CLI isn't logged in on A's laptop. **B: please deploy V7.1 asap.** The user explicitly wants the voice-over gone from production.
**Open:** "reacts too sharply to gestures" is not yet addressed beyond buttons. The clay mapping is 1:1 hand travel; waiting for the user to say which action feels too sharp.

### 2026-09-30 18:30 · A · V6 core: thumb-tip depth, press-only exterior palms, slow rim press, lesson context
**Done:** all 10 `src/ui/interactionV6.test.ts` cases pass (12/12). Full suite **285/285** (V7 32/32 still green), build/typecheck green. Your 16:xx correction (preserve lift placement) was already in `f9a60c9`; nothing further changed there. Playwright not run by A.
- **Thumb insertion:** depth now follows the thumb **tip** (landmark 4), not palm velocity, so bending the thumb with a still palm works. It's measured from contact (the cavity bottom, or the top surface for the first dent), and the deepest point reached is what counts. Pulling back and pushing to the same point again adds nothing, even across re-engagements. The fixed 0.12 first dent is gone, so depth grows continuously (per-frame step = the tip's travel). A jitter deadband (`MOTION_DEADBAND_PALM` 0.02 × palm) only gates the start; once past it, the full travel counts. Safe depth → `thinFloor` → `bottomHole` is unchanged.
- **Indent too fast:** a tip pushing in faster than `INDENT_MAX_PALM_PER_S` (2.0 palm/s) is rejected before any depth is applied, latching **`indentTooFast`**. The next contact starts from wherever the tip is.
- **Exterior palms press only:** travel inward past the stroke's closest point narrows the clay. Moving outward past the deadband (either hand) **releases** the stroke with no widening, and it stays released until contact actually breaks, so hovering or coming back in doesn't resume. A new contact is acquisition only; after that, inward travel presses again. The rebase-on-loss/band/tracks/epoch/projection/pause/restart/step cases are unchanged.
- **Rim compression:** after the 0.5 s hold, the palm's actual descent below the lowest point already applied presses, so 0.05 palm/s works. At ordinary speeds the velocity term (≥ 0.1 palm/s) still applies, whichever is larger per frame; that keeps the physically confirmed behaviour. Too fast now latches **`compressTooFast`** instead of silently cancelling; lifting the hand still releases it.
- **Lift:** uses the same "deadband gates the start, then full travel counts" rule (V7 behaviour otherwise unchanged).
- **Lesson context:** in the tutorial only the expected action can start or continue, and only its coaching is shown (the core filters `nearMiss` by `expectedGesture`). A **new step number** clears the engagement, latched near-miss and attempt evidence (`GestureRecognizer.resetAction`). Re-sending the **same** step (your freeze/unfreeze) keeps the held engagement, not deforming, so your release detection still works.
**Contract changes (`types.ts`):** `NearMissReason` + `'indentTooFast'`, `'compressTooFast'` (no params, hint priority 55, severity warn). `CONFIG`: − `INDENT_TRAVEL_WORLD`, − `LIFT_DEADBAND_PALM`; + `MOTION_DEADBAND_PALM`, `INDENT_MAX_PALM_PER_S`. `INDENT_DEPTH_WORLD` is kept as your lesson's first-dent target only.
**Edited your files (please review/reword):**
- `src/i18n.ts`: added RU texts for the two new reasons; the exhaustive switch otherwise broke typecheck.
- `src/ui/flow.test.ts:71`: dent depth `toBeCloseTo(.12)` → `toBeCloseTo(.12, 1)`. With a continuous dent your lesson accepts and freezes it at ~0.10 (inside your tolerance); the old exact 0.12 only came from the removed fixed jump.
**Mine:** `tests/helpers.ts` `shapingHands(…, fast=true)` is now one sustained inward stroke reported at 9 palm/s. The old in-contact back-and-forth releases under V6, so it can't tear. Old outward-widening and fixed-dent expectations were replaced with release/continuous-dent tests.
**For you (B):** Integrate the two new hint ids. Lesson step 2's target depth: any value is now reachable, so the 0.12 constant is only a target. Rerun Playwright lessons/palm retry; physical retest should cover thumb-only bending, slow press, withdrawing both or one hand, and a too-fast thumb.
**Known issues:** synthetic only. The model is still not volume-conserving (no geometry equations changed). A quickly shaken in-contact hand no longer tears (it releases); a fast inward stroke still does.
**Next:** your physical reports.

### 2026-09-30 17:30 · A · V7 core: stable lift, 20 % pancake, 10 % local wall tear
**Done:** all 22 failing `src/ui/studioV7.test.ts` cases pass (32/32), following your REVISED lift section. Placement untouched: same zones, the y=.25 near-base pose and foreshortened hands are still accepted, and palm-size scaling is unchanged. Full suite **274 pass / 10 fail / 284**, and all 10 failures are the known `interactionV6.test.ts` cases. Build/typecheck green.
- **Lift grace:** one-frame glitches (orientation past 50°, loose fingers or pinch, leaving the base zone before arming, a speed spike during the hold) now *pause* the lift for up to `LIFT_GRACE_MS` (250) instead of cancelling it. Paused frames add no hold time and no deformation. Sustained motion restarts the hold; a glitch that persists past the grace cancels.
- **Slow rise:** once armed, height follows the palm's actual rise above a ratchet (arming height + `LIFT_DEADBAND_PALM` × palm ≈ 1 px on a 100 px palm, ≈ 4 px on a 215 px real palm). Speed floor `LIFT_MIN_PALM_PER_S` removed: 0.05 palm/s now lifts. Stationary jitter can't pump it (new test in `tests/gestures.test.ts`). After a pause or a >200 ms observation gap it rebases, so resuming never jumps.
- **Cancel:** an armed hand that leaves the base horizontally (|x| > base radius + margin) cancels immediately and must re-arm. The existing cancels still apply: lost support or input, role change, below the zone, and rising too fast.
- **Pancake:** `PANCAKE_HEIGHT_WORLD` 0.7 → **0.24** (20 % of `INIT_HEIGHT` 1.2; the reference is the fixed initial height). `MIN_HEIGHT` 0.6 → **0.2**. At pancake the cavity closes (depth/radius 0). `TOO_FLAT_HEIGHT_WORLD` warning 0.9 → **0.4**.
- **Wall tear:** `MIN_THICKNESS` 0.08 → **0.1** (10 % of `INIT_RADIUS` 1.0). `OPEN_MIN_WALL_WORLD` is removed: opening now reaches 0.1 exactly. Any cavity wall ≤ 0.1, whether from opening, lifting, shaping inward or stretch thinning, now ends as permanent **`wallTorn`**. Height is kept (no sag) and damage 0.8 goes on the thin band(s), with a Gaussian falloff inside the cavity only. `tooThin` now warns below 0.15 (`TOO_THIN_MARGIN` 0.05). The time-based 10 s stretch tear is unchanged; the first permanent cause wins.
**Contract changes:** none in `types.ts`. **The core no longer produces `collapseCause: 'thinWall'`**; the only recoverable collapse left is `tooTall`. The type still has `thinWall`, so your i18n and mock stay valid.
**For you (B):**
- `storage.ts` validates `height ≥ CONFIG.MIN_HEIGHT`. It now accepts the 0.24 pancake saves; with the old 0.6 they would have been rejected. Check the schema-2 migration path too.
- Renderer: a pancake at 0.24 with a closed cavity; `wallTorn` damage covers only the thin bands.
- Any lesson or target geometry that assumed height ≥ 0.6 or an opening clamp at 0.12.
**Test changes (mine):** clay/rules/gestures tests updated to the new rules (tear instead of thinWall sag, the grace, a support hand that follows the wall down in the pancake fixture). No B-owned files edited.
**Known issues:** all values are synthetic; there's no physical retest yet. The 10 V6 cases are still open and are next.
**Next:** V6 (thumb-tip depth/jump, outward-withdrawal release, very slow press, action/hint reset at lesson boundaries).

### 2026-09-30 12:30 · A · V5 core: ceiling, hole, over-stretch, pancake
**Done:** docs/GESTURES_V5.md A-items 2–6. Support hand, either role, 3 s lift arming and fresh-input gates unchanged. All core tests + fuzz pass.
**Contract changes (`types.ts`) — confirmed as proposed:**
- `ClayState` + `floorThicknessWorld` (derived: height − cavityDepth; 0 = hole), `bottomHole` (draw a real hole; cavityDepth = height), `safeIndentDepthWorld` (~one thumb phalanx = 0.3 × user's palm), `maxHeightWorld` (screen ceiling = 0.75 × `bottomYPx` / ppu; draw it as a limit line if you like).
- `CollapseCause` + `bottomHole` | `wallTorn` | `pancake`: **permanent until `restart`** (rim compression can't repair them). `thinWall` / `tooTall` stay recoverable. Past the screen ceiling = `tooTall` collapse (sag), not silent resistance.
- `ClayEventType` + `thinFloor` (indent deeper than safe depth; data {floor, safeDepth}), `overStretch` (opening engaged ≥ 7 s; data {seconds, tearInS}), `tooFlat` (compressing below height 0.9; data {height}). All `execution`, hint priority 85 (above tear), severity error.
- `GestureState.engagedMs`: time the current one-hand action has been ARMED. For `open` it is the stretch clock: starts at pinch acquisition, counts while spreading OR holding, resets on release / tracking loss / support loss / hand switch; replayed frames add nothing. Danger at `CONFIG.STRETCH_DANGER_MS` (7000), tear at `STRETCH_TEAR_MS` (10000).
- `SessionResult` **`schemaVersion: 3`** + `floorThicknessWorld`, `bottomHole`. Migration: v2 → floor = height − cavityDepth, bottomHole false; v1 → solid.
**Behaviour:** indent now deepens with continued thumb push (first dent 0.12, then +1 world per world of thumb travel); past `safeIndentDepthWorld` → `thinFloor`; floor ≤ 0.02 → hole. Opening past 7 s thins the wall visibly, 10 s tears it. Rim compression has no per-engagement cap (gain 1.0) → `tooFlat` at 0.9 → `pancake` at 0.7.
**For you (B), red until you do:** `mockCore` (new ClayState fields + `engagedMs`), `storage.ts` accepts/migrates schema 3 (your `flow.test.ts` fails only at `store.save(result)` because it rejects v3), i18n for `thinFloor` / `overStretch` / `tooFlat` and the three new collapse causes (Try Again, not "press to recover"), renderer hole + ceiling, lesson validators if they assumed a one-shot 0.12 dent.
**Blocked / need from you:** none.
**Known issues:** all v5 numbers are game values, untested by real hands.
**Next:** fix from your physical reports.

### 2026-09-30 10:30 · A · real-hand fixes + B owns physical testing now
**Done:** first real-hand session (Yerassyl: Acer Aspire A715-76G, Edge + Chrome, built-in webcam, daylight) found 3 core bugs, all fixed and pushed (`cdf15f7`, `8299795`), 169/169 tests incl. your flow tests, build green:
1. **Pointing never fired:** curled fingers read 0.36–0.66 on a real webcam, the rule wanted ≤ 0.35. Now relative: index − mean(other three) ≥ 0.35 (0.25 to stay). Measured margin was 0.44–0.56.
2. **Dwell restarted on one-frame dropouts:** pointing is now sticky for the same hand, and the cursor stays on that fingertip during the 120 ms grace.
3. **Lesson 2 (lift) and all one-hand actions couldn't start:** his palm is ~215 px, bigger than the pot radius (~100 px), but placement tolerances were fixed world distances (support within 0.45 ≈ 60 px of the wall: impossible for a palm centre). **All zones now scale with the measured palm size** (support, base, rim, top centre, opening, shape contact). Flat hand also accepts fingers pointing at the camera; thumbs-down no longer needs every finger < 0.35 (and never matches a pinch).
**Contract changes:** none.
**For you (B): the user asked that you do all physical testing from now on. I work from your reports.**
1. **Redeploy now.** Production has none of the fixes above, so menus can't be clicked there.
2. **Test locally for numbers:** `npm run dev`, open `http://127.0.0.1:5173/?dev=1` (Chrome), good light. The green panel shows per hand `ext i m r p`, `pinch`, `POINT`, then `gesture`, `cursor`, `contact … err L R`, `action active/support progress`, `nearMiss`, `cavity`, `hint`.
3. **For each lesson step that fails, send me:** the step, what you did, and a copy of the panel text while holding the pose. Quickest: in DevTools console:
   `copy([...document.querySelectorAll('pre')].find(p=>p.textContent.includes('tracking')).textContent)`
   then paste it into your handoff. Two or three captures per failing pose. The numbers let me fix thresholds exactly instead of guessing.
4. Poses to check, in order: point at a menu card · shape (open palms at both walls) · lift (flat palm under the pot, other hand on a side wall, 3 s still, then slowly up) · indent (thumbs-down at top centre, short push) · open (pinch in the dent, spread slowly) · rim (flat palm just above the rim, hold, slowly down) · raise to finish. Both hand roles if you have time.
5. Optional, best data: `?dev=1&rec=1`, keys 0–8 pick the label, R starts/stops, commit the JSON to `recordings/`.
**Blocked / need from you:** redeploy + the reports above.
**Known issues:** only one person's hands measured so far. Thresholds for pinch and the lift/rim speeds are still unmeasured.
**Next:** fix whatever your reports show, fast.

### 2026-09-30 01:30 · A · GESTURES_V4 contract + core pushed
**Done:** the four v4 actions per docs/GESTURES_V4.md, with your proposed ids: lift (`pullUp`, 3 s armed hold then slow rise), `indent` (thumb down at the top centre, one shallow push), `open` (pinch in the indentation, then slow spread), `compressRim` (flat hand just above the rim, 0.5 s hold, then slowly down). Old two-pinch pull and two-fist press are gone. Either hand can be active; roles are persistent track ids for the whole engagement. Collapse is now recovered by rim compression. 154 core tests pass: both role assignments, short vs 3 s holds, duplicate observations, stale input, lost support, switched hands, pose conflicts, bounded cavity, actionable hints, plus the fuzz now drives the new actions through the real controller. Thresholds are seeds, untuned on real hands.
**Contract changes (`types.ts`):**
- `Gesture`: removed `pressDown`; added `indent`, `open`, `compressRim`. New `ActionGesture = 'shape'|'pullUp'|'indent'|'open'|'compressRim'|'raise'` used by `tutorialStep.expectedGesture`, `GestureContext.expectedGesture`, `NearMiss.intended`.
- `NearMissReason`: removed `fistLoose`; added `noSupport` {side: hand that must go to a wall}, `holdStill` {remainingS}, `liftTooFast`, `notHorizontal` {side}, `thumbNotOnTop` {dx: 'left'|'right'|'', dy: 'up'|'down'|''} (direction to MOVE the thumb), `noIndentation`, `pinchFirst` {side}, `spreadTooFast`, `rimPlacement` {dir: 'lower'|'closer'}. `pinchLoose` now means "pinch tighter to start opening". `notMoving` = armed lift/rim waiting for the slow movement. `liftTooFast`/`spreadTooFast` stay on screen 1.5 s after the cancel.
- `GestureState`: + `activeTrackId`, `supportTrackId` (null unless a one-hand action), `activationProgress` 0..1 (lift hold, indent travel, open pinch acquisition, rim hold; 1 = acting). `deforming` = the clay changed from this action on this observation.
- `ClayState`: + `cavityRadiusWorld`, `cavityDepthWorld` (0/0 = solid, the initial state). Opening = cylinder of that radius from the rim down that depth. `thickness` is now DERIVED: thinnest wall around the opening (solid pot: narrowest radius). Draw the cavity from these two fields, not from thickness.
- `SessionResult`: `schemaVersion: 2`, + `cavityRadiusWorld`, `cavityDepthWorld`. Schema 1 saves have no cavity: migrate as solid (0/0).
- `CONFIG`: removed `INIT_THICKNESS`, `PULL_RATE`, `PRESS_RATE`, `THIN_PER_HEIGHT`, `TEAR_THICKNESS_LOSS_PER_S`, `REPAIR_THICKNESS_PER_S`, `MOTION_*`, `FULL_MOTION_PALM_PER_S`, `FIST_LOOSE_MAX`. Kept `MAX_THICKNESS`, `MIN_INNER_RADIUS`, `THICKNESS_FLOOR` for your renderer. New: `LIFT_HOLD_MS` (3000), `COMPRESS_HOLD_MS`, `OPEN_ACQUIRE_MS`, zones etc.
**For you (B), typecheck is red until you do this:**
- `mockCore.ts`: add `cavityRadiusWorld: 0, cavityDepthWorld: 0` to its clay; add `activeTrackId: null, supportTrackId: null, activationProgress: 0` to its GestureState; `schemaVersion: 2` + cavity fields on its result; replace `pressDown` (e.g. with `compressRim`).
- `i18n.ts`: drop `pressDown`/`fistLoose`; add gesture names for `indent`/`open`/`compressRim` and texts for the new reasons above (use the params).
- `tutorial.ts` + `flow.test.ts`: six steps shape → pullUp → indent → open → compressRim → raise via `tutorialStep.expectedGesture`. In the tutorial only the expected action deforms. Step done = `gesture.deforming` with the step's gesture AND the matching change (height up / cavity depth > 0 / cavity radius up / height down), then require a release (`activationProgress` back to 0 or a different gesture) before the next step.
- Renderer: activation ring from `gesture.activationProgress` at the active hand (`activeTrackId` → `input.screenLeft/Right.trackId`), highlight the support hand. Cavity from the two new fields.
**Blocked / need from you:** none. Tell me if a field doesn't fit.
**Known issues:** all new thresholds are guesses (see `config.ts`, v4 section). Physical testing matters more than ever: the flat-hand and thumb-down detection come from 2-D landmark angles. `targetMismatch` still scores only the outer profile, not the cavity.
**Next:** real-hand recordings (needs a human at the camera) → tune the v4 thresholds.

### 2026-09-29 22:45 · A · please record hand data (A can't tonight)
**Done:** nothing new in code. Recording pipeline checked: the dev page loads with the recorder panel.
**Contract changes:** none.
**For you (B):** A can't record tonight (dark room). Every threshold is still a guess, so the recognition gets tuned from YOUR recordings. ~5 minutes:
1. Good light, plain background if possible. `npm run dev`, open `http://127.0.0.1:5173/?dev=1&rec=1`, press Start, allow the camera, pass calibration (hold both hands still).
2. Click the page once so it has keyboard focus. The debug panel's last line shows `○ rec (R) label [n] …`.
3. For EACH label: press its number key, then `R` to start, do it for ~15 s, then `R` to stop. Stopping downloads a `kiln-rec-*.json`. One file per label is ideal.
   - `0` neutral: hands relaxed, moving around, not doing any gesture
   - `1` shape: open flat palms on both sides of the pot, moving in and out slowly
   - `2` pullUp: pinch thumb+index on both hands, move both up slowly
   - `3` pressDown: both fists, move both down slowly
   - `4` point: ONE hand, index finger out, other fingers curled; move it around
   - `5` raise: both open palms above the pot, hold still
   - `6` tooFast: like shape, but move your hands FAST on purpose
4. Bonus if you have time: a second round with a sloppy version of each (loose pinch, half-closed fist), and a second lighting setup.
5. Put the files in `recordings/` in the repo and commit them: `recordings: <who>, <lighting>`. Landmark JSON is fine to commit (PLAN §13); no video is recorded.
6. Write in your handoff: who recorded, lighting, and anything that felt wrong (e.g. "fist often shows as pullUp").
A then runs `notebooks/tuning.ipynb` on them and tunes `config.ts`.
**Blocked / need from you:** the recordings above.
**Known issues:** none new.
**Next:** tune thresholds from the recordings.

### 2026-09-29 22:20 · A · snapshot target + glazeId (B4 request)
**Done:** `EngineSnapshot.target` and `EngineSnapshot.glazeId`, filled by the controller. Test added, 116/116.
**Contract changes:** `types.ts`: `EngineSnapshot` gets `target: TargetProfile | null` (the commission target while a commission session is on screen, else null) and `glazeId: string | null` (set by `selectGlaze`, null in the menu).
**For you (B):** **`npm run typecheck` fails until you add the two fields to your mock**, in `src/dev/mockCore.ts` line ~151, in the snapshot you return:
```ts
      stats: this.stats, result: this.result,
      target: null, glazeId: null };   // or your mock's own values
```
Target radii are `target.radii` (48 values, bottom → top, same units as `clay.radii`) and `target.height`. Draw the silhouette with the same projection as the pot.
**Blocked / need from you:** none.
**Known issues:** none new.
**Next:** real-hand recording + tuning (B2 is live).

### 2026-09-29 19:30 · A · bug fixes (speech rule, GPU fallback)
**Done:** "recovered" hint could be spoken twice. Tracker now falls back to CPU if the GPU delegate fails at the first detection (not only at load). Controller warns once in the console if it drops frames because of an epoch mismatch. 87/87.
**Contract changes:** none.
**For you (B):** **speech rule changed, replaces the one in my A3 entry.** Speak when `hint && hint.speak && hint !== lastHint`, then set `lastHint = hint` every frame. The core returns the same Hint object on every tick until something changes. The old rule, dedupe by (id, episodeId), would silence near-miss hints forever after their first time because they have no episodeId. Also: on camera restart / resize always set BOTH `tracker.epoch = n` and `core.resetInput(n)`, otherwise every frame is dropped (you'll see a console warning).
**Blocked / need from you:** B2 camera + main-loop wiring.
**Known issues:** raising open hands just above the pot after a pull and holding still for 1.5 s finishes the pot. That's the plan's raise gesture, but it may trigger by accident. We'll see in testing; `RAISE_MARGIN_WORLD` (0.15) is the knob.
**Next:** real-hand recording + tuning once B2 is in.

### 2026-09-29 19:10 · A · A5 recorder + tuning notebook
**Done:** `tracking/recorder.ts` (labelled FrameInput recordings) built into the debug panel: `?dev=1&rec=1`, keys `0–6` = neutral/shape/pullUp/pressDown/point/raise/tooFast, `R` start/stop → downloads JSON. `notebooks/tuning.ipynb`: per-feature distributions per label, ON/OFF thresholds from the gap, fist-read-as-pinch check, label vs recognizer table, prints suggested `config.ts` lines. Runs end to end on clearly marked synthetic data until real recordings exist. 85/85 tests.
**Contract changes:** none.
**For you (B):** nothing new. Recording only needs the debug panel wired as in my A2 entry (dev build, `?dev=1`), and keyboard focus on the page.
**Blocked / need from you:** B2 camera + main-loop wiring. Recording and all tuning need real hands.
**Known issues:** no real recordings yet, so no thresholds are tuned.
**Next:** once B2 is in: record both of us (correct + sloppy, 2 lighting setups) into `recordings/`, run the notebook, tune config.

### 2026-09-29 18:30 · A · A4 phases, target, session, result
**Done:** controller owns the whole flow `loading → permission → calibrate → menu → tutorial | studio → glaze → firing → result → gallery / menu`. One-shot raise → finishShaping. Target «Ваза» + similarity (signed deltas), `targetMismatch` coaching (tooWide/tooNarrow/tooLow/tooHigh). Session stats (execution vs tracking episodes, gestureMs, activeMs), one `SessionResult` per session with copied arrays. Also fixed: two visible hands in a bad frame no longer read as `oneHand`; in studio/tutorial pointing needs one hand only (no accidental "start over" mid-press). Tests T15–T18 + flow: 84/84, typecheck + build pass.
**Contract changes:** `types.ts`: added `AppCommand { type: 'modelReady' }`. The core can't know when the model finished loading; that's the only way to leave `loading`.
**For you (B):**
- **Boot:** `HandTracker.create()` resolved → `core.dispatch({ type: 'modelReady' }, now)` (`loading → permission`). Call `core.updateProjection()` **only once the camera is running**: the first call moves to `calibrate`. Calibration = both hands visible and still for 0.8 s, `snap.calibrationProgress` 0..1, then `menu` automatically.
- **Controller:** `createController({ nowIso: () => new Date().toISOString() })` so `result.completedAtIso` is set (the core never reads the clock).
- **Commands per phase** (others are ignored, so a late dwell can't skip a screen): menu: `start` (tutorial/free/commission; commission `targetId` optional, default «Ваза»), `openGallery` · tutorial: `tutorialStep`, `restart` (keeps the step), `backToMenu` · studio: `finishShaping` (raise does it too), `restart`, `backToMenu` · glaze: `selectGlaze` then `confirmGlaze` (confirm is ignored until a glaze is selected), `backToMenu` · result: `openGallery`, `backToMenu` · gallery: `backToMenu`.
- **Firing** lasts `CONFIG.FIRING_MS` (4 s), then `phase = 'result'` and `snap.result` is set. Save it once (check `result.id`); the same object comes back on every tick.
- **Tutorial:** send `tutorialStep` with `expectedGesture` for each step. Shaping/pull/press only act on the step that expects them. On the final step (`expectedGesture: 'raise'`), holding raise 1.5 s ends the tutorial and returns to `menu`. For the tear step, watch `snap.events` for `tear` `begin` then `end`.
- **Best scores:** `stats.targetId` is `'vase@1'` (id@version); compare scores only for the same string. Score = `result.stats.similarity.score` (0..100, float).
- **Studio "start over":** point with ONE hand (other hand out of frame or down).
**Blocked / need from you:** B2 camera + `ProjectionParams`, then the main-loop wiring (A2 entry + boot steps above).
**Known issues:** all thresholds untested on real hands. `targetMismatch` tolerance (0.05) is tight, so the coaching hint is almost always on in commission (lowest priority, shows only when nothing else does). Tutorial result isn't a result screen; the tutorial goes back to menu.
**Next:** A5: `tracking/recorder.ts` (dev recordings), `notebooks/tuning.ipynb`. Then real-hand tuning once B2 is wired.

### 2026-09-29 17:10 · A · A3 pull/press, error mode, hints
**Done:** gestures pullUp / pressDown (motionStrength = slower hand), raise, point (cursor), near-miss with evidence only. Clay: pull/press, repair, tear damage, wobble, overhang smoothing, collapse once + recovery by pressing. `engine/rules.ts`: episodes (begin/update/end, categories). `engine/hints.ts`: one hint, priority, speech cooldown. Controller wires it all: `snap.events`, `snap.activeIssues`, `snap.hint` are live. Fixes from review: per-track velocity dt after brief hand loss (was a fake-tear source), tracker no longer swallows core errors. Tests T10, T12, T13 + 30 more: 64/64, typecheck + build pass.
**Contract changes:** none.
**For you (B):**
- **Hint texts (i18n), keyed by `hint.id`, with `hint.params`:** `tear` {speedRatio} · `wobble` {dir: 'left'|'right' = where to move both hands, offsetPalm} · `tooThin` · `collapse` {cause: 'thinWall'|'tooTall'} · `overhang` (use `hint.band`) · `handsTooFar` {side: 'left'|'right', dir: 'in'|'out'} · `oneHand` {missing: 'left'|'right'} · `noHands` · `trackingUncertain` {status} · `pinchLoose` / `fistLoose` {side} · `handsTooLow` · `handsUneven` {raise: side of the lower hand} · `handsNotOpposite` · `notMoving` · `atLimit` · `recovered`. RU texts are in PLAN §8.
- **Speech:** speak when `hint.speak` is true and (`hint.id`, `hint.episodeId`) differ from the last spoken pair. Replace, don't queue.
- **Sounds:** play on `snap.events` with `phase === 'begin'` (tear → crack, collapse → thud). `snap.events` holds each transition exactly once; don't replay.
- **Visuals:** `clay.damage[]` (crack marks), `clay.wobble` (shake amount), `clay.collapsed`, `hint.band` (highlight). `clay.revision` bumps on any of these.
- **Dwell:** `snap.gesture.cursorPx` is set only while the gesture is `point` (menu/glaze/result/gallery, and the studio "start over" button).
**Blocked / need from you:** still B2 camera + `ProjectionParams` and the main-loop wiring from my A2 entry. Nothing in A3 depends on it.
**Known issues:** `THIN_PER_HEIGHT` changed 0.1 → 0.15 (with 0.1 "pulled too thin" was unreachable). All thresholds untested on real hands. `targetMismatch` comes with the target in A4. Rules only run in studio/tutorial.
**Next:** A4: phase FSM, one-shot raise → finishShaping, target «Ваза» + similarity, session stats + result.

### 2026-09-29 16:20 · A · A2 tracking + shape + controller skeleton
**Done:** `tracking/handTracker.ts` (rVFC, ≤30 Hz, GPU→CPU fallback, WASM pinned to 1.0.1, model in `public/models/`), `filters.ts` (One Euro per track), `features.ts` (px conversion, 2-permutation association, reacquire, calibration median, finger extension, pinch, pointing, velocities, status), `gestures.ts` (shape only, hysteresis + 120 ms stability), `engine/contact.ts` (two-wall), `engine/clay.ts` (shape + invariants), `engine/controller.ts` (observe/tick/dispatch, freshness gate, starts in `studio`/`free`), `dev/debug.ts`. Tests T05, T06, T11 + association/reacquire/hand-loss: 30/30, typecheck + build pass.
**Contract changes:** none.
**For you (B):** real core is ready to wire in `main.ts`. Use `performance.now()` everywhere (same clock as the tracker):
```ts
import { HandTracker, HandTrackerError } from './tracking/handTracker';
import { FeatureExtractor } from './tracking/features';
import { createController } from './engine/controller';

const core = createController();
core.updateProjection(projection);              // again on every projection change
const features = new FeatureExtractor();
const tracker = await HandTracker.create();     // throws HandTrackerError { stage: 'wasm' | 'model' }
tracker.start(video, (packet) => core.observe(features.compute(packet, projection)));
// camera restart / resize / rotation: epoch++; tracker.epoch = epoch; core.resetInput(epoch);
// rAF: const snap = core.tick(performance.now());
// dev only (behind import.meta.env.DEV && ?dev=1):
//   const { createDebugPanel } = await import('./dev/debug'); const panel = createDebugPanel();
//   panel.update(snap, now) every frame
```
Draw hands from `snap.input.screenLeft/Right.landmarksPx` (already mirrored, CSS px). Band highlight: `snap.clay.activeBand` (null when not touching). `snap.clay.revision` only changes when the shape changes, so rebuild the LatheGeometry only then.
**Blocked / need from you:** `camera.ts` + `ProjectionParams` (B2) and the main-loop wiring above, so we can hit the 19:30 checkpoint with real hands.
**Known issues:** thresholds are the plan's seed values, untested on real hands. `calibrationProgress` is 0 until the phase FSM (A4); features already exposes `features.calibrationProgress`. No pull/press/raise/point yet.
**Next:** A3: pull/press, collapse/recovery, overhang, rules + episodes, hints, near-miss.

### 2026-09-29 15:00 · A · A1 contract + config + coordinates
**Done:** `src/types.ts` (rev. 3, as agreed), `src/config.ts` (PLAN §10, one `CONFIG` object `as const`), `src/tracking/coordinates.ts` (`sourceToPx`, `pxToSource`, `pxToWorld`, `worldToPx`, `potTopPx`, `distPx`). Tests T01 and T02 pass (8/8).
**Contract changes:** none.
**For you (B):** in the Vite scaffold please add `vitest` to devDependencies and `"test": "vitest run"` to scripts, so `npm test` runs `tests/`. For `ProjectionParams`, use `fit: 'cover'` and `mirrored: true` to match the video. Your ortho camera needs to agree with `worldToPx`: world (0,0) = (`axisXPx`, `bottomYPx`), y up, `pixelsPerWorldUnit` px per unit.
**Blocked / need from you:** the scaffold (`package.json`, `index.html`, Vite config) before I can start `handTracker.ts`.
**Known issues:** none.
**Next:** A2: handTracker, filters, features, gestures (shape), contact, clay shape, controller skeleton.
