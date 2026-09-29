# KILN

A virtual pottery wheel controlled by hand gestures through a webcam. A browser game model with Russian UI.

**Current milestone: B1 scaffold.** The landing page runs; camera access, tracking integration and pottery interactions follow in later tasks. Production URL: pending deployment.

## Run locally

Use Node.js 22.12+ (22 LTS) or 24+.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `?dev=1` enables the development stub only in the dev server; production builds exclude it.

```sh
npm run build   # TypeScript check + production bundle in dist/
npm test        # A's Vitest tests
npm run preview
```

## Deploy

Import this repository into Vercel using the Vite preset. `vercel.json` sets the build command, `dist` output and SPA fallback. No environment variables are required for B1. Deployment configuration follows [Vercel's Vite guide](https://vercel.com/docs/frameworks/frontend/vite).

## Collaboration

[Plan](docs/PLAN.md) · [Core contract](src/types.ts) · [A's handoff](docs/handoff/A.md) · [B's handoff](docs/handoff/B.md)

Vite + vanilla TypeScript, Three.js, MediaPipe Tasks Vision and Vitest. Browser audio will use Web Audio and speechSynthesis. MediaPipe is pinned in `package.json`; its WASM CDN version must match exactly. Frontend modules are scaffolded with their milestone marked; `engine/` and `tracking/` belong to A.

Kiln - hackathon case solution
