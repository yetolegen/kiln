// Target profiles + similarity score (PLAN §9). Pure.
import { CONFIG } from '../config';
import type { SimilarityResult, TargetProfile } from '../types';

/** Radii at n evenly spaced relative heights u = 0..1, linearly interpolated between (u, r) control points. */
function profileFromPoints(points: readonly [number, number][], n: number): number[] {
  return Array.from({ length: n }, (_, j) => {
    const u = j / (n - 1);
    let k = 0;
    while (k < points.length - 2 && u > points[k + 1][0]) k++;
    const [u0, r0] = points[k], [u1, r1] = points[k + 1];
    return r0 + ((r1 - r0) * (u - u0)) / (u1 - u0);
  });
}

export const TARGETS: readonly TargetProfile[] = [
  {
    id: 'vase', version: 1, name: 'Ваза', height: 1.8,
    radii: profileFromPoints([[0, 0.95], [0.2, 1.1], [0.6, 0.9], [1, 0.65]], CONFIG.N_BANDS),
  },
];

/** Unknown or missing id → the default target, so commission mode always has one. Accepts 'id' or 'id@version'. */
export function getTarget(id?: string): TargetProfile {
  const bare = id?.split('@')[0];
  return TARGETS.find((t) => t.id === bare) ?? TARGETS[0];
}

/** What sessions store as targetId: best scores are only comparable for the same id AND version. */
export const targetKey = (t: TargetProfile) => `${t.id}@${t.version}`;

/** Resample a bottom → top profile to n points over relative height. */
export function resample(radii: ArrayLike<number>, n: number): number[] {
  const m = radii.length;
  return Array.from({ length: n }, (_, j) => {
    const x = (j / (n - 1)) * (m - 1);
    const i = Math.min(Math.floor(x), m - 2);
    return radii[i] + (radii[i + 1] - radii[i]) * (x - i);
  });
}

/**
 * Both profiles on the same relative-height grid (u = y / height). Radii are NOT divided by height:
 * a vase twice as tall but equally wide is a different pot, and heightError handles the height.
 */
export function similarity(radii: ArrayLike<number>, height: number, target: TargetProfile): SimilarityResult {
  const n = CONFIG.N_BANDS;
  const r = resample(radii, n), t = resample(target.radii, n);
  let absSum = 0, tSum = 0, worstBand = 0, worstAbs = -1;
  for (let j = 0; j < n; j++) {
    const d = Math.abs(r[j] - t[j]);
    absSum += d;
    tSum += t[j];
    if (d > worstAbs) {
      worstAbs = d;
      worstBand = j;
    }
  }
  const radialError = absSum / tSum;
  const heightError = Math.abs(height - target.height) / target.height;
  const score = Math.max(0, Math.min(100, 100 * (1 - radialError) - 100 * CONFIG.HEIGHT_SCORE_WEIGHT * heightError));
  return {
    score,
    radialError,
    heightError,
    worstBand,
    signedRadiusDeltaWorld: r[worstBand] - t[worstBand],
    signedHeightDeltaWorld: height - target.height,
  };
}
