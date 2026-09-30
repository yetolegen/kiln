// FrameInput → GestureState (PLAN §6 + docs/GESTURES_V4.md).
// Order: unusable input → raise → point → one-hand action (lift / indent / open / rim) → shape → none.
// Two-hand poses must hold GESTURE_STABLE_MS; losing tracking or a hand stops everything instantly.
// One-hand actions: an ACTIVE hand does the action while the SUPPORT hand holds a side wall. Either hand
// may be active; roles are persistent track ids for the whole engagement (switching hands restarts it).
import { CONFIG } from '../config';
import { NO_DELTA, type ActionDelta } from '../engine/clay';
import { computeContact, palmWorldSize, tol, type ContactResult } from '../engine/contact';
import type {
  ActionGesture, ClayState, ContactState, FrameInput, Gesture, GestureContext, GestureState, HandFeatures,
  NearMiss, ProjectionParams, Vec2,
} from '../types';
import { pxToWorld } from './coordinates';
import { isPointingPose } from './features';

const NO_CONTACT: ContactState = {
  valid: false, activeBand: null, bandY: null, leftErrorWorld: null, rightErrorWorld: null, reason: null,
};
const TWO_HAND: readonly Gesture[] = ['shape', 'raise'];
const UNTRUSTED = ['stale', 'invalidLandmarks', 'ambiguousTracks'];
const WRIST = 0, THUMB_MCP = 2, THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_MCP = 9;

// Hysteresis: entering a pose needs the strict threshold, staying in it only the loose one.
const fingers = (h: HandFeatures) => [h.extension.index, h.extension.middle, h.extension.ring, h.extension.pinky];
const allOpen = (h: HandFeatures, sticky: boolean) =>
  fingers(h).every((v) => v >= (sticky ? CONFIG.FINGER_OPEN_OFF : CONFIG.FINGER_OPEN_ON));
const isFist = (h: HandFeatures, sticky: boolean) =>
  fingers(h).every((v) => v < (sticky ? CONFIG.FINGER_CURLED_OFF : CONFIG.FINGER_CURLED_ON));
const isPinch = (h: HandFeatures, sticky: boolean) => h.pinchRatio < (sticky ? CONFIG.PINCH_OFF : CONFIG.PINCH_ON);
const openPalm = (h: HandFeatures, sticky: boolean) =>
  allOpen(h, sticky) && h.pinchRatio > (sticky ? CONFIG.PINCH_ON : CONFIG.PINCH_OFF) && !h.pointing;
const side = (h: HandFeatures, l: HandFeatures) => (h === l ? 'left' : 'right');
/** Sticky (looser) once pointing, so the dwell ring doesn't restart. Rule lives in features.ts. */
const isPointing = (h: HandFeatures, sticky: boolean) => isPointingPose(h.extension, h.pinchRatio, sticky);
const speedOf = (h: HandFeatures) => (h.velocityValid ? Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y) : Infinity);
const vUp = (h: HandFeatures) => (h.velocityValid ? h.velocityPalmPerS.y : 0);
const hasLandmarks = (h: HandFeatures) => h.landmarksPx.length === 21;

/** Angle in degrees of a screen-px vector a→b from the given unit direction. */
function angleFrom(a: Vec2, b: Vec2, dir: Vec2): number {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if (len === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (dx * dir.x + dy * dir.y) / len))) * 180) / Math.PI;
}
/**
 * Flat hand: wrist → middle knuckle roughly horizontal on screen (fingers sideways), OR so short on
 * screen that the fingers point at the camera (a palm held flat toward the laptop looks like that).
 */
function isHorizontal(h: HandFeatures): boolean {
  if (!hasLandmarks(h)) return false;
  const a = h.landmarksPx[WRIST], b = h.landmarksPx[MIDDLE_MCP];
  if (Math.hypot(b.x - a.x, b.y - a.y) < CONFIG.FORESHORTENED_RATIO * h.palmSizePx) return true;
  const deg = angleFrom(a, b, { x: 1, y: 0 });
  return Math.min(deg, 180 - deg) <= CONFIG.HORIZONTAL_TOL_DEG;
}
/**
 * Thumb knuckle → tip pointing down with the fingers NOT open. Relative, not "every finger < 0.35":
 * on a real laptop webcam curled fingers read 0.36–0.66, so an absolute fist test never fired.
 */
