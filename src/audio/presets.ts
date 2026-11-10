export interface PadPreset {
  id: string;
  name: string;
  description: string;
  /** Oscillator layers. Each layer is played on every note of the voicing. */
  layers: { type: OscillatorType; gain: number; detune: number; octave?: number }[];
  /** Base low-pass cutoff in Hz. */
  cutoff: number;
  /** Slow filter movement depth in Hz (0 = static). */
  motion: number;
  /** Seconds the pad takes to swell in. */
  attack: number;
}

export const PRESETS: PadPreset[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Quente e aberto, para momentos de adoração.',
    layers: [
      { type: 'sawtooth', gain: 0.35, detune: -7 },
      { type: 'sawtooth', gain: 0.35, detune: 7 },
      { type: 'sine', gain: 0.5, detune: 0, octave: -1 },
    ],
    cutoff: 900,
    motion: 300,
    attack: 3,
  },
  {
    id: 'nevoa',
    name: 'Névoa',
    description: 'Suave e escuro, quase só textura.',
    layers: [
      { type: 'triangle', gain: 0.5, detune: -4 },
      { type: 'triangle', gain: 0.5, detune: 4 },
    ],
    cutoff: 600,
    motion: 150,
    attack: 4,
  },
  {
    id: 'horizonte',
    name: 'Horizonte',
    description: 'Brilhante, com movimento lento.',
    layers: [
      { type: 'sawtooth', gain: 0.25, detune: -12 },
      { type: 'sawtooth', gain: 0.25, detune: 0 },
      { type: 'sawtooth', gain: 0.25, detune: 12 },
      { type: 'sine', gain: 0.3, detune: 0, octave: 1 },
    ],
    cutoff: 1800,
    motion: 900,
    attack: 2.5,
  },
  {
    id: 'calmaria',
    name: 'Calmaria',
    description: 'Puro e limpo, só senos.',
    layers: [
      { type: 'sine', gain: 0.6, detune: -3 },
      { type: 'sine', gain: 0.6, detune: 3 },
      { type: 'sine', gain: 0.25, detune: 0, octave: 1 },
    ],
    cutoff: 3000,
    motion: 0,
    attack: 3,
  },
];

export function getPreset(id: string): PadPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
