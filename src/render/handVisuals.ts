import type { FrameInput, HandFeatures } from '../types';
import { CONFIG } from '../config';
import { OneEuro } from '../tracking/filters';

export const VISUAL_HOLD_MS = 350;
export interface VisualHand { trackId: number; points: Float32Array; lastSeenMs: number; opacity: number }
/**
 * One Euro per landmark coordinate (px). A still hand gets a ~1.2 Hz cutoff, so webcam landmark noise of a few
 * pixels no longer makes the glove shimmer; a fast hand raises the cutoff (beta) and the glove keeps up.
 */
const VISUAL_FILTER = { minCutoff: 1.6, beta: 0.02, dCutoff: 1 }; // follows a closing fist without shimmering at rest
const newFilters = () => Array.from({ length: 42 }, () => new OneEuro(VISUAL_FILTER));

// Display-only history. These points never enter recognition or clay deformation.
export class HandVisuals {
  readonly hands: VisualHand[] = [
    { trackId: -1, points: new Float32Array(42), lastSeenMs: -Infinity, opacity: 0 },
    { trackId: -1, points: new Float32Array(42), lastSeenMs: -Infinity, opacity: 0 },
  ];
  private epoch = -1;
  private frame = -1;
  private readonly filters = [newFilters(), newFilters()];
  reset(): void {
    for (const hand of this.hands) { hand.trackId = -1; hand.lastSeenMs = -Infinity; hand.opacity = 0; }
    this.filters[0] = newFilters(); this.filters[1] = newFilters(); this.frame = -1;
  }
  private observe(hand: HandFeatures | null, slot: VisualHand, tMs: number): void {
    if (!hand || hand.landmarksPx.length !== 21) return;
    const index = this.hands.indexOf(slot), elapsed = tMs - slot.lastSeenMs;
    // a different hand or a long gap starts fresh: never glide a glove across the screen
    if (slot.trackId !== hand.trackId || elapsed > VISUAL_HOLD_MS) this.filters[index] = newFilters();
    const filters = this.filters[index], dtS = Number.isFinite(elapsed) ? Math.max(0, elapsed) / 1000 : 0;
    for (let i = 0; i < 21; i++) {
      slot.points[i * 2] = filters[i * 2].filter(hand.landmarksPx[i].x, dtS);
      slot.points[i * 2 + 1] = filters[i * 2 + 1].filter(hand.landmarksPx[i].y, dtS);
    }
    slot.trackId = hand.trackId; slot.lastSeenMs = tMs;
  }
  update(input: FrameInput | null, nowMs: number): readonly VisualHand[] {
    if (input && input.epoch !== this.epoch) { this.reset(); this.epoch = input.epoch; }
    if (input && input.frameId !== this.frame && nowMs >= input.tMs && nowMs - input.tMs <= CONFIG.MAX_INPUT_AGE_MS && ['ready', 'oneHand'].includes(input.status)) {
      this.frame = input.frameId;
      this.observe(input.screenLeft, this.hands[0], input.tMs);
      this.observe(input.screenRight, this.hands[1], input.tMs);
    }
    for (const hand of this.hands) {
      const age = nowMs - hand.lastSeenMs;
      hand.opacity = age <= 100 ? 1 : Math.max(0, 1 - (age - 100) / (VISUAL_HOLD_MS - 100));
    }
    return this.hands;
  }
}
