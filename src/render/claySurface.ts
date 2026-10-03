import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';

/** Baked once, then carried by the rotating mesh. No animated noise or geometry displacement. */
export function createClaySurface(size = 512) {
  const color = new Uint8Array(size * size * 4);
  const glaze = new Uint8Array(color.length);
  const relief = new Uint8Array(color.length);
  const roughness = new Uint8Array(color.length);
  const tau = Math.PI * 2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x === size - 1 ? 0 : x / (size - 1), v = y === size - 1 ? 0 : y / (size - 1), a = u * tau;
    const broad = Math.sin(a * 3 + Math.sin(v * tau) * .7) * .5 + Math.sin(a * 7 - v * tau * 2) * .25;
    const turn = v * tau * 28 + Math.sin(v * tau * 3) * .45 + Math.sin(v * tau * 7) * .2 + Math.sin(a * 3) * .28 + Math.sin(a * 7 + v * tau * 2) * .12;
    const groove = Math.sin(turn);
    const broken = .35 + .65 * Math.max(0, Math.sin(a * 9 + v * tau * 7));
    const furrow = Math.max(0, Math.cos(turn + .4)) ** 12 * broken;
    const slip = Math.max(0, Math.sin(turn - .75)) ** 8 * (.5 + .5 * Math.sin(a * 5 - v * tau * 3));
    const fine = Math.sin(a * 59 + Math.sin(v * tau * 37) * 2) * Math.sin(v * tau * 71 + Math.cos(a * 31));
    const pores = Math.max(0, Math.sin(a * 83 + v * tau * 47) * Math.cos(a * 37 - v * tau * 89) - .8);
    const shade = .84 + broad * .085 + slip * .12 + groove * .025 - furrow * .17 + fine * .008;
    const height = .5 + groove * .12 - furrow * .06 + fine * .018 - pores * .20;
    const wetness = .94 - slip * .09 + broad * .02 + fine * .012;
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) {
      color[i + c] = Math.round(255 * Math.max(0, Math.min(1, shade)));
      // Fired glaze keeps its authoritative color with a quieter version of the same wheel marks.
      glaze[i + c] = Math.round(255 * (.90 + (shade - .84) * .38));
      relief[i + c] = Math.round(255 * height);
      roughness[i + c] = Math.round(255 * wetness);
    }
    color[i + 3] = glaze[i + 3] = relief[i + 3] = roughness[i + 3] = 255;
  }
  const texture = (data: Uint8Array) => {
    const map = new DataTexture(data, size, size, RGBAFormat);
    map.wrapS = map.wrapT = RepeatWrapping;
    map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter;
    map.generateMipmaps = true; map.needsUpdate = true;
    return map;
  };
  const map = texture(color), glazeMap = texture(glaze), bumpMap = texture(relief), roughnessMap = texture(roughness);
  map.colorSpace = glazeMap.colorSpace = SRGBColorSpace;
  return { map, glazeMap, bumpMap, roughnessMap, dispose() { map.dispose(); glazeMap.dispose(); bumpMap.dispose(); roughnessMap.dispose(); } };
}
