import { CONFIG } from '../config';
import type { SessionResult } from '../types';

export const GALLERY_KEY = 'kiln.gallery.v1';
export const MAX_POTS = 24;
const ISSUES = ['tear', 'wobble', 'collapse', 'overhang', 'tooThin', 'offWheel', 'handsTooFar', 'oneHand', 'noHands', 'trackingUncertain', 'targetMismatch'];
const GESTURES = ['none', 'oneHand', 'shape', 'pullUp', 'pressDown', 'raise', 'point'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min - 1e-6 && value <= max + 1e-6;
const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 200;
function counts(value: unknown, keys: string[], integers: boolean): boolean {
  return record(value) && Object.entries(value).every(([key, count]) => keys.includes(key) && number(count) && (!integers || Number.isInteger(count)));
}
export function isSessionResult(value: unknown): value is SessionResult {
  if (!record(value) || value.schemaVersion !== 1 || !text(value.id) || !text(value.completedAtIso) || !Number.isFinite(Date.parse(value.completedAtIso)) || !record(value.stats)) return false;
  const stats = value.stats;
  if (stats.sessionId !== value.id || typeof stats.mode !== 'string' || !['free', 'commission', 'tutorial'].includes(stats.mode) || !number(stats.durationMs) || !number(stats.activeMs, 0, stats.durationMs) ||
    !counts(stats.executionEpisodes, ISSUES, true) || !counts(stats.trackingEpisodes, ISSUES, true) || !counts(stats.gestureMs, GESTURES, false)) return false;
  if (stats.targetId !== undefined && !text(stats.targetId)) return false;
  if (stats.similarity !== undefined) {
    const s = stats.similarity;
    if (!record(s) || !number(s.score, 0, 100) || !number(s.radialError) || !number(s.heightError) || !number(s.worstBand, 0, CONFIG.N_BANDS - 1) || !Number.isInteger(s.worstBand) ||
      !number(s.signedRadiusDeltaWorld, -CONFIG.MAX_R * 2, CONFIG.MAX_R * 2) || !number(s.signedHeightDeltaWorld, -CONFIG.MAX_HEIGHT, CONFIG.MAX_HEIGHT)) return false;
  }
  if (stats.mode === 'commission' && (!text(stats.targetId) || !stats.similarity)) return false;
  if (!Array.isArray(value.finalProfile) || value.finalProfile.length !== CONFIG.N_BANDS || !value.finalProfile.every((r) => number(r, CONFIG.MIN_R, CONFIG.MAX_R)) ||
    !Array.isArray(value.damage) || value.damage.length !== CONFIG.N_BANDS || !value.damage.every((d) => number(d, 0, 1))) return false;
  return number(value.height, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT) && number(value.thickness, CONFIG.THICKNESS_FLOOR, Math.min(CONFIG.MAX_THICKNESS, Math.min(...value.finalProfile) - CONFIG.MIN_INNER_RADIUS)) &&
    typeof value.collapsed === 'boolean' && typeof value.glazeId === 'string' && ['amber', 'jade', 'chalk'].includes(value.glazeId);
}

export function createGalleryStore(getStorage: () => Pick<Storage, 'getItem' | 'setItem'> = () => window.localStorage) {
  let pots: SessionResult[] = [];
  let persistent = true;
  const bestScores = new Map<string, number>();
  function rememberBest(pot: SessionResult): void {
    if (pot.stats.mode === 'commission' && pot.stats.targetId && pot.stats.similarity) bestScores.set(pot.stats.targetId, Math.max(bestScores.get(pot.stats.targetId) ?? 0, pot.stats.similarity.score));
  }
  try {
    const raw = getStorage().getItem(GALLERY_KEY);
    if (raw && raw.length < 2_000_000) {
      const parsed: unknown = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : record(parsed) && parsed.schemaVersion === 1 && Array.isArray(parsed.pots) ? parsed.pots : [];
      if (record(parsed) && parsed.schemaVersion === 1 && record(parsed.bestScores)) {
        for (const [target, score] of Object.entries(parsed.bestScores)) if (text(target) && number(score, 0, 100)) bestScores.set(target, score);
      }
      if (items.length) {
        const seen = new Set<string>();
        const valid = items.filter(isSessionResult).filter((pot) => { if (seen.has(pot.id)) return false; seen.add(pot.id); return true; });
        for (const pot of valid) rememberBest(pot);
        pots = valid.slice(0, MAX_POTS);
      }
    }
  } catch { persistent = false; }
  return {
    get persistent(): boolean { return persistent; },
    list(): readonly SessionResult[] { return pots; },
    save(result: SessionResult): boolean {
      if (!isSessionResult(result) || pots.some((pot) => pot.id === result.id)) return false;
      // Freeze the stored representation independently of the live controller snapshot.
      const copy = JSON.parse(JSON.stringify(result)) as SessionResult;
      pots = [copy, ...pots].slice(0, MAX_POTS);
      rememberBest(copy);
      try { getStorage().setItem(GALLERY_KEY, JSON.stringify({ schemaVersion: 1, pots, bestScores: Object.fromEntries(bestScores) })); persistent = true; }
      catch { persistent = false; }
      return true;
    },
    best(targetId: string): number | null {
      return bestScores.get(targetId) ?? null;
    },
  };
}
