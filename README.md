# KILN

A virtual pottery wheel controlled by hand gestures through a webcam. A browser game model with Russian UI.

[Live HTTPS site](https://kiln-delta-rose.vercel.app)

**Current milestone: B1 scaffold.** The landing page runs; camera access, tracking integration and pottery interactions follow in later tasks.

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

Deployed to the `kiln` project via Vercel CLI. To update production from this linked checkout:

```sh
npx vercel@61.0.0 deploy --prod
```

Automatic deployments on GitHub pushes are not connected yet: Vercel requires a GitHub login connection for the account. Until that is configured, deploy with the CLI.

B1 verification: typecheck/build and 8 coordinate tests pass. Public HTTPS returns 200 for the page, assets, `/gallery` and `?dev=1`; production JavaScript excludes the mock. Visual checks and device testing are still pending.

## Collaboration

[Plan](docs/PLAN.md) · [Core contract](src/types.ts) · [A's handoff](docs/handoff/A.md) · [B's handoff](docs/handoff/B.md)

Vite + vanilla TypeScript, Three.js, MediaPipe Tasks Vision and Vitest. Browser audio will use Web Audio and speechSynthesis. MediaPipe is pinned in `package.json`; its WASM CDN version must match exactly. Frontend modules are scaffolded with their milestone marked; `engine/` and `tracking/` belong to A.

Kiln - hackathon case solution
