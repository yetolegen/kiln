import { describe, expect, it } from 'vitest';
import { createClay, stepClay } from '../src/engine/clay';
import { createController } from '../src/engine/controller';
import { RuleEngine, type RuleInput } from '../src/engine/rules';
import type { ClayEvent, EngineSnapshot, GestureState } from '../src/types';
import { frame, hand, moveGesture, PROJ, shapeGesture } from './helpers';

const wobbling = (off: number): GestureState => ({ ...shapeGesture(0.5, 1), centerOffsetPalm: off });
const input = (tMs: number, g: GestureState): RuleInput =>
  ({ tMs, phase: 'studio', input: frame(tMs, hand(-1, 0.6), hand(1, 0.6)), gesture: g, clay: createClay() });

function feed(rules: RuleEngine, fromMs: number, toMs: number, g: GestureState, events: ClayEvent[]) {
  for (let t = fromMs; t < toMs; t += 33) events.push(...rules.update(input(t, g)).events);
}
const count = (ev: ClayEvent[], type: string, phase: ClayEvent['phase']) =>
  ev.filter((e) => e.type === type && e.phase === phase).length;

describe('rules / episodes', () => {
  it('T13 3 s of continuous wobble is ONE episode; clear + new = 2', () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    feed(rules, 0, 3000, wobbling(0.6), ev);
    expect(count(ev, 'wobble', 'begin')).toBe(1);
    expect(count(ev, 'wobble', 'update')).toBeGreaterThan(0);

    feed(rules, 3000, 3600, wobbling(0), ev); // centred long enough to clear
    expect(count(ev, 'wobble', 'end')).toBe(1);
    feed(rules, 3600, 5000, wobbling(0.6), ev);
    expect(count(ev, 'wobble', 'begin')).toBe(2);
    expect(new Set(ev.filter((e) => e.type === 'wobble').map((e) => e.episodeId)).size).toBe(2);
  });

  it('a short flicker inside RULE_CLEAR_MS stays the same episode', () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    feed(rules, 0, 1000, wobbling(0.6), ev);
    feed(rules, 1000, 1100, wobbling(0), ev);
    feed(rules, 1100, 2000, wobbling(0.6), ev);
    expect(count(ev, 'wobble', 'begin')).toBe(1);
    expect(count(ev, 'wobble', 'end')).toBe(0);
  });

  it('wobble hysteresis: 0.3 palm keeps a running episode but does not start one', () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    feed(rules, 0, 1000, wobbling(0.3), ev);
    expect(count(ev, 'wobble', 'begin')).toBe(0);
    feed(rules, 1000, 2000, wobbling(0.6), ev);
    feed(rules, 2000, 3000, wobbling(0.3), ev);
    expect(count(ev, 'wobble', 'end')).toBe(0);
  });

  it('wobble tells the user which way to move', () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    feed(rules, 0, 700, wobbling(0.6), ev); // hands right of the axis
    expect(ev.find((e) => e.type === 'wobble')?.data.dir).toBe('left');
  });

  it("tracking issues are category 'tracking', not the user's fault", () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    for (let t = 0; t < 2000; t += 33) {
      ev.push(...rules.update({ ...input(t, shapeGesture(0.5, 1, false)), input: frame(t, null, null) }).events);
    }
    expect(ev.find((e) => e.type === 'noHands')?.category).toBe('tracking');
  });
});

describe('pulling too thin', () => {
  it('a wide pot pulled up warns tooThin BEFORE it collapses with thinWall', () => {
    const rules = new RuleEngine();
    const pull = moveGesture('pullUp');
    let clay = createClay();
    clay.radii.fill(1.6); // wide base, so tooTall doesn't come first
    const order: string[] = [];
    for (let t = 0; t < 8000 && !clay.collapsed; t += 50) {
      clay = stepClay(clay, pull, 0.05);
      for (const e of rules.update({ ...input(t, pull), clay }).events) if (e.phase === 'begin') order.push(e.type);
    }
    expect(clay.collapseCause).toBe('thinWall');
    expect(order.indexOf('tooThin')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('tooThin')).toBeLessThan(order.indexOf('collapse'));
  });

  it('wobble needs actual deformation, not just hands resting at the walls', () => {
    const rules = new RuleEngine();
    const ev: ClayEvent[] = [];
    feed(rules, 0, 2000, { ...wobbling(0.6), deforming: false }, ev);
    expect(count(ev, 'wobble', 'begin')).toBe(0);
  });
});

describe('controller end-to-end', () => {
  function drive(ms: number, fast: boolean, core = createController(), t0 = 0) {
    core.updateProjection(PROJ);
    const snaps: EngineSnapshot[] = [];
    for (let t = t0; t < t0 + ms; t += 33) {
      const v = { velocityPalmPerS: { x: fast ? 9 : 0.2, y: 0 } };
      core.observe(frame(t, hand(-1, 0.6, v), hand(1, 0.6, v)));
      snaps.push(core.tick(t));
    }
    return { core, snaps, events: snaps.flatMap((s) => [...s.events]) };
  }

  it('moving too fast tears (begin, damage, hint); slowing down ends it', () => {
    const fast = drive(1000, true);
    expect(count(fast.events, 'tear', 'begin')).toBe(1);
    const last = fast.snaps.at(-1)!;
    expect(Math.max(...last.clay!.damage)).toBeGreaterThan(0);
    expect(last.hint?.id).toBe('tear');
    expect(last.hint?.params.speedRatio).toBeGreaterThan(1);

    const slow = drive(1000, false, fast.core, 1000);
    expect(count(slow.events, 'tear', 'end')).toBe(1);
    expect(slow.snaps.at(-1)!.hint?.id).not.toBe('tear');
  });

  it('events are delivered once, not replayed on the next tick', () => {
    const { core, snaps } = drive(1000, true);
    expect(snaps.filter((s) => s.events.some((e) => e.type === 'tear' && e.phase === 'begin')).length).toBe(1);
    expect(core.tick(2000).events.length).toBe(0);
  });

  it('restart forgets clay, episodes and hint', () => {
    const { core } = drive(1000, true);
    core.dispatch({ type: 'restart', newSessionId: 's2' }, 1000);
    const s = core.tick(1000);
    expect(s.hint).toBeNull();
    expect(s.activeIssues.length).toBe(0);
    expect(Math.max(...s.clay!.damage)).toBe(0);
  });
});
