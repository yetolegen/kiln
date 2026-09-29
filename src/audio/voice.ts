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
