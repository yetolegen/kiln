import { expect, it, vi } from 'vitest';
import { createSoundPlayer } from './sound';
import { MockCore } from '../dev/mockCore';

it('plays issue begins once, ignores updates/ends, and emits one result chime', () => {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), gain: parameter(), frequency: parameter() });
  const oscillator = vi.fn(node);
  const ctx = { state: 'running', currentTime: 0, sampleRate: 10, destination: {}, createGain: node, createOscillator: oscillator,
    createBufferSource: node, createBiquadFilter: node, createBuffer: () => ({ getChannelData: () => new Float32Array(10) }) };
  const player = createSoundPlayer(() => ctx as unknown as AudioContext), core = new MockCore();
  player.update(core.tick(0)); expect(oscillator).toHaveBeenCalledTimes(1);
  core.key('t', 1); const begin = core.tick(1); player.update(begin); player.update(begin);
  expect(oscillator).toHaveBeenCalledTimes(2);
  player.update({ ...begin, events: [{ ...begin.events[0], phase: 'update' }] });
  core.key('t', 2); player.update(core.tick(2)); expect(oscillator).toHaveBeenCalledTimes(2);
  player.setMuted(true); core.key('c', 3); player.update(core.tick(3)); expect(oscillator).toHaveBeenCalledTimes(2);
  player.setMuted(false); core.key('8', 4); player.update(core.tick(4)); player.update(core.tick(5));
  expect(oscillator).toHaveBeenCalledTimes(5);
  expect(() => player.destroy()).not.toThrow();
});
it('does not block the flow when audio is absent or fails to initialize', () => {
  const snap = new MockCore().tick(0);
  expect(() => createSoundPlayer(() => null).update(snap)).not.toThrow();
  expect(() => createSoundPlayer(() => { throw new Error('disabled'); }).update(snap)).not.toThrow();
});
