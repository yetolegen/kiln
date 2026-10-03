# Preset handles, ceramic rendering and hand overlay

Local review branch: `feature/preset-handles-rendering`, based on `b4c3ac2`.
No commit, push or deployment is part of this feature sprint.

## Handles

Exactly three fixed presets are available: round side loop, angular side loop and top arch. After confirming the main shape, the existing glaze phase locks the body and opens an optional handle panel. Skipping proceeds to the existing decoration workspace. The editor supports selection, vessel-local placement, whole-object rotation, confirmation, removal and adding another handle (maximum four). Side handles also support bounded uniform scale; the arch fits the upper vessel diameter automatically. There is no independent axis scaling or curve editing.

Placement checks the anchor, finite transform and both endpoint contacts. An invalid handle never changes or damages the body. Short forms and arches whose endpoints fall inside the opening have specific guidance; users can choose another preset or skip. Handles use the existing raycast, HandOrbit and registered dwell actions. The short lesson uses an isolated training pot and can be skipped; the main tutorial does not require handles.

The existing version-1 customization record gains a `handles` array. Missing arrays normalize to empty, including old gallery saves and old links. Share version, compression, size limits and route stay unchanged; the optional field is omitted from zero-handle links. The checkpoint reader extends its existing "no post-shaping decoration in a studio checkpoint" validation to handles. Checkpoint capture, restore, statistics and recovery behavior are unchanged.

## Assembly and resource ownership

```text
VesselRoot
├── BodyMesh
├── HandleGroup
├── AttachmentGroup
├── SurfaceDecorationLayer
└── temporary selection previews / contact ring
```

All geometry uses vessel-local coordinates. Inspection changes the camera around this assembly; wheel rotation applies to the common root. Changing the body only replaces `BodyMesh.geometry` and disposes that unique old geometry. It cannot clear the root, handle group or attachment group. Materials and transforms survive the replacement.

Each handle view caches three preset geometries. Deleting one handle disposes its material, not the shared geometry. The entire handle view owns and eventually disposes the geometry cache. Moving a preview reuses its mesh. Confirmed meshes update only when their records change.

One material family owns the vessel's procedural textures; body, handles and clay attachments have separate materials with matching finish parameters. Selection cannot recolor another mesh. Glaze/firing finish updates all compatible meshes. Stamps retain their own existing motif colors and follow the same interpolated outer profile as the body.

## Rendering diagnosis and changes

The baseline already enabled antialiasing and capped device pixel ratio at 2. It also reduced resolution under slow frames, potentially as far as 25% of that cap. Missing antialiasing was therefore not the cause of the soft appearance. The coarse vertical profile, strong bump/roughness variation, glossy raw-clay highlights and bright inspection fill contributed to it. The final texture keeps the existing broad color pattern so wheel rotation stays visible, while reducing fine color noise, bump strength and wetness variation.

| Property | Before | After |
|---|---|---|
| Logical simulation bands | 48 | 48, unchanged |
| Outer visual samples | 48 | 142 |
| Total lathe profile points | 106 | 200, including existing inner wall and lip |
| Radial segments | 96 | 96 |
| Body vertices | 10,282 | 19,400 |
| Normals | Computed with seam averaging | Same treatment after body replacement |
| Raw roughness / bump / clearcoat | .60 / .018 / .22 | .88 / .006 / .02 |
| Full-glaze roughness / bump / clearcoat | .32 / .006 / .82 | .31 / .002 / .70 |
| Metalness | 0 | 0 |
| Rim light | Purple, 1.3 | Warm cream, .9 |
| Inspection fill | 2.3 | 1.2 |

Monotone cubic interpolation passes through the original logical samples and cannot overshoot neighboring radii. Neck and bulge shape, rim tear, opening and floor remain readable. Simulation, scoring and raycast anchor validation continue to use the original logical clay data. No texture packs, post-processing, displacement, CSG or topology fusion were added.

