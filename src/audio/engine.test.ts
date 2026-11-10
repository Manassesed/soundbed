import { describe, expect, it } from 'vitest';
import { voicingFor } from './engine';
import { PRESETS, getPreset } from './presets';

describe('presets', () => {
  it('have unique ids and fall back to the first', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
    expect(getPreset('nope').id).toBe(PRESETS[0].id);
  });
  it('split the voicing by register', () => {
    const key = { root: 7, mode: 'major' as const };
    expect(voicingFor(key, getPreset('aurora'))).toHaveLength(5);
    expect(voicingFor(key, getPreset('alicerce'))).toHaveLength(2);
    expect(voicingFor(key, getPreset('brisa'))).toHaveLength(3);
  });
});
