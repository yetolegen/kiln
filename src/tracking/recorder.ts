// Dev-only: record labelled FrameInput sequences for threshold tuning (notebooks/tuning.ipynb).
// Pure: the key handling and file download live in dev/debug.ts.
import type { FrameInput, GestureState } from '../types';

/** What the user is DOING on purpose while recording (keys 1–6, 0 = neutral). */
export const LABELS = ['neutral', 'shape', 'pullUp', 'pressDown', 'point', 'raise', 'tooFast'] as const;
export type RecordLabel = (typeof LABELS)[number];

export interface RecordedFrame {
  label: RecordLabel;
  input: FrameInput;
  // what the recognizer decided, so the notebook can compare labels vs recognizer output
  gesture: Pick<GestureState, 'gesture' | 'centerOffsetPalm' | 'speedPalmPerS' | 'motionStrength' | 'deforming'> | null;
}

export class FrameRecorder {
  label: RecordLabel = 'neutral';
  private frames: RecordedFrame[] = [];
  private lastFrameId = -1;

  /** Call on every snapshot; each observation is stored once. */
  push(input: FrameInput | null, gesture: GestureState | null): void {
    if (!input || input.frameId === this.lastFrameId) return;
    this.lastFrameId = input.frameId;
    this.frames.push({
      label: this.label,
      input,
      gesture: gesture && {
        gesture: gesture.gesture,
        centerOffsetPalm: gesture.centerOffsetPalm,
        speedPalmPerS: gesture.speedPalmPerS,
        motionStrength: gesture.motionStrength,
        deforming: gesture.deforming,
      },
    });
  }

  get count(): number {
    return this.frames.length;
  }

  /** JSON for download; clears the buffer. */
  flush(meta: Record<string, string>): string {
    const json = JSON.stringify({ version: 1, meta, frames: this.frames });
    this.frames = [];
    this.lastFrameId = -1;
    return json;
  }
}
