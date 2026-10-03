import { CONFIG } from '../config';
import { createClay, enforceInvariants } from '../engine/clay';
import type { DisplayArtifact } from '../engine/artifact';
import { customizationFits, emptyCustomization, readCustomization } from '../engine/customization';
import { isMaterial } from '../engine/materials';

export const MAX_SHARE_HASH = 12_000, MAX_SHARE_BYTES = 65_536;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;

/** One whitelisted, independent artifact. No session ids, scores, history or checkpoint/input state. */
export function packArtifact(artifact: DisplayArtifact): unknown {
  const c = artifact.clay, decor = readCustomization(artifact.customization);
  if (!decor) throw Error('Недопустимое оформление.');
  return { v: 1, p: Array.from(c.radii), h: c.height, c: [c.cavityRadiusWorld, c.cavityDepthWorld], d: Array.from(c.damage),
    hole: c.bottomHole, failed: c.collapsed, cause: c.collapseCause, g: artifact.glazeId,
    a: decor.attachments.map((a, i) => ({ ...a, id: `a${i}` })), s: decor.stamps.map((s, i) => ({ ...s, id: `s${i}` })) };
}
export function unpackArtifact(v: unknown): DisplayArtifact | null {
  if (!object(v) || v.v !== 1 || Object.keys(v).some(k => !['v','p','h','c','d','hole','failed','cause','g','a','s'].includes(k)) ||
      !Array.isArray(v.p) || v.p.length !== CONFIG.N_BANDS || !v.p.every(r => num(r, CONFIG.MIN_R, CONFIG.MAX_R)) ||
      !Array.isArray(v.d) || v.d.length !== CONFIG.N_BANDS || !v.d.every(d => num(d, 0, 1)) ||
      !num(v.h, CONFIG.MIN_HEIGHT, CONFIG.MAX_HEIGHT) || !Array.isArray(v.c) || v.c.length !== 2 || !num(v.c[0], 0, CONFIG.MAX_R) || !num(v.c[1], 0, v.h) ||
      typeof v.hole !== 'boolean' || typeof v.failed !== 'boolean' || !isMaterial(v.g) ||
      (v.cause !== null && (typeof v.cause !== 'string' || !['thinWall','tooTall','bottomHole','wallTorn','pancake'].includes(v.cause)))) return null;
  if (!v.failed && v.cause !== null || v.failed && v.cause === null || (v.cause === 'bottomHole') !== v.hole || v.hole && (!v.failed || v.c[1] !== v.h)) return null;
  const clay = { ...createClay(), radii: Float32Array.from(v.p), damage: Float32Array.from(v.d), height: v.h,
    cavityRadiusWorld: v.c[0], cavityDepthWorld: v.c[1], bottomHole: v.hole, collapsed: v.failed,
    collapseCause: v.cause as DisplayArtifact['clay']['collapseCause'], revision: 1 };
  enforceInvariants(clay);
  if (Math.abs(clay.cavityRadiusWorld - v.c[0]) > 1e-5 || Math.abs(clay.cavityDepthWorld - v.c[1]) > 1e-5 ||
      (!v.hole && clay.floorThicknessWorld <= 0)) return null;
  const customization = readCustomization({ ...emptyCustomization(), attachments: v.a, stamps: v.s });
  return customization && customizationFits(customization, clay) ? { clay, customization, glazeId: v.g } : null;
}

async function boundedBytes(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array> {
  const reader = stream.getReader(), chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw Error('Размер данных превышает безопасный предел.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
/** The browser lacks (De)CompressionStream: say so, instead of a raw ReferenceError or a "broken link". */
export class ShareUnsupportedError extends Error {}
function requireStreams(open: boolean): void {
  if (typeof (open ? globalThis.DecompressionStream : globalThis.CompressionStream) !== 'function') {
    throw new ShareUnsupportedError(open
      ? 'Этот браузер не умеет открывать ссылки KILN. Откройте ссылку в свежем Chrome, Edge, Firefox или Safari.'
      : 'Этот браузер не умеет создавать ссылки KILN. Обновите браузер или сохраните изображение PNG.');
  }
}
export async function encodeShare(artifact: DisplayArtifact): Promise<string> {
  requireStreams(false);
  const packed = packArtifact(artifact); if (!unpackArtifact(packed)) throw Error('Данные сосуда не прошли проверку.');
  const bytes = new TextEncoder().encode(JSON.stringify(packed)); if (bytes.length > MAX_SHARE_BYTES) throw Error('Изделие слишком большое для ссылки.');
  const zipped = await boundedBytes(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')), MAX_SHARE_BYTES);
  let binary = ''; for (const b of zipped) binary += String.fromCharCode(b);
  const hash = '#pot=v1.' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  if (hash.length > MAX_SHARE_HASH) throw Error('Ссылка слишком длинная. Уменьшите число деталей или штампов.');
  return hash;
}
export async function decodeShare(hash: string): Promise<DisplayArtifact> {
  if (hash.length > MAX_SHARE_HASH || !/^#pot=v1\.[A-Za-z0-9_-]+$/.test(hash)) throw Error('Неизвестная версия или повреждённая ссылка.');
  requireStreams(true);
  const encoded = hash.slice(8).replace(/-/g, '+').replace(/_/g, '/');
  let compressed: Uint8Array;
  try { compressed = Uint8Array.from(atob(encoded), c => c.charCodeAt(0)); } catch { throw Error('Повреждённая ссылка.'); }
  const bytes = await boundedBytes(new Blob([compressed as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip')), MAX_SHARE_BYTES);
  const artifact = unpackArtifact(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
  if (!artifact) throw Error('Ссылка содержит недопустимую форму или оформление.');
  return artifact;
}
