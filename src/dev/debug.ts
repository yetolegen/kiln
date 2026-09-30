// Dev-only numbers panel. Load it only behind `import.meta.env.DEV && ?dev=1` so it never ships.
// With `&rec=1` it also records: keys 0–8 pick the label, R starts/stops, stop downloads the JSON.
import { FrameRecorder, LABELS } from '../tracking/recorder';
import type { EngineSnapshot, HandFeatures } from '../types';

const f = (n: number | null | undefined, d = 2) => (n === null || n === undefined ? '–' : n.toFixed(d));

function hand(label: string, h: HandFeatures | null): string {
  if (!h) return `${label}: –`;
  const e = h.extension;
  return [
    `${label}: #${h.trackId} palm ${f(h.palmPx.x, 0)},${f(h.palmPx.y, 0)}px  world ${f(h.palmWorld.x)},${f(h.palmWorld.y)}`,
    `   size ${f(h.palmSizePx, 0)}/${f(h.referencePalmSizePx, 0)}px  ext i${f(e.index)} m${f(e.middle)} r${f(e.ring)} p${f(e.pinky)}` +
      `  open ${f(h.openness)}  pinch ${f(h.pinchRatio)}${h.pointing ? '  POINT' : ''}`,
    `   v ${f(h.velocityPalmPerS.x)},${f(h.velocityPalmPerS.y)} palm/s${h.velocityValid ? '' : ' (invalid)'}`,
  ].join('\n');
}

export function createDebugPanel(parent: HTMLElement = document.body) {
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;top:8px;left:8px;z-index:9999;margin:0;padding:8px 10px;background:rgba(0,0,0,.75);' +
    'color:#9f9;font:11px/1.35 ui-monospace,monospace;pointer-events:none;white-space:pre';
  parent.append(el);
  let renders = 0, observations = 0, lastFrameId = -1, windowStartMs = -1, fps = 0, obsHz = 0, lastPaintMs = 0;

  const recorder = new URLSearchParams(location.search).get('rec') === '1' ? new FrameRecorder() : null;
  let recording = false;
  const onKey = (e: KeyboardEvent) => {
    if (!recorder) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 0 && n < LABELS.length) recorder.label = LABELS[n];
    if (e.key.toLowerCase() !== 'r') return;
    recording = !recording;
    if (!recording && recorder.count > 0) {
      const url = URL.createObjectURL(new Blob([recorder.flush({ userAgent: navigator.userAgent })], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: `kiln-rec-${Date.now()}.json` });
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  addEventListener('keydown', onKey);

  return {
    update(s: EngineSnapshot, nowMs: number): void {
      renders++;
      if (recording) recorder?.push(s.input, s.gesture);
      if (s.input && s.input.frameId !== lastFrameId) {
        lastFrameId = s.input.frameId;
        observations++;
      }
      if (windowStartMs < 0) windowStartMs = nowMs;
      if (nowMs - windowStartMs >= 1000) {
        fps = (renders * 1000) / (nowMs - windowStartMs);
        obsHz = (observations * 1000) / (nowMs - windowStartMs);
        renders = observations = 0;
        windowStartMs = nowMs;
      }
      if (nowMs - lastPaintMs < 100) return; // repaint text at 10 Hz
      lastPaintMs = nowMs;

      const i = s.input, g = s.gesture, c = s.clay;
      el.textContent = [
        `render ${f(fps, 0)} fps · tracking ${f(obsHz, 0)} Hz · age ${i ? f(nowMs - i.tMs, 0) : '–'} ms`,
        `status ${i?.status ?? '–'} · phase ${s.phase}${s.mode ? `/${s.mode}` : ''} · calib ${f(s.calibrationProgress)}` +
          (s.stats?.similarity ? ` · score ${f(s.stats.similarity.score, 1)}` : ''),
        hand('L', i?.screenLeft ?? null),
        hand('R', i?.screenRight ?? null),
        g
          ? `gesture ${g.gesture} hold ${f(g.holdMs, 0)}ms usable ${g.inputUsable} DEFORMING ${g.deforming}\n` +
            `contact ${g.contact.valid ? 'VALID' : g.contact.reason ?? '–'} band ${g.contact.activeBand ?? '–'} ` +
            `err L${f(g.contact.leftErrorWorld)} R${f(g.contact.rightErrorWorld)}\n` +
            `targetR ${f(g.targetRadiusWorld)} center ${f(g.centerOffsetPalm)} palm speed ${f(g.speedPalmPerS)} palm/s`
          : 'gesture –',
        g ? `motion ${f(g.motionStrength)} nearMiss ${g.nearMiss ? `${g.nearMiss.reason} ${JSON.stringify(g.nearMiss.params)}` : '–'}` : '',
        g ? `action active #${g.activeTrackId ?? '–'} support #${g.supportTrackId ?? '–'} progress ${f(g.activationProgress)}` : '',
        c ? `cavity r ${f(c.cavityRadiusWorld)} depth ${f(c.cavityDepthWorld)}` : '',
        c ? `clay h ${f(c.height)} thick ${f(c.thickness, 3)} wobble ${f(c.wobble)} ` +
          `maxDmg ${f(Math.max(...c.damage))} ${c.collapsed ? `COLLAPSED(${c.collapseCause})` : ''} rev ${c.revision}` : 'clay –',
        `issues ${s.activeIssues.map((e) => e.type).join(', ') || '–'}`,
        s.hint ? `hint ${s.hint.id} ${s.hint.severity} p${s.hint.priority} ${JSON.stringify(s.hint.params)}` : 'hint –',
        recorder
          ? `${recording ? '● REC' : '○ rec (R)'} label [${LABELS.indexOf(recorder.label)}] ${recorder.label} · ` +
            `${recorder.count} frames · 0–8: ${LABELS.join(' ')}`
          : '',
      ].join('\n');
    },
    destroy(): void {
      removeEventListener('keydown', onKey);
      el.remove();
    },
  };
}
