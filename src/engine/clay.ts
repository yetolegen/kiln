// Clay game model (PLAN §7 + docs/GESTURES_V4.md). Pure: returns new states, never mutates the input.
// All rates are per second; nothing depends on the frame rate.
// The pot is solid until indented; the opening is a cylinder (cavityRadius, cavityDepth down from the rim).
// thickness is DERIVED: the thinnest wall around the opening (solid pot: the narrowest radius).
import { CONFIG } from '../config';
import type { ClayState, CollapseCause, GestureState } from '../types';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const finiteOr = (v: number, fallback: number) => (Number.isFinite(v) ? v : fallback);

/** Continuous consequences of active rule episodes (rules.ts decides, clay applies). */
export interface ClayEffects { tearBand: number | null; wobbling: boolean }
export const NO_EFFECTS: ClayEffects = { tearBand: null, wobbling: false };

/** What the recognizer measured for the one-hand actions on this observation (gestures.ts decides). */
export interface ActionDelta {
  liftWorld: number;     // hand rise while the lift is armed
  indentWorld: number;   // downward thumb travel this observation (after the jitter guard)
  spreadRatio: number;   // pinch-ratio growth since the widest span so far
  compressWorld: number; // hand descent while the rim compression is armed
  stretchMs: number;     // how long the opening has been engaged (armed), for the v5 over-stretch
}
export const NO_DELTA: ActionDelta = { liftWorld: 0, indentWorld: 0, spreadRatio: 0, compressWorld: 0, stretchMs: 0 };

/** Limits that come from outside the clay (screen, hand size); the controller supplies them each step. */
export interface ClayLimits { maxHeightWorld: number; safeIndentDepthWorld: number }
export const DEFAULT_LIMITS: ClayLimits = { maxHeightWorld: CONFIG.MAX_HEIGHT, safeIndentDepthWorld: CONFIG.SAFE_INDENT_MIN_WORLD };

/** Failures the rim compression must NOT repair: they stay until restart. */
const PERMANENT: readonly CollapseCause[] = ['bottomHole', 'wallTorn', 'pancake'];

/** ClayState plus bookkeeping the renderer doesn't need. */
export interface ClayModel extends ClayState {
  recoveryMs: number; // real rim compression accumulated while collapsed
}

export function createClay(): ClayModel {
  const c: ClayModel = {
    revision: 0,
    radii: new Float32Array(CONFIG.N_BANDS).fill(CONFIG.INIT_RADIUS),
    height: CONFIG.INIT_HEIGHT,
    thickness: 0,
    cavityRadiusWorld: 0,
    cavityDepthWorld: 0,
    floorThicknessWorld: 0,
    bottomHole: false,
    safeIndentDepthWorld: DEFAULT_LIMITS.safeIndentDepthWorld,
    maxHeightWorld: DEFAULT_LIMITS.maxHeightWorld,
    wobble: 0,
    damage: new Float32Array(CONFIG.N_BANDS),
    collapsed: false,
    collapseCause: null,
    touching: false,
    activeBand: null,
    recoveryMs: 0,
  };
  return enforceInvariants(c);
}

export function cloneClay(c: ClayModel): ClayModel {
  return { ...c, radii: c.radii.slice(), damage: c.damage.slice() };
}

/** First band (bottom → top) that lies inside the opening. */
export function cavityStartBand(c: Pick<ClayState, 'radii' | 'height' | 'cavityDepthWorld'>): number {
  const n = c.radii.length;
  return Math.max(0, Math.min(n - 1, Math.floor(((c.height - c.cavityDepthWorld) / c.height) * (n - 1))));
}

function minRadius(radii: ArrayLike<number>, from = 0): number {
  let m = Infinity;
  for (let i = from; i < radii.length; i++) m = Math.min(m, radii[i]);
  return m;
}

