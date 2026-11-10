import { Key, midiToFreq, padVoicing } from '../lib/music';
import { PadPreset } from './presets';

interface Voice {
  out: GainNode;
  stop: (when: number) => void;
}

function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

/**
 * Synthesised pad engine. One voice per key; changing key crossfades the old
 * voice out while the new one swells in.
 */
export class PadEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private tone!: BiquadFilterNode;
  private current: Voice | null = null;

  volume = 0.7;
  reverb = 0.5;
  brightness = 0.5; // 0..1, scales filter cutoff
  crossfade = 3; // seconds

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.tone = ctx.createBiquadFilter();
    this.tone.type = 'highshelf';
    this.tone.frequency.value = 3000;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = makeImpulse(ctx, 5, 2.5);
    this.tone.connect(this.dry).connect(this.master);
    this.tone.connect(conv).connect(this.wet).connect(this.master);
    this.master.connect(ctx.destination);
    this.applyMix();
    return ctx;
  }

  private applyMix() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volume, t, 0.05);
    this.dry.gain.setTargetAtTime(1 - this.reverb * 0.6, t, 0.05);
    this.wet.gain.setTargetAtTime(this.reverb * 1.2, t, 0.05);
    this.tone.gain.setTargetAtTime((this.brightness - 0.5) * 18, t, 0.05);
  }

  setVolume(v: number) { this.volume = v; this.applyMix(); }
  setReverb(v: number) { this.reverb = v; this.applyMix(); }
  setBrightness(v: number) { this.brightness = v; this.applyMix(); }
  setCrossfade(s: number) { this.crossfade = s; }

  get playing(): boolean { return this.current !== null; }

  private buildVoice(ctx: AudioContext, key: Key, preset: PadPreset): Voice {
    const out = ctx.createGain();
    out.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.cutoff;
    filter.Q.value = 0.7;
    filter.connect(out).connect(this.tone);

    const sources: AudioScheduledSourceNode[] = [];
    if (preset.motion > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07;
      const depth = ctx.createGain();
      depth.gain.value = preset.motion;
      lfo.connect(depth).connect(filter.frequency);
      lfo.start();
      sources.push(lfo);
    }

    const notes = padVoicing(key);
    const norm = 1 / (notes.length * preset.layers.length);
    for (const note of notes) {
      for (const layer of preset.layers) {
        const osc = ctx.createOscillator();
        osc.type = layer.type;
        osc.frequency.value = midiToFreq(note + 12 * (layer.octave ?? 0));
        osc.detune.value = layer.detune;
        const g = ctx.createGain();
        g.gain.value = layer.gain * norm * 2.5;
        osc.connect(g).connect(filter);
        osc.start();
        sources.push(osc);
      }
    }

    return {
      out,
      stop: (when: number) => {
        for (const s of sources) s.stop(when);
        window.setTimeout(() => out.disconnect(), (when - ctx.currentTime) * 1000 + 100);
      },
    };
  }

  /** Start or crossfade to a key. */
  async play(key: Key, preset: PadPreset) {
    const ctx = this.ensure();
    if (ctx.state !== 'running') await ctx.resume();
    const now = ctx.currentTime;
    const fade = Math.max(0.1, this.current ? this.crossfade : preset.attack);

    const next = this.buildVoice(ctx, key, preset);
    next.out.gain.setValueAtTime(0, now);
    next.out.gain.linearRampToValueAtTime(1, now + fade);

    this.fadeOutCurrent(fade);
    this.current = next;
  }

  /** Fade out and stop. */
  stop(fadeSeconds = 2) {
    this.fadeOutCurrent(fadeSeconds);
    this.current = null;
  }

  private fadeOutCurrent(seconds: number) {
    if (!this.ctx || !this.current) return;
    const now = this.ctx.currentTime;
    const g = this.current.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + seconds);
    this.current.stop(now + seconds + 0.05);
  }
}
