// Source image → mirrored viewport px → world (PLAN §5). Pure: no DOM.
// MediaPipe normalizes x by width and y by height, so distances in those units are
// distorted on non-square frames. Always convert to px before measuring anything.
import type { ProjectionParams, Vec2 } from '../types';

type Frame = Pick<
  ProjectionParams,
  'videoWidth' | 'videoHeight' | 'viewportWidth' | 'viewportHeight' | 'fit' | 'mirrored'
>;

function fitLayout(p: Frame) {
  const sx = p.viewportWidth / p.videoWidth;
  const sy = p.viewportHeight / p.videoHeight;
  const s = p.fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
  return {
    s,
    ox: (p.viewportWidth - s * p.videoWidth) / 2,
    oy: (p.viewportHeight - s * p.videoHeight) / 2,
  };
}

/** MediaPipe point (u, v in 0..1 of the source image) → CSS px on screen. Mirrors exactly once. */
export function sourceToPx(pt: Vec2, p: Frame): Vec2 {
  const { s, ox, oy } = fitLayout(p);
  const u = p.mirrored ? 1 - pt.x : pt.x;
  return { x: ox + s * p.videoWidth * u, y: oy + s * p.videoHeight * pt.y };
}

/** Px per source-normalized unit of x. MediaPipe's z uses roughly the x scale, so this also converts z. */
export function pxPerSourceX(p: Frame): number {
  return fitLayout(p).s * p.videoWidth;
}

/** Inverse of sourceToPx. */
export function pxToSource(pt: Vec2, p: Frame): Vec2 {
  const { s, ox, oy } = fitLayout(p);
  const u = (pt.x - ox) / (s * p.videoWidth);
  return { x: p.mirrored ? 1 - u : u, y: (pt.y - oy) / (s * p.videoHeight) };
}

/** Screen px (y down) → world (x from wheel axis, y up from pot bottom). */
export function pxToWorld(pt: Vec2, p: ProjectionParams): Vec2 {
  return {
    x: (pt.x - p.axisXPx) / p.pixelsPerWorldUnit,
    y: (p.bottomYPx - pt.y) / p.pixelsPerWorldUnit,
  };
}

export function worldToPx(pt: Vec2, p: ProjectionParams): Vec2 {
  return {
    x: p.axisXPx + pt.x * p.pixelsPerWorldUnit,
    y: p.bottomYPx - pt.y * p.pixelsPerWorldUnit,
  };
}

export function potTopPx(heightWorld: number, p: ProjectionParams): number {
  return p.bottomYPx - heightWorld * p.pixelsPerWorldUnit;
}

export function distPx(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
