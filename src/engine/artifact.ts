import { createClay } from './clay';
import type { ClayState, SessionResult } from '../types';
import { emptyCustomization, type Customization } from './customization';

/** Renderable work, deliberately independent of active session, score and provenance. */
export interface DisplayArtifact { clay: ClayState; glazeId: string; customization: Customization }
let revision = 0;
export function artifactFromResult(result: SessionResult): DisplayArtifact {
  return { glazeId: result.glazeId, customization: structuredClone(result.customization ?? emptyCustomization()), clay: { ...createClay(),
    revision: ++revision, radii: Float32Array.from(result.finalProfile), damage: Float32Array.from(result.damage),
    height: result.height, thickness: result.thickness, cavityRadiusWorld: result.cavityRadiusWorld,
    cavityDepthWorld: result.cavityDepthWorld, floorThicknessWorld: result.floorThicknessWorld,
    bottomHole: result.bottomHole, collapsed: result.collapsed,
    collapseCause: result.collapseCause ?? (result.bottomHole ? 'bottomHole' : result.collapsed ? 'thinWall' : null),
    touching: false, activeBand: null,
  } };
}
