import { DoubleSide, MeshPhysicalMaterial } from 'three';
import { createClaySurface } from './claySurface';

/** One vessel owns the textures; every mesh owns its own highlight-safe material. */
export function createMaterialFamily() {
  const surface = createClaySurface();
  function apply(material: MeshPhysicalMaterial, color: string, gloss = 0, glow = 0) {
    // Only reinterpret the existing unglazed display color; glaze catalog/data stay untouched.
    const raw = color === '#b9825e';
    material.color.set(raw ? '#b05d3a' : color); material.metalness = 0;
    material.map = raw ? surface.map : surface.glazeMap;
    material.roughness = raw ? .96 : .90 - gloss * .59;
    material.bumpScale = raw ? .013 : .006 - gloss * .004;
    material.clearcoat = raw ? 0 : .02 + gloss * .68;
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