Pixel ratio remains `min(devicePixelRatio, 2) × adaptive quality`, including resize. The existing slow-frame thresholds and minimum quality remain unchanged. Camera-free inspection can restore full resolution; live hand editing retains the adaptive budget. An initial attempt to restore full resolution for every inspection interrupted landmark continuity in the real-pipeline browser test. Restricting that restoration to camera-free views fixed the regression without relaxing input freshness or gesture timing.

The body now compares render data when revision/array identity changes. The engine legitimately clones arrays on neutral observations; those equal-value clones no longer rebuild the mesh. Root rotation, wobble and the contact ring update independently.

### Measured local performance

Headless Chromium, 1440×900, DPR 1, same machine and fixtures. Baseline source was exported from `b4c3ac2` to a separate local directory. After 20 warm-up iterations, body timings use 200 samples; overlay timings use 100. The overlay benchmark draws two synthetic hands, clears the canvas and reads one pixel to flush drawing. These are CPU/browser microbenchmarks, not camera/MediaPipe throughput or hardware FPS claims.

| Operation | Before median / p95 | After median / p95 |
|---|---|---|
| Changed body geometry | 2.0 / 2.1 ms | 5.0 / 5.7 ms |
| Equal-value cloned clay | 1.9 / 2.2 ms | Both below the browser timer's 0.1 ms resolution |
| Idle hand drawing including flush | .9 / 1.0 ms | .6 / .8 ms |
| Active hand drawing including flush | .8 / 1.1 ms | .8 / .9 ms |

Overlay draw submission p95 stayed at .1 ms. The denser body costs more when geometry actually changes; skipping neutral rebuilds reduces unnecessary work. No measured increase appeared in this controlled glove test. Physical-hand responsiveness still needs validation on the demo machine. Script, measurements and captures are in the local evidence directory (`capture.mjs`, `performance-both.json`, and the final texture run `performance-after.json`).

## Glove overlay

Canvas2D fills the palm and draws thick continuous finger strokes, small joints and a restrained glow from the existing 21 landmarks. Active clay interaction raises opacity; a new recognized shaping action briefly changes its highlight. Existing hand-specific warning data can emphasize the affected hand. The existing presentation history and all tracking/recognition/filtering remain untouched. `?dev=1&skeleton=1` retains an optional skeleton overlay.

## Verification record

Final Chromium verification passed: **71/71 tests**, including the real MediaPipe startup/pipeline, shaping, damage/recovery, existing attachments, all handle flows, gallery/share, responsive controls and accessibility. Firefox/WebKit frontend checks passed **24/24**. Together with the 12 Chromium cases, all **36 existing screenshot baselines** passed unchanged. Axe reported no violations in the tested states, including the added controls.

Current verified unit result: 408/408, 51 files; typecheck and production build passed (79 modules). Added coverage includes all three preset round trips, zero handles, old saves/links, deletion, multiple handles, body lock, endpoint validation, mesh survival, disposal ownership, finish consistency, deterministic reconstruction, interpolation and stamp alignment.

Production-preview shared-viewer smoke passed **3/3** in Chromium, Firefox and WebKit: three handles plus an attachment and stamp, rotation, portrait/landscape resize, reload, axe, no camera requests and no creator editing controls. The initial WebKit run identified a bug in the new test's camera-denial setup when `navigator.mediaDevices` is absent. The stub now covers both environments; all original assertions remain. Typecheck passed again after that test-only fix. Firefox initially needed execution outside the Windows sandbox because its tab subprocess could not launch; its unrestricted checks passed. No global timing or application behavior was changed for either browser.

The production build's real MediaPipe model/camera startup and resize smoke also passed **1/1** in Chromium. This uses the browser's fake camera device with the real model, not a physical-hand quality measurement. The development and preview servers started for verification were stopped before handoff; use the commands below for a fresh local preview.

