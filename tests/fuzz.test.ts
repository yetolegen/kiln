import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { createController } from '../src/engine/controller';
import type { AppCommand, ClayEvent, CoreController, FrameInput, HandFeatures, SessionMode } from '../src/types';
import { hand, moving, poseHand, PROJ, rng } from './helpers';

// Random frames + random commands through the REAL controller; check invariants after every step.
function randomHand(rand: () => number, side: -1 | 1): HandFeatures {
  const pick = rand();
  const ext = pick < 0.25 ? 1 : pick < 0.5 ? 0 : rand();
  return hand(side * (0.3 + rand() * 1.8), rand() * 3 - 0.5, {
    trackId: side < 0 ? 1 : 2,
    extension: { index: rand() < 0.2 ? 1 : ext, middle: ext, ring: ext, pinky: ext },
    pinchRatio: rand() < 0.3 ? rand() * 0.3 : 0.2 + rand(),
    pointing: rand() < 0.05,
    velocityPalmPerS: { x: (rand() - 0.5) * (rand() < 0.1 ? 20 : 3), y: (rand() - 0.5) * 4 },
    velocityValid: rand() < 0.95,
  });
}

const STATUSES: FrameInput['status'][] = ['ready', 'ready', 'ready', 'ready', 'reacquiring', 'outOfFrame', 'stale', 'ambiguousTracks'];
const MODES: SessionMode[] = ['tutorial', 'free', 'commission'];

function randomCommand(rand: () => number, n: number): AppCommand {
  const gestures = [undefined, 'shape', 'pullUp', 'indent', 'open', 'compressRim', 'raise'] as const;
  const all: AppCommand[] = [
    { type: 'modelReady' },
    { type: 'start', mode: MODES[Math.floor(rand() * 3)], sessionId: `s${n}` },
    { type: 'restart', newSessionId: `r${n}` },
    { type: 'finishShaping' },
    { type: 'selectGlaze', glazeId: 'g' },
    { type: 'confirmGlaze' },
    { type: 'openGallery' },
    { type: 'backToMenu' },
    { type: 'tutorialStep', step: n, expectedGesture: gestures[Math.floor(rand() * gestures.length)] },
  ];
  return all[Math.floor(rand() * all.length)];
}

