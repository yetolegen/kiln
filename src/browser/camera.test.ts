import { afterEach, describe, expect, it, vi } from 'vitest';
import { CameraSession, cameraProjection } from './camera';

class FakeTrack extends EventTarget {
  readyState = 'live';
  stop = vi.fn(() => { this.readyState = 'ended'; });
}
class FakeVideo extends EventTarget {
  autoplay = false; muted = false; playsInline = false; disablePictureInPicture = false;
  srcObject: MediaStream | null = null;
  videoWidth = 1280; videoHeight = 720; readyState = 0; paused = true;
  pause = vi.fn(() => { this.paused = true; });
  play = vi.fn(async () => { this.readyState = 2; this.paused = false; });
}
function setup() {
  const track = new FakeTrack();
  const stream = { getTracks: () => [track], getVideoTracks: () => [track] } as unknown as MediaStream;
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('isSecureContext', true);
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  const video = new FakeVideo();
  const ended = vi.fn();
  const camera = new CameraSession(video as unknown as HTMLVideoElement, ended);
  return { track, stream, getUserMedia, video, ended, camera };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('camera permission and lifecycle', () => {
  it('requests a front camera without a microphone, and waits for real video dimensions', async () => {
    const s = setup();
    expect(s.getUserMedia).not.toHaveBeenCalled();
    await s.camera.start();
    expect(s.getUserMedia).toHaveBeenCalledWith({ audio: false, video: {
      facingMode: { ideal: 'user' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 },
    } });
    expect(s.video.muted && s.video.playsInline).toBe(true);
    expect(s.video.srcObject).toBe(s.stream);
    s.camera.stop();
    expect(s.track.stop).toHaveBeenCalledOnce();
    expect(s.video.srcObject).toBeNull();
  });
  it.each(['NotAllowedError', 'NotFoundError'])('does not repeat permission requests after %s', async (name) => {
    const s = setup();
    s.getUserMedia.mockRejectedValue(new DOMException('test', name));
    await expect(s.camera.start()).rejects.toMatchObject({ code: name === 'NotAllowedError' ? 'denied' : 'notFound' });
    expect(s.getUserMedia).toHaveBeenCalledOnce();
  });
  it('tries 640 by 480 when the preferred format fails', async () => {
    const s = setup();
    s.getUserMedia.mockRejectedValueOnce(new DOMException('format', 'OverconstrainedError'));
    await s.camera.start();
    expect(s.getUserMedia.mock.calls[1][0].video.width.ideal).toBe(640);
    expect(s.getUserMedia.mock.calls[1][0].video.height.ideal).toBe(480);
    s.camera.stop();
  });
  it('coalesces rapid clicks and releases a stream granted after cancellation', async () => {
    const s = setup();
    let grant!: (stream: MediaStream) => void;
    s.getUserMedia.mockReturnValue(new Promise<MediaStream>((resolve) => { grant = resolve; }));
    const pending = s.camera.start();
    expect(s.camera.start()).toBe(pending);
    s.camera.stop();
    grant(s.stream);
    await expect(pending).rejects.toMatchObject({ code: 'interrupted' });
    expect(s.track.stop).toHaveBeenCalledOnce();
    expect(s.video.srcObject).toBeNull();
  });
  it('stops the stream when playback fails', async () => {
    const s = setup();
    s.video.play.mockRejectedValue(new Error('playback'));
    await expect(s.camera.start()).rejects.toMatchObject({ code: 'playback' });
    expect(s.track.stop).toHaveBeenCalledOnce();
  });
  it('handles camera disconnection once', async () => {
    const s = setup();
    await s.camera.start();
    s.track.dispatchEvent(new Event('ended'));
    s.track.dispatchEvent(new Event('ended'));
    expect(s.ended).toHaveBeenCalledOnce();
    expect(s.video.srcObject).toBeNull();
  });
  it('reports an unsupported or insecure context before asking for media', async () => {
    const s = setup();
    vi.stubGlobal('isSecureContext', false);
    await expect(s.camera.start()).rejects.toMatchObject({ code: 'insecure' });
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('navigator', {});
    await expect(s.camera.start()).rejects.toMatchObject({ code: 'unsupported' });
    expect(s.getUserMedia).not.toHaveBeenCalled();
  });
});

describe('projection from actual layout', () => {
  it.each([[1440, 900], [390, 844], [844, 390]])('fits the maximum pot at %i by %i', (width, height) => {
    const p = cameraProjection({ videoWidth: 640, videoHeight: 480 }, { width, height }, 7);
    expect(p).toMatchObject({ revision: 7, fit: 'cover', mirrored: true, axisXPx: width * (height < 500 && width > height ? .74 : .5), bottomYPx: height * .8 });
    expect(p.bottomYPx - 3.2 * p.pixelsPerWorldUnit).toBeGreaterThanOrEqual(height * .15);
    expect(p.axisXPx - 1.6 * p.pixelsPerWorldUnit).toBeGreaterThan(0);
    expect(p.axisXPx + 1.6 * p.pixelsPerWorldUnit).toBeLessThan(width);
  });
  it('rejects a not-yet-running video', () => {
    expect(() => cameraProjection({ videoWidth: 0, videoHeight: 0 }, { width: 390, height: 844 }, 1)).toThrow();
  });
  it('reserves room above and below the phone result pot', () => {
    const p = cameraProjection({ videoWidth: 640, videoHeight: 480 }, { width: 390, height: 844 }, 1, 'result');
    expect(p.bottomYPx - 3.2 * p.pixelsPerWorldUnit).toBeGreaterThan(330);
    expect(p.bottomYPx + .2 * p.pixelsPerWorldUnit).toBeLessThan(844 * .7);
  });
});
