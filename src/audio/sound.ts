import type { AppPhase, EngineSnapshot } from '../types';

let context: AudioContext | null = null;

export function getSoundContext(): AudioContext | null { return context; }

// Called synchronously from Start, before waiting for camera permission.
export function unlockSound(): void {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
    const source = context.createBufferSource();
    source.buffer = context.createBuffer(1, 1, context.sampleRate);
    source.connect(context.destination);
    source.onended = () => source.disconnect();
    source.start();
  } catch { /* Sound is optional. */ }
}

export function createSoundPlayer(getContext: () => AudioContext | null = getSoundContext) {
  let graph: { context: AudioContext; master: GainNode; hum: GainNode; squish: GainNode; kiln: GainNode; sources: AudioScheduledSourceNode[] } | null = null;
  let muted = false;
  let previousPhase: AppPhase | null = null;
  const heard = new Set<string>();
  function prepare(ctx: AudioContext) {
    const master = ctx.createGain(); master.gain.value = muted ? 0 : .6; master.connect(ctx.destination);
    const hum = ctx.createGain(), squish = ctx.createGain(), kiln = ctx.createGain();
    for (const gain of [hum, squish, kiln]) { gain.gain.value = 0; gain.connect(master); }
    const wheel = ctx.createOscillator(); wheel.type = 'sine'; wheel.frequency.value = 72; wheel.connect(hum); wheel.start();
    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const sources: AudioScheduledSourceNode[] = [wheel];
    for (const [gain, frequency] of [[squish, 700], [kiln, 180]] as const) {
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
      source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = frequency;
      source.connect(filter); filter.connect(gain); source.start(); sources.push(source);
    }
    return { context: ctx, master, hum, squish, kiln, sources };
  }
  function tone(frequency: number, duration: number, volume: number, delay = 0): void {
    if (!graph) return;
    const ctx = graph.context, start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = frequency < 100 ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency * .7), start + duration);
    gain.gain.setValueAtTime(volume, start); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(gain); gain.connect(graph.master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration);
  }
  function silence(): void {
    try { if (graph) for (const gain of [graph.hum, graph.squish, graph.kiln]) gain.gain.setTargetAtTime(0, graph.context.currentTime, .03); } catch { /* Optional API. */ }
  }
  return {
    update(snapshot: EngineSnapshot, audible = true): void {
      const arrived = snapshot.phase === 'result' && previousPhase !== 'result';
      previousPhase = snapshot.phase;
      try {
        const ctx = getContext();
        if (!ctx || ctx.state !== 'running') return;
        graph ??= prepare(ctx);
        const active = audible && !muted;
        const working = snapshot.phase === 'studio' || snapshot.phase === 'tutorial';
        const touching = active && working && snapshot.gesture?.inputUsable && snapshot.clay?.touching;
        graph.hum.gain.setTargetAtTime(touching ? .07 : 0, ctx.currentTime, .1);
        graph.squish.gain.setTargetAtTime(touching && snapshot.gesture?.deforming ? .13 : 0, ctx.currentTime, .07);
        graph.kiln.gain.setTargetAtTime(active && snapshot.phase === 'firing' ? .28 : 0, ctx.currentTime, .3);
        for (const event of snapshot.events) {
          if (event.phase !== 'begin' || !['tear', 'collapse'].includes(event.type) || heard.has(event.episodeId)) continue;
          heard.add(event.episodeId);
          if (heard.size > 128) heard.delete(heard.values().next().value!);
          if (active) tone(event.type === 'tear' ? 180 : 58, event.type === 'tear' ? .12 : .45, .22);
        }
        if (active && arrived) { tone(523, .5, .12); tone(659, .6, .1, .12); tone(784, .8, .09, .24); }
      } catch { silence(); }
    },
    setMuted(value: boolean): void {
      muted = value;
      try { if (graph) graph.master.gain.setTargetAtTime(value ? 0 : .6, graph.context.currentTime, .03); } catch { /* Optional API. */ }
    },
    silence,
    destroy(): void { silence(); if (graph) { for (const source of graph.sources) { try { source.stop(); source.disconnect(); } catch { /* Already stopped. */ } } graph.master.disconnect(); graph = null; } },
  };
}
