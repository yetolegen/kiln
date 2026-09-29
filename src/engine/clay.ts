// Clay game model (PLAN §7). Pure: returns new states, never mutates the input.
// All rates are per second; nothing depends on the frame rate.
import { CONFIG } from '../config';
import type { ClayState, CollapseCause, GestureState } from '../types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

/** Continuous consequences of active rule episodes (rules.ts decides, clay applies). */
export interface ClayEffects { tearBand: number | null; wobbling: boolean }
export const NO_EFFECTS: ClayEffects = { tearBand: null, wobbling: false };

/** ClayState plus bookkeeping the renderer doesn't need. */
export interface ClayModel extends ClayState {
  recoveryMs: number; // real pressing accumulated while collapsed
}

export function createClay(): ClayModel {
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
    recoveryMs: 0,
  };
}

export function cloneClay(c: ClayModel): ClayModel {
  return { ...c, radii: c.radii.slice(), damage: c.damage.slice() };
}

/** Clamp everything into the legal range and replace NaN/Infinity. Mutates and returns c. */
export function enforceInvariants<T extends ClayState>(c: T): T {
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

/** A pot can only be ~STABILITY_FACTOR times as tall as its base is wide. */
export function maxStableHeight(radii: ArrayLike<number>): number {
  const k = Math.max(1, Math.floor(radii.length / 3));
  let sum = 0;
  for (let i = 0; i < k; i++) sum += radii[i];
  return Math.min(CONFIG.MAX_HEIGHT, (CONFIG.STABILITY_FACTOR * sum) / k);
}

/** Steepest outward step between neighbouring bands, if it exceeds OVERHANG_SLOPE_WORLD. */
export function findOverhang(c: ClayState): { band: number; slope: number } | null {
  const bandH = c.height / (c.radii.length - 1);
  let worst: { band: number; slope: number } | null = null;
  for (let j = 1; j < c.radii.length; j++) {
    const slope = (c.radii[j] - c.radii[j - 1]) / bandH;
    if (slope > CONFIG.OVERHANG_SLOPE_WORLD && (!worst || slope > worst.slope)) worst = { band: j, slope };
  }
  return worst;
}

/** One engine step per new observation. dtS is already capped by the controller. */
export function stepClay(clay: ClayModel, g: GestureState, dtS: number, fx: ClayEffects = NO_EFFECTS): ClayModel {
  const c = cloneClay(clay);
  c.touching = g.deforming;
  c.activeBand = g.deforming ? g.contact.activeBand : null;
  let changed = false;

  if (dtS > 0) {
    const ms = g.motionStrength;
    const acting = g.deforming && !c.collapsed; // while collapsed only pressing acts
    if (acting && g.gesture === 'shape' && g.targetRadiusWorld !== null && g.contact.bandY !== null) {
      shape(c, g.contact.bandY, g.targetRadiusWorld, dtS);
      changed = true;
    }
    if (acting && g.gesture === 'pullUp' && ms > 0) {
      changed = changeHeight(c, CONFIG.PULL_RATE * ms * dtS) || changed;
    }
    if (g.deforming && g.gesture === 'pressDown' && ms > 0) {
      changeHeight(c, -CONFIG.PRESS_RATE * ms * dtS);
      repair(c, ms * dtS);
      if (c.collapsed) c.recoveryMs += dtS * 1000;
      changed = true;
    }
    if (fx.tearBand !== null) {
      tear(c, fx.tearBand, dtS);
      changed = true;
    }
    if (fx.wobbling) {
      c.wobble += CONFIG.WOBBLE_GROWTH_PER_S * dtS;
      changed = true;
    } else if (c.touching && g.gesture === 'shape' && c.wobble > 0) {
      c.wobble *= Math.exp(-CONFIG.WOBBLE_CENTERED_DAMPING_PER_S * dtS);
      changed = true;
    }
    changed = smoothOverhang(c, dtS) || changed;
  }
  enforceInvariants(c);
  changed = updateCollapse(c) || changed;
  if (changed) c.revision++;
  return c;
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

// Pull (+) / press (−). Thinning and narrowing follow the ACTUAL height change, so pulling
// at MAX_HEIGHT (dH = 0) no longer thins the walls. Returns whether the height moved.
function changeHeight(c: ClayState, requested: number): boolean {
  const newH = clamp(c.height + requested, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT);
  const dH = newH - c.height;
  if (dH === 0) return false;
  c.thickness -= CONFIG.THIN_PER_HEIGHT * dH;
  const k = Math.exp(-CONFIG.RADIAL_STRAIN_PER_HEIGHT * dH);
  for (let j = 0; j < c.radii.length; j++) c.radii[j] *= k;
  c.height = newH;
  return true;
}

// Pressing re-centres and compacts the clay. Works at MIN_HEIGHT too.
function repair(c: ClayState, strengthS: number): void {
  c.thickness += CONFIG.REPAIR_THICKNESS_PER_S * strengthS;
  for (let j = 0; j < c.damage.length; j++) c.damage[j] -= CONFIG.REPAIR_DAMAGE_PER_S * strengthS;
  c.wobble *= Math.exp(-CONFIG.WOBBLE_DAMPING_PER_S * strengthS);
}

function tear(c: ClayState, band: number, dtS: number): void {
  const s = CONFIG.TEAR_SIGMA_BANDS;
  for (let j = Math.max(0, Math.floor(band - 3 * s)); j <= Math.min(c.damage.length - 1, band + 3 * s); j++) {
    c.damage[j] += CONFIG.DAMAGE_PER_S * dtS * Math.exp(-0.5 * ((j - band) / s) ** 2);
  }
  c.thickness -= CONFIG.TEAR_THICKNESS_LOSS_PER_S * dtS;
}

// Upper band much wider than the one below: pull it in, rate-limited. Never pushes outward.
function smoothOverhang(c: ClayState, dtS: number): boolean {
  const maxJump = CONFIG.OVERHANG_SLOPE_WORLD * (c.height / (c.radii.length - 1));
  const step = CONFIG.OVERHANG_SMOOTH_PER_S * dtS;
  let changed = false;
  for (let j = 1; j < c.radii.length; j++) {
    const excess = c.radii[j] - c.radii[j - 1] - maxJump;
    if (excess > 0) {
      c.radii[j] -= Math.min(excess, step);
      changed = true;
    }
  }
  return changed;
}

// Collapse enters ONCE (one-time sag). It clears only after real pressing has made the pot sound again.
function updateCollapse(c: ClayModel): boolean {
  const maxH = maxStableHeight(c.radii);
  if (!c.collapsed) {
    const cause: CollapseCause | null =
      c.thickness < CONFIG.MIN_THICKNESS ? 'thinWall' : c.height > maxH ? 'tooTall' : null;
    if (!cause) return false;
    c.collapsed = true;
    c.collapseCause = cause;
    c.recoveryMs = 0;
    sag(c);
    enforceInvariants(c);
    return true;
  }
  const sound =
    c.thickness >= CONFIG.MIN_THICKNESS + CONFIG.RECOVERY_THICKNESS_MARGIN &&
    c.height <= maxH - CONFIG.RECOVERY_HEIGHT_MARGIN &&
    c.wobble <= CONFIG.RECOVERY_WOBBLE_MAX &&
    c.recoveryMs >= CONFIG.RECOVERY_ACTIVE_MS;
  if (!sound) return false;
  c.collapsed = false;
  c.collapseCause = null;
  c.recoveryMs = 0;
  return true;
}

function sag(c: ClayState): void {
  c.height = Math.max(CONFIG.MIN_HEIGHT, CONFIG.SAG_HEIGHT_FACTOR * c.height);
  const n = c.radii.length;
  for (let pass = 0; pass < CONFIG.SAG_SMOOTH_PASSES; pass++) {
    for (let j = Math.floor(n / 2); j < n; j++) {
      c.radii[j] = (c.radii[j - 1] + c.radii[j] + c.radii[Math.min(j + 1, n - 1)]) / 3;
    }
  }
}