function isThumbDown(h: HandFeatures): boolean {
  if (!hasLandmarks(h)) return false;
  // a pinch also has the thumb pointing down-ish; a thumbs-down keeps the thumb away from the index tip
  return (h.openness < CONFIG.FINGERS_CURLED_MEAN || isFist(h, false)) && h.pinchRatio > CONFIG.PINCH_OFF &&
    !isPointingPose(h.extension, h.pinchRatio, false) &&
    angleFrom(h.landmarksPx[THUMB_MCP], h.landmarksPx[THUMB_TIP], { x: 0, y: 1 }) <= CONFIG.THUMB_DOWN_TOL_DEG;
}

/** Placement zones for this frame, grown with the user's palm size (see config). */
interface Zones {
  supportReach: number; supportY: number; liftBelow: number; liftAbove: number; liftX: number;
  rimBelow: number; rimAbove: number; rimX: number; indentX: number; indentY: number; openMargin: number;
}
function zonesFor(palmW: number): Zones {
  const z = CONFIG.ZONE_PALM * palmW;
  return {
    supportReach: tol(CONFIG.SUPPORT_REACH_WORLD, CONFIG.SUPPORT_REACH_PALM, palmW),
    supportY: tol(CONFIG.SUPPORT_Y_MARGIN_WORLD, CONFIG.SUPPORT_Y_MARGIN_PALM, palmW),
    liftBelow: Math.max(CONFIG.LIFT_ZONE_BELOW_WORLD, z),
    liftAbove: Math.max(CONFIG.LIFT_ZONE_ABOVE_WORLD, 0.6 * z),
    liftX: Math.max(CONFIG.LIFT_ZONE_X_MARGIN_WORLD, 0.5 * z),
    rimBelow: Math.max(CONFIG.RIM_BELOW_WORLD, 0.4 * z),
    rimAbove: Math.max(CONFIG.RIM_ABOVE_WORLD, z),
    rimX: Math.max(CONFIG.RIM_X_MARGIN_WORLD, 0.5 * z),
    indentX: Math.max(CONFIG.INDENT_TOL_X_WORLD, 0.5 * z),
    indentY: Math.max(CONFIG.INDENT_TOL_Y_WORLD, 0.5 * z),
    openMargin: Math.max(CONFIG.OPEN_ZONE_MARGIN_WORLD, 0.5 * z),
  };
}
// ponytail: module-level zones set at the top of each update(); updates are synchronous, so the helpers
// below always see this frame's zones. Pass Zones explicitly if recognizers ever run concurrently.
let Z: Zones = zonesFor(0);

type Kind = 'pullUp' | 'indent' | 'open' | 'compressRim';
/** One engagement of a one-hand action. `ms` = hold / acquisition time; `armed` = allowed to deform. */
interface Engagement {
  kind: Kind;
  activeId: number;
  supportId: number;
  ms: number;
  armed: boolean;
  travel: number;     // indent: downward thumb travel so far (jitter guard)
  armedMs: number;    // time since the action armed (open: stretch duration, v5)
  span: number;       // open: widest pinch ratio so far
  stillSinceMs: number | null;
}

export class GestureRecognizer {
  /** Clay change measured on the last update, for stepClay(). */
  delta: ActionDelta = NO_DELTA;
  private current: Gesture = 'none';
  private currentSinceMs = 0;
  private candidate: Gesture = 'none';
  private candidateSinceMs = 0;
  private contactValid = false;
  private shapeContact: {
    leftId: number; rightId: number; band: number; halfGap: number; tMs: number;
    epoch: number; projection: number; phase: GestureContext['phase'];
  } | null = null;
  private pointerId: number | null = null;
  private engagement: Engagement | null = null;
  private lastT: number | null = null;
  private lastFrame: { id: number; epoch: number; state: GestureState } | null = null;
  private evidenceSince = new Map<string, number>();
  private latched: { miss: NearMiss; untilMs: number } | null = null;

  reset(): void {
    this.current = 'none';
    this.candidate = 'none';
    this.contactValid = false;
    this.resetShapeContact();
    this.engagement = null;
    this.lastT = null;
    this.lastFrame = null;
    this.evidenceSince.clear();
    this.latched = null;
    this.delta = NO_DELTA;
  }

  resetShapeContact(): void { this.shapeContact = null; }

