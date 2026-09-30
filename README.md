# KILN

**Team: Avivengers**

A virtual pottery wheel controlled by hand gestures through a webcam. A browser game model with Russian UI.

[Live HTTPS site](https://kiln-delta-rose.vercel.app)

![KILN development preview using synthetic input](public/kiln-demo.gif)

*The GIF is a labelled development preview using keyboard/mouse fixtures, not a recording of real hand recognition.*

Wait for the hand model, click «Начать» once and allow the camera. Hold both hands still for calibration, then place the centre of either palm over a menu button for 0.9 seconds. The button highlights and the cursor ring fills. Index-finger pointing also works. After system camera permission, in-app navigation is designed to work with gestures. Tutorial, commission/free shaping, three glazes, firing, results, PNG export and a local gallery are implemented.

V5.1 fixes camera/render timestamp ordering that could reset dwell and lesson confirmation, and puts the cursor ring above the buttons. The camera footer shows the version; small cyan dots mark tracked palm centres.

**V8.1 clay:** uneven slip marks, fine throwing grooves, damp highlights, cavity/contact shadows and visible wheel smears make rotation readable. The material stays attached to the mesh as it spins; core shape and gesture behavior stay the same. Reduced motion and inspection freeze decorative rotation. The tested update preserves A's debug pass.

**V8.0 workshop:** mineral green studio, clear lesson and action panels, warm clay, a visibly spinning wheel, bounded clay splatter during valid shaping, and free 3D vessel inspection. The [final Word design proposal](docs/KILN%20Frontend%20Design%20Final.docx) includes the approved rim-origin tearing, wheel effects and unrestricted viewing direction. Includes A's latest V7.2 visible-edge contact and jitter fixes through `67516c6`; working palm dwell is preserved. Automated synthetic tests cover both hand roles; physical-camera recognition and T22 still need human verification. See [GESTURES_V7.md](docs/GESTURES_V7.md) and [GESTURES_V6.md](docs/GESTURES_V6.md).

**View the vessel freely:** select «Осмотреть в 3D» after releasing the clay. Drag with the mouse or one finger to rotate through any side, above or underneath; use the wheel or pinch to zoom. Arrow buttons/keys rotate, +/− zoom, and 0 resets the view. «Вернуться к сосуду» or Escape restores the calibrated shaping camera. Clay manipulation and tutorial progression pause during inspection. The same inspection is available in glazing and results. WebGL is required for 3D inspection; shaping keeps its 2D fallback.

Wheel and pot share one rotation angle. Droplets are visual only and emit from fresh, valid deformation frames. Inspection and reduced-motion preferences stop these effects. Wall rupture opens from the rim down to the weak band through the outer wall, lip and inner wall; height is preserved. Bottom perforation and terminal pancakes retain their different geometry.

## Current controls

| Action | Gesture |
|---|---|
| Shape | Open both palms at opposite side walls, at the same height; move inward to narrow. Moving either palm outward releases the stroke. Leave contact before starting another stroke |
| Lift | One open hand horizontal near the base; other hand supports a wall. Hold still for 3 seconds until the ring fills, then rise very slowly |
| Initial indentation | Support a wall; point the other thumb downward at the top centre and insert slowly. Depth follows the thumb tip, including thumb bending with a stationary palm. Continuing too deeply thins and perforates the floor |
| Widen/deepen | Support a wall; pinch thumb/index inside the dent, hold briefly, then gradually spread the fingers |
| Compress/smooth rim | Support a wall; hold the other open hand horizontal just above the rim for 0.5 seconds, then lower it slowly. Repairs recoverable damage; continued pressing can flatten the pot |
| Finish | Select «Готово» with palm dwell or click, then choose glaze and fire. Raised hands do not finish the pot |
| Navigate | Hold either palm centre over a button; alternatively point with the index finger and curl the others |

These are basic shaping plus exactly four additional pottery functions. Either hand can act while the other supports; keep those roles throughout one action. The gold ring shows activation and green marks support. Moving too early/fast or losing support cancels activation.

**Studio controls:** Done/restart/menu/inspection hide and disable during contact or active gesture arming and return after 400 ms of clear disengagement. Session controls use a deliberate 1.8-second dwell; menu selection remains 0.9 seconds. Terminal damage leaves restart and inspection available and Done disabled. Small lift-pose fluctuations pause progress for up to 250 ms instead of erasing it; questionable frames never deform clay. Genuine departure, tracking/support loss and changed hand roles still cancel the action.

**Geometry-led lessons:** every phase shows a cyan transparent target, including a dotted cavity cross-section. The amber section shows actual cavity depth. Completion requires the correct action to produce a matching height, full outer profile, cavity radius and depth. Goals lock when each step begins; a gesture alone cannot pass. The shape freezes briefly at the target, then releasing the action advances. After compression in step 5 is validated, step 6 displays «Обучение окончено» immediately. No additional gesture is needed. Overshoot or damage stops progression with corrective feedback and a palm-selectable Try Again button, which restarts the entire attempt. The same five pottery actions are tested in Free Mode and commissions with either hand assignment.

**Damage in every shaping mode:** a ceiling at roughly 75% of the space above the pot base limits height. Thumb penetration beyond a palm-scaled safe depth warns of a thin floor; further pushing makes a through-hole. Holding an engaged opening for 7 seconds starts thinning the walls, and 10 seconds tears them. A wall reaching 10% of its original normalized thickness tears locally without sagging. Downward compression warns below height 0.4 and becomes a terminal pancake at 20% of initial height (0.24 game units); the cavity closes. Perforation, torn walls and pancakes freeze further sculpting and require restart. The camera infers movement; it does not measure physical pressure. The model does not conserve clay volume exactly.

Rim compression was selected from [Clayground's wheel tutorial](https://www.clayground.net/post/beginnings-on-the-wheel-part-1-how-to-center-open-your-clay). A horizontal hand above the rim is distinguishable from a base lift, thumb-down indentation and pinch-spread opening. This camera mapping is a game adaptation.

## Feedback, privacy and local data

- Text coaching is always visible when needed. There is no voice-over; synthesized sound effects are optional and the sound button also supports dwell.
- Brief interrupted tracking keeps a fading hand drawing for up to 350 ms. Cached drawing coordinates never enter the engine; deformation and confirmations require fresh reliable input.
- Results separate execution mistakes from tracking interruptions. Gallery and target-version best scores are local to this browser. The shelf keeps 24 pots; best scores survive trimming. Storage failure retains the shelf only until the page closes.
- Pots start solid. Opening radius/depth, floor thickness and bottom perforation are preserved in schema-3 saves. WebGL leaves an actual hole; the annotated cross-section makes deep perforation visible from the camera angle. Damaged cavity walls show open tears. Legacy schema-2 pots retain their cavity and derive floor thickness; schema-1 pots migrate as solid silhouettes.
- PNG export, storage and sound may fail without blocking the result.
- Camera frames stay in the browser. The application requests no microphone and has no application backend. The model is served locally; pinned MediaPipe WASM loads from jsDelivr.
- This is a game model, not a measurement or simulation of real clay pressure or physical thickness.

## Run locally

Use Node.js 24.x. The deployment runtime is pinned to this tested major version.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `?dev=1` enables A's tracking debug panel only in the dev server. Add `&rec=1` for landmark recordings (R starts/stops). Keys 0–8 select neutral, shape, lift, indent, open, rim compression, point, finish and too fast. Production excludes debug and recording tools.

Frontend fixtures: `?dev=1&mock=1` skips camera/model loading. Keys 0–9 select loading/permission/calibrate/menu/tutorial/studio/glaze/firing/result/gallery; S/U/I/O/D simulate shape/lift/indent/open/rim compression, Escape releases, F simulates raised palms without finishing, T/W/C toggle tear/wobble/collapse, X toggles hand loss, arrows change the middle radius. Mouse movement simulates the cursor: H selects palm-centre mode, P selects index-pointing mode. Finish by selecting «Готово». Fixture action keys apply immediately; they do not exercise recognition or physical hold timing. These fixtures are never included in production.

V5 failure fixtures: B perforates the floor, E toggles the over-stretch warning, N creates a pancake. They are display fixtures; real-controller tests separately exercise the actual gesture/damage pipeline.

The camera uses a mirrored, centered cover crop with an ideal front-camera resolution of 1280×720 and a 640×480 fallback. It never requests the microphone. Resize/orientation changes reset tracker and core together. Optional sound unlocks in the Start click. Camera permission requires HTTPS or localhost; see [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

```sh
npm run build   # TypeScript check + production bundle in dist/
npm test        # core and frontend unit/integration tests
npm run test:browser # Playwright Chromium, Firefox, WebKit (install browsers first)
npm run preview
```

The production build loads hand tracking asynchronously and splits Three.js core/renderer into independently cached chunks using Vite's supported `rolldownOptions.output.codeSplitting`. The 500 KB warning threshold is unchanged; V8's largest minified JavaScript chunk is about 352 KB. See [Vite production chunking](https://vite.dev/guide/build.html#chunking-strategy).

## Deploy

Import this repository into Vercel using the Vite preset. `vercel.json` sets the build command, `dist` output and SPA fallback. No environment variables are required. Deployment configuration follows [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

Deployed to the `kiln` project via Vercel CLI. To update production from this linked checkout:

```sh
npx vercel@61.0.0 deploy --prod --scope mansurertaj5-4014
```

Automatic deployments on GitHub pushes are not connected yet: Vercel requires a GitHub login connection for the account. Until that is configured, deploy with the CLI.

Verification results and physical-device limitations are recorded in [QA.md](docs/QA.md). Browser fixtures do not verify recognition quality or the mouse-free human T22 task. Real recordings are still required for threshold tuning.

Windows Playwright WebKit can omit the pot from landscape screenshots after a resize despite populated WebGL pixels. This remains unresolved; physical Safari support is unverified. Chromium is the verified real-model/simulated-camera path.

## Collaboration

[Plan](docs/PLAN.md) · [Core contract](src/types.ts) · [A's handoff](docs/handoff/A.md) · [B's handoff](docs/handoff/B.md)

Vite + vanilla TypeScript, Three.js, MediaPipe Tasks Vision, Vitest and Playwright. Audio uses Web Audio. MediaPipe is pinned in `package.json`; its WASM CDN version must match exactly. `engine/`, `tracking/`, config and shared types belong to A; browser/render/UI/audio and this README top belong to B.

Assets: procedural Three.js/Canvas pots and SVG hand diagrams; locally synthesized sounds; no stock audio, textures or custom-trained hand model. The hand landmarker is the pretrained MediaPipe model. The project builds on the repository's existing core code and the libraries above.

Kiln - hackathon case solution
