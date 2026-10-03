// TrackingPacket → FrameInput (PLAN §5, §6). Pure: no DOM, no clock; time comes from the packet.
// Steps: convert to px → persistent track ids → smooth palm → features → calibration → sort by screen side.
import { CONFIG } from '../config';
import type {
  FingerExtension, FrameInput, HandFeatures, ProjectionParams, RawHand, TrackingPacket, TrackingStatus, Vec2, Vec3,
} from '../types';
import { distPx, pxPerSourceX, pxToWorld, sourceToPx } from './coordinates';
import { OneEuroVec2 } from './filters';

const WRIST = 0, THUMB_TIP = 4, INDEX_MCP = 5, INDEX_TIP = 8, MIDDLE_MCP = 9, RING_MCP = 13, PINKY_MCP = 17;

interface Observation { px: Vec3[]; palmPx: Vec2; sizePx: number }
interface Track { id: number; filter: OneEuroVec2; palmPx: Vec2; lastSeenMs: number }

export class FeatureExtractor {
  private tracks: Track[] = [];
  private nextTrackId = 1;
  private epoch: number | null = null;
  private lastTMs: number | null = null;
  private recentSizesPx: number[] = [];
  private stillSizesPx: number[] = [];
  private stillMs = 0;
  private lockedPalmPx: number | null = null;

  /** 0..1 while both hands are held still; 1 once the reference palm size is locked. */
  get calibrationProgress(): number {
    return this.lockedPalmPx !== null ? 1 : Math.min(1, this.stillMs / CONFIG.CALIBRATION_STILL_MS);
  }

  recalibrate(): void {
    this.lockedPalmPx = null;
    this.stillSizesPx = [];
    this.stillMs = 0;
  }

  /** New epoch = camera/viewport changed: px sizes and positions from before are meaningless. */
  reset(epoch: number): void {
    this.epoch = epoch;
    this.tracks = [];
    this.lastTMs = null;
    this.recentSizesPx = [];
    this.recalibrate();
  }

  compute(packet: TrackingPacket, proj: ProjectionParams): FrameInput {
    if (packet.epoch !== this.epoch) this.reset(packet.epoch);
    const t = packet.capturedAtMs;
    const dtS = this.lastTMs === null ? 0 : Math.max(0, (t - this.lastTMs) / 1000);
    this.lastTMs = t;
    const out = (status: TrackingStatus, hands: HandFeatures[]): FrameInput => {
      const [left, right] = sides(hands, proj);
      return {
        frameId: packet.frameId, epoch: packet.epoch, tMs: t, receivedAtMs: packet.receivedAtMs,
        dtSampleS: dtS, status, screenLeft: left, screenRight: right,
      };
    };

    const valid = packet.hands.filter(isValidHand);
    let status: TrackingStatus | null = valid.length < packet.hands.length ? 'invalidLandmarks' : null;
    const obs = valid.slice(0, 2).map((h) => measure(h, proj)).filter((o) => o.sizePx > 0);
    const inFrame = obs.filter((o) => inside(o.palmPx, proj));
    if (!status && inFrame.length < obs.length) status = 'outOfFrame';

    this.tracks = this.tracks.filter((tr) => t - tr.lastSeenMs <= CONFIG.REACQUIRE_MS);

    // two detections on top of each other: likely one hand detected twice
    if (inFrame.length === 2 && distPx(inFrame[0].palmPx, inFrame[1].palmPx) <
        CONFIG.HAND_OVERLAP_PALM * Math.max(inFrame[0].sizePx, inFrame[1].sizePx)) {
      return out(status ?? 'ambiguousTracks', []);
    }

    for (const o of inFrame) pushCapped(this.recentSizesPx, o.sizePx, 30);
    const refPx = this.lockedPalmPx ?? median(this.recentSizesPx);
    const matched = associate(inFrame, this.tracks, refPx);

    const hands: HandFeatures[] = [];
    const seen: Track[] = [];
    let reacquired = false;
    inFrame.forEach((o, i) => {
      let tr = matched[i];
      const isNew = !tr;
      if (!tr) {
        tr = { id: this.nextTrackId++, filter: new OneEuroVec2(CONFIG.ONE_EURO), palmPx: o.palmPx, lastSeenMs: t };
        reacquired = true;
      }
      // time since THIS hand was last seen, not since the last packet: a hand that dropped out
      // for a few frames moved over that whole gap, and dividing by one frame would fake a fast jerk
      const trackDtS = isNew ? 0 : (t - tr.lastSeenMs) / 1000;
      const smooth = tr.filter.filter(o.palmPx, trackDtS);
      // first frame of a track has no history: velocity would be a fake jump
      const velocityValid = !isNew && trackDtS > 0;
      const vPx = velocityValid
        ? { x: (smooth.x - tr.palmPx.x) / trackDtS, y: (smooth.y - tr.palmPx.y) / trackDtS }
        : { x: 0, y: 0 };
      tr.palmPx = smooth;
      tr.lastSeenMs = t;
      seen.push(tr);
      hands.push(buildFeatures(tr.id, o, smooth, vPx, velocityValid, refPx, proj));
    });
    // keep unmatched tracks briefly (REACQUIRE_MS) so a flickering hand keeps its id; never more than 2
    this.tracks = [...seen, ...this.tracks.filter((tr) => !seen.includes(tr))].slice(0, 2);

    this.updateCalibration(hands, dtS);
    const withRef = hands.map((h) => ({ ...h, referencePalmSizePx: this.lockedPalmPx ?? h.referencePalmSizePx }));

    status ??= reacquired ? 'reacquiring' : withRef.length === 2 ? 'ready' : withRef.length === 1 ? 'oneHand' : 'noHands';
    return out(status, withRef);
  }