/** Clamp everything into the legal range, replace NaN/Infinity, derive thickness. Mutates and returns c. */
export function enforceInvariants<T extends ClayState>(c: T): T {
  for (let i = 0; i < c.radii.length; i++) {
    c.radii[i] = clamp(finiteOr(c.radii[i], CONFIG.INIT_RADIUS), CONFIG.MIN_R, CONFIG.MAX_R);
    c.damage[i] = clamp(finiteOr(c.damage[i], 0), 0, 1);
  }
  c.height = clamp(finiteOr(c.height, CONFIG.INIT_HEIGHT), CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT);
  c.wobble = clamp(finiteOr(c.wobble, 0), 0, 1);

  // the opening keeps at least THICKNESS_FLOOR of wall around it; the floor may only reach 0 as a hole
  c.bottomHole = c.bottomHole === true;
  c.cavityDepthWorld = c.bottomHole ? c.height : clamp(finiteOr(c.cavityDepthWorld, 0), 0, c.height);
  const wallR = minRadius(c.radii, cavityStartBand(c));
  c.cavityRadiusWorld = clamp(finiteOr(c.cavityRadiusWorld, 0), 0, wallR - CONFIG.THICKNESS_FLOOR);
  if (!c.bottomHole && (c.cavityDepthWorld <= 0 || c.cavityRadiusWorld <= 0)) c.cavityDepthWorld = c.cavityRadiusWorld = 0;

  c.floorThicknessWorld = c.height - c.cavityDepthWorld;
  c.thickness = c.cavityDepthWorld > 0 ? wallR - c.cavityRadiusWorld : minRadius(c.radii);
  c.maxHeightWorld = clamp(finiteOr(c.maxHeightWorld, CONFIG.MAX_HEIGHT), CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT);
  c.safeIndentDepthWorld = Math.max(0, finiteOr(c.safeIndentDepthWorld, CONFIG.SAFE_INDENT_MIN_WORLD));
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
export function stepClay(
  clay: ClayModel, g: GestureState, dtS: number, fx: ClayEffects = NO_EFFECTS, d: ActionDelta = NO_DELTA,
  limits: ClayLimits = DEFAULT_LIMITS,
): ClayModel {
  const c = cloneClay(clay);
  // a permanent failure is frozen exactly as it happened: nothing deforms it, nothing overwrites its cause
  if (c.collapsed && c.collapseCause && PERMANENT.includes(c.collapseCause)) {
    c.touching = false;
    c.activeBand = null;
    return c;
  }
  c.maxHeightWorld = limits.maxHeightWorld;
  c.safeIndentDepthWorld = limits.safeIndentDepthWorld;
  c.touching = g.deforming;
  c.activeBand = g.deforming ? g.contact.activeBand : null;
  let changed = false;

  if (dtS > 0) {
    const acting = g.deforming && !c.collapsed; // while collapsed only the rim compression acts
    if (acting && g.gesture === 'shape' && g.targetRadiusWorld !== null && g.contact.bandY !== null) {
      shape(c, g.contact.bandY, g.targetRadiusWorld, dtS);
      changed = true;
    }
    if (acting && g.gesture === 'pullUp' && d.liftWorld > 0) {
      changed = changeHeight(c, d.liftWorld) || changed;
    }
    if (acting && g.gesture === 'indent' && d.indentWorld > 0) {
      // v5: the thumb keeps going in. Past the safe depth the floor thins (rules warn); through it = a hole.
      c.cavityDepthWorld = c.cavityDepthWorld > 0
        ? c.cavityDepthWorld + CONFIG.INDENT_GAIN * d.indentWorld
        : CONFIG.INDENT_DEPTH_WORLD;
      c.cavityRadiusWorld = Math.max(c.cavityRadiusWorld, CONFIG.INDENT_RADIUS_WORLD);
      if (c.height - c.cavityDepthWorld <= CONFIG.HOLE_FLOOR_WORLD) {
        c.bottomHole = true;
        fail(c, 'bottomHole');
      }
      changed = true;
    }
    if (acting && g.gesture === 'open' && d.spreadRatio > 0 && c.cavityDepthWorld > 0) {
      open(c, d.spreadRatio);
      changed = true;
    }
    // v5 over-stretch: engaged opening (moving or held) thins the wall past 7 s and tears it at 10 s
    // (not gated on `deforming`: a spread HELD still counts too; stretchMs is only non-zero while armed and allowed)
    if (!c.collapsed && g.gesture === 'open' && c.cavityDepthWorld > 0 && d.stretchMs >= CONFIG.STRETCH_DANGER_MS) {
      c.cavityRadiusWorld += CONFIG.STRETCH_THIN_PER_S * dtS; // the invariant keeps THICKNESS_FLOOR of wall
      if (d.stretchMs >= CONFIG.STRETCH_TEAR_MS) {
        for (let j = cavityStartBand(c); j < c.damage.length; j++) c.damage[j] = Math.max(c.damage[j], 0.8);
        fail(c, 'wallTorn');
      }
      changed = true;
    }
    if (g.deforming && g.gesture === 'compressRim' && d.compressWorld > 0) {
      compressRim(c, d.compressWorld, g.motionStrength * dtS);
      if (c.collapsed) c.recoveryMs += dtS * 1000;
      // v5: no per-engagement cap; keep pressing and it flattens for good
      if (c.height <= CONFIG.PANCAKE_HEIGHT_WORLD) fail(c, 'pancake');
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

// Lift (+) / compress (−). The walls narrow when lifted and widen when compressed. The floor stays put,
// so an existing opening gets deeper as the rim rises and shallower as it is pushed down.
function changeHeight(c: ClayState, requested: number): boolean {
  const newH = clamp(c.height + requested, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT);
  const dH = newH - c.height;
  if (dH === 0) return false;
  const k = Math.exp(-CONFIG.RADIAL_STRAIN_PER_HEIGHT * dH);
  for (let j = 0; j < c.radii.length; j++) c.radii[j] *= k;
  if (c.cavityDepthWorld > 0) c.cavityDepthWorld += dH;
  c.height = newH;
  return true;
}

// Spreading the pinch widens and deepens the opening, but never past a wall of OPEN_MIN_WALL and a floor.
function open(c: ClayState, spreadRatio: number): void {
  c.cavityDepthWorld = Math.min(c.cavityDepthWorld + CONFIG.OPEN_DEPTH_PER_SPAN * spreadRatio, c.height - CONFIG.FLOOR_WORLD);
  const limit = minRadius(c.radii, cavityStartBand(c)) - CONFIG.OPEN_MIN_WALL_WORLD;
  c.cavityRadiusWorld = Math.max(c.cavityRadiusWorld, Math.min(c.cavityRadiusWorld + CONFIG.OPEN_RADIUS_PER_SPAN * spreadRatio, limit));
}

// Rim compression: bounded push down, smooths and strengthens the upper profile, heals damage and wobble.
function compressRim(c: ClayState, compressWorld: number, strengthS: number): void {
  const before = c.height;
  changeHeight(c, -compressWorld);
  const pushed = before - c.height;
  c.cavityRadiusWorld = Math.max(0, c.cavityRadiusWorld - CONFIG.COMPRESS_CAVITY_SHRINK_PER_WORLD * pushed);
  const n = c.radii.length;
  const a = 1 - Math.exp(-CONFIG.COMPRESS_SMOOTH_PER_S * strengthS);
  for (let j = Math.floor(n / 2); j < n; j++) {
    const avg = (c.radii[j - 1] + c.radii[j] + c.radii[Math.min(j + 1, n - 1)]) / 3;
    c.radii[j] += (avg - c.radii[j]) * a;
    c.damage[j] -= CONFIG.REPAIR_DAMAGE_PER_S * strengthS;
  }
  c.wobble *= Math.exp(-CONFIG.WOBBLE_DAMPING_PER_S * strengthS);
}

function tear(c: ClayState, band: number, dtS: number): void {
  const s = CONFIG.TEAR_SIGMA_BANDS;
  for (let j = Math.max(0, Math.floor(band - 3 * s)); j <= Math.min(c.damage.length - 1, band + 3 * s); j++) {
    c.damage[j] += CONFIG.DAMAGE_PER_S * dtS * Math.exp(-0.5 * ((j - band) / s) ** 2);
  }
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

/** v5 failures: no sag, no recovery by compression; only restart clears them. */
function fail(c: ClayModel, cause: CollapseCause): void {
  if (c.collapsed && c.collapseCause && PERMANENT.includes(c.collapseCause)) return; // the first failure wins
  c.collapsed = true;
  c.collapseCause = cause;
  c.recoveryMs = 0;
}

// Collapse enters ONCE (one-time sag). It clears only after real rim compression has made the pot sound again.
// The screen ceiling counts as "too tall": past it the pot becomes unstable instead of silently resisting.
function updateCollapse(c: ClayModel): boolean {
  const maxH = Math.min(maxStableHeight(c.radii), c.maxHeightWorld);
  if (c.collapsed && c.collapseCause && PERMANENT.includes(c.collapseCause)) return false;
  if (!c.collapsed) {
    const cause: CollapseCause | null =
      c.cavityDepthWorld > 0 && c.thickness < CONFIG.MIN_THICKNESS ? 'thinWall' : c.height > maxH ? 'tooTall' : null;
    if (!cause) return false;
    c.collapsed = true;
    c.collapseCause = cause;
    c.recoveryMs = 0;
    sag(c);
    enforceInvariants(c);
    return true;
  }
  const sound =
    (c.cavityDepthWorld === 0 || c.thickness >= CONFIG.MIN_THICKNESS + CONFIG.RECOVERY_THICKNESS_MARGIN) &&
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
  c.cavityDepthWorld *= CONFIG.SAG_HEIGHT_FACTOR;
  const n = c.radii.length;
  for (let pass = 0; pass < CONFIG.SAG_SMOOTH_PASSES; pass++) {
    for (let j = Math.floor(n / 2); j < n; j++) {
      c.radii[j] = (c.radii[j - 1] + c.radii[j] + c.radii[Math.min(j + 1, n - 1)]) / 3;
    }
  }
}
