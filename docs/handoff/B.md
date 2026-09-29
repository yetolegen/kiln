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