  update(frame: FrameInput, ctx: GestureContext, clay: ClayState, proj: ProjectionParams): GestureState {
    // the same observation twice must never accumulate holds or deform twice
    if (this.lastFrame && this.lastFrame.id === frame.frameId && this.lastFrame.epoch === frame.epoch) {
      this.delta = NO_DELTA;
      return this.lastFrame.state;
    }
    const t = frame.tMs;
    // time this observation stands for; a gap longer than the stale limit counts as nothing
    const dtS = this.lastT === null ? 0 : Math.min(Math.max(0, (t - this.lastT) / 1000), CONFIG.MAX_INPUT_AGE_MS / 1000);
    this.lastT = t;
    this.delta = NO_DELTA;

    const l = frame.screenLeft, r = frame.screenRight;
    Z = zonesFor(palmWorldSize(proj.pixelsPerWorldUnit, ...[l, r].filter((h): h is HandFeatures => h !== null)));
    const trusted = !UNTRUSTED.includes(frame.status);
    const both = frame.status === 'ready' && l !== null && r !== null;
    const cur = this.current;
    const shapingPhase = ctx.phase === 'studio' || ctx.phase === 'tutorial';
    const allowed = (g: ActionGesture) => ctx.phase === 'studio' || (ctx.phase === 'tutorial' && ctx.expectedGesture === g);
    const raisePhase = ctx.phase === 'studio' || (ctx.phase === 'tutorial' && ctx.expectedGesture === 'raise');
    const raiseLineWorld = clay.height + CONFIG.RAISE_MARGIN_WORLD;
    // In shaping phases a stray index finger must not become a cursor (it could dwell on "start over"),
    // so there pointing only counts with ONE hand visible.
    const pointAllowed = trusted && ctx.uiEnabled && (!shapingPhase || !l || !r);
    // keep the SAME hand as the pointer while it's still loosely pointing; otherwise take a new clear point
    const byId = [l, r].find((h) => h !== null && h.trackId === this.pointerId) ?? null;
    const pointer = !pointAllowed ? null
      : cur === 'point' && byId && isPointing(byId, true) ? byId
      : [r, l].find((h) => h !== null && isPointing(h, false)) ?? null;
    if (pointer) this.pointerId = pointer.trackId;

    if (!both) this.engagement = null; // tracking loss / stale / one hand: every action stops and re-arms

    // one-hand actions first: their own holds replace the generic stability delay
    let act: ActionResult | null = null;
    if (both && shapingPhase && !pointer) act = this.runAction(l, r, clay, proj, dtS, t);

    let cand: Gesture = 'none';
    if (both && raisePhase && allOpen(l, cur === 'raise') && allOpen(r, cur === 'raise') &&
        l.palmWorld.y > raiseLineWorld && r.palmWorld.y > raiseLineWorld) cand = 'raise';
    else if (pointer) cand = 'point';
    else if (act) cand = act.kind;
    else if (both && openPalm(l, cur === 'shape') && openPalm(r, cur === 'shape')) cand = 'shape';
    else if (trusted && !l !== !r) cand = 'oneHand'; // exactly one hand; two hands in a bad frame are 'none'
    if (cand === 'raise' || cand === 'point') {
      act = null;
      this.engagement = null;
    }

    if (cand !== this.candidate) {
      this.candidate = cand;
      this.candidateSinceMs = t;
    }
    const immediate = !trusted || (!both && (TWO_HAND.includes(cur) || isKind(cur))) || isKind(cand) || isKind(cur);
    if (cand !== cur && (immediate || t - this.candidateSinceMs >= CONFIG.GESTURE_STABLE_MS)) {
      this.current = cand;
      this.currentSinceMs = t;
    }
    const g = this.current;

    const c = both ? computeContact(l, r, clay, proj.pixelsPerWorldUnit, this.contactValid) : null;
    this.contactValid = !!c?.contact.valid;

    let deforming = false;
    let motionStrength = 0;
    let shapeTarget: number | null = null;
    if (both && g === 'shape' && cand === 'shape' && allowed('shape') && !clay.collapsed &&
        c?.contact.valid && c.contact.activeBand !== null && c.halfGapWorld !== null &&
        l.velocityValid && r.velocityValid) {
      const previous = this.shapeContact;
      const band = c.contact.activeBand;
      this.shapeContact = {
        leftId: l.trackId, rightId: r.trackId, band, halfGap: c.halfGapWorld, tMs: t,
        epoch: frame.epoch, projection: proj.revision, phase: ctx.phase,
      };
      // Rebase on acquisition or discontinuity. Never apply movement across missing samples.
      if (previous && previous.leftId === l.trackId && previous.rightId === r.trackId &&
          previous.band === band && previous.epoch === frame.epoch && previous.projection === proj.revision &&
          previous.phase === ctx.phase && t > previous.tMs && t - previous.tMs <= CONFIG.MAX_INPUT_AGE_MS) {
        const travel = c.halfGapWorld - previous.halfGap;
        if (Number.isFinite(travel) && Math.abs(travel) > 1e-6) {
          this.delta = { ...NO_DELTA, shapeWorld: travel };
          shapeTarget = clay.radii[band] + travel;
          deforming = true;
        }
      }
    } else this.resetShapeContact();
    if (act && g === act.kind && allowed(act.kind) && (!clay.collapsed || act.kind === 'compressRim')) {
      deforming = act.deforming;
      motionStrength = act.motionStrength;
      if (deforming) this.delta = act.delta;
      // the stretch clock runs while the opening is armed, moving or held (v5 over-stretch)
      if (act.kind === 'open') this.delta = { ...this.delta, stretchMs: act.engagedMs };
    }

    let speed = 0;
    for (const h of [l, r]) if (h?.velocityValid) speed = Math.max(speed, Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y));
    // a one-frame dropout of the pose keeps the cursor on that fingertip for the GESTURE_STABLE_MS grace,
    // instead of vanishing (the dwell ring restarts from zero whenever the cursor is missing)
    const pointerNow = g !== 'point' ? null : pointer ?? (pointAllowed ? byId : null);