  private updateCalibration(hands: HandFeatures[], dtS: number): void {
    if (this.lockedPalmPx !== null) return;
    const still = hands.length === 2 && hands.every(
      (h) => h.velocityValid && Math.hypot(h.velocityPalmPerS.x, h.velocityPalmPerS.y) < CONFIG.CALIBRATION_STILL_PALM_PER_S,
    );
    if (!still) {
      this.stillMs = 0;
      this.stillSizesPx = [];
      return;
    }
    this.stillMs += dtS * 1000;
    for (const h of hands) this.stillSizesPx.push(h.palmSizePx);
    // median, not mean: one bad frame can't skew the ruler
    if (this.stillMs >= CONFIG.CALIBRATION_STILL_MS) this.lockedPalmPx = median(this.stillSizesPx);
  }
}

function isValidHand(h: RawHand): boolean {
  return h.landmarks.length === 21 && h.landmarks.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
}

function measure(h: RawHand, proj: ProjectionParams): Observation {
  const zScale = pxPerSourceX(proj);
  const px = h.landmarks.map((lm) => ({ ...sourceToPx(lm, proj), z: (Number.isFinite(lm.z) ? lm.z : 0) * zScale }));
  const palmIdx = [WRIST, INDEX_MCP, MIDDLE_MCP, PINKY_MCP];
  const palmPx = {
    x: palmIdx.reduce((s, i) => s + px[i].x, 0) / palmIdx.length,
    y: palmIdx.reduce((s, i) => s + px[i].y, 0) / palmIdx.length,
  };
  return { px, palmPx, sizePx: dist3(px[WRIST], px[MIDDLE_MCP]) };
}

/**
 * Match detections to existing tracks. MediaPipe's array order is not identity, so with
 * 2 hands we try both assignments and keep the one with less total movement.
 */
function associate(obs: Observation[], tracks: Track[], refPx: number): (Track | null)[] {
  if (!obs.length || !tracks.length) return obs.map(() => null);
  const options: number[][] =
    obs.length === 1 ? tracks.map((_, j) => [j]) : tracks.length === 1 ? [[0, -1], [-1, 0]] : [[0, 1], [1, 0]];
  const cost = (opt: number[]) =>
    opt.reduce((s, j, i) => s + (j < 0 ? 0 : distPx(obs[i].palmPx, tracks[j].palmPx)), 0);
  const best = options.reduce((a, b) => (cost(b) < cost(a) ? b : a));
  const maxJumpPx = CONFIG.REACQUIRE_JUMP_PALM * refPx;
  return best.map((j, i) => (j >= 0 && distPx(obs[i].palmPx, tracks[j].palmPx) <= maxJumpPx ? tracks[j] : null));
}

function buildFeatures(
  trackId: number, o: Observation, palmPx: Vec2, vPx: Vec2, velocityValid: boolean, refPx: number, proj: ProjectionParams,
): HandFeatures {
  const extension: FingerExtension = {
    index: fingerExtension(o.px, INDEX_MCP),
    middle: fingerExtension(o.px, MIDDLE_MCP),
    ring: fingerExtension(o.px, RING_MCP),
    pinky: fingerExtension(o.px, PINKY_MCP),
  };
  const pinchRatio = dist3(o.px[THUMB_TIP], o.px[INDEX_TIP]) / o.sizePx;
  const ppu = proj.pixelsPerWorldUnit;
  return {
    trackId,
    palmPx,
    palmWorld: pxToWorld(palmPx, proj),
    indexTipPx: { x: o.px[INDEX_TIP].x, y: o.px[INDEX_TIP].y },
    landmarksPx: o.px.map((p) => ({ x: p.x, y: p.y })),
    palmSizePx: o.sizePx,
    referencePalmSizePx: refPx,
    extension,
    openness: (extension.index + extension.middle + extension.ring + extension.pinky) / 4,
    pinchRatio,
    pointing: isPointingPose(extension, pinchRatio, false),
    // screen y points down, world/palm y points up
    velocityWorldPerS: { x: vPx.x / ppu, y: -vPx.y / ppu },
    velocityPalmPerS: { x: vPx.x / refPx, y: -vPx.y / refPx },
    velocityValid,
  };
}

