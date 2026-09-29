// Clay game model (PLAN §7). Pure: returns new states, never mutates the input.
import { CONFIG } from '../config';
import type { ClayState, GestureState } from '../types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

export function createClay(): ClayState {
  return {
    revision: 0,
    radii: new Float32Array(CONFIG.N_BANDS).fill(CONFIG.INIT_RADIUS),
    height: CONFIG.INIT_HEIGHT,
    thickness: CONFIG.INIT_THICKNESS,
    wobble: 0,
    damage: new Float32Array(CONFIG.N_BANDS),
    collapsed: false,
    collapseCause: null,
    touching: false,
    activeBand: null,
  };
}

export function cloneClay(c: ClayState): ClayState {
  return { ...c, radii: c.radii.slice(), damage: c.damage.slice() };
}

/** Clamp everything into the legal range and replace NaN/Infinity. Mutates and returns c. */
export function enforceInvariants(c: ClayState): ClayState {
  let minR = Infinity;
  for (let i = 0; i < c.radii.length; i++) {
    c.radii[i] = clamp(finiteOr(c.radii[i], CONFIG.INIT_RADIUS), CONFIG.MIN_R, CONFIG.MAX_R);
    c.damage[i] = clamp(finiteOr(c.damage[i], 0), 0, 1);
    minR = Math.min(minR, c.radii[i]);
  }
  c.height = clamp(finiteOr(c.height, CONFIG.INIT_HEIGHT), CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT);
  // the wall can't be thicker than the narrowest band minus a small hole
  c.thickness = clamp(
    finiteOr(c.thickness, CONFIG.INIT_THICKNESS),
    CONFIG.THICKNESS_FLOOR,
    Math.min(CONFIG.MAX_THICKNESS, minR - CONFIG.MIN_INNER_RADIUS),
  );
  c.wobble = clamp(finiteOr(c.wobble, 0), 0, 1);
  return c;
}

/** One engine step per new observation. dtS is already capped by the controller. */
export function stepClay(clay: ClayState, g: GestureState, dtS: number): ClayState {
  const next = cloneClay(clay);
  next.touching = g.deforming;
  next.activeBand = g.deforming ? g.contact.activeBand : null;
  if (g.deforming && g.gesture === 'shape' && !clay.collapsed && dtS > 0 &&
      g.targetRadiusWorld !== null && g.contact.bandY !== null) {
    shape(next, g.contact.bandY, g.targetRadiusWorld, dtS);
    next.revision++;
  }
  return enforceInvariants(next);
}

// Radii near the hands' band move toward the target radius; gaussian falloff over neighbouring bands.
// a = 1 − exp(−k·w·dt) is frame-rate independent: two 16 ms steps ≈ one 33 ms step.
function shape(c: ClayState, bandY: number, targetRadiusWorld: number, dtS: number): void {
  const n = c.radii.length;
  const i = Math.round(bandY * (n - 1));
  const R = clamp(targetRadiusWorld, CONFIG.MIN_R, CONFIG.MAX_R);
  const maxStep = CONFIG.MAX_DR_PER_S * dtS;
  for (let j = 0; j < n; j++) {
    const w = Math.exp(-0.5 * ((j - i) / CONFIG.SIGMA_BANDS) ** 2);
    const a = 1 - Math.exp(-CONFIG.SHAPE_GAIN * w * dtS);
    c.radii[j] += clamp((R - c.radii[j]) * a, -maxStep, maxStep);
  }
}
