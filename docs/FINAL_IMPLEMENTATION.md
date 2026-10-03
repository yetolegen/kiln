# Final update — implementation log

## Baseline (3 October 2026)

- Repository: `yetolegen/kiln`; baseline `c8df5a7739b65263df40ba5abf176e250ab0ae09`.
- Clean checkout; local working branch `final/motion-update`. No automatic commits, pushes or deployments.
- Windows, Node 24.21.0, npm 11.19.0. `npm ci`, typecheck, 321 unit tests and production build passed.
- Baseline Chromium: 25/27 passed. B6 asserted an old fast-motion warning but received the newer damage warning. B2 could not download CDN WASM in the sandbox; network-enabled retry passed. Initial runner was interrupted after all 27 results because teardown stalled.
- Existing external/internal widening, lesson wording/target/order and widening regression tests are frozen.

## Slices

| Slice | Scope | Status |
|---|---|---|
| M0 | Baseline and contracts | Complete |
| M1 | Validated manual checkpoint, recovery, modal isolation | Implemented; core/storage tests include real terminal compression for both hand roles; browser recovery route passes |
| M2 | Continuous hand rotation, selected shelf artifact | Implemented; both-role orbit tests, browser selected-work route and build pass |
| M3 | Bounded local attachments, persisted customization | Complete; hand placement, firing, reload, selected shelf and PNG browser checks pass |
| M4 | Eight glazes, three stamps, migrations | Implemented; each material passes real-controller finalization and save/reload |
| M5 | Bounded camera-free artifact links | Codec, camera-free route, denial, malformed link, phone and WebGL-loss browser checks pass |
| M6 | New lessons, regression, demo and documentation | Five modules complete; 39/39 Chromium gate, production smoke and hand-audit documents complete; physical-camera rehearsal remains external |

## Verification limits

Automated hand observations are synthetic. No physical-hand test or production deployment has been performed for this update. Existing deployed V9.1 is distinct from this local branch. First-round submission is not assumed to equal the baseline commit.

## M1 findings and fixes

- Recovery initially required both hands to leave all modal buttons. A stationary support hand could block the other hand. Fixed with per-pointer release gating; underlying actions also reject clicks during modal scope.
- Checked deep copies, malformed/terminal checkpoint rejection, monotonic revision, late frames, held input, release, restored shaping after glaze, immutable firing/result, elapsed time/mistake retention, reload clock and storage failure/future data preservation.
- Central dialogs pause deformation while fresh tracking remains available. Manual checkpoints are separate from gallery saves. Existing tutorial targets and recognizer are untouched.

## M2 findings and fixes

- Viewer rotation is a separate fresh-frame pinch controller. Lost/stale input, track switches, viewport changes and new modes require release/regrab. Pottery recognition is unchanged.
- A browser fixture sent its palm-mode shortcut before mock initialization; waiting for initialization fixed the test. The test now checks actual dragging, not just the camera's initial position update.
- Shelf opens a copied display artifact and returns without modifying its stored record. PNG uses a separate render target and frames the entire selected artifact, including attachments, without changing the inspection camera. Optional mouse/touch controls remain.

## M3/M4 findings

- Serialization moved to schema 4; schema 1–3 migrate with empty decoration. Unsupported future storage is preserved, and memory-only/invalid/duplicate saves are distinguished.
- Shared glaze validation rejected legacy unit fixtures using placeholder ids `g` and `celadon`; these tests now use an actual glaze, with a new explicit invalid-id rejection test.
- Preview shader compilation exposed the fresh-frame release gate under software rendering. Preview materials were simplified and static previews no longer rebuild during every armed observation. The user receives a specific reopen/regrab message after an input gap.
- The mock viewer pinch also incorrectly incremented the clay revision, unnecessarily rebuilding confirmed decoration. Its UI-only shortcut now changes input only.
- Raycast tests cover CSS rectangle mapping, rotated/nonuniformly scaled roots, local normals, and exterior-only anchors. DTO tests bound counts, dimensions, aspect ratios, kinds and colors. Restore/finalize/save tests preserve confirmed decoration.

## M5/M6 and final regression findings

