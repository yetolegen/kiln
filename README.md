# KILN

**Team: Avivengers**

A virtual pottery wheel controlled by hand gestures through a webcam. A browser game model with Russian UI.

[Live HTTPS site](https://kiln-delta-rose.vercel.app)

![KILN development preview using synthetic input](public/kiln-demo.gif)

*The GIF is a labelled development preview using keyboard/mouse fixtures, not a recording of real hand recognition.*

Wait for the hand model, click «Начать» once and allow the camera. Hold both hands still for calibration, then point at a menu button and dwell for 0.9 seconds. After system camera permission, in-app navigation is designed to work with gestures. Tutorial, commission/free shaping, three glazes, firing, results, PNG export and a local gallery are implemented.

**v4 interaction:** A's new recognizer and cavity model are integrated with the frontend. The controls below replace the former two-pinch lift and two-fist press. Automated synthetic tests cover both hand roles; physical-camera recognition and T22 still need human verification. See [GESTURES_V4.md](docs/GESTURES_V4.md).

## Current controls

| Action | Gesture |
|---|---|
| Shape | Open both palms at opposite side walls, at the same height; move them in/out |
| Lift | One open hand horizontal near the base; other hand supports a wall. Hold still for 3 seconds until the ring fills, then rise very slowly |
| Initial indentation | Support a wall; point the other thumb downward at the top centre and push slightly to make one shallow dent |
| Widen/deepen | Support a wall; pinch thumb/index inside the dent, hold briefly, then gradually spread the fingers |
| Compress/smooth rim | Support a wall; hold the other open hand horizontal just above the rim for 0.5 seconds, then lower it slowly. Also repairs damage |
| Finish | Hold both open palms above the pot for 1.5 seconds |
| Navigate | Point the index finger, curl the other fingers, dwell on a button; use one hand in the studio |

These are basic shaping plus exactly four additional pottery functions. Either hand can act while the other supports; keep those roles throughout one action. The gold ring shows activation and green marks support. Moving too early/fast or losing support cancels activation. Six lessons require the requested action and actual shape change, with a gesture release between steps.

Rim compression was selected from [Clayground's wheel tutorial](https://www.clayground.net/post/beginnings-on-the-wheel-part-1-how-to-center-open-your-clay). A horizontal hand above the rim is distinguishable from a base lift, thumb-down indentation and pinch-spread opening. This camera mapping is a game adaptation.

## Feedback, privacy and local data

- Text coaching is always visible when needed. Russian system voice and synthesized audio are optional; the sound button also supports dwell.
- Brief interrupted tracking keeps a fading hand drawing for up to 350 ms. Cached drawing coordinates never enter the engine; deformation and confirmations require fresh reliable input.
- Results separate execution mistakes from tracking interruptions. Gallery and target-version best scores are local to this browser. The shelf keeps 24 pots; best scores survive trimming. Storage failure retains the shelf only until the page closes.
- Pots start solid. Opening radius/depth are shared by rendering, PNG export and schema-2 saves. Legacy schema-1 pots migrate as solid silhouettes because their files contain no cavity geometry.
- PNG export, storage, speech and sound may fail without blocking the result.
- Camera frames stay in the browser. The application requests no microphone and has no application backend. The model is served locally; pinned MediaPipe WASM loads from jsDelivr.
- This is a game model, not a measurement or simulation of real clay pressure or physical thickness.

## Run locally

Use Node.js 22.12+ (22 LTS) or 24+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `?dev=1` enables A's tracking debug panel only in the dev server. Add `&rec=1` for landmark recordings (R starts/stops). Keys 0–8 select neutral, shape, lift, indent, open, rim compression, point, finish and too fast. Production excludes debug and recording tools.

Frontend fixtures: `?dev=1&mock=1` skips camera/model loading. Keys 0–9 select loading/permission/calibrate/menu/tutorial/studio/glaze/firing/result/gallery; S/U/I/O/D simulate shape/lift/indent/open/rim compression, Escape releases, F finishes, T/W/C toggle tear/wobble/collapse, X toggles hand loss, arrows change the middle radius, and moving the mouse simulates pointing. Fixture action keys apply immediately; they do not exercise recognition or physical hold timing. These fixtures are never included in production.

The camera uses a mirrored, centered cover crop with an ideal front-camera resolution of 1280×720 and a 640×480 fallback. It never requests the microphone. Resize/orientation changes reset tracker and core together. Audio and speech unlock in the Start click and remain optional. Camera permission requires HTTPS or localhost; see [getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia).

```sh
npm run build   # TypeScript check + production bundle in dist/
npm test        # core and frontend unit/integration tests
npm run test:browser # Playwright Chromium, Firefox, WebKit (install browsers first)
npm run preview
```

## Deploy

Import this repository into Vercel using the Vite preset. `vercel.json` sets the build command, `dist` output and SPA fallback. No environment variables are required. Deployment configuration follows [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

Deployed to the `kiln` project via Vercel CLI. To update production from this linked checkout:

```sh
npx vercel@61.0.0 deploy --prod
```

Automatic deployments on GitHub pushes are not connected yet: Vercel requires a GitHub login connection for the account. Until that is configured, deploy with the CLI.

Verification results and physical-device limitations are recorded in [QA.md](docs/QA.md). Browser fixtures do not verify recognition quality or the mouse-free human T22 task. Real recordings are still required for threshold tuning.

Windows Playwright WebKit can omit the pot from landscape screenshots after a resize despite populated WebGL pixels. This remains unresolved; physical Safari support is unverified. Chromium is the verified real-model/simulated-camera path.

## Collaboration

[Plan](docs/PLAN.md) · [Core contract](src/types.ts) · [A's handoff](docs/handoff/A.md) · [B's handoff](docs/handoff/B.md)

Vite + vanilla TypeScript, Three.js, MediaPipe Tasks Vision, Vitest and Playwright. Audio uses Web Audio and speechSynthesis. MediaPipe is pinned in `package.json`; its WASM CDN version must match exactly. `engine/`, `tracking/`, config and shared types belong to A; browser/render/UI/audio and this README top belong to B.

Assets: procedural Three.js/Canvas pots and SVG hand diagrams; locally synthesized sounds; no stock audio, textures or custom-trained hand model. The hand landmarker is the pretrained MediaPipe model. The project builds on the repository's existing core code and the libraries above.

Kiln - hackathon case solution
