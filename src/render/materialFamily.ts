import { DoubleSide, MeshPhysicalMaterial } from 'three';
import { createClaySurface } from './claySurface';

/** One vessel owns the textures; every mesh owns its own highlight-safe material. */
export function createMaterialFamily() {
  const surface = createClaySurface();
  function apply(material: MeshPhysicalMaterial, color: string, gloss = 0, glow = 0) {
    material.color.set(color); material.metalness = 0;
    material.roughness = .88 - gloss * .57;
    material.bumpScale = .006 - gloss * .004;
    material.clearcoat = .02 + gloss * .68;
    material.clearcoatRoughness = .5 - gloss * .3;
    material.emissive.set('#ff640b'); material.emissiveIntensity = glow;
  }
  return {
    apply,
    create(vertexColors = false) {
      const material = new MeshPhysicalMaterial({ side: DoubleSide, vertexColors, map: surface.map, bumpMap: surface.bumpMap,
        roughnessMap: surface.roughnessMap, envMapIntensity: .7 });
      apply(material, '#b9825e'); return material;
    },
    dispose() { surface.dispose(); },
  };
}
export type MaterialFamily = ReturnType<typeof createMaterialFamily>;
