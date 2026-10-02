// Error mode (PLAN §8). Each rule is a condition; RuleEngine turns conditions into EPISODES:
//   inactive → pending (enter delay) → active → clearing (RULE_CLEAR_MS) → inactive
// emitting begin / update / end with a stable episodeId. Stats count begins only,
// so 3 s of continuous wobble is one mistake, not 90 frames of mistakes.
import { CONFIG } from '../config';
import type {
  AppPhase, ClayEvent, ClayEventType, ClayState, FrameInput, GestureState, IssueCategory, TargetProfile,
} from '../types';
import { findOverhang, NO_EFFECTS, type ClayEffects } from './clay';
import { similarity } from './target';

export interface RuleInput {
  tMs: number;
  phase: AppPhase;
  input: FrameInput;
  gesture: GestureState;
  clay: ClayState;
  target?: TargetProfile | null; // commission mode only
}

interface Hit {
  severity: number;
  band?: number;
  cause?: ClayEvent['cause'];
  data: Record<string, number | string>;
}

interface Rule {
  type: ClayEventType;
  category: IssueCategory;
  enterMs: number;
  clearMs: number;
  /** active = episode already running, for rules with their own exit hysteresis */
  test(i: RuleInput, active: boolean): Hit | null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round2 = (v: number) => Math.round(v * 100) / 100;
const UNCERTAIN = ['invalidLandmarks', 'outOfFrame', 'ambiguousTracks', 'stale'];

/** Band under the hands' mean height. Clamping is fine here: it's only a highlight, not deformation. */
function handsBand(i: RuleInput): number | undefined {
  const l = i.input.screenLeft, r = i.input.screenRight;
  if (!l || !r) return undefined;
  const y = (l.palmWorld.y + r.palmWorld.y) / 2;
  return Math.round(clamp01(y / i.clay.height) * (i.clay.radii.length - 1));
}

const RULES: Rule[] = [
  // tracking: not the user's fault, deformation is already paused by the gesture layer
  {
    type: 'noHands', category: 'tracking', enterMs: CONFIG.NO_HANDS_ENTER_MS, clearMs: 0,
    test: (i) => (i.input.status === 'noHands' ? { severity: 0.4, data: {} } : null),
  },
  {
    type: 'oneHand', category: 'tracking', enterMs: CONFIG.ONE_HAND_ENTER_MS, clearMs: 0,
    test: (i) => {
      const l = i.input.screenLeft, r = i.input.screenRight;
      if (!!l === !!r || i.gesture.gesture === 'point' || i.input.status === 'stale') return null;
      return { severity: 0.4, data: { missing: l ? 'right' : 'left' } };
    },
  },
  {
    type: 'trackingUncertain', category: 'tracking', enterMs: CONFIG.TRACKING_UNCERTAIN_ENTER_MS, clearMs: 0,
    test: (i) => (UNCERTAIN.includes(i.input.status) ? { severity: 0.4, data: { status: i.input.status } } : null),
  },

  // execution: the user's mistakes with valid input
  {
    type: 'collapse', category: 'execution', enterMs: 0, clearMs: 0,
    test: (i) => (i.clay.collapsed
      ? { severity: 1, cause: i.clay.collapseCause ?? undefined, data: { cause: i.clay.collapseCause ?? '' } }
      : null),
  },
  {
    type: 'tear', category: 'execution', enterMs: CONFIG.TEAR_ENTER_MS, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => {
      const g = i.gesture;
      if (!g.deforming || g.speedPalmPerS <= CONFIG.TEAR_SPEED_PALM_PER_S) return null;
      const ratio = g.speedPalmPerS / CONFIG.TEAR_SPEED_PALM_PER_S;
      return {
        severity: clamp01(0.5 + (ratio - 1)),
        band: g.contact.activeBand ?? handsBand(i),
        data: { speedRatio: round2(ratio) },
      };
    },
  },
  {
    type: 'wobble', category: 'execution', enterMs: CONFIG.WOBBLE_ENTER_MS, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i, active) => {
      const g = i.gesture, off = g.centerOffsetPalm;
      // off-centre only matters for two-hand shaping; one-hand actions put the hands asymmetric on purpose
      if (!g.deforming || g.gesture !== 'shape' || off === null) return null;
      if (Math.abs(off) <= (active ? CONFIG.WOBBLE_CLEAR_TOL_PALM : CONFIG.WOBBLE_TOL_PALM)) return null;
      // dir = where the user should move both hands
      return {
        severity: clamp01(Math.abs(off) / (2 * CONFIG.WOBBLE_TOL_PALM)),
        data: { offsetPalm: round2(off), dir: off > 0 ? 'left' : 'right' },
      };
    },
  },
  {
    type: 'tooThin', category: 'execution', enterMs: 0, clearMs: CONFIG.RULE_CLEAR_MS,
    // lifting an opened pot, or squeezing it with shape, thins the wall around the opening
    test: (i) => (['pullUp', 'open', 'shape'].includes(i.gesture.gesture) && !i.clay.collapsed &&
      i.clay.cavityDepthWorld > 0 && i.clay.thickness < CONFIG.MIN_THICKNESS + CONFIG.TOO_THIN_MARGIN
      ? { severity: 0.7, data: { thickness: round2(i.clay.thickness) } }
      : null),
  },
  {
    type: 'overhang', category: 'execution', enterMs: CONFIG.OVERHANG_ENTER_MS, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => {
      const o = findOverhang(i.clay);
      return o ? { severity: 0.6, band: o.band, data: { slope: round2(o.slope) } } : null;
    },
  },
  // v5 dangers: warnings before the permanent failures (bottomHole / wallTorn / pancake are collapse causes)
  {
    type: 'thinFloor', category: 'execution', enterMs: 0, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => (i.gesture.gesture === 'indent' && !i.clay.collapsed && i.clay.cavityDepthWorld > i.clay.safeIndentDepthWorld
      ? { severity: 0.8, band: 0, data: { floor: round2(i.clay.floorThicknessWorld), safeDepth: round2(i.clay.safeIndentDepthWorld) } }
      : null),
  },
  {
    type: 'overStretch', category: 'execution', enterMs: 0, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => (i.gesture.gesture === 'open' && !i.clay.collapsed && i.gesture.engagedMs >= CONFIG.STRETCH_DANGER_MS
      ? { severity: 0.9, data: { seconds: Math.round(i.gesture.engagedMs / 1000), tearInS: Math.max(0, Math.ceil((CONFIG.STRETCH_TEAR_MS - i.gesture.engagedMs) / 1000)) } }
      : null),
  },
  {
    type: 'tooFlat', category: 'execution', enterMs: 0, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => (i.gesture.gesture === 'compressRim' && !i.clay.collapsed && i.clay.height <= CONFIG.TOO_FLAT_HEIGHT_WORLD
      ? { severity: 0.8, data: { height: round2(i.clay.height) } }
      : null),
  },