    const state: GestureState = {
      gesture: g,
      sourceFrameId: frame.frameId,
      capturedAtMs: t,
      holdMs: t - this.currentSinceMs,
      inputUsable: both,
      deforming,
      motionStrength: deforming ? motionStrength : 0,
      activeTrackId: act && g === act.kind ? act.activeId : null,
      supportTrackId: act && g === act.kind ? act.supportId : null,
      activationProgress: act && g === act.kind ? act.progress : 0,
      engagedMs: act && g === act.kind ? act.engagedMs : 0,
      targetRadiusWorld: shapeTarget,
      centerOffsetPalm: c?.centerOffsetPalm ?? null,
      speedPalmPerS: speed,
      contact: c?.contact ?? NO_CONTACT,
      cursorPx: pointerNow ? ({ ...pointerNow.indexTipPx } as Vec2) : null,
      nearMiss: both ? this.nearMiss(ctx, t, g, l, r, clay, c, act, proj) : null,
    };
    this.lastFrame = { id: frame.frameId, epoch: frame.epoch, state };
    return state;
  }

  // ---------- one-hand actions ----------

  private runAction(l: HandFeatures, r: HandFeatures, clay: ClayState, proj: ProjectionParams, dtS: number, t: number): ActionResult | null {
    const world = (p: Vec2) => pxToWorld(p, proj);
    const supportOk = (h: HandFeatures) => atSideWall(h, clay);
    const e = this.engagement;

    // continue the current engagement with the SAME roles, or drop it
    if (e) {
      const active = l.trackId === e.activeId ? l : r.trackId === e.activeId ? r : null;
      const support = active === l ? r : l;
      if (active && support.trackId === e.supportId && supportOk(support)) {
        if (e.armed) e.armedMs += dtS * 1000; // dtS is 0 for replayed frames (update() returns early for them)
        const res = STEP[e.kind](this, e, active, clay, world, dtS, t);
        if (res) return { ...res, kind: e.kind, activeId: e.activeId, supportId: e.supportId, engagedMs: e.armed ? e.armedMs : 0 };
      }
      this.engagement = null;
    }

    // start a new one: try both role assignments (right hand active first, then left)
    for (const kind of ['open', 'indent', 'compressRim', 'pullUp'] as const) {
      for (const [active, support] of [[r, l], [l, r]] as const) {
        if (!supportOk(support) || !QUALIFIES[kind](active, clay, world)) continue;
        if (kind === 'open' && clay.cavityDepthWorld <= 0) continue; // needs an indentation first
        const fresh: Engagement = {
          kind, activeId: active.trackId, supportId: support.trackId, ms: 0, armed: false,
          travel: 0, armedMs: 0, span: active.pinchRatio, stillSinceMs: null,
        };
        this.engagement = fresh;
        const res = STEP[kind](this, fresh, active, clay, world, 0, t);
        if (res) return { ...res, kind, activeId: active.trackId, supportId: support.trackId, engagedMs: 0 };
        this.engagement = null;
      }
    }
    return null;
  }

  latch(miss: NearMiss, t: number): void {
    this.latched = { miss, untilMs: t + CONFIG.NEAR_MISS_LATCH_MS };
  }

  // ---------- near-miss: only with evidence of an attempt ----------

  private nearMiss(
    ctx: GestureContext, t: number, g: Gesture, l: HandFeatures, r: HandFeatures, clay: ClayState,
    c: ContactResult | null, act: ActionResult | null, proj: ProjectionParams,
  ): NearMiss | null {
    const touched = new Set<string>();
    const held = (key: string, cond: boolean) => {
      if (!cond) return false;
      touched.add(key);
      if (!this.evidenceSince.has(key)) this.evidenceSince.set(key, t);
      return t - this.evidenceSince.get(key)! >= CONFIG.NEAR_MISS_MIN_MS || (ctx.phase === 'tutorial' && ctx.expectedGesture !== undefined);
    };
    const miss = this.findNearMiss(ctx, t, g, l, r, clay, c, act, proj, held);
    // evidence only counts while it's continuously observed: forget anything not seen true this frame
    for (const key of [...this.evidenceSince.keys()]) if (!touched.has(key)) this.evidenceSince.delete(key);
    return miss;
  }

  private findNearMiss(
    ctx: GestureContext, t: number, g: Gesture, l: HandFeatures, r: HandFeatures, clay: ClayState,
    c: ContactResult | null, act: ActionResult | null, proj: ProjectionParams, held: (key: string, cond: boolean) => boolean,
  ): NearMiss | null {
    if (g === 'point' || g === 'raise') return null;
    if (this.latched && t <= this.latched.untilMs) return this.latched.miss;
    this.latched = null;
    const expected = ctx.phase === 'tutorial' ? ctx.expectedGesture : undefined;

    // an action in progress: tell the user what it's waiting for
    if (act) {
      const e = this.engagement;
      if (act.kind === 'pullUp' && e && !e.armed) {
        return { intended: 'pullUp', reason: 'holdStill', handTrackId: act.activeId,
          params: { remainingS: Math.max(0, Math.ceil((CONFIG.LIFT_HOLD_MS - e.ms) / 1000)) } };
      }
      if ((act.kind === 'pullUp' || act.kind === 'compressRim') && e?.armed && e.stillSinceMs !== null &&
          t - e.stillSinceMs >= CONFIG.NOT_MOVING_MS) {
        return { intended: act.kind, reason: 'notMoving', handTrackId: act.activeId, params: {} };
      }
      return null;
    }

    const world = (p: Vec2) => pxToWorld(p, proj);
    for (const [h, o] of [[r, l], [l, r]] as const) {
      const supported = atSideWall(o, clay);
      const hs = side(h, l);
      // lift / rim attempts: an open hand at the base or above the rim
      if (allOpen(h, false) && !isPinch(h, false)) {
        const atBase = inLiftZone(h, clay), atRim = inRimZone(h, clay);
        if (held(`notHorizontal${hs}`, (atBase || atRim) && !isHorizontal(h))) {
          return { intended: atBase ? 'pullUp' : 'compressRim', reason: 'notHorizontal', handTrackId: h.trackId, params: { side: hs } };
        }
        if (held(`noSupportOpen${hs}`, (atBase || atRim) && isHorizontal(h) && !supported)) {
          return { intended: atBase ? 'pullUp' : 'compressRim', reason: 'noSupport', handTrackId: o.trackId, params: { side: side(o, l) } };
        }
        const topR = clay.radii[clay.radii.length - 1];
        const high = h.palmWorld.y > clay.height + Z.rimAbove && h.palmWorld.y < clay.height + 2 * Z.rimAbove;
        const wide = !atRim && h.palmWorld.y > clay.height - Z.rimBelow && h.palmWorld.y < clay.height + Z.rimAbove &&
          Math.abs(h.palmWorld.x) < topR + 2 * Z.rimX;
        if (held(`rim${hs}`, (high || wide) && isHorizontal(h) && supported && (expected === 'compressRim' || expected === undefined))) {
          return { intended: 'compressRim', reason: 'rimPlacement', handTrackId: h.trackId, params: { dir: high ? 'lower' : 'closer' } };
        }
      }
      // indent attempts: thumbs-down near the top
      if (isThumbDown(h)) {
        const tip = world(h.landmarksPx[THUMB_TIP]);
        const nearPot = Math.abs(tip.x) < CONFIG.ATTEMPT_ZONE_X_WORLD && tip.y > -CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD &&
          tip.y < clay.height + 2 * CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD;
        const onTop = QUALIFIES.indent(h, clay, world);
        if (held(`thumb${hs}`, nearPot && !onTop)) {
          const dx = tip.x > Z.indentX ? 'left' : tip.x < -Z.indentX ? 'right' : '';
          const dy = tip.y > clay.height + Z.indentY ? 'down' : tip.y < clay.height - Z.indentY ? 'up' : '';
          return { intended: 'indent', reason: 'thumbNotOnTop', handTrackId: h.trackId, params: { dx, dy } };
        }
        if (held(`noSupportThumb${hs}`, onTop && !supported)) {
          return { intended: 'indent', reason: 'noSupport', handTrackId: o.trackId, params: { side: side(o, l) } };
        }
      }
      // open attempts: thumb + index at the top centre
      if (hasLandmarks(h) && !isThumbDown(h)) {
        const inOpening = atOpening(h, clay, world, true);
        if (held(`noIndent${hs}`, inOpening && isPinch(h, false) && clay.cavityDepthWorld <= 0)) {
          return { intended: 'open', reason: 'noIndentation', handTrackId: h.trackId, params: {} };
        }
        if (held(`pinch${hs}`, inOpening && clay.cavityDepthWorld > 0 && !isPinch(h, false) && h.extension.index >= CONFIG.FINGER_OPEN_OFF)) {
          const loose = h.pinchRatio < CONFIG.PINCH_LOOSE_MAX;
          return { intended: 'open', reason: loose ? 'pinchLoose' : 'pinchFirst', handTrackId: h.trackId, params: { side: hs } };
        }
        if (held(`noSupportPinch${hs}`, inOpening && clay.cavityDepthWorld > 0 && isPinch(h, false) && !supported)) {
          return { intended: 'open', reason: 'noSupport', handTrackId: o.trackId, params: { side: side(o, l) } };
        }
      }
    }

    // finish attempt: open hands above the pot, but not above the raise line
    const yMean = (l.palmWorld.y + r.palmWorld.y) / 2;
    const openBoth = allOpen(l, false) && allOpen(r, false);
    const heldShape = t - this.currentSinceMs >= CONFIG.NEAR_MISS_MIN_MS;
    if (openBoth && (expected === 'raise' || (ctx.phase === 'studio' && g === 'shape' && heldShape && yMean > clay.height && !c?.contact.valid))) {
      return { intended: 'raise', reason: 'handsTooLow', params: {} };
    }

    // shaping attempt that doesn't touch both walls
    const inZone =
      Math.abs(l.palmWorld.x) < CONFIG.ATTEMPT_ZONE_X_WORLD && Math.abs(r.palmWorld.x) < CONFIG.ATTEMPT_ZONE_X_WORLD &&
      yMean > -CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD && yMean < clay.height + CONFIG.ATTEMPT_ZONE_Y_MARGIN_WORLD;
    if (g === 'shape' && (heldShape || expected === 'shape') && inZone && c && !c.contact.valid && c.contact.reason) {
      const reason = c.contact.reason;
      if (reason === 'handsTooFar' && c.contact.leftErrorWorld !== null && c.contact.rightErrorWorld !== null) {
        const far = Math.abs(c.contact.leftErrorWorld) >= Math.abs(c.contact.rightErrorWorld) ? l : r;
        const err = far === l ? c.contact.leftErrorWorld : c.contact.rightErrorWorld;
        return { intended: 'shape', reason, handTrackId: far.trackId, params: { side: side(far, l), dir: err > 0 ? 'in' : 'out' } };
      }
      if (reason === 'handsUneven') {
        const low = l.palmWorld.y < r.palmWorld.y ? l : r;
        return { intended: 'shape', reason, handTrackId: low.trackId, params: { raise: side(low, l) } };
      }
      return { intended: 'shape', reason, params: {} };
    }
    return null;
  }
}

