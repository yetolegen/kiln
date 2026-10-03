# Final frontend polish — manual review handoff

Date: 3 October 2026. Repository baseline: `a989b3c`, branch `final/motion-update`.
The working tree was clean before this pass. Product checkpoint `2f3ec5c` and tag
`final-motion-stable` remain unchanged. No commit, push or deployment is authorized
by automated verification. All changes remain local for the user's visual review.

## Audit and priorities

Read both READMEs, FINAL_IMPLEMENTATION, FINAL_TEST_REPORT, FINAL_DEMO and
FRONTEND_TESTS before implementation. Inspected all 36 Windows baselines and
rendered menu, tutorial, shaping, glaze, firing, result, gallery, inspection,
sharing and the public viewer. Read decoration placement/editing, modal,
checkpoint and dwell registration code. Baseline Chromium: all 12 frontend
cases passed their screenshot and axe checks; sandbox teardown stalled afterward.

| Priority | Finding | Resolution |
|---|---|---|
| P0 | Recovery cause/correction buried in one paragraph; recovery and restart looked alike | Specific damage title, distinct correction, explicit action hierarchy |
| P0 | Modal action scope guarded activation but did not isolate keyboard focus | Inert siblings, focus entry/return and Tab cycling for recovery/share dialogs |
| P0 | Controls below the 1366×768 menu and short landscape viewport | Targeted responsive layouts; actual target bounds and occlusion checks |
| P0 | Nested scrolling could leave hand targets at old positions | Capture scroll events and intersect registered targets with visible clipping bounds |
| P0 | An initial 4px dialog entrance moved a button under a resting palm | Removed translation; the 180ms fade keeps hit regions stationary, with an added default-motion regression |
| P0 | Asynchronous share controls/feedback could move a target under a resting hand | Reapply the existing release guard after the target layout changes; no codec or architecture change |
| P1 | Checkpoint availability and restore feedback hard to spot | Persistent availability text, success treatment, restore acknowledgement across stage changes |
| P1 | Finishing actions, decoration adjustments and inspection guidance competed | Read-only process labels, grouped tools, prominent confirmation and hand-rotation status |
| P1 | Gallery metadata and viewer/error-page styling inconsistent | Existing glaze metadata, card focus treatment, view-only badge and styled return action |
| P1 | Expanded axe scan found an unnamed-role inspector surface | Labelled `region` semantics |
| P2 | Larger artistic redesign, new imagery/fonts/renderer effects | Intentionally deferred; retained the existing atelier backdrop and typography |

## Intentional changes

1. **Shared presentation tokens and controls.** Warm paper/charcoal surfaces,
   clay destructive actions, sage recovery, gold primary actions, shared borders,
   radii and spacing. Utility buttons are at least 44px high; the existing dwell
   indicator is 4px high. No dwell duration or recognition thresholds changed.
2. **Recovery dialogs.** Existing bottom-hole, wall-tear and pancake cause data
   now produce a specific heading, short cause and separate corrective advice.
   The darker backdrop and hidden competing HUD emphasize the dialog. Disabled
   restore has a visible, programmatically associated reason. Restore is green,
   restart/replacement is clay red and secondary actions are quiet paper.
3. **Checkpoint and studio feedback.** Availability/absence is visible before
   clicking. Save and restore use a restrained success treatment. Restore says
   that the saved version returned, including when the saved stage differs.
   The HUD separately reports whether the existing gesture is deforming clay.
4. **Progress and success.** Read-only Form → Decor → Glaze → Firing → Ready
   labels appear during finishing/inspection editing, firing and result. The
   glaze heading confirms the form is ready. Lesson success has a green accent
   and completion label. Modal/success entrance fades over 180ms, keeps controls
   stationary and respects reduced motion. No navigation is attached to the
   process indicator.
5. **Inspection and sharing.** Warm neutral inspection background, a view-only
   or paused-shaping badge, clearer pinch/move/release guidance, live armed/
   dragging status, grouped controls and a more prominent existing share action.
   The shared viewer retains camera-off wording and optional camera activation.
   Share controls reapply the existing hand-release guard when asynchronous
   content or copy feedback changes their layout, preventing accidental actions.
   The invalid-link return button now matches the studio. No author is invented:
   the shared artifact does not contain author metadata.
6. **Decoration and glazes.** Clear selection/placement/editing headings,
   shorter natural Russian guidance, larger shape selection targets, paired
   adjustment controls, emphasized Apply/return and destructive Remove. Glaze
   swatches have ceramic highlights, a selected outline/check and selected-name
   feedback. The same eight glaze definitions and three-item paging remain.
7. **Collection and result.** Existing glaze names and color chips accompany
   artwork title/date; thumbnail areas have a distinct surface; card focus/dwell
   highlights the selected action. The existing open action spans the card.
   Result storage confirmation is stronger; long phone statistics scroll within
   their panel so utility controls remain accessible.