function run(seed: number, steps: number) {
  const rand = rng(seed);
  const core: CoreController = createController({ nowIso: () => 'iso' });
  core.dispatch({ type: 'modelReady' }, 0);
  core.updateProjection(PROJ);
  let t = 0, epoch = 0;
  const open = new Map<string, ClayEvent>(); // episodeId → begin
  const begunIds = new Set<string>();
  const beginsBySession = new Map<string, Record<string, number>>();
  let result: unknown = null, resultJson = '';
  let sessionId: string | null = null;
  const phases = new Set<string>();
  let cavities = 0, lifts = 0;

  for (let k = 0; k < steps; k++) {
    t += 10 + rand() * 60;
    if (rand() < 0.002) core.resetInput(++epoch);
    if (rand() < 0.03) core.dispatch(randomCommand(rand, k), t);
    // mostly real hands, sometimes missing ones
    const l = rand() < 0.9 ? randomHand(rand, -1) : null;
    const r = rand() < 0.9 ? randomHand(rand, 1) : null;
    // stretches of calm hands so calibration and menus get reached, then scripted one-hand
    // actions (support + active pose moving slowly, with noise) so lift/indent/open/rim really run
    const phase = k % 400;
    const calm = phase < 60;
    const scripted = phase >= 60 && phase < 260;
    const kind = Math.floor(k / 400) % 4;
    const u = (phase - 60) / 200; // 0 → 1 over the stretch
    const noise = () => (rand() - 0.5) * 0.04;
    const active = [
      () => poseHand('flat', noise(), u < 0.6 ? noise() : (u - 0.6) * 0.8, { trackId: 2, ...moving(noise(), u < 0.6 ? 0 : 0.5) }),
      () => poseHand('thumbDown', noise(), 1.25 - u * 0.3, { trackId: 2, ...moving(0, -0.5) }),
      () => poseHand('spread', noise(), 1.15, { trackId: 2, ratio: 0.2 + Math.max(0, u - 0.2) * 1.2 }),
      () => poseHand('flat', noise(), 1.35 - u * 0.3, { trackId: 2, ...moving(0, u < 0.3 ? 0 : -0.4) }),
    ][kind];
    const frame: FrameInput = {
      frameId: k, epoch, tMs: t, receivedAtMs: t + (rand() < 0.02 ? 500 : 5),
      dtSampleS: rand() < 0.01 ? 3 : 0.033,
      status: calm || scripted ? 'ready' : l && r ? STATUSES[Math.floor(rand() * STATUSES.length)] : l || r ? 'oneHand' : 'noHands',
      screenLeft: calm ? hand(-1, 0.6) : scripted ? poseHand('wall', -1 + noise(), 0.6, { trackId: 1 }) : l,
      screenRight: calm ? hand(1, 0.6) : scripted ? active() : r,
    };
    core.observe(frame);
    const s = core.tick(t + rand() * 10);

    // clay invariants
    if (s.clay) {
      const c = s.clay;
      const ok = c.radii.every((x) => Number.isFinite(x) && x >= CONFIG.MIN_R - 1e-6 && x <= CONFIG.MAX_R + 1e-6) &&
        c.damage.every((d) => d >= 0 && d <= 1) &&
        c.height >= CONFIG.MIN_HEIGHT && c.height <= CONFIG.MAX_HEIGHT &&
        Number.isFinite(c.thickness) && c.thickness >= CONFIG.THICKNESS_FLOOR - 1e-6 &&
        (c.cavityDepthWorld === 0) === (c.cavityRadiusWorld === 0) &&
        c.cavityDepthWorld <= c.height - CONFIG.FLOOR_WORLD + 1e-6 &&
        c.wobble >= 0 && c.wobble <= 1;
      if (c.cavityDepthWorld > 0) cavities++;
      if (c.height > CONFIG.INIT_HEIGHT + 0.05) lifts++;
      if (!ok) expect.fail(`clay invariant broken at step ${k}: ${JSON.stringify({ ...c, radii: [...c.radii], damage: [...c.damage] })}`);
    }

    // new session → forget per-session bookkeeping for counting
    if (s.stats && s.stats.sessionId !== sessionId) {
      sessionId = s.stats.sessionId;
      beginsBySession.set(sessionId, {});
    }
    // episode pairing
    for (const e of s.events) {
      if (e.phase === 'begin') {
        if (begunIds.has(e.episodeId)) expect.fail(`duplicate begin ${e.episodeId}`);
        begunIds.add(e.episodeId);
        open.set(e.episodeId, e);
        if (sessionId && e.category !== 'coaching') {
          const b = beginsBySession.get(sessionId)!;
          b[e.type] = (b[e.type] ?? 0) + 1;
        }
      } else {
        if (!open.has(e.episodeId)) expect.fail(`${e.phase} without begin: ${e.episodeId}`);
        if (e.phase === 'end') open.delete(e.episodeId);
      }
    }
    // outside shaping nothing may stay open
    if (s.phase !== 'studio' && s.phase !== 'tutorial' && (s.activeIssues.length || open.size)) {
      expect.fail(`episode left open in ${s.phase}: ${[...open.keys()].join(', ')}`);
    }
    // stats = begins (only while the session is live; frozen sessions stop counting)
    if (s.stats && (s.phase === 'studio' || s.phase === 'tutorial')) {
      const counted = { ...s.stats.executionEpisodes, ...s.stats.trackingEpisodes };
      expect(counted).toEqual(beginsBySession.get(s.stats.sessionId));
    }
    // a result never changes once made
    if (s.result) {
      if (s.result === result) expect(JSON.stringify(s.result)).toBe(resultJson);
      else {
        result = s.result;
        resultJson = JSON.stringify(s.result);
        expect(s.result.finalProfile.every(Number.isFinite)).toBe(true);
      }
    }
    if (s.hint && !Number.isFinite(s.hint.expiresAtMs)) expect.fail('hint without a finite expiry');
    phases.add(s.phase);
  }
  return { phases, cavities, lifts };
}

describe('fuzz: random frames and commands through the real controller', () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`seed ${seed}: invariants hold for 20000 steps`, () => {
      const { phases, cavities, lifts } = run(seed, 20000);
      expect(phases.has('studio') || phases.has('tutorial')).toBe(true); // the fuzz actually reached shaping
      expect(cavities + lifts).toBeGreaterThan(0); // the one-hand actions really ran through the controller
    }, 30_000);
  }
});