interface ActionResult {
  kind: Kind;
  activeId: number;
  supportId: number;
  progress: number;
  deforming: boolean;
  motionStrength: number;
  delta: ActionDelta;
  engagedMs: number;
}
type StepResult = Omit<ActionResult, 'kind' | 'activeId' | 'supportId' | 'engagedMs'>;
type World = (p: Vec2) => Vec2;

const isKind = (g: Gesture): g is Kind => g === 'pullUp' || g === 'indent' || g === 'open' || g === 'compressRim';

/** Support: palm near either real side wall, within the pot's current height. */
function atSideWall(h: HandFeatures, clay: ClayState): boolean {
  const y = h.palmWorld.y;
  if (y < -Z.supportY || y > clay.height + Z.supportY) return false;
  const band = Math.round(Math.max(0, Math.min(1, y / clay.height)) * (clay.radii.length - 1));
  const r = clay.radii[band];
  // off to a side (not in front of the pot's centre), and near that wall
  return Math.abs(h.palmWorld.x) >= 0.5 * r && Math.abs(Math.abs(h.palmWorld.x) - r) < Z.supportReach;
}
const inLiftZone = (h: HandFeatures, clay: ClayState) =>
  h.palmWorld.y >= -Z.liftBelow && h.palmWorld.y <= Z.liftAbove &&
  Math.abs(h.palmWorld.x) <= clay.radii[0] + Z.liftX;