8. **Responsive reliability.** Checked 1440×900, 1366×768, 390×844, 430×932 and
   844×390. Compact finishing/shaping grids, short-laptop menu spacing, grouped
   landscape controls, bounded panels and safe-area offsets retain the same UI.

## Screenshot review

Every changed baseline was inspected as an actual/diff pair before copying that
specific reviewed PNG into the baseline directory. No `--update-snapshots`
command was used. Screenshot masking, 100-pixel tolerance, deterministic fixture
settings and all accessibility rules remain unchanged.

All **36 existing baselines changed intentionally**; **0 remained byte-identical**.
The menu's main composition and lesson content were preserved, but their utility
targets changed size, so those baseline PNGs also changed.

| Screen (both 1440×900 and 390×844; Chromium, Firefox, WebKit) | Reason |
|---|---|
| `menu` | Camera/sound target height raised to 44px; main composition retained |
| `lesson` | Utility target height, clay-active/paused badge, distinct restart treatment; lesson target/copy unchanged |
| `damage` | Specific title, separated cause/advice, differentiated actions, focus state, darker backdrop, competing HUD hidden |
| `glaze` | Form-ready heading, process label, selected-glaze guidance, swatches, checkpoint availability and compact layout |
| `decoration` | Process label, warm background, grouped toolbar and larger choices |
| `invalid-share` | Heading scale/spacing, subtle border and studio-styled return button |

Review evidence is in ignored local directories `test-results/polish-review/`
(Chromium/WebKit) and `test-results/polish-review-firefox/`. Each sheet contains
both viewport actual/diff pairs. Their `manifest.json` files map every reviewed
actual PNG to its exact baseline filename. This evidence is intentionally not
added as duplicate tracked assets.

## Verification

| Check | Result |
|---|---|
| Final full Chromium suite | **59/59 passed**, 10.6 minutes, no skips or retries |
| Firefox frontend + expanded polish checks | **20/20 passed** |
| WebKit frontend + expanded polish checks | **18/20 passed** across the full run and strengthened sharing recheck; two headless dwell limitations below |
| Screenshot comparisons | **36/36 passed** across Chromium, Firefox and WebKit, without update flags |
| Accessibility | **Zero automatically detected WCAG A/AA violations** in the original six states and the expanded recovery/result/gallery/inspection/sharing/public-viewer scans |
| Targeted existing Chromium final/design/atelier regressions | **11/11 passed** |
| Existing V5 recovery + new stationary-palm regression, Chromium, three repetitions each | **6/6 passed** after the fade-only fix |
| Existing sharing lesson, M5 recipient flow and strengthened collection/share check, Chromium, three repetitions each | **9/9 passed** after the asynchronous release guard |
| Production preview smoke | **4/4 passed**: real-model/fake-camera startup in Chromium; camera-free decorated viewer, responsive resizing and WebGL-loss fallback in Chromium, Firefox and WebKit |
| Unit suite | **355/355 passed**, 44 files |
| Typecheck | **Passed** (`tsc --noEmit`) |
| Production build | **Passed**, 75 modules; no added dependencies |
| Diff whitespace / protected scope | Passed; no changes in the protected modules |

The first full Chromium run was **57/58**. Its V5 failure exposed the 4px entrance
movement crossing a resting palm; an instrumented comparison reproduced the
unintended menu activation with motion and not with reduced motion. Removing
translation corrected it without modifying the dwell controller. That initial
run is not presented as a clean final run.

A subsequent full Chromium run was **58/59**. The sharing lesson exposed a
second layout boundary: asynchronous share controls could activate beneath a
stationary support hand. An expanded test reproduced unintended activation.
The sharing panel now calls the existing release guard after its asynchronous
controls and feedback are laid out. URL encoding, payloads, permissions and
storage are unchanged. The expanded check retains both fixture palms, verifies
the dialog stays open with its initial message and then closes it deliberately
by dwell.

The Firefox sandbox initially failed at `browserContext.newPage` before loading
the app. The permitted run outside the sandbox completed normally.

**Known WebKit limitation:** the new normal-motion test can time out during
deliberate menu/restart dwell. Three traced repetitions reproduced it. The
strengthened share check also keeps the modal open correctly but times out on
deliberate close-by-dwell. A follow-up share diagnostic observed 177–215ms
frames and dwell resets on frames above 200ms; it eventually completed when
enough consecutive frames stayed below the bound. This is timing-sensitive,
not an invariant inability to close the dialog. Recovery-frame
instrumentation measured approximately 220–285ms per frame with the modal open,
exceeding the unchanged 200ms input-age bound and repeatedly resetting dwell.
The same diagnostic against an untouched local archive of `a989b3c` also stayed
at 0% dwell (approximately 250–330ms frames). Removing backdrop blur did not
resolve it, and that diagnostic override was not retained. The new regression
remains enabled and unchanged; no timeout/threshold/assertion was relaxed or
skipped. This existing Windows headless WebKit rendering limit needs a separate
renderer/performance investigation, outside this frontend-only scope. It does
not invalidate WebKit's 12 passing visual/axe cases or its six other passing
polish cases. The earlier camera-free public-viewer axe scan passed; the final
strengthened flow stops at close-by-dwell before reaching that scan. Physical
Safari performance is unverified.

