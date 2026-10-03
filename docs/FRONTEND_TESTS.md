# Frontend accessibility and visual regression checks

Baseline: `2f3ec5c` / `final-motion-stable`. This addition changes test tooling only.

## Run

Use the repository's Node 24 environment and installed Playwright browsers:

```sh
npm ci
npm run test:browser -- src/browser/frontend.pw.ts
npm run typecheck
npm run build
```

The new file is discovered by the existing `src/browser/**/*.pw.ts` configuration. There is no second test runner. The command runs the existing Chromium, Firefox and WebKit projects. To run Chromium alone, append `--project=chromium`.

## Coverage

Each browser checks six visible UI states at **1440×900** and **390×844**:

- Main menu.
- First lesson, including missing-support-hand feedback.
- Terminal damage dialog and unavailable checkpoint explanation.
- Glaze controls.
- Attachment selection.
- Invalid shared-link error and return button.

Tests use the existing development mock only to reach UI states. They do not import the engine, change gestures, exercise clay physics, create saved records, or redefine share serialization. The invalid-link UI check also works against a production preview; the other fixtures require the dev server.

### Accessibility

`@axe-core/playwright` scans the full page before screenshot styling. Enabled tags: WCAG 2 A/AA, 2.1 A/AA and 2.2 AA. No element exclusions or disabled rules are used. Violations fail the test; the full axe result, including incomplete checks, is attached as JSON for review.

Passing automated checks is not a complete accessibility assessment. Keyboard navigation, screen-reader behavior, hand-control usability and contrast that axe cannot resolve still require manual review. See the [official Playwright accessibility guidance](https://playwright.dev/docs/accessibility-testing).

### Visual baselines

`expect(page).toHaveScreenshot()` compares the rendered interface to the PNGs in `src/browser/frontend.pw.ts-snapshots/`. Baselines are specific to browser and operating system; the supplied set is for Windows. Different systems require separately reviewed baselines, not a higher mismatch tolerance.

Locale, time zone, viewport and reduced-motion preference are fixed. Fonts and background artwork load before capture. CSS animations are disabled during capture, and up to 100 differing pixels are allowed for small rasterization variations. There is no blanket percentage tolerance.

`frontend.screenshot.css` is applied only during capture. It hides canvas/video surfaces, hand cursors and the development badge so GPU output and tracking frames do not destabilize UI comparisons. It retains the artwork, page layout, text, alerts and controls. Existing rendering and gesture tests continue to cover the hidden surfaces. No screenshot CSS is imported by the application.

After an intentional frontend change, inspect the test's actual/diff images first. Update only the affected baselines, then rerun without the update flag:

```sh
npm run test:browser -- src/browser/frontend.pw.ts --project=chromium --grep "menu:" --update-snapshots
npm run test:browser -- src/browser/frontend.pw.ts --project=chromium --grep "menu:"
```

Repeat for the other affected browser projects. Do not use `--update-snapshots` as the normal verification command. See [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots).

## Dependency boundary

`npm install -D @axe-core/playwright` added `@axe-core/playwright@4.13.0` and its required `axe-core@4.13.0`, both development dependencies. Existing dependency versions and runtime dependencies remain unchanged. No alternative library was installed.

The first sandboxed installation failed with `EACCES`: `FetchError: request to https://registry.npmjs.org/@axe-core%2fplaywright failed`. The same command succeeded with network permission; npm reported zero vulnerabilities.

## Verification at introduction

Environment: Windows, Node 24.21.0, npm 11.19.0, Playwright 1.63.0.

| Check | Result |
|---|---|
| Dependency diff | Only the requested package and transitive `axe-core`; all existing lock entries unchanged |
| Chromium baseline creation | 12/12 |
| Firefox + WebKit baseline creation | 24/24 |
| Normal comparison run, **without** `--update-snapshots` | **36/36**, 2.7 minutes; zero detected axe violations on all scanned states |
| `npm run typecheck` | Passed |
| `npm run build` | Passed, including typecheck; 73 modules |
| Scope diff against `2f3ec5c` | Runtime code, gesture recognition, widening, clay physics, storage schema and sharing architecture unchanged |

During setup, the damage test initially selected the explanatory text as the dialog's accessible name (10 passed / 2 failed); it now checks the actual dialog heading and the explanation separately. Screenshot capture now uses Playwright's `stylePath` option. A temporary Node URL import failed typecheck; using the existing Playwright project test directory removed that import without another dependency. No application fixes or accessibility-rule suppressions were required.

Firefox/WebKit emitted shader precision warnings from the unchanged renderer. These did not fail the checks; renderer work is outside this test-only change. No physical-hand, screen-reader or manual keyboard assessment was performed in this task. The original engine/unit suite was not rerun because no runtime or core code changed.

Changes are local and uncommitted; the stable checkpoint and tag remain intact.
