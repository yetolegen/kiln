// MediaPipe HandLandmarker wrapper. The only tracking file allowed to touch the DOM (the video element).
// One inference per NEW video frame (requestVideoFrameCallback), capped at INFERENCE_MAX_HZ.
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { CONFIG } from '../config';
import type { RawHand, TrackingPacket } from '../types';

const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${CONFIG.MEDIAPIPE_VERSION}/wasm`;
const MODEL_URL = '/models/hand_landmarker.task';

export class HandTrackerError extends Error {
  constructor(readonly stage: 'wasm' | 'model', cause: unknown) {
    super(`Hand tracker failed to load (${stage}): ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'HandTrackerError';
  }
}

export class HandTracker {
  /** B sets this on camera restart / resize, together with controller.resetInput(epoch). */
  epoch = 0;
  private running = false;
  private stopLoop: (() => void) | null = null;
  private frameId = 0;
  private lastMediaTimeMs = -1;
  private lastSubmitMs = -Infinity;
  private lastTimestampMs = 0;
  private errorLogged = false;

  private constructor(private readonly landmarker: HandLandmarker, readonly delegate: 'GPU' | 'CPU') {}

  /** Loads WASM + model. GPU first, CPU fallback. Throws HandTrackerError with the failing stage. */
  static async create(): Promise<HandTracker> {
    let fileset;
    try {
      fileset = await FilesetResolver.forVisionTasks(WASM_URL);
    } catch (e) {
      throw new HandTrackerError('wasm', e);
    }
    const make = (delegate: 'GPU' | 'CPU') =>
      HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      });
    try {
      return new HandTracker(await make('GPU'), 'GPU');
    } catch {
      try {
        return new HandTracker(await make('CPU'), 'CPU');
      } catch (e) {
        throw new HandTrackerError('model', e);
      }
    }
  }

  start(video: HTMLVideoElement, onPacket: (packet: TrackingPacket) => void): void {
    this.stop();
    this.running = true;
    // small slack so a 30 fps camera isn't throttled to 15 Hz by timing jitter
    const minIntervalMs = 1000 / CONFIG.INFERENCE_MAX_HZ - 2;

    const onFrame = (mediaTimeS: number) => {
      if (!this.running) return;
      schedule(); // first, so an exception below can't kill the loop
      const mediaTimeMs = mediaTimeS * 1000;
      const now = performance.now();
      if (video.readyState >= 2 && mediaTimeMs !== this.lastMediaTimeMs && now - this.lastSubmitMs >= minIntervalMs) {
        this.lastMediaTimeMs = mediaTimeMs;
        this.lastSubmitMs = now;
        // MediaPipe requires strictly increasing timestamps
        this.lastTimestampMs = Math.max(now, this.lastTimestampMs + 1);
        let result: HandLandmarkerResult | null = null;
        try {
          result = this.landmarker.detectForVideo(video, this.lastTimestampMs);
        } catch (e) {
          if (!this.errorLogged) console.error('HandTracker.detectForVideo failed', e);
          this.errorLogged = true;
        }
        // outside the try: errors in the core must surface, not be swallowed as inference errors
        if (result) {
          onPacket({
            frameId: ++this.frameId,
            epoch: this.epoch,
            capturedAtMs: now,
            receivedAtMs: performance.now(),
            mediaTimeMs,
            hands: toRawHands(result),
          });
        }
      }
    };

    const schedule = () => {
      if (!this.running) return;
      if ('requestVideoFrameCallback' in video) {
        const id = video.requestVideoFrameCallback((_now, meta) => onFrame(meta.mediaTime));
        this.stopLoop = () => video.cancelVideoFrameCallback(id);
      } else {
        // fallback: poll on rAF, dedupe by currentTime
        const id = requestAnimationFrame(() => onFrame((video as HTMLVideoElement).currentTime));
        this.stopLoop = () => cancelAnimationFrame(id);
      }
    };
    schedule();
  }

  stop(): void {
    this.running = false;
    this.stopLoop?.();
    this.stopLoop = null;
  }

  close(): void {
    this.stop();
    this.landmarker.close();
  }
}

function toRawHands(r: HandLandmarkerResult): RawHand[] {
  return r.landmarks.map((lm, i) => {
    const cat = r.handedness[i]?.[0];
    const label = cat?.categoryName;
    return {
      landmarks: lm.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      worldLandmarks: r.worldLandmarks[i]?.map((p) => ({ x: p.x, y: p.y, z: p.z })),
      handedness: label === 'Left' || label === 'Right' ? label : undefined,
      handednessScore: cat?.score,
    };
  });
}
