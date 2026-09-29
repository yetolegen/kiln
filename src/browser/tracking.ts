import { FeatureExtractor } from '../tracking/features';
import type { HandTracker } from '../tracking/handTracker';
import type { CoreController, ProjectionParams, TrackingPacket } from '../types';

type Tracker = Pick<HandTracker, 'epoch' | 'start' | 'stop'>;

// Keeps the browser's projection and both consumers of input on the same epoch.
export function connectTracking(core: CoreController, tracker: Tracker, video: HTMLVideoElement) {
  const features = new FeatureExtractor();
  let projection: ProjectionParams | null = null;
  let epoch = 0;
  let paused = true;
  const reset = () => {
    tracker.epoch = ++epoch;
    features.reset(epoch);
    core.resetInput(epoch);
  };
  const observe = (packet: TrackingPacket) => {
    if (!paused && projection && packet.epoch === epoch) core.observe(features.compute(packet, projection));
  };
  return {
    resume(next: ProjectionParams, nowMs: number): void {
      tracker.stop();
      projection = next;
      reset();
      core.updateProjection(next);
      paused = false;
      core.setPaused(false, nowMs);
      tracker.start(video, observe);
    },
    pause(nowMs: number): void {
      paused = true;
      tracker.stop();
      reset();
      core.setPaused(true, nowMs);
    },
  };
}

export function loadTracker<T extends { close(): void }>(create: () => Promise<T>, timeoutMs = 40_000): Promise<T> {
  return new Promise((resolve, reject) => {
    let finished = false;
    const timer = setTimeout(() => { finished = true; reject(new Error('Tracker loading timed out')); }, timeoutMs);
    create().then((tracker) => {
      if (finished) { tracker.close(); return; }
      finished = true; clearTimeout(timer); resolve(tracker);
    }, (error: unknown) => {
      if (finished) return;
      finished = true; clearTimeout(timer); reject(error);
    });
  });
}
