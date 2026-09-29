import type { FrameInput, HandFeatures } from '../types';
import { CONFIG } from '../config';

export const VISUAL_HOLD_MS = 350;
export interface VisualHand { trackId: number; points: Float32Array; lastSeenMs: number; opacity: number }

// Display-only history. These points never enter recognition or clay deformation.
export class HandVisuals {
  readonly hands: VisualHand[] = [
    { trackId: -1, points: new Float32Array(42), lastSeenMs: -Infinity, opacity: 0 },
    { trackId: -1, points: new Float32Array(42), lastSeenMs: -Infinity, opacity: 0 },
  ];
  private epoch = -1;
  private frame = -1;
  reset(): void { for (const hand of this.hands) { hand.trackId = -1; hand.lastSeenMs = -Infinity; hand.opacity = 0; } this.frame = -1; }
  private observe(hand: HandFeatures | null, slot: VisualHand, tMs: number): void {
    if (!hand || hand.landmarksPx.length !== 21) return;
    const elapsed = tMs - slot.lastSeenMs;
    const blend = slot.trackId !== hand.trackId || elapsed > VISUAL_HOLD_MS ? 1 : 1 - Math.exp(-Math.max(0, elapsed) / 45);
    for (let i = 0; i < 21; i++) {
      slot.points[i * 2] += (hand.landmarksPx[i].x - slot.points[i * 2]) * blend;
      slot.points[i * 2 + 1] += (hand.landmarksPx[i].y - slot.points[i * 2 + 1]) * blend;
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