  // coaching: guidance only
  {
    type: 'handsTooFar', category: 'coaching', enterMs: 0, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i) => {
      const nm = i.gesture.nearMiss;
      return nm?.reason === 'handsTooFar' ? { severity: 0.3, data: { ...nm.params } } : null;
    },
  },
  {
    // the enter delay doubles as the "every few seconds, not every frame" interval
    type: 'targetMismatch', category: 'coaching', enterMs: CONFIG.TARGET_HINT_INTERVAL_MS, clearMs: CONFIG.RULE_CLEAR_MS,
    test: (i): Hit | null => {
      if (!i.target || i.clay.collapsed) return null;
      const s = similarity(i.clay.radii, i.clay.height, i.target);
      const radial = Math.abs(s.signedRadiusDeltaWorld) / CONFIG.TARGET_RADIUS_TOL_WORLD;
      const vertical = Math.abs(s.signedHeightDeltaWorld) / CONFIG.TARGET_HEIGHT_TOL_WORLD;
      if (radial <= 1 && vertical <= 1) return null;
      // coach the bigger problem, relative to its tolerance
      if (radial >= vertical) {
        return {
          severity: 0.3,
          band: s.worstBand,
          cause: s.signedRadiusDeltaWorld > 0 ? 'tooWide' : 'tooNarrow',
          // `opening` picks the advice: a finger inside widens locally, a solid pot only widens with the outside grip
          data: { pct: Math.round((100 * s.worstBand) / (i.clay.radii.length - 1)), deltaWorld: round2(s.signedRadiusDeltaWorld),
            opening: i.clay.cavityDepthWorld > 0 ? 'yes' : 'no' },
        };
      }
      return {
        severity: 0.3,
        cause: s.signedHeightDeltaWorld < 0 ? 'tooLow' : 'tooHigh',
        data: { deltaWorld: round2(s.signedHeightDeltaWorld) },
      };
    },
  },
];

