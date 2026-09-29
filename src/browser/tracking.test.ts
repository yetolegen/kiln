import { afterEach, expect, it, vi } from 'vitest';
import { connectTracking, loadTracker } from './tracking';
import { createController } from '../engine/controller';
import { cameraProjection } from './camera';
import type { TrackingPacket } from '../types';

afterEach(() => vi.useRealTimers());

it('keeps tracker/core epochs aligned on startup, resize, pause and resume; drops old packets', () => {
  const core = createController();
  const observe = vi.spyOn(core, 'observe');
  const reset = vi.spyOn(core, 'resetInput');
  let onPacket!: (packet: TrackingPacket) => void;
  const tracker = { epoch: 0, start: vi.fn((_video: HTMLVideoElement, callback: typeof onPacket) => { onPacket = callback; }), stop: vi.fn() };
  const bridge = connectTracking(core, tracker, {} as HTMLVideoElement);
  const projection = cameraProjection({ videoWidth: 1280, videoHeight: 720 }, { width: 1000, height: 800 }, 1);
  core.dispatch({ type: 'modelReady' }, 0);
  expect(core.tick(0).phase).toBe('permission');
  bridge.resume(projection, 0);
  expect(core.tick(0).phase).toBe('calibrate');
  const packet: TrackingPacket = { frameId: 1, epoch: tracker.epoch, capturedAtMs: 1, receivedAtMs: 1, mediaTimeMs: 1, hands: [] };
  onPacket(packet);
  expect(observe).toHaveBeenCalledOnce();
  bridge.resume({ ...projection, revision: 2, viewportWidth: 500 }, 2);
  expect(reset).toHaveBeenLastCalledWith(tracker.epoch);
  onPacket(packet);
  expect(observe).toHaveBeenCalledOnce();
  bridge.pause(3);
  onPacket({ ...packet, epoch: tracker.epoch, frameId: 2 });
  expect(observe).toHaveBeenCalledOnce();
  bridge.resume(projection, 4);
  onPacket({ ...packet, epoch: tracker.epoch, frameId: 3, capturedAtMs: 4, receivedAtMs: 4 });
  expect(observe).toHaveBeenCalledTimes(2);
  expect(reset).toHaveBeenLastCalledWith(tracker.epoch);
  expect(core.tick(4).input?.epoch).toBe(tracker.epoch);
});

it('turns a stalled model into a retryable error and closes a late model', async () => {
  vi.useFakeTimers();
  const tracker = { close: vi.fn() };
  let finish!: (value: typeof tracker) => void;
  const pending = loadTracker(() => new Promise<typeof tracker>((resolve) => { finish = resolve; }), 100);
  const result = expect(pending).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(101);
  await result;
  finish(tracker);
  await Promise.resolve();
  expect(tracker.close).toHaveBeenCalledOnce();
});

it('preserves model errors so the UI can explain the failed stage', async () => {
  const error = Object.assign(new Error('model'), { stage: 'wasm' });
  await expect(loadTracker(() => Promise.reject(error))).rejects.toBe(error);
});
