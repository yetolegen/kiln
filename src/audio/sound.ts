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