const inRimZone = (h: HandFeatures, clay: ClayState) =>
  h.palmWorld.y >= clay.height - Z.rimBelow && h.palmWorld.y <= clay.height + Z.rimAbove &&
  Math.abs(h.palmWorld.x) <= clay.radii[clay.radii.length - 1] + Z.rimX;
/** Pinch point (between thumb and index tips) inside the opening, or at the top centre when there's none yet. */
function atOpening(h: HandFeatures, clay: ClayState, world: World, orTopCentre = false): boolean {
  if (!hasLandmarks(h)) return false;
  const a = world(h.landmarksPx[THUMB_TIP]), b = world(h.landmarksPx[INDEX_TIP]);
  const p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const radius = Math.max(clay.cavityRadiusWorld, orTopCentre ? Z.indentX : 0);
  const bottom = clay.height - Math.max(clay.cavityDepthWorld, orTopCentre ? Z.indentY : 0);
  return Math.abs(p.x) <= radius + Z.openMargin &&
    p.y >= bottom - Z.openMargin && p.y <= clay.height + Z.openMargin;
}

/** Can this hand START the action (pose + place)? */
const QUALIFIES: Record<Kind, (h: HandFeatures, clay: ClayState, world: World) => boolean> = {
  pullUp: (h, clay) => allOpen(h, false) && !isPinch(h, false) && isHorizontal(h) && inLiftZone(h, clay),
  indent: (h, clay, world) => {
    if (!isThumbDown(h)) return false;
    const tip = world(h.landmarksPx[THUMB_TIP]);
    // at the top centre, or already down inside its own dent (the thumb goes in as it pushes)
    return Math.abs(tip.x) <= Math.max(Z.indentX, clay.cavityRadiusWorld) &&
      tip.y <= clay.height + Z.indentY && tip.y >= clay.height - clay.cavityDepthWorld - Z.indentY;
  },
  open: (h, clay, world) => isPinch(h, false) && atOpening(h, clay, world),
  compressRim: (h, clay) => allOpen(h, false) && !isPinch(h, false) && isHorizontal(h) && inRimZone(h, clay),
};