/**
 * Fist grip for viewer controls (3D rotation, decoration placement): every finger curled and the hand not pointing.
 * Relative to real webcam readings, where relaxed curled fingers measure 0.36–0.66 (see config), so the mean and
 * the straightest finger are tested, not an absolute "every finger < 0.35". Sticky = looser threshold to stay closed.
 */
export function isFistGrip(h: Pick<HandFeatures, 'extension' | 'pinchRatio'>, sticky: boolean): boolean {
  const e = h.extension, values = [e.index, e.middle, e.ring, e.pinky];
  const mean = values.reduce((a, b) => a + b, 0) / 4, straightest = Math.max(...values);
  return mean < (sticky ? CONFIG.FIST_MEAN_OFF : CONFIG.FIST_MEAN_ON) && straightest < (sticky ? CONFIG.FIST_FINGER_OFF : CONFIG.FIST_FINGER_ON) &&
    !isPointingPose(e, h.pinchRatio, false);
}
/** Clearly open hand: required before a new fist grip, so a hand that arrives already closed never grabs. */
export function isOpenForGrip(h: Pick<HandFeatures, 'extension'>): boolean {
  const e = h.extension;
  return (e.index + e.middle + e.ring + e.pinky) / 4 >= CONFIG.FIST_RELEASED_MEAN;
}

/**
 * Index clearly straighter than the average of the other three fingers, and not pinching.
 * Relative, not absolute: real curled fingers read 0.4–0.65 on a laptop webcam (see config).
 */
export function isPointingPose(e: FingerExtension, pinchRatio: number, sticky: boolean): boolean {
  const others = (e.middle + e.ring + e.pinky) / 3;
  return e.index >= (sticky ? CONFIG.FINGER_OPEN_OFF : CONFIG.FINGER_OPEN_ON) &&
    e.index - others >= (sticky ? CONFIG.POINT_MARGIN_OFF : CONFIG.POINT_MARGIN_ON) &&
    pinchRatio > (sticky ? CONFIG.PINCH_ON : CONFIG.PINCH_OFF);
}

/**
 * 0 = curled, 1 = straight. A straight finger has ~180° at both PIP and DIP joints; a curled one ~90° or less.
 * Uses the more bent of the two joints, in 3-D px (z from MediaPipe) so fingers curling toward the camera still count.
 */
function fingerExtension(px: Vec3[], mcp: number): number {
  const pip = angleDeg(px[mcp], px[mcp + 1], px[mcp + 2]);
  const dip = angleDeg(px[mcp + 1], px[mcp + 2], px[mcp + 3]);
  return clamp01((Math.min(pip, dip) - CONFIG.FINGER_ANGLE_CURLED_DEG) / CONFIG.FINGER_ANGLE_RANGE_DEG);
}

function angleDeg(a: Vec3, b: Vec3, c: Vec3): number {
  const u = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const n = Math.hypot(u.x, u.y, u.z) * Math.hypot(v.x, v.y, v.z);
  if (n === 0) return 180;
  return (Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y + u.z * v.z) / n))) * 180) / Math.PI;
}

function sides(hands: HandFeatures[], proj: ProjectionParams): [HandFeatures | null, HandFeatures | null] {
  if (hands.length === 2) {
    const [a, b] = hands[0].palmPx.x <= hands[1].palmPx.x ? hands : [hands[1], hands[0]];
    return [a, b];
  }
  if (hands.length === 1) return hands[0].palmPx.x < proj.axisXPx ? [hands[0], null] : [null, hands[0]];
  return [null, null];
}

const inside = (p: Vec2, proj: ProjectionParams) =>
  p.x >= 0 && p.x <= proj.viewportWidth && p.y >= 0 && p.y <= proj.viewportHeight;
const dist3 = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function pushCapped(arr: number[], v: number, cap: number): void {
  arr.push(v);
  if (arr.length > cap) arr.shift();
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
