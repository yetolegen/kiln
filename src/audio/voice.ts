import type { Hint } from '../types';
import { hintText } from '../i18n';

export function unlockVoice(): void {
  try {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance('Готово');
    utterance.lang = 'ru-RU';
    utterance.voice = synth.getVoices().find((voice) => /^ru\b/i.test(voice.lang)) ?? null;
    utterance.volume = 0;
    synth.cancel();
    synth.speak(utterance);
  } catch { /* Text remains available without speech. */ }
}

export function createVoicePlayer(
  synth: SpeechSynthesis | undefined = typeof window === 'undefined' ? undefined : window.speechSynthesis,
  makeUtterance: (text: string) => SpeechSynthesisUtterance = (text) => new SpeechSynthesisUtterance(text),
) {
  let voice: SpeechSynthesisVoice | null = null;
  let lastHint: Hint | null = null;
  let muted = false;
  const refresh = () => {
    try { voice = synth?.getVoices().find((item) => /^ru(?:-|_)/i.test(item.lang) || item.lang === 'ru') ?? null; }
    catch { voice = null; }
  };
  const stop = () => { try { synth?.cancel(); } catch { /* Optional API. */ } };
  refresh();
  try { synth?.addEventListener('voiceschanged', refresh); } catch { /* Older browsers can still use initial voices. */ }
  return {
    update(hint: Hint | null): void {
      const changed = hint !== lastHint;
      lastHint = hint;
      if (!changed || !hint?.speak || muted || !voice || !synth) return;
      try {
        const utterance = makeUtterance(hintText(hint));
        utterance.voice = voice; utterance.lang = 'ru-RU'; utterance.rate = 1;
        synth.cancel(); synth.speak(utterance);
      } catch { /* The text hint remains visible. */ }
    },
    setMuted(value: boolean): void { muted = value; if (muted) stop(); },
    stop,
    destroy(): void { stop(); try { synth?.removeEventListener('voiceschanged', refresh); } catch { /* Optional API. */ } },
  };
}
