export interface PadPreset {
  id: string;
  name: string;
  description: string;
  tags: string[];
  /** Two colours for the card artwork gradient. */
  colors: [string, string];
  /** Oscillator layers. Each layer is played on every note of the voicing. */
  layers: { type: OscillatorType; gain: number; detune: number; octave?: number }[];
  /** Base low-pass cutoff in Hz. */
  cutoff: number;
  /** Slow filter movement depth in Hz (0 = static). */
  motion: number;
  /** Seconds the pad takes to swell in. */
  attack: number;
  /** Plays only part of the voicing (e.g. only high notes). */
  register?: 'full' | 'low' | 'high';
}

export const PRESETS: PadPreset[] = [
  {
    id: 'aurora', name: 'Aurora', description: 'Quente e aberto, a base para quase todo momento.',
    tags: ['quente', 'base'], colors: ['#f2b544', '#c2410c'],
    layers: [
      { type: 'sawtooth', gain: 0.35, detune: -7 },
      { type: 'sawtooth', gain: 0.35, detune: 7 },
      { type: 'sine', gain: 0.5, detune: 0, octave: -1 },
    ],
    cutoff: 900, motion: 300, attack: 3,
  },
  {
    id: 'nevoa', name: 'Névoa', description: 'Suave e escuro, quase só textura de fundo.',
    tags: ['suave', 'escuro'], colors: ['#475569', '#0f172a'],
    layers: [
      { type: 'triangle', gain: 0.5, detune: -4 },
      { type: 'triangle', gain: 0.5, detune: 4 },
    ],
    cutoff: 600, motion: 150, attack: 4,
  },
  {
    id: 'horizonte', name: 'Horizonte', description: 'Brilhante, com movimento lento no filtro.',
    tags: ['brilhante', 'movimento'], colors: ['#38bdf8', '#7c3aed'],
    layers: [
      { type: 'sawtooth', gain: 0.25, detune: -12 },
      { type: 'sawtooth', gain: 0.25, detune: 0 },
      { type: 'sawtooth', gain: 0.25, detune: 12 },
      { type: 'sine', gain: 0.3, detune: 0, octave: 1 },
    ],
    cutoff: 1800, motion: 900, attack: 2.5,
  },
  {
    id: 'calmaria', name: 'Calmaria', description: 'Puro e limpo, feito só de senos.',
    tags: ['puro', 'leve'], colors: ['#a7f3d0', '#0d9488'],
    layers: [
      { type: 'sine', gain: 0.6, detune: -3 },
      { type: 'sine', gain: 0.6, detune: 3 },
      { type: 'sine', gain: 0.25, detune: 0, octave: 1 },
    ],
    cutoff: 3000, motion: 0, attack: 3,
  },
  {
    id: 'alicerce', name: 'Alicerce', description: 'Só o grave, para dar chão ao som da banda.',
    tags: ['grave', 'base'], colors: ['#78350f', '#1c1917'],
    layers: [
      { type: 'sine', gain: 0.8, detune: 0 },
      { type: 'triangle', gain: 0.3, detune: 2, octave: -1 },
    ],
    cutoff: 400, motion: 0, attack: 3.5, register: 'low',
  },
  {
    id: 'brisa', name: 'Brisa', description: 'Agudos que brilham por cima, para camadas.',
    tags: ['agudo', 'camada'], colors: ['#fde68a', '#f472b6'],
    layers: [
      { type: 'triangle', gain: 0.4, detune: -9, octave: 1 },
      { type: 'triangle', gain: 0.4, detune: 9, octave: 1 },
    ],
    cutoff: 4000, motion: 1200, attack: 4, register: 'high',
  },
  {
    id: 'firmamento', name: 'Firmamento', description: 'Largo e cheio, para a abertura do culto.',
    tags: ['largo', 'intenso'], colors: ['#6366f1', '#be185d'],
    layers: [
      { type: 'sawtooth', gain: 0.3, detune: -15 },
      { type: 'sawtooth', gain: 0.3, detune: 15 },
      { type: 'square', gain: 0.12, detune: 0, octave: -1 },
      { type: 'sine', gain: 0.3, detune: 0, octave: 1 },
    ],
    cutoff: 1400, motion: 600, attack: 3,
  },
  {
    id: 'orvalho', name: 'Orvalho', description: 'Delicado e respirando, para oração.',
    tags: ['suave', 'oração'], colors: ['#c4b5fd', '#1e3a8a'],
    layers: [
      { type: 'sine', gain: 0.5, detune: -6 },
      { type: 'triangle', gain: 0.35, detune: 6 },
    ],
    cutoff: 1500, motion: 700, attack: 5,
  },
];

export function getPreset(id: string): PadPreset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}
