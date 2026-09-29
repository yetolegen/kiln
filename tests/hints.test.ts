import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createClay } from '../src/engine/clay';
import { HintManager } from '../src/engine/hints';
import type { ClayEvent } from '../src/types';

const ev = (type: ClayEvent['type'], phase: ClayEvent['phase'] = 'begin', id = `${type}-1`): ClayEvent => ({
  episodeId: id, type, phase, category: 'execution', tMs: 0, severity: 0.8, data: {},
});
const upd = (h: HintManager, tMs: number, active: ClayEvent[], events: ClayEvent[] = []) =>
  h.update({ tMs, events, active, gesture: null, clay: createClay() });

describe('hints', () => {
  it('one hint, highest priority wins: tear over wobble, tracking over tear', () => {
    const h = new HintManager();
    expect(upd(h, 0, [ev('wobble'), ev('tear')])?.id).toBe('tear');
    expect(upd(h, 33, [ev('wobble'), ev('tear'), { ...ev('noHands'), category: 'tracking' }])?.id).toBe('noHands');
  });

  it('disappears when its cause clears', () => {
    const h = new HintManager();
    upd(h, 0, [ev('wobble')]);
    expect(upd(h, 33, [])).toBeNull();
  });

  it('speaks once per cause; cooldown limits repeated speech but never hides the hint', () => {
    const h = new HintManager();
    expect(upd(h, 0, [ev('wobble')])?.speak).toBe(true);
    expect(upd(h, 33, [ev('wobble')])?.speak).toBe(false); // same episode, refreshed
    upd(h, 66, []);
    const again = upd(h, 100, [ev('wobble', 'begin', 'wobble-2')]); // new episode inside cooldown
    expect(again?.id).toBe('wobble');
    expect(again?.speak).toBe(false);
    upd(h, 200, []);
    expect(upd(h, 200 + CONFIG.HINT_COOLDOWN_MS, [ev('wobble', 'begin', 'wobble-3')])?.speak).toBe(true);
  });

  it('collapse end gives a short "recovered" hint that expires', () => {
    const h = new HintManager();
    upd(h, 0, [ev('collapse')]);
    expect(upd(h, 33, [], [ev('collapse', 'end')])?.id).toBe('recovered');
    expect(h.expire(33 + CONFIG.HINT_TTL_MS + 1)).toBeNull();
  });

  it('"recovered" is spoken once even if a bigger hint covers it and clears', () => {
    const h = new HintManager();
    upd(h, 0, [ev('collapse')]);
    const first = upd(h, 33, [], [ev('collapse', 'end')]);
    expect(first?.speak).toBe(true);
    expect(upd(h, 66, [ev('wobble')])?.id).toBe('wobble');
    const back = upd(h, 99, []);
    expect(back?.id).toBe('recovered');
    expect(back?.speak).toBe(false);
  });

  it('hint object is stable while nothing changes (consumers speak on object change)', () => {
    const h = new HintManager();
    const a = upd(h, 0, [ev('wobble')]);
    expect(h.expire(10)).toBe(a);
    expect(h.expire(20)).toBe(a);
  });

  it('wobble direction reaches the hint params', () => {
    const h = new HintManager();
    expect(upd(h, 0, [{ ...ev('wobble'), data: { dir: 'left', offsetPalm: 0.6 } }])?.params.dir).toBe('left');
  });
});
