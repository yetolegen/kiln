import { CONFIG } from '../config';
import type { ProjectionParams } from '../types';

export type CameraProblem = 'unsupported' | 'insecure' | 'denied' | 'notFound' | 'busy' | 'interrupted' | 'playback' | 'unknown';

export class CameraError extends Error {
  constructor(readonly code: CameraProblem, cause?: unknown) {
    super(`Camera: ${code}`, { cause });
    this.name = 'CameraError';
  }
}

export function cameraProblem(error: unknown): CameraProblem {
  if (error instanceof CameraError) return error.code;
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'notFound';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'busy';
  if (name === 'AbortError') return 'interrupted';
  return 'unknown';
}

export class CameraSession {
  private stream: MediaStream | null = null;
  private pending: Promise<void> | null = null;
  private generation = 0;
  private playback: AbortController | null = null;
  private readonly ended = () => { this.stop(); this.onEnded(); };

  constructor(readonly video: HTMLVideoElement, private readonly onEnded: () => void) {
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.disablePictureInPicture = true;
  }

  start(): Promise<void> {
    if (this.pending) return this.pending;
    this.stop();
    const generation = this.generation;
    const request = this.open(generation).finally(() => {
      if (this.pending === request) this.pending = null;
    });
    this.pending = request;
    return request;
  }

  stop(): void {
    this.generation++;
    this.playback?.abort();
    this.playback = null;
    for (const track of this.stream?.getTracks() ?? []) {
      track.removeEventListener('ended', this.ended);
      track.stop();
    }
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
  }

  private async open(generation: number): Promise<void> {
    if (!globalThis.isSecureContext) throw new CameraError('insecure');
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported');
    const request = (width: number, height: number) => navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'user' }, width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: 30 } },
    });
    try {
      let stream: MediaStream;
      try { stream = await request(1280, 720); }
      catch (error) {
        if (generation !== this.generation) throw new CameraError('interrupted');
        if (!(error instanceof Error) || !['OverconstrainedError', 'NotReadableError', 'AbortError'].includes(error.name)) throw error;
        stream = await request(640, 480);
      }
      // Permission may resolve after the page was closed or a session was cancelled.
      if (generation !== this.generation) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraError('interrupted');
      }
      this.stream = stream;
      if (!stream.getVideoTracks().some((track) => track.readyState === 'live')) throw new CameraError('notFound');
      for (const track of stream.getVideoTracks()) track.addEventListener('ended', this.ended);
      this.playback = new AbortController();
      this.video.srcObject = stream;
      await waitForVideo(this.video, this.playback.signal);
      if (generation !== this.generation) throw new CameraError('interrupted');
    } catch (error) {
      if (generation === this.generation) this.stop();
      throw new CameraError(cameraProblem(error), error);
    }
  }
}

function waitForVideo(video: HTMLVideoElement, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', check);
      video.removeEventListener('playing', check);
      video.removeEventListener('error', fail);
      signal.removeEventListener('abort', abort);
    };
    const check = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2 && !video.paused) {
        cleanup(); resolve();
      }
    };
    const fail = () => { cleanup(); reject(new CameraError('playback')); };
    const abort = () => { cleanup(); reject(new CameraError('interrupted')); };
    const timer = setTimeout(fail, 12_000);
    video.addEventListener('loadeddata', check);
    video.addEventListener('playing', check);
    video.addEventListener('error', fail);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) { abort(); return; }
    void video.play().then(check, fail);
  });
}

export function cameraProjection(
  video: Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>,
  viewport: { width: number; height: number },
  revision: number,
  phase = 'studio',
): ProjectionParams {
  const { width, height } = viewport;
  if (![width, height, video.videoWidth, video.videoHeight].every((n) => Number.isFinite(n) && n > 0)) {
    throw new CameraError('playback');
  }
  const landscape = height < 500 && width > height;
  const phoneResult = width <= 600 && phase === 'result';
  const display = ['menu', 'glaze', 'result'].includes(phase);
  // Wide shaping screens (studio.css layout): the pot is the centred subject, sized like the reference shot.
  // The screen ceiling (CONFIG.SCREEN_HEIGHT_FRACTION) then caps growth at .75 × .72 / .24 = 2.25 world units:
  // above the 1.8 commission vase, and the tallest pot still ends below the top bar.
  const wideShaping = !landscape && width >= 901 && height >= 600 && (phase === 'studio' || phase === 'tutorial');
  // the glaze screen shows the same large pot, shifted right of the glaze column
  const wideGlaze = !landscape && width >= 901 && height >= 600 && phase === 'glaze';
  const axis = wideShaping ? .5 : wideGlaze ? .62 : landscape ? .74 : width >= 1000 ? display ? .7 : .56 : width > 600 ? .66 : .5;
  return {
    revision, videoWidth: video.videoWidth, videoHeight: video.videoHeight,
    viewportWidth: width, viewportHeight: height, fit: 'cover', mirrored: true,
    axisXPx: width * axis, bottomYPx: height * (wideShaping || wideGlaze ? .72 : phoneResult ? .65 : .8),
    pixelsPerWorldUnit: wideShaping || wideGlaze ? Math.min(width / 5, height * .24)
      : landscape ? Math.min(width * .43 / 3.8, height * .64 / CONFIG.MAX_HEIGHT) : Math.min(width / 5, height * (phoneResult ? .24 : .48) / CONFIG.MAX_HEIGHT),
  };
}
