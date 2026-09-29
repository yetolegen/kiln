import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createController } from '../src/engine/controller';
import type { CoreController, HandFeatures } from '../src/types';
import { frame, hand, inSession, PROJ, T_START, toMenu } from './helpers';

/** Feed the same hands for `ms` starting at t0; returns the end time. */
function feed(core: CoreController, l: HandFeatures | null, r: HandFeatures | null, t0: number, ms: number): number {
  let t = t0;
  for (; t < t0 + ms; t += 33) {
    core.observe(frame(t, l, r));
    core.tick(t);
  }
  return t;
}
const fast = { velocityPalmPerS: { x: 9, y: 0 } };

describe('phases', () => {
  it('loading → permission → calibrate → menu', () => {
    const core = createController();
    expect(core.tick(0).phase).toBe('loading');
    core.dispatch({ type: 'modelReady' }, 0);
    expect(core.tick(0).phase).toBe('permission');
    core.updateProjection(PROJ);
    expect(core.tick(0).phase).toBe('calibrate');
    feed(core, hand(-1, 0.6), hand(1, 0.6), 0, 400);
    const mid = core.tick(400);
    expect(mid.calibrationProgress).toBeGreaterThan(0.2);
    expect(mid.calibrationProgress).toBeLessThan(1);
    feed(core, hand(-1, 0.6), hand(1, 0.6), 400, 600);
    expect(core.tick(1000).phase).toBe('menu');
  });

  it('calibration needs both hands held STILL; moving resets it', () => {
    const core = createController();
    core.updateProjection(PROJ);
    const moving = { velocityPalmPerS: { x: 2, y: 0 } };
    feed(core, hand(-1, 0.6, moving), hand(1, 0.6, moving), 0, 2000);
    expect(core.tick(2000).phase).toBe('calibrate');
    expect(core.tick(2000).calibrationProgress).toBe(0);
    feed(core, hand(-1, 0.6), null, 2000, 2000);
    expect(core.tick(4000).phase).toBe('calibrate');
  });

  it('full commission route: studio → glaze → firing → result → gallery → menu', () => {
    const core = inSession('commission');
    expect(core.tick(T_START).phase).toBe('studio');
    let t = feed(core, hand(-0.8, 0.6), hand(0.8, 0.6), T_START, 1000);
    core.dispatch({ type: 'finishShaping' }, t);
    const glaze = core.tick(t);
    expect(glaze.phase).toBe('glaze');
    expect(glaze.stats?.similarity?.score).toBeGreaterThan(0);
    expect(glaze.stats?.targetId).toBe('vase@1'); // id@version: best scores only compare like with like

    core.dispatch({ type: 'confirmGlaze' }, t);
    expect(core.tick(t).phase).toBe('glaze'); // no glaze chosen yet
    core.dispatch({ type: 'selectGlaze', glazeId: 'celadon' }, t);
    core.dispatch({ type: 'confirmGlaze' }, t);
    expect(core.tick(t).phase).toBe('firing');
    expect(core.tick(t + CONFIG.FIRING_MS - 1).phase).toBe('firing');
    const res = core.tick((t += CONFIG.FIRING_MS));
    expect(res.phase).toBe('result');
    expect(res.result?.glazeId).toBe('celadon');
    expect(res.result?.id).toBe('s1');

    core.dispatch({ type: 'openGallery' }, t);
    expect(core.tick(t).phase).toBe('gallery');
    core.dispatch({ type: 'backToMenu' }, t);
    const menu = core.tick(t);
    expect(menu.phase).toBe('menu');
    expect(menu.mode).toBeNull();
  });

  it('"start over" in the tutorial keeps the current step', () => {
    const core = inSession('tutorial');
    core.dispatch({ type: 'tutorialStep', step: 1, expectedGesture: 'shape' }, T_START);
    core.dispatch({ type: 'restart', newSessionId: 'tut2' }, T_START);
    const t = feed(core, hand(-0.8, 0.6), hand(0.8, 0.6), T_START, 600);
    const s = core.tick(t);
    expect(s.stats?.sessionId).toBe('tut2');
    expect(s.gesture?.deforming).toBe(true); // shaping still allowed on this step
  });

  it('commands that do not fit the phase are ignored', () => {
    const core = createController();
    toMenu(core);
    core.dispatch({ type: 'finishShaping' }, T_START);
    core.dispatch({ type: 'confirmGlaze' }, T_START);
    expect(core.tick(T_START).phase).toBe('menu');
    core.dispatch({ type: 'start', mode: 'free', sessionId: 'a' }, T_START);
    core.dispatch({ type: 'start', mode: 'commission', sessionId: 'b' }, T_START); // already in studio
    expect(core.tick(T_START).stats?.sessionId).toBe('a');
  });

  it('raise held HOLD_FIRE_MS finishes shaping ONCE', () => {
    const core = inSession('free');
    const t = feed(core, hand(-1, 1.6), hand(1, 1.6), T_START, CONFIG.HOLD_FIRE_MS + 500);
    const s = core.tick(t);
    expect(s.phase).toBe('glaze');
    // still holding: nothing else happens (no second finish, no glaze confirm)
    core.dispatch({ type: 'selectGlaze', glazeId: 'x' }, t);
    feed(core, hand(-1, 1.6), hand(1, 1.6), t, 3000);
    expect(core.tick(t + 3000).phase).toBe('glaze');
  });

  it('tutorial: raise finishes only on the step that expects it', () => {
    const core = inSession('tutorial');
    let t = feed(core, hand(-1, 1.6), hand(1, 1.6), T_START, 2000);
    expect(core.tick(t).phase).toBe('tutorial');
    core.dispatch({ type: 'tutorialStep', step: 6, expectedGesture: 'raise' }, t);
    t = feed(core, hand(-1, 1.6), hand(1, 1.6), t, 2000);
    expect(core.tick(t).phase).toBe('menu');
  });
});