type Step = (rec: GestureRecognizer, e: Engagement, h: HandFeatures, clay: ClayState, world: World, dtS: number, t: number) => StepResult | null;
const idle = (progress: number): StepResult => ({ progress, deforming: false, motionStrength: 0, delta: NO_DELTA });

/** Per-action state machines. null = the engagement ends (release / conditions broken). */
const STEP: Record<Kind, Step> = {
  // 3 s of still, valid observations at the base arms it; then only a SLOW rise lifts the pot
  pullUp: (rec, e, h, clay, _world, dtS, t) => {
    if (!allOpen(h, true) || h.pinchRatio <= CONFIG.PINCH_ON || !isHorizontal(h)) return null;
    if (!e.armed) {
      if (!inLiftZone(h, clay)) return null;
      // moving (early rise, a pass) resets the hold but keeps the engagement
      e.ms = speedOf(h) < CONFIG.STILL_PALM_PER_S ? e.ms + dtS * 1000 : 0;
      if (e.ms < CONFIG.LIFT_HOLD_MS) return idle(e.ms / CONFIG.LIFT_HOLD_MS);
      e.armed = true;
    }
    if (h.palmWorld.y < -Z.liftBelow) return null;
    const vy = vUp(h);
    if (vy > CONFIG.LIFT_MAX_PALM_PER_S) {
      rec.latch({ intended: 'pullUp', reason: 'liftTooFast', handTrackId: h.trackId, params: {} }, t);
      return null;
    }
    if (vy < CONFIG.LIFT_MIN_PALM_PER_S) {
      e.stillSinceMs ??= t;
      return idle(1);
    }
    e.stillSinceMs = null;
    return {
      progress: 1, deforming: true, motionStrength: vy / CONFIG.LIFT_MAX_PALM_PER_S,
      delta: { ...NO_DELTA, liftWorld: h.velocityWorldPerS.y * dtS * CONFIG.LIFT_GAIN },
    };
  },

  // one short push down with the thumb at the top centre makes ONE shallow indentation per engagement
  // v5: after a short jitter guard every bit of downward thumb travel deepens the dent. About one phalanx
  // is safe; pushing on thins the floor (thinFloor) and finally goes through (bottomHole).
  indent: (_rec, e, h, clay, world, dtS) => {
    if (!QUALIFIES.indent(h, clay, world)) return null;
    const down = h.velocityValid ? Math.max(0, -h.velocityWorldPerS.y * dtS) : 0;
    if (!e.armed) {
      e.travel += down;
      if (e.travel < CONFIG.INDENT_TRAVEL_WORLD) return idle(e.travel / CONFIG.INDENT_TRAVEL_WORLD);
      e.armed = true;
    }
    if (down <= 0) return idle(1);
    return { progress: 1, deforming: true, motionStrength: 1, delta: { ...NO_DELTA, indentWorld: down } };
  },

  // pinch inside the opening, hold briefly, then SLOWLY spread: the widest span so far drives the opening
  open: (rec, e, h, clay, world, dtS, t) => {
    if (!atOpening(h, clay, world) || clay.cavityDepthWorld <= 0) return null;
    if (!e.armed) {
      if (!isPinch(h, true)) return null; // starting with spread fingers never opens
      e.ms += dtS * 1000;
      e.span = h.pinchRatio;
      if (e.ms < CONFIG.OPEN_ACQUIRE_MS) return idle(e.ms / CONFIG.OPEN_ACQUIRE_MS);
      e.armed = true;
      return idle(1);
    }
    const grow = h.pinchRatio - e.span;
    if (dtS > 0 && grow / dtS > CONFIG.OPEN_MAX_SPREAD_PER_S) {
      rec.latch({ intended: 'open', reason: 'spreadTooFast', handTrackId: h.trackId, params: {} }, t);
      return null;
    }
    if (grow <= 0) return idle(1); // closing again doesn't un-open, and re-spreading to the same span adds nothing
    e.span = h.pinchRatio;
    return {
      progress: 1, deforming: true, motionStrength: dtS > 0 ? Math.min(1, grow / dtS / CONFIG.OPEN_MAX_SPREAD_PER_S) : 0,
      delta: { ...NO_DELTA, spreadRatio: grow },
    };
  },

  // open horizontal hand just above the rim: brief still hold, then slowly down (no cap: v5)
  compressRim: (_rec, e, h, clay, _world, dtS, t) => {
    if (!allOpen(h, true) || h.pinchRatio <= CONFIG.PINCH_ON || !isHorizontal(h) || !inRimZone(h, clay)) return null;
    const vy = vUp(h);
    if (!e.armed) {
      e.ms = speedOf(h) < CONFIG.STILL_PALM_PER_S ? e.ms + dtS * 1000 : 0;
      if (e.ms < CONFIG.COMPRESS_HOLD_MS) return idle(e.ms / CONFIG.COMPRESS_HOLD_MS);
      e.armed = true;
    }
    if (vy > CONFIG.STILL_PALM_PER_S || -vy > CONFIG.COMPRESS_MAX_PALM_PER_S) return null; // up or too fast: stop
    if (-vy < CONFIG.COMPRESS_MIN_PALM_PER_S) {
      e.stillSinceMs ??= t;
      return idle(1);
    }
    e.stillSinceMs = null;
    const push = -h.velocityWorldPerS.y * dtS * CONFIG.COMPRESS_GAIN; // v5: no cap, sustained pressing flattens it
    return { progress: 1, deforming: true, motionStrength: -vy / CONFIG.COMPRESS_MAX_PALM_PER_S, delta: { ...NO_DELTA, compressWorld: push } };
  },
};