JSON results and traces are retained locally in ignored `test-results/polish-*`
directories. The untouched comparison copy is outside unit-test discovery at
`C:\Users\User\AppData\Local\Temp\kiln-polish-a989b3c-baseline` (the original ZIP
is in `test-results/checkpoint-source.zip`). The repository HEAD and working
files were not rolled back to run that comparison.

The new `polish.pw.ts` retains the existing mock boundary. It checks visible
buttons for at least 44×44 targets, viewport containment and center-point
occlusion across five sizes, including the attachment editor and damage dialog. It also checks
modal focus isolation, blocked underlying activation, same-stage/cross-stage
restore acknowledgements and axe scans for result, gallery, inspector, sharing
and public viewer. A normal-motion regression keeps both fixture palms stationary
through the recovery fade, then verifies deliberate palm restart. The existing
frontend test's damage dialog name changed to
the new specific title; no assertion was deleted or weakened.

## Changed source and test files

- `src/ui/final.css`
- `src/ui/screens.ts`
- `src/ui/hud.ts`
- `src/ui/modal.ts`
- `src/ui/dialogFocus.ts` (new, presentation focus helper)
- `src/ui/recovery.ts`
- `src/ui/process.ts` (new, noninteractive stage labels)
- `src/ui/inspection.ts`
- `src/ui/decorating.ts`
- `src/ui/finishing.ts`
- `src/ui/gallery.ts`
- `src/ui/sharing.ts` (dialog focus and existing release guard after asynchronous layout)
- `src/ui/publicViewer.ts` (presentation and labels only)
- `src/browser/frontend.pw.ts` (specific damage title)
- `src/browser/polish.pw.ts` (new frontend regression coverage)
- `src/browser/frontend.pw.ts-snapshots/` (36 reviewed PNGs, enumerated below)
- `docs/FRONTEND_POLISH.md` (this handoff)

## Protected boundaries

Widening behavior, widening lesson wording/target/order, gesture recognition and
thresholds, MediaPipe/hand tracking, clay physics and ClayState, checkpoint and
restore semantics, storage schema, sharing architecture/codec, damage rules,
attachment data model and scoring are unchanged. `src/engine`, `src/tracking`,
`src/render`, `src/config.ts`, tutorial modules, dwell controller and hand-orbit
controller have no diff. No new product features, dependencies, framework,
assets, fonts, architecture rewrite or deployment were introduced.

## Manual review gate

Run in PowerShell:

```powershell
Set-Location 'C:\Users\User\kiln'
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/` without `dev` or `mock` query parameters.

1. Menu and tutorial: utility target size, natural Russian readability, lesson
   success dialog. Recheck both hands and the unchanged widening lesson.
2. Shape → save → damage → restore: visible save confirmation, concrete cause
   and correction, disabled restore without a checkpoint, no background actions,
   keyboard focus and palm dwell. Also cancel checkpoint replacement, restore
   from glaze to shaping and reload/resume the existing checkpoint.
3. Finish → inspect → decorate: free hand rotation and release/regrab; placement,
   adjustments, Apply/Cancel/Remove and returning to glaze.
4. Browse all eight glazes, select one, fire, inspect the result and storage
   confirmation. Open the gallery, reopen the work, rotate and export PNG.
5. Share: inspect the dialog and clipboard-failure URL, then open the link in a
   clean browser without camera permission. Confirm view-only presentation.
6. Check 1366×768 and both phone orientations in particular; inspect long result
   statistics and the full attachment editor. Review the 36 baseline diffs.

Physical hand accuracy, screen-reader behavior, real mobile safe-area/browser
chrome and device performance still require human validation. Automated camera
input is synthetic. Long result statistics and very short dialogs may scroll;
scrolling uses the existing mouse/touch/keyboard fallback, not a new hand gesture.
The unchanged software renderer can reduce resolution under test load; masked
UI baselines are not a claim about live-camera/3D image quality. The existing
WebGL-loss fallback remains limited to its simplified 2D representation.

Stop here for manual approval. Passing automated checks does not authorize a
checkpoint commit, push or deployment.

## Exact updated baseline filenames

- `src/browser/frontend.pw.ts-snapshots/damage-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/damage-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/damage-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/damage-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/damage-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/damage-390x844-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/decoration-390x844-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/glaze-390x844-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/invalid-share-390x844-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/lesson-390x844-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-1440x900-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-1440x900-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-1440x900-webkit-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-390x844-chromium-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-390x844-firefox-win32.png`
- `src/browser/frontend.pw.ts-snapshots/menu-390x844-webkit-win32.png`
