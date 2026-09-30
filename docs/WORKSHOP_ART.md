# V9 workshop art and frontend

The user supplied `арара.avif` as a mood reference: a warm pottery workshop, shelves, plants, tactile clay and a wheel. The new scenery is an original image, not a copy of that reference. The live clay, wheel, target silhouettes, tracked hands and controls are rendered separately.

## Saved asset

- Project asset: `public/workshop-dusk.png` (1672 × 941, approximately 2 MB).
- Generated with the built-in `image_gen.imagegen` tool using the imagegen skill, 30 September 2026. No external API key or paid asset pack used.
- Original retained at `C:\Users\User\.codex\generated_images\01a0ec80-e57b-7e92-961e-f84c62fabcda\exec-fe518987-6156-4c1a-b1ca-5807a6415a5b.png`.
- UI styling: `src/ui/atelierTheme.css`; original SVG action icons: `src/ui/icons.ts`.
- The static image is decorative. Camera processing and clay interaction use the existing projection; decorative scenery never supplies input or changes clay geometry. The inspection view uses a quiet backdrop so all vessel angles stay readable.

## Generation prompt

Use case: stylized-concept. Asset type: a seamless-in-feel full-screen background illustration for KILN, an interactive 3D pottery browser game, landscape 16:9, 1920x1080 or larger. Create an ORIGINAL cozy artisan pottery workshop at blue-violet twilight, stylized polished 3D game environment with painterly material detail. Dark aged timber beams, shelves of imperfect ceramic bowls and earth-tone jars along far LEFT and far RIGHT edges, a few muted olive plants, clay-stained small tools at edges, warm amber lantern light, cool indigo evening through a high back window, subtle firefly-like dust. Composition is crucial: the entire CENTRAL 50% of the image should be broad, low-detail open dim workspace behind an interactive pot that will be rendered separately. No pot, wheel, table, hands or people in the central foreground. Centre lower area is empty shadowed warm floor/negative space; keep the background horizon low and detail concentrated at edges. No giant hero object, no text, logos, UI, border or watermark. Make it feel like a professional calm pottery simulator, intimate and believable, with tactile wood, earthenware and warm parchment tones. Eye-level view into the room with gentle depth. The left third must remain dark enough for a parchment instruction panel overlay and the rightmost edge for action buttons. This is background scenery only; foreground interaction will be real 3D.