describe('sessions', () => {
  it('T17 a tutorial tear does not count in the next session', () => {
    const core = inSession('tutorial', 'tut');
    core.dispatch({ type: 'tutorialStep', step: 4, expectedGesture: 'shape' }, T_START);
    let t = feed(core, hand(-1, 0.6, fast), hand(1, 0.6, fast), T_START, 1000);
    expect(core.tick(t).stats?.executionEpisodes.tear).toBe(1);
    core.dispatch({ type: 'backToMenu' }, t);
    core.dispatch({ type: 'start', mode: 'commission', sessionId: 'c1' }, t);
    t = feed(core, hand(-0.8, 0.6), hand(0.8, 0.6), t, 500);
    const s = core.tick(t);
    expect(s.stats?.sessionId).toBe('c1');
    expect(s.stats?.executionEpisodes.tear ?? 0).toBe(0);
  });

  it('stats count episode begins, and tracking issues separately', () => {
    const core = inSession('free');
    let t = feed(core, hand(-1, 0.6, fast), hand(1, 0.6, fast), T_START, 2000); // one long tear
    t = feed(core, null, null, t, CONFIG.NO_HANDS_ENTER_MS + 500);
    const s = core.tick(t).stats!;
    expect(s.executionEpisodes.tear).toBe(1);
    expect(s.trackingEpisodes.noHands).toBe(1);
    expect(s.executionEpisodes.noHands).toBeUndefined();
    expect(s.activeMs).toBeGreaterThan(0);
  });

  it('T18 gestures after finishShaping do not change the result', () => {
    const core = inSession('commission');
    let t = feed(core, hand(-0.8, 0.6), hand(0.8, 0.6), T_START, 1000);
    core.dispatch({ type: 'finishShaping' }, t);
    const frozen = core.tick(t);
    const profile = Array.from(frozen.clay!.radii);
    const score = frozen.stats!.similarity!.score;

    t = feed(core, hand(-0.4, 0.6, fast), hand(0.4, 0.6, fast), t, 2000); // shaping + fast moves in glaze
    core.dispatch({ type: 'selectGlaze', glazeId: 'g' }, t);
    core.dispatch({ type: 'confirmGlaze' }, t);
    t = feed(core, hand(-0.4, 0.6, fast), hand(0.4, 0.6, fast), t, CONFIG.FIRING_MS + 100);
    const first = core.tick(t);
    expect(first.phase).toBe('result');
    expect(first.result!.finalProfile).toEqual(profile);
    expect(first.result!.stats.similarity!.score).toBe(score);
    expect(first.result!.stats.executionEpisodes.tear ?? 0).toBe(0);

    feed(core, hand(-0.4, 0.6, fast), hand(0.4, 0.6, fast), t, 1000);
    expect(core.tick(t + 1000).result).toBe(first.result); // same object: no second result
  });

  it('result arrays are copies, not the live clay arrays', () => {
    const core = inSession('free');
    let t = feed(core, hand(-0.8, 0.6), hand(0.8, 0.6), T_START, 500);
    core.dispatch({ type: 'finishShaping' }, t);
    core.dispatch({ type: 'selectGlaze', glazeId: 'g' }, t);
    core.dispatch({ type: 'confirmGlaze' }, t);
    const s = core.tick((t += CONFIG.FIRING_MS));
    expect(Array.isArray(s.result!.finalProfile)).toBe(true);
    expect(Array.isArray(s.result!.damage)).toBe(true);
  });

  it('completedAtIso comes from the injected wall clock', () => {
    const core = createController({ nowIso: () => '2026-09-30T10:00:00.000Z' });
    toMenu(core);
    core.dispatch({ type: 'start', mode: 'free', sessionId: 'w' }, T_START);
    core.dispatch({ type: 'finishShaping' }, T_START);
    core.dispatch({ type: 'selectGlaze', glazeId: 'g' }, T_START);
    core.dispatch({ type: 'confirmGlaze' }, T_START);
    expect(core.tick(T_START + CONFIG.FIRING_MS).result?.completedAtIso).toBe('2026-09-30T10:00:00.000Z');
  });

  it('"start over" mid-tear ends the tear episode instead of dropping it', () => {
    const core = inSession('free');
    const t = feed(core, hand(-1, 0.6, fast), hand(1, 0.6, fast), T_START, 1000);
    core.dispatch({ type: 'restart', newSessionId: 's2' }, t);
    const s = core.tick(t);
    expect(s.events.some((e) => e.type === 'tear' && e.phase === 'end')).toBe(true);
    expect(s.stats?.executionEpisodes.tear ?? 0).toBe(0); // new session starts clean
  });

  it('leaving the studio ends every running episode', () => {
    const core = inSession('free');
    const t = feed(core, hand(-1, 0.6, fast), hand(1, 0.6, fast), T_START, 1000);
    core.dispatch({ type: 'finishShaping' }, t);
    const s = core.tick(t);
    expect(s.events.some((e) => e.type === 'tear' && e.phase === 'end')).toBe(true);
    expect(s.activeIssues.length).toBe(0);
    expect(s.hint).toBeNull();
  });
});
