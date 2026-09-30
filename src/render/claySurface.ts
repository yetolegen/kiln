import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';

/** Baked once, then carried by the rotating mesh. No animated noise or geometry displacement. */
export function createClaySurface(size = 512) {
  const color = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(color.length);
  const roughness = new Uint8Array(color.length);
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x === size - 1 ? 0 : x / (size - 1), v = y === size - 1 ? 0 : y / (size - 1), a = u * tau;
    const broad = Math.sin(a * 3 + Math.sin(v * tau) * .7) * .5 + Math.sin(a * 7 - v * tau * 2) * .25;
    const drag = Math.sin(a * 5 + v * tau * 2 + Math.sin(a * 2) * .6);
    const slip = Math.max(0, drag) ** 6 * (.5 + .5 * Math.sin(v * tau + a));
    const groove = Math.sin(v * tau * 22 + Math.sin(a * 3) * .8 + Math.sin(a * 7) * .25);
    const fine = Math.sin(a * 59 + Math.sin(v * tau * 37) * 2) * Math.sin(v * tau * 71 + Math.cos(a * 31));
    const pores = Math.max(0, Math.sin(a * 83 + v * tau * 47) * Math.cos(a * 37 - v * tau * 89) - .8);
    const shade = .84 + broad * .075 + slip * .095 + groove * .009 + fine * .006;
    const height = .5 + groove * .105 + drag * .025 + fine * .035 - pores * .35;
    const wetness = .76 - slip * .28 + broad * .08 + fine * .025;
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) {
      color[i + c] = Math.round(255 * shade);
      relief[i + c] = Math.round(255 * height);
      roughness[i + c] = Math.round(255 * wetness);
    }
    color[i + 3] = relief[i + 3] = roughness[i + 3] = 255;
  }
  const texture = (data: Uint8Array) => {
    const map = new DataTexture(data, size, size, RGBAFormat);
    map.wrapS = map.wrapT = RepeatWrapping;
    map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.needsUpdate = true;
    return map;
  };
  const map = texture(color), bumpMap = texture(relief), roughnessMap = texture(roughness);
  map.colorSpace = SRGBColorSpace;
  return { map, bumpMap, roughnessMap, dispose() { map.dispose(); bumpMap.dispose(); roughnessMap.dispose(); } };
}
