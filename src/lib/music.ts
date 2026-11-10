export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type NoteName = (typeof NOTE_NAMES)[number];
export type Mode = 'major' | 'minor';

export interface Key {
  root: number; // 0..11 (C = 0)
  mode: Mode;
}

export const ALL_KEYS: Key[] = (['major', 'minor'] as Mode[]).flatMap((mode) =>
  NOTE_NAMES.map((_, root) => ({ root, mode })),
);

export function keyId(key: Key): string {
  return `${NOTE_NAMES[key.root]}${key.mode === 'minor' ? 'm' : ''}`;
}

export function parseKeyId(id: string): Key | null {
  const m = /^([A-G]#?)(m?)$/.exec(id);
  if (!m) return null;
  const root = NOTE_NAMES.indexOf(m[1] as NoteName);
  if (root < 0) return null;
  return { root, mode: m[2] ? 'minor' : 'major' };
}

/** Frequency of a MIDI note (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Notes (MIDI) that make up a pad voicing for the key.
 * Root low, fifth, octave, third (major/minor) and a high fifth, kept in a
 * warm register (root between C2 and B2).
 */
export function padVoicing(key: Key): number[] {
  const base = 36 + key.root; // C2..B2
  const third = key.mode === 'major' ? 4 : 3;
  return [base, base + 7, base + 12, base + 12 + third, base + 19];
}
