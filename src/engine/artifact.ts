import { createClay, enforceInvariants } from './clay';
import { CONFIG } from '../config';
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

/**
 * Menu showcase: a finished, glazed vase (foot, belly, neck, flared rim) so the turning wheel reads as motion.
 * A plain lump of clay is rotationally identical at every angle; this one shows its glaze and throwing lines.
 */
export function showcaseArtifact(): DisplayArtifact {
  const points: [number, number][] = [[0, .62], [.18, .98], [.42, 1.08], [.68, .74], [.86, .5], [1, .64]];
  const radii = Array.from({ length: CONFIG.N_BANDS }, (_, j) => {
    const u = j / (CONFIG.N_BANDS - 1); let k = 0;
    while (k < points.length - 2 && u > points[k + 1][0]) k++;
    const [u0, r0] = points[k], [u1, r1] = points[k + 1], t = (u - u0) / (u1 - u0);
    return r0 + (r1 - r0) * (t * t * (3 - 2 * t)); // eased between control points: no kinks in the silhouette
  });
  const clay = enforceInvariants({ ...createClay(), revision: ++revision, radii: Float32Array.from(radii), height: 2.2,
    cavityRadiusWorld: .48, cavityDepthWorld: 1.7, touching: false, activeBand: null });
  return { clay, glazeId: 'amber', customization: emptyCustomization() };
}