- The camera-first stylesheet initially hid the shared viewer canvas. A separate viewer state now reveals its viewport without claiming camera access.
- The complete Chromium regression found hidden-button targets missing after CSS fade-in. Targets now refresh after the visibility transition; stale progress styling is cleared when a control loses focus.
- New controls overflowed short landscape glaze/gallery layouts, and the result card covered PNG. Layouts were corrected.
- A rebuilt glaze page could activate again under a single continuous hold. Activated controls require release across screen changes. Fresh absence also clears old pointer locks.
- Tool lesson storage is separate; repeat/skip are disabled during firing so a training result cannot reach the personal store.
- A test-only probe measured roughly 210–220 ms between synthetic observations in a close-up software-rendered view. Freshness protection correctly refused dwell. Sustained slow rendering now reduces internal rendering resolution; camera freshness and pottery thresholds remain unchanged. The temporary probe was removed.
- Existing browser fixtures now wait for asynchronous app startup and address the correct visible viewer surface. Old Done/completion/damage assertions were updated to the intended new UI. Widening actions, expected geometry and their assertions remain intact.
- README is updated in English and Russian; changelog, demo and Q&A are present. All 349 unit tests pass at this point. FINAL_TEST_REPORT records final browser/build evidence separately.

- Final integration: stationary inspection frames and shadow maps are cached so hand observations remain responsive. Modal boundaries retain active pinches until release; the rotation lesson no longer auto-repeats. Tool instructions no longer cover glaze actions. Rim attachments are allowed on the top annulus while stamp footprints remain on the side wall.

- Final data audit: strict enum types, nonempty checkpoint ids, consistent shared bottom holes, and editing-history retention on restore. The new regressions were reproduced before fixes; the full unit suite is now 355/355.
- Repeated complete synthetic-landmark route: 3/3 passes after resolving the 150 ms track-continuity gap via renderer quality adaptation. No tracking thresholds changed.

- Final gate: 39/39 Chromium tests passed. Screenshot review then found portrait resize cropping an already-open viewer; the regression reproduced it before fixing camera distance while retaining angle/relative zoom. Final production smoke: Chromium 2/2, Firefox/WebKit 2/2. Full physical-camera/device performance testing remains outstanding. No commit, push or deployment was performed.
- After that resize fix, all six affected Chromium inspection/decoration/export/phone routes passed. Final typecheck, diff whitespace audit, protected-widening content comparison and production dev-mock exclusion passed. The optional handle remains deferred.

## Exact changed-file inventory

Paths relative to the repository; includes implementation, regression tests and documentation. HEAD is unchanged.

### Core

- `src/engine/artifact.ts`
- `src/engine/checkpoint.test.ts`
- `src/engine/checkpoint.ts`
- `src/engine/controller.ts`
- `src/engine/customization.test.ts`
- `src/engine/customization.ts`
- `src/engine/decorationFlow.test.ts`
- `src/engine/materials.ts`
- `src/engine/session.ts`

### Browser adapters and browser tests

- `src/browser/app.pw.ts`
- `src/browser/atelier.pw.ts`
- `src/browser/checkpointStore.ts`
- `src/browser/design.pw.ts`
- `src/browser/final.pw.ts`
- `src/browser/finalPipeline.pw.ts`
- `src/browser/lessons.pw.ts`
- `src/browser/shareCodec.test.ts`
- `src/browser/shareCodec.ts`
- `src/browser/storage.test.ts`
- `src/browser/storage.ts`
- `src/browser/timing.pw.ts`

### Rendering

- `src/render/decoration.ts`
- `src/render/kiln.ts`
- `src/render/pot.ts`
- `src/render/scene.ts`
- `src/render/surfacePicking.test.ts`
- `src/render/surfacePicking.ts`
- `src/render/thumbnailDecoration.ts`

### Interface

- `src/ui/decorating.ts`
- `src/ui/dwell.test.ts`
- `src/ui/dwell.ts`
- `src/ui/final.css`
- `src/ui/finishing.ts`
- `src/ui/gallery.ts`
- `src/ui/handOrbit.test.ts`
- `src/ui/handOrbit.ts`
- `src/ui/inspection.ts`
- `src/ui/modal.ts`
- `src/ui/publicViewer.ts`
- `src/ui/recovery.ts`
- `src/ui/result.ts`
- `src/ui/screens.ts`
- `src/ui/sharing.ts`
- `src/ui/toolLessonProgress.test.ts`
- `src/ui/toolLessonProgress.ts`
- `src/ui/toolLessons.ts`

### Remaining modules and documentation

- `README.md`
- `README.ru.md`
- `docs/FINAL_CHANGELOG.md`
- `docs/FINAL_DEMO.md`
- `docs/FINAL_IMPLEMENTATION.md`
- `docs/FINAL_QA.md`
- `docs/FINAL_TEST_REPORT.md`
- `src/dev/mockCore.ts`
- `src/i18n.ts`
- `src/main.ts`
- `src/types.ts`
- `src/workshop.ts`
- `tests/controller.test.ts`
