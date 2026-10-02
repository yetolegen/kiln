import { readCheckpoint, type Checkpoint } from '../engine/checkpoint';

export const CHECKPOINT_KEY = 'kiln.checkpoint.v1';
export function createCheckpointStore(storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => localStorage) {
  let current: Checkpoint | null = null, persistent = true, protectedData = false;
  try {
    const raw = storage().getItem(CHECKPOINT_KEY);
    if (raw) {
      if (raw.length > 100_000) protectedData = true;
      else { current = readCheckpoint(JSON.parse(raw)); protectedData = !current; }
    }
  } catch { persistent = false; protectedData = true; }
  return {
    get persistent() { return persistent && !protectedData; },
    get available() { return current !== null; },
    load(): Checkpoint | null { return current ? structuredClone(current) : null; },
    save(value: unknown): boolean {
      const checked = readCheckpoint(value); if (!checked) return false;
      current = checked;
      // Preserve an unrecognized/future record; this session still has a memory checkpoint.
      if (!protectedData) try { storage().setItem(CHECKPOINT_KEY, JSON.stringify(checked)); persistent = true; }
      catch { persistent = false; }
      return true;
    },
  };
}