type EpState = 'inactive' | 'pending' | 'active' | 'clearing';
interface Episode { state: EpState; sinceMs: number; id: string; current: ClayEvent | null; lastEmitMs: number }

export interface RuleOutput {
  events: ClayEvent[];        // transitions from this observation only
  active: ClayEvent[];        // latest state of every running episode
  effects: ClayEffects;       // continuous consequences for the next clay step
}

export class RuleEngine {
  private episodes = new Map<ClayEventType, Episode>();
  private seq = 0;

  /** Leaving the studio or starting over: end every running episode so consumers never see a begin without an end. */
  closeAll(tMs: number): ClayEvent[] {
    const events: ClayEvent[] = [];
    for (const ep of this.episodes.values()) {
      if (ep.current) events.push({ ...ep.current, phase: 'end', tMs });
    }
    this.episodes.clear();
    return events;
  }

  update(i: RuleInput): RuleOutput {
    const t = i.tMs;
    const events: ClayEvent[] = [];
    for (const rule of RULES) {
      let ep = this.episodes.get(rule.type);
      if (!ep) this.episodes.set(rule.type, (ep = { state: 'inactive', sinceMs: t, id: '', current: null, lastEmitMs: 0 }));
      const running = ep.state === 'active' || ep.state === 'clearing';
      const hit = rule.test(i, running);
      const make = (phase: ClayEvent['phase'], h: Hit): ClayEvent => ({
        episodeId: ep!.id, type: rule.type, phase, category: rule.category, tMs: t,
        severity: h.severity, band: h.band, cause: h.cause, data: h.data,
      });

      if (ep.state === 'inactive' && hit) {
        ep.state = 'pending';
        ep.sinceMs = t;
      } else if (ep.state === 'pending' && !hit) {
        ep.state = 'inactive';
      } else if (ep.state === 'active' && !hit) {
        ep.state = 'clearing';
        ep.sinceMs = t;
      } else if (ep.state === 'clearing' && hit) {
        ep.state = 'active'; // came back within RULE_CLEAR_MS: same episode
      }

      if (ep.state === 'pending' && hit && t - ep.sinceMs >= rule.enterMs) {
        ep.state = 'active';
        ep.id = `${rule.type}-${++this.seq}`;
        ep.current = make('begin', hit);
        ep.lastEmitMs = t;
        events.push(ep.current);
      } else if (ep.state === 'active' && hit && ep.current) {
        const prev = ep.current;
        ep.current = make('update', hit);
        if (t - ep.lastEmitMs >= CONFIG.RULE_UPDATE_MS || prev.band !== hit.band || prev.cause !== hit.cause) {
          ep.lastEmitMs = t;
          events.push(ep.current);
        }
      }
      if (ep.state === 'clearing' && t - ep.sinceMs >= rule.clearMs && ep.current) {
        events.push({ ...ep.current, phase: 'end', tMs: t });
        ep.state = 'inactive';
        ep.current = null;
      }
    }

    const active: ClayEvent[] = [];
    for (const ep of this.episodes.values()) if (ep.current) active.push(ep.current);
    const tear = this.episodes.get('tear');
    const wobble = this.episodes.get('wobble');
    const effects: ClayEffects = {
      ...NO_EFFECTS,
      tearBand: tear?.state === 'active' ? tear.current?.band ?? null : null,
      wobbling: wobble?.state === 'active',
    };
    return { events, active, effects };
  }
}
