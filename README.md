# KILN

A pottery wheel you control with your hands through a webcam. Built by team Avivengers for ADMIT Hackathon 2026.

English · [Русский](README.ru.md)

You shape virtual clay with both hands, open a cavity, pick a glaze and fire the pot. KILN recognizes six pottery actions, draws your hands over the video and tells you how to fix a movement that didn't work.

Live version: https://kiln-delta-rose.vercel.app/

Nothing to install. Click «Начать», allow camera access, and from there menus, shaping, glazing, firing and the gallery all work by hand. The interface is in Russian, so this guide gives the original button labels.

## Quick start

1. Open the studio on a device with a camera. A computer running Chrome with a reasonably large screen is convenient for your first session.
2. Position yourself so the camera can see both entire hands, including fingertips. Light your hands from the front and avoid overlapping them.
3. Wait for hand recognition to load, click Start («Начать»), grant camera permission and show both open palms. Hold still briefly for calibration until the menu appears.
4. Choose Learn · Lesson («Научиться · урок») to learn the actions. To start making a vessel immediately, choose Free Sculpting («Свободная форма») or Create a Vase · From a Reference («Создать вазу · по образцу»). Completing the lesson is optional.

The camera view is mirrored. Follow the hand outlines and vessel on screen: contact means aligning them in the image. Show Camera («Показать камеру») makes the video brighter to help you position your hands. Sound On / Sound Off («Звук включён» / «Звук выключен») toggles sound effects and also supports palm selection.

### Selecting buttons without a mouse

- Move the center of your palm, shown as a cyan dot on its outline, over a button.
- Hold it there until the progress circle fills. Ordinary selections take about 0.9 seconds. Done, restart, exit and inspection during shaping take 1.8 seconds.
- Move your palm away after activation. Leaving the button before completion resets its progress.
- You can also point your index finger at a button while curling the other fingers. Palm position is the main navigation method.
- Finishing and exit buttons hide during active shaping to prevent accidental selection. Release the clay and move your hands away; the buttons return after about half a second.

## How to sculpt: six actions

For actions that require support, either hand can be the working hand. Keep the other palm beside the wall, within the vessel's height. Keep the same hand roles throughout each action.

Feedback: a green ring and Support («Опора») label identify the supporting hand. A gold ring shows preparation progress on the working hand. For actions with a hold, wait until the ring fills and Slowly («Медленно») appears before moving.

![Six pottery actions: narrow, lift, indent, open, compress and widen the body](docs/gestures-guide.en.svg)

### 1. Narrow the vessel from outside

1. Open both palms, straighten your fingers and move your thumbs away from your index fingers.
2. Place your hands outside the left and right walls, at the same height. For lesson step 1, work around the middle of the vessel.
3. Bring the inner edges of the hand outlines to the walls. Slowly move the left palm rightward and the right palm leftward, as though squeezing the clay between them.
4. The walls move inward at the contact height. Stop at the transparent target or your preferred width.

To stop: move your palms outward, away from the walls. This releases the clay. For another press, leave contact first, then bring your hands back. Holding still should not keep narrowing the vessel.

### 2. Lift and stretch the vessel

1. Support a side wall with one open palm.
2. Bring your other hand horizontally to the base, slightly underneath it. Point your fingers sideways, as though scooping up the clay with the edge of your palm.
3. Maintain support and hold the lower hand still for about 3 seconds, until the circle fills.
4. Raise the lower hand very slowly. The vessel grows taller; keep the supporting palm against the wall.

To stop: stop at the desired height and move the working hand sideways out of the base area. If the action is cancelled, return to the starting position and wait for a full circle again. In the lesson, keep the top within the target silhouette.

### 3. Make the initial thumb indentation

1. Keep one open palm beside the wall for support.
2. Curl the other fingers of your working hand and point its thumb downward.
3. Align the thumb tip with the center of the clay's top surface.
4. Slowly lower the tip a little into the clay. The indentation deepens with the tip's movement; you can bend the thumb while keeping the palm still.

Depth guide: in the lesson, stop at the cyan floor marker. The yellow line marks the safe guide depth: roughly one segment of the thumb. The initial dent needs only a small press; it has no long preparation hold.

To stop: lift the thumb out of the clay. Pressing too quickly cancels the action and shows advice. Pressing too deeply thins the bottom and can puncture it. Depth is scaled to the tracked hand, not measured in real centimeters.

### 4. Widen and deepen the opening

1. Make a thumb indentation first. Keep one palm supporting the outside wall.
2. Bring the working hand's thumb and index finger together in a pinch and place their tips inside the existing indentation.
3. Hold the closed pinch for about 0.2 seconds, until the circle fills.
4. Slowly spread those fingers. The opening becomes wider and deeper, and the walls become thinner.