Verification commands (each browser command ran alone to avoid competing GPU load):

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:5174'
npm.cmd run test:browser -- --project=chromium --output=test-results/handles-full-final --reporter=line --max-failures=3
npm.cmd run test:browser -- src/browser/frontend.pw.ts --project=firefox --project=webkit --output=test-results/handles-frontend-final --reporter=line --max-failures=3
$env:PLAYWRIGHT_BASE_URL='http://127.0.0.1:4173'
npm.cmd run test:browser -- src/browser/handleViewer.pw.ts --output=test-results/handles-production-viewer-final --reporter=line --max-failures=1
npm.cmd run test:browser -- src/browser/app.pw.ts --project=chromium --grep 'B2 loads' --output=test-results/handles-production-camera --reporter=line --max-failures=1
```

The existing screenshot baselines have not been updated. Visual evidence is stored locally outside the repository at `C:\Users\User\AppData\Local\Temp\kiln-handles-evidence-20261003`; these are review captures, not automatically accepted baselines. Individual before/after captures cover raw, wide, tall, narrow-neck, damaged and glazed vessels, all three handles, multiple handles, and the overlay. Browser captures cover result, gallery reopen, shared viewer and the five required viewports.

All 19 final browser captures were inspected individually: result/reopen/shared for each preset, and editor/viewer at 1440×900, 1366×768, 390×844, 430×932 and 844×390. Critical controls fit these viewports. The landscape preset chooser partly covers the bottom of the vessel; placement clears that chooser. Under sustained slow frames the live editor/result can still look soft because adaptive resolution deliberately prioritizes hand responsiveness. Camera-free viewer captures regain full detail. This limitation needs review on the actual demo hardware.

## File review map

| Area | Files |
|---|---|
| Handle data and compatibility | New `src/engine/handles.ts`; `src/engine/customization.ts`, `src/browser/shareCodec.ts`, `src/engine/checkpoint.ts` |
| Independent render layers and finish | New `src/render/handles.ts`, `src/render/materialFamily.ts`; `src/render/pot.ts`, `src/render/scene.ts`, `src/render/decoration.ts`, `src/render/claySurface.ts` |
| Glove presentation | New `src/render/handGlove.ts`; `src/render/overlay.ts` |
| Handle workspace and optional lesson | `src/ui/decorating.ts`, `src/ui/final.css`, `src/ui/toolLessons.ts`, `src/ui/toolLessonProgress.ts`, `src/workshop.ts` |
| Gallery/result presentation | `src/render/thumbnailDecoration.ts`, `src/ui/gallery.ts`, `src/ui/result.ts` |
| Focused unit coverage | New `src/engine/handles.test.ts`, `src/render/assembly.test.ts`; `src/engine/checkpoint.test.ts` |
| Browser coverage | New `src/browser/handles.pw.ts`, `src/browser/handleViewer.pw.ts`, `src/browser/handleTestFlow.ts`; existing `app.pw.ts`, `clay.pw.ts`, `final.pw.ts`, `finalPipeline.pw.ts`, `polish.pw.ts` navigate the optional step |
| Report | New `docs/HANDLES_RENDERING.md` |

Existing assertions, screenshot baselines and global browser timing remain intact. No dependencies were added. Widening and its lesson, gesture recognition/thresholds, MediaPipe/tracking/filtering, input-age limits, dwell timing, clay physics/ClayState, damage and scoring are unchanged. Checkpoint capture/restore semantics and gallery/sharing architecture are unchanged; only the optional handle data and its validation extend the existing document.

## Manual review gate

```powershell
cd C:\Users\User\kiln
npm.cmd run build
npm.cmd run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/` and inspect:

1. Shape normally, including widening, then finish the body. Confirm the body stays locked throughout handle editing.
2. Skip handles and finish one vessel through decoration, glaze and firing.
3. Place each preset; rotate the complete vessel, rotate/resize a side handle, confirm, move, cancel and delete. Try an invalid rim/edge placement and recover.
4. Add two handles and existing details/stamps. Check contact points and matching raw/glazed appearance from several angles.
5. Save to the gallery, reload, reopen and share. Open the link separately with camera permission denied; confirm all parts remain and no editing controls appear.
6. Check raw clay, narrow neck, wide rim, visible damage, eight existing glazes and PNG export.
7. Try the optional handle lesson and its skip action.
8. Check real hands, glove readability, dwell targeting, pinch release/reacquisition and responsiveness on the demo machine.
9. Check 1440×900, 1366×768, 390×844, 430×932 and landscape phone layouts.

Real-hand usability and device-specific performance require this manual pass. Separate meshes intentionally intersect slightly; handles are not physically fused. Existing WebGL-loss fallback retains the data but cannot display the complete 3D assembly, and PNG export is unavailable for decorated fallback vessels.

Concord configuration files added during this session belong to the user's local coordination setup and are separate from this feature. Keep them separate when reviewing or eventually staging changes.

## Working tree at handoff

Branch: `feature/preset-handles-rendering`; HEAD: `b4c3ac2`. No staged files, commits, pushes, deployments or tag changes. `final-motion-stable` still points to `2f3ec5c`.

`git status --short`:

```text
 M .gitignore
 M src/browser/app.pw.ts
 M src/browser/clay.pw.ts
 M src/browser/final.pw.ts
 M src/browser/finalPipeline.pw.ts
 M src/browser/polish.pw.ts
 M src/browser/shareCodec.ts
 M src/engine/checkpoint.test.ts
 M src/engine/checkpoint.ts
 M src/engine/customization.ts
 M src/render/claySurface.ts
 M src/render/decoration.ts
 M src/render/overlay.ts
 M src/render/pot.ts
 M src/render/scene.ts
 M src/render/thumbnailDecoration.ts
 M src/ui/decorating.ts
 M src/ui/final.css
 M src/ui/gallery.ts
 M src/ui/result.ts
 M src/ui/toolLessonProgress.ts
 M src/ui/toolLessons.ts
 M src/workshop.ts
