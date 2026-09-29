import { describe, expect, it } from 'vitest';
import type { ProjectionParams, Vec2 } from '../src/types';
import {
  distPx, potTopPx, pxToSource, pxToWorld, sourceToPx, worldToPx,
} from '../src/tracking/coordinates';

function proj(over: Partial<ProjectionParams> = {}): ProjectionParams {
  return {
    revision: 1, videoWidth: 1280, videoHeight: 720, viewportWidth: 1440, viewportHeight: 900,
    fit: 'cover', mirrored: true, axisXPx: 720, bottomYPx: 760, pixelsPerWorldUnit: 180,
    ...over,
  };
}

// deterministic pseudo-random so failures reproduce
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

describe('T01 coordinate round-trip ≤ 0.5 px', () => {
  const rand = rng(1);
  const cases: ProjectionParams[] = [
    proj(),
    proj({ fit: 'contain' }),
    proj({ mirrored: false }),
    proj({ videoWidth: 640, videoHeight: 480, viewportWidth: 390, viewportHeight: 844 }), // phone portrait
  ];

  it.each(cases.map((p, i) => [i, p] as const))('case %i', (_i, p) => {
    for (let k = 0; k < 200; k++) {
      const px: Vec2 = { x: rand() * p.viewportWidth, y: rand() * p.viewportHeight };
      expect(distPx(worldToPx(pxToWorld(px, p), p), px)).toBeLessThanOrEqual(0.5);
      expect(distPx(sourceToPx(pxToSource(px, p), p), px)).toBeLessThanOrEqual(0.5);
    }
  });

  it('mirrors: source left edge lands on screen right', () => {
    const p = proj({ fit: 'contain', viewportWidth: 1280, viewportHeight: 720 });
    expect(sourceToPx({ x: 0, y: 0.5 }, p).x).toBeCloseTo(1280);
    expect(sourceToPx({ x: 0, y: 0.5 }, { ...p, mirrored: false }).x).toBeCloseTo(0);
  });

  it('world axes: y up from pot bottom, pot top above bottom', () => {
    const p = proj();
    expect(pxToWorld({ x: p.axisXPx, y: p.bottomYPx }, p)).toEqual({ x: 0, y: 0 });
    expect(pxToWorld({ x: p.axisXPx + 180, y: p.bottomYPx - 360 }, p)).toEqual({ x: 1, y: 2 });
    expect(potTopPx(1.2, p)).toBeCloseTo(p.bottomYPx - 216);
  });
});

describe('T02 16:9 vs 4:3 source: same pixel geometry → same features', () => {
  // a hand as the user sees it, in viewport px: wrist, middle MCP, thumb tip, index tip
  const hand: Vec2[] = [{ x: 500, y: 600 }, { x: 510, y: 480 }, { x: 440, y: 470 }, { x: 470, y: 440 }];
  const palm = (h: Vec2[]) => distPx(h[0], h[1]);
  const pinch = (h: Vec2[]) => distPx(h[2], h[3]) / palm(h);

  const wide = proj({ videoWidth: 1280, videoHeight: 720 });
  const narrow = proj({ videoWidth: 640, videoHeight: 480 });
  const srcWide = hand.map((pt) => pxToSource(pt, wide));
  const srcNarrow = hand.map((pt) => pxToSource(pt, narrow));

  it('features computed in px are identical', () => {
    const a = srcWide.map((pt) => sourceToPx(pt, wide));
    const b = srcNarrow.map((pt) => sourceToPx(pt, narrow));
    expect(palm(a)).toBeCloseTo(palm(b), 6);
    expect(pinch(a)).toBeCloseTo(pinch(b), 6);
  });

  it('features computed in raw normalized units would differ (the bug this prevents)', () => {
    expect(Math.abs(pinch(srcWide) - pinch(srcNarrow))).toBeGreaterThan(0.01);
  });
});