To stop: withdraw the working hand from the opening. Simply stopping the spread is insufficient for a long pause: the stretching timer continues while the opening gesture remains engaged. After about 7 seconds, the walls become dangerously thin; continuing can tear them. In the lesson, stop earlier when the target width is reached.

### 5. Lower the vessel and compress the rim

1. Hold one open palm vertically beside the vessel, supporting its wall.
2. Hold the other palm horizontally just above the rim, as though resting it on the clay. Point its fingers sideways. Your hands form an angle: one beside the vessel, one above it. They do not need to touch each other.
3. Hold the upper palm still for about 0.5 seconds, until the circle fills.
4. Slowly and steadily lower the upper palm, maintaining side support. The vessel becomes shorter and its rim becomes smoother. Continuing the movement increases compression.

To stop: stop when the top aligns with the silhouette, then move the working hand away from the rim. Height changes follow hand movement; the camera does not measure pressure. Excessive compression flattens the clay into a pancake and requires a restart.

### 6. Widen the vessel's body

To widen the wall at a chosen height, no opening is required:

1. Place your hands outside the left and right walls, at the height you want to widen.
2. Pinch the thumb and index finger of each hand together, as though gripping the vessel from both sides.
3. Hold still for about 0.5 seconds, until the preparation circles fill.
4. Slowly spread both hands sideways, keeping both pinches closed. The wall widens around the height of your pinches, blending smoothly into the bands above and below; this action does not expand the cavity itself.
5. Open both pinches, then move your hands away. This stops widening. Moving only one hand does not widen the body.

Ordinary open palms still narrow the vessel when brought together and release it when moved outward. Use two closed pinches for deliberate widening. A sudden movement cancels the action: open your fingers and prepare again.

Alternative: widen a wall locally from inside.

This method is available in Free Sculpting and Reference mode. It requires an existing cavity with enough depth.

1. Support an outside wall with one palm.
2. Point the working hand's index finger downward into the opening, at the height you want to widen. Keep the thumb above the index fingertip, without pinching them together.
3. Hold still for about 0.3 seconds, until the circle fills.
4. Slowly move the index finger from inside toward either wall. The outer profile widens at the fingertip's height.

To stop: withdraw the finger. Returning toward the center adds no further widening. Work in short strokes at nearby heights for a smooth profile.

Action differences: outside palms narrow the shape; two outside pinches widen the wall at their height; spreading two fingers of one hand inside enlarges the cavity; an inside index finger widens the wall at a chosen height.

## From the first movement to a finished vessel

### A lesson with transparent targets

The lesson teaches narrowing, widening the middle, lifting, making an indentation, opening the cavity and compressing the rim. It has seven screens: six actions followed by Training Complete («Обучение окончено»). Widening is step 2, immediately after narrowing.

Each action has a cyan target silhouette and a Shape («Форма») indicator. Progress depends on the resulting geometry: height, wall profile, cavity width and cavity depth. Once the shape matches, stop moving and release the gesture to continue. Holding one pose does not skip several steps.

Exceeding the permitted shape or damaging the clay stops progression. Read the explanation and choose Try Again · From Step One («Попробовать снова · с первого шага»). This restarts the entire lesson attempt. After completing the lesson, return to the studio and begin Free Sculpting or Reference mode.

### Shape, glaze, fire

1. Choose Free Sculpting («Свободная форма») for your own design, or Create a Vase · From a Reference («Создать вазу · по образцу») to match a transparent silhouette.
2. Shape the vessel using the gestures above. All six actions are available in Free Sculpting.
3. Move your hands away and select Done («Готово»). This unlocks glazing and firing.
4. Hover your palm over a glaze: Amber («Янтарь»), Jade («Нефрит») or Milk («Молоко»). Selecting a glaze enables Fire («В печь»).
5. Select Fire and wait about 4 seconds for firing to finish.
6. Review your time and mistakes on the result screen. Reference mode also shows a similarity percentage against the target vase.
7. Your vessel is automatically added to My Shelf («Моя полка»). Export its image with Save PNG («Сохранить PNG») or begin another vessel.

The gallery stores up to 24 works and the best reference scores in the current browser. If browser storage is unavailable, the shelf lasts until the page is closed; the complete scenario remains playable.

### Inspect the vessel from any angle

Release the clay and choose Inspect in 3D («Осмотреть в 3D»). You can freely rotate, zoom and inspect it from above or below.

- With your hands: dwell over the arrow buttons, Top («Сверху»), Bottom («Снизу»), +, − and Reset View («Сбросить вид»).
- Optional mouse or touch controls: drag to rotate; use the mouse wheel or a touchscreen pinch to zoom.
- Select Return to Vessel («Вернуться к сосуду») to continue. Shaping and lesson progression pause during inspection.

