import { expect, it, vi } from 'vitest';
import { createVoicePlayer } from './voice';
import type { Hint } from '../types';
import { hintText } from '../i18n';

const hint = (): Hint => ({ id: 'tear', params: {}, priority: 50, expiresAtMs: 4000, severity: 'warn', speak: true });
function fixture() {
  let voices: SpeechSynthesisVoice[] = [];
  let change = () => {};
  const synth = { getVoices: () => voices, cancel: vi.fn(), speak: vi.fn(), addEventListener: (_: string, fn: () => void) => { change = fn; }, removeEventListener: vi.fn() };
  const voice = createVoicePlayer(synth as unknown as SpeechSynthesis, (text) => ({ text }) as SpeechSynthesisUtterance);
  return { voice, synth, load: () => { voices = [{ lang: 'ru-RU' } as SpeechSynthesisVoice]; change(); } };
}
it('waits for a Russian voice, deduplicates by identity, and replaces speech', () => {
  const f = fixture();
  f.voice.update(hint()); expect(f.synth.speak).not.toHaveBeenCalled();
  f.load(); const first = hint(); f.voice.update(first); f.voice.update(first);
  expect(f.synth.speak).toHaveBeenCalledTimes(1);
  f.voice.update(hint()); expect(f.synth.speak).toHaveBeenCalledTimes(2);
  expect(f.synth.cancel).toHaveBeenCalledTimes(2);
  f.voice.setMuted(true); f.voice.update(hint()); expect(f.synth.speak).toHaveBeenCalledTimes(2);
  f.voice.destroy(); expect(f.synth.removeEventListener).toHaveBeenCalled();
});
it('survives unavailable and throwing speech APIs', () => {
  expect(() => createVoicePlayer(undefined).update(hint())).not.toThrow();
  const f = fixture(); f.load(); f.synth.speak.mockImplementation(() => { throw new Error('blocked'); });
  expect(() => f.voice.update(hint())).not.toThrow();
});
it('speaks the same v4 technique and tracking feedback as the banner, once per hint', () => {
  const f = fixture(); f.load();
  for (const id of ['noSupport', 'liftTooFast', 'thumbNotOnTop', 'pinchFirst', 'spreadTooFast', 'trackingUncertain', 'thinFloor', 'overStretch', 'tooFlat'] as const) {
    const message: Hint = { ...hint(), id, params: { side: 'right', interrupted: 'true' } };
    f.voice.update(message); f.voice.update(message);
    expect(f.synth.speak).toHaveBeenLastCalledWith(expect.objectContaining({ text: hintText(message) }));
  }
  expect(f.synth.speak).toHaveBeenCalledTimes(9);
});

it.each(['bottomHole', 'wallTorn', 'pancake'])('explains permanent %s failure with restart instead of recovery', (cause) => {
  const message = hintText({ ...hint(), id: 'collapse', params: { cause } });
  expect(message).toContain('Начать сначала'); expect(message).not.toContain('восстановления');
});