?? .agents/
?? .claude/
?? .codex/
?? .cursor/
?? .gemini/
?? .grok/
?? .mcp.json
?? AGENTS.md
?? CLAUDE.md
?? docs/HANDLES_RENDERING.md
?? src/browser/handleTestFlow.ts
?? src/browser/handleViewer.pw.ts
?? src/browser/handles.pw.ts
?? src/engine/handles.test.ts
?? src/engine/handles.ts
?? src/render/assembly.test.ts
?? src/render/handGlove.ts
?? src/render/handles.ts
?? src/render/materialFamily.ts
```

`git diff --stat`:

```text
 .gitignore                        |  1 +
 src/browser/app.pw.ts             |  3 ++
 src/browser/clay.pw.ts            |  1 +
 src/browser/final.pw.ts           |  2 +
 src/browser/finalPipeline.pw.ts   |  9 +++-
 src/browser/polish.pw.ts          |  1 +
 src/browser/shareCodec.ts         |  7 ++--
 src/engine/checkpoint.test.ts     | 11 +++++
 src/engine/checkpoint.ts          |  2 +-
 src/engine/customization.ts       | 15 +++++--
 src/render/claySurface.ts         |  4 +-
 src/render/decoration.ts          | 29 ++++++++-----
 src/render/overlay.ts             | 24 +++++------
 src/render/pot.ts                 | 72 ++++++++++++++++++++------------
 src/render/scene.ts               | 38 ++++++++++-------
 src/render/thumbnailDecoration.ts | 10 ++++-
 src/ui/decorating.ts              | 88 +++++++++++++++++++++++++++++++--------
 src/ui/final.css                  |  5 +++
 src/ui/gallery.ts                 |  3 +-
 src/ui/result.ts                  |  2 +-
 src/ui/toolLessonProgress.ts      |  4 +-
 src/ui/toolLessons.ts             | 10 +++--
 src/workshop.ts                   |  2 +-
 23 files changed, 242 insertions(+), 101 deletions(-)
```

This stat covers tracked files only: 22 feature files plus the user-added `.gitignore` coordination entry. The 10 new feature files are untracked and listed in the review map above. The local agent/MCP setup entries (`.agents/`, `.claude/`, `.codex/`, `.cursor/`, `.gemini/`, `.grok/`, `.mcp.json`, `AGENTS.md`, `CLAUDE.md`) belong to the coordination setup and were preserved separately. Test output, temporary captures and build artifacts remain ignored or outside the repository. Nothing was staged.
