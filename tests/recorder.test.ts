import { describe, expect, it } from 'vitest';
import { FrameRecorder } from '../src/tracking/recorder';
import { frame, hand, shapeGesture } from './helpers';

describe('recorder', () => {
  it('stores each observation once with the label active at the time, flush clears', () => {
    const rec = new FrameRecorder();
    const f1 = frame(1, hand(-1, 0.6), hand(1, 0.6));
    rec.push(f1, shapeGesture(0.5, 1));
    rec.push(f1, shapeGesture(0.5, 1)); // same frame re-rendered
    rec.label = 'tooFast';
    rec.push(frame(2, hand(-1, 0.6), null), null);
    const data = JSON.parse(rec.flush({ note: 't' }));
    expect(data.frames.map((f: { label: string }) => f.label)).toEqual(['neutral', 'tooFast']);
    expect(data.frames[0].gesture.gesture).toBe('shape');
    expect(data.frames[0].input.screenLeft.pinchRatio).toBe(1);
    expect(rec.count).toBe(0);
  });
});