## Mistake mode: what went wrong and how to fix it

KILN checks pose, contact position, support, preparation time and movement speed. Advice above the heading explains what to change. Hand outlines, preparation circles and contact highlights help you locate the problem.

The following examples are English translations of the in-game Russian hints:

| Situation | Example hint | Correction |
|---|---|---|
| Right palm is too far from the wall | “Bring your right hand to the right wall.” | Align its outline with the vessel's right side |
| Working hand is vertical instead of horizontal | “Open your right palm and turn your wrist horizontally, with fingers pointing sideways.” | Rotate the hand, then wait for the preparation circle |
| Lifting starts too quickly | “Raise your hand more slowly. Hold it horizontally at the base for three seconds again.” | Return to the base, prepare again and lift smoothly |
| There is no indentation to open | “First make a shallow indentation with your thumb pointing down, supporting the wall with your other hand.” | Create the initial dent before pinching inside it |
| Working hand moves without support | “Keep the palm of your left hand beside the wall for support.” | Restore side support and prepare the action again |
| Camera loses the hands | “Tracking lost. Bring your hands back into view and separate them. The clay is paused.” | Show both hands and wait for stable outlines |

Technique mistakes and tracking failures are separate. Unreliable input pauses deformation. A hand outline briefly preserved on screen does not keep shaping the clay. Tracking issues are listed separately from execution mistakes in the results.

### Visible consequences of mistakes

- Excessive thumb insertion thins the bottom and can make a hole through it.
- Prolonged opening or critically thin walls causes a tear starting at the rim.
- Excessive vertical compression creates a flat pancake. At around 20% of the initial height, this becomes a terminal failure.
- An excessively tall or unstable vessel can slump. In the lesson, exceeding the target's permitted bounds also stops the step.

Serious damage displays “The clay is ruined. Start again.” («Глина испортилась, начните заново») with its cause and restart instructions. Withdraw your hands and select Start Again («Начать сначала»). A punctured bottom, terminal wall tear or pancake blocks further shaping until restart. Minor damage produces technique advice and may be repaired by rim compression; a light scratch does not require restarting.

## Run from source

You need Node.js 24.x, npm, Git, a webcam and an internet connection for the initial dependency and recognition-component downloads.

```sh
git clone https://github.com/yetolegen/kiln.git
cd kiln
npm ci
npm run dev
```

Open the local URL printed by Vite, click Start («Начать») and allow camera access. Camera access works on `localhost`. Access from another device requires HTTPS; an ordinary HTTP URL using your computer's IP address may not allow the camera.

Build and preview the production application locally:

```sh
npm run build
npm run preview
```

Deploy to a host that supports Vite: use `npm run build` as the build command and `dist` as the output directory. A Vercel configuration is included. No API keys or application backend are required.

Run checks:

```sh
npm test
npx playwright install chromium
npm run test:browser -- --project=chromium
```

## Technical implementation and components

Our own logic covers movement interpretation, working/supporting hand assignment, contact checks, action preparation and cancellation, vessel deformation, mistake detection, target comparison, lessons and the game flow. These are implemented in TypeScript.

MediaPipe Hand Landmarker supplies hand and finger coordinates. KILN's rules determine each gesture's meaning and effect on the clay. Three.js renders the vessel. The interface uses TypeScript, HTML and CSS; sound uses Web Audio. Vite builds the application, and Vitest and Playwright run the checks. Dependencies are listed in [package.json](package.json).

Code layout:

- `src/tracking`: camera observations, coordinates, filtering and gesture recognition;
- `src/engine`: clay geometry, game limits, mistakes, targets and statistics;
- `src/render`: vessel, wheel, effects and hand visualization;
- `src/ui`: menus, dwell selection, lessons, hints and results;
- `src/browser`: camera and local storage; `src/audio`: sound.

The vessel model, diagrams and effects are generated in code; sounds are synthesized in the browser. The decorative studio backdrop was created with image generation; its [source and prompt](docs/WORKSHOP_ART.md) are documented separately.

## Operating conditions and limitations

- Video frames are processed in the browser and are not sent to an application server. The microphone is not requested. The browser downloads the recognition model and WASM components.
- Keep your fingers visible, avoid overlapping hands and move slowly. If recognition is unclear, check the outlines and advice. If a circle does not fill, check support and working-hand placement first.
- The layout adapts to computers and phones. Recognition depends on the camera, lighting, browser and device performance. Automated tests with simulated hands do not guarantee identical recognition on every physical device.
- Free 3D inspection requires WebGL. A simplified 2D vessel display is available if the graphics context is lost.
- This is a game model of clay. The camera estimates positions and movement, not real force, physical thickness or exact material volume.

