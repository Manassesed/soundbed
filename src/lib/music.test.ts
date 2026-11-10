import { describe, expect, it } from 'vitest';
import { ALL_KEYS, keyId, midiToFreq, padVoicing, parseKeyId } from './music';

describe('music', () => {
  it('has 24 unique keys', () => {
    expect(ALL_KEYS).toHaveLength(24);
    expect(new Set(ALL_KEYS.map(keyId)).size).toBe(24);
  });
  it('round-trips key ids', () => {
    for (const k of ALL_KEYS) expect(parseKeyId(keyId(k))).toEqual(k);
    expect(parseKeyId('H')).toBeNull();
  });
  it('computes A4 = 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440);
  });
  it('uses a major or minor third in the voicing', () => {
    const [root, , , maj] = padVoicing({ root: 0, mode: 'major' });
    const [, , , min] = padVoicing({ root: 0, mode: 'minor' });
    expect(maj - root).toBe(16);
    expect(min - root).toBe(15);
  });
});
