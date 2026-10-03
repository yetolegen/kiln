import { CONFIG } from '../config';
import type { SessionMode, SessionStats } from '../types';
import { cloneClay, enforceInvariants, type ClayModel } from './clay';
import { customizationFits, emptyCustomization, readCustomization, type Customization } from './customization';
import { isMaterial } from './materials';

export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export const finite = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
export const terminalClay = (c: Pick<ClayModel, 'collapsed' | 'collapseCause'>) => c.collapsed && ['bottomHole', 'wallTorn', 'pancake'].includes(c.collapseCause ?? '');
export interface Checkpoint {
  version: 1;
  mode: Exclude<SessionMode, 'tutorial'>;
  stage: 'studio' | 'glaze';
  targetId?: string;
  glazeId: string | null;
  clay: Omit<ClayModel, 'radii' | 'damage'> & { radii: number[]; damage: number[] };
  stats: SessionStats;
  customization: Customization;
}

/** Validate the complete DTO before constructing any live state; never silently repair a save. */
export function readCheckpoint(value: unknown): Checkpoint | null {
  if (!record(value) || value.version !== 1 || typeof value.mode !== 'string' || !['free', 'commission'].includes(value.mode) ||
      typeof value.stage !== 'string' || !['studio', 'glaze'].includes(value.stage) || !record(value.clay) || !validStats(value.stats)) return null;
  if (value.glazeId !== null && !isMaterial(value.glazeId)) return null;
  if (value.mode === 'commission' ? value.targetId !== 'vase@1' : value.targetId !== undefined) return null;
  const c = value.clay;
  if (!Array.isArray(c.radii) || c.radii.length !== CONFIG.N_BANDS || !c.radii.every(r => finite(r, CONFIG.MIN_R, CONFIG.MAX_R)) ||
      !Array.isArray(c.damage) || c.damage.length !== CONFIG.N_BANDS || !c.damage.every(d => finite(d, 0, 1)) ||
      !finite(c.height, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT) || !finite(c.wobble, 0, 1) || !finite(c.recoveryMs, 0, 1e9) ||
      !finite(c.revision, 0, Number.MAX_SAFE_INTEGER) || !Number.isInteger(c.revision) ||
      !finite(c.safeIndentDepthWorld, .01, CONFIG.MAX_HEIGHT) || !finite(c.maxHeightWorld, .01, CONFIG.MAX_HEIGHT) ||
      typeof c.collapsed !== 'boolean' || typeof c.bottomHole !== 'boolean' || typeof c.touching !== 'boolean' ||
      (c.activeBand !== null && (!finite(c.activeBand, 0, CONFIG.N_BANDS - 1) || !Number.isInteger(c.activeBand))) ||
      (c.collapseCause !== null && (typeof c.collapseCause !== 'string' || !['thinWall', 'tooTall', 'bottomHole', 'wallTorn', 'pancake'].includes(c.collapseCause))) ||
      (!c.collapsed && c.collapseCause !== null) || (c.collapsed && c.collapseCause === null)) return null;
  for (const key of ['thickness', 'cavityRadiusWorld', 'cavityDepthWorld', 'floorThicknessWorld'] as const) {
    if (!finite(c[key], 0, CONFIG.MAX_HEIGHT)) return null;
  }
  const clay = { ...c, radii: Float32Array.from(c.radii), damage: Float32Array.from(c.damage) } as ClayModel;
  if (terminalClay(clay) || clay.bottomHole) return null;
  const derived = enforceInvariants(cloneClay(clay));
  for (const key of ['height', 'thickness', 'cavityRadiusWorld', 'cavityDepthWorld', 'floorThicknessWorld'] as const) {
    if (Math.abs(derived[key] - clay[key]) > 1e-5) return null;
  }
  if (value.stats.mode !== value.mode) return null;
  const customization = value.customization === undefined ? emptyCustomization() : readCustomization(value.customization);
  if (!customization || !customizationFits(customization, clay) || (value.stage === 'studio' && (customization.attachments.length || customization.stamps.length || customization.handles.length))) return null;
  // Whitelist, then copy: unknown properties never reach the engine.
  return {
    version: 1, mode: value.mode as Checkpoint['mode'], stage: value.stage as Checkpoint['stage'],
    customization,
    ...(value.targetId ? { targetId: String(value.targetId) } : {}), glazeId: value.glazeId as string | null,
    clay: { radii: Array.from(clay.radii), damage: Array.from(clay.damage), height: clay.height, thickness: clay.thickness,
      cavityRadiusWorld: clay.cavityRadiusWorld, cavityDepthWorld: clay.cavityDepthWorld, floorThicknessWorld: clay.floorThicknessWorld,
      bottomHole: clay.bottomHole, safeIndentDepthWorld: clay.safeIndentDepthWorld, maxHeightWorld: clay.maxHeightWorld,
      wobble: clay.wobble, collapsed: clay.collapsed, collapseCause: clay.collapseCause, recoveryMs: clay.recoveryMs,
      revision: clay.revision, touching: false, activeBand: null },
    stats: { sessionId: value.stats.sessionId, mode: value.stats.mode, durationMs: value.stats.durationMs, activeMs: value.stats.activeMs,
      executionEpisodes: { ...value.stats.executionEpisodes }, trackingEpisodes: { ...value.stats.trackingEpisodes },
      gestureMs: { ...value.stats.gestureMs }, restores: value.stats.restores ?? 0,
      ...(value.targetId ? { targetId: String(value.targetId) } : {}) },
  };
}

const issues = ['tear', 'wobble', 'collapse', 'overhang', 'tooThin', 'thinFloor', 'overStretch', 'tooFlat', 'offWheel', 'handsTooFar', 'oneHand', 'noHands', 'trackingUncertain', 'targetMismatch'];
const gestures = ['none', 'oneHand', 'shape', 'pullUp', 'indent', 'open', 'compressRim', 'widen', 'raise', 'point'];
function counts(v: unknown, keys: string[], integer: boolean): boolean {
  return record(v) && Object.entries(v).every(([k, n]) => keys.includes(k) && finite(n, 0, 1e12) && (!integer || Number.isInteger(n)));
}
function validStats(v: unknown): v is SessionStats {
  return record(v) && typeof v.sessionId === 'string' && v.sessionId.length > 0 && v.sessionId.length <= 200 &&
    typeof v.mode === 'string' && ['free', 'commission'].includes(v.mode) && finite(v.durationMs, 0, 1e12) && finite(v.activeMs, 0, v.durationMs) &&
    counts(v.executionEpisodes, issues, true) && counts(v.trackingEpisodes, issues, true) && counts(v.gestureMs, gestures, false) &&
    (v.restores === undefined || (finite(v.restores, 0, 1e9) && Number.isInteger(v.restores)));
}
