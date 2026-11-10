import { Key, midiToFreq, padVoicing } from '../lib/music';
import { PadPreset } from './presets';

interface Voice {
  out: GainNode;
  stop: (when: number) => void;
}

interface Layer {
  preset: PadPreset;
  bus: GainNode; // per-layer volume
  voice: Voice | null;
}

function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

export function voicingFor(key: Key, preset: PadPreset): number[] {
  const notes = padVoicing(key);
  if (preset.register === 'low') return notes.slice(0, 2);
  if (preset.register === 'high') return notes.slice(2);
  return notes;
}

/**
 * Synthesised pad engine with several simultaneous layers (one per preset).
 * Changing key crossfades every layer from the old voicing to the new one.
 */
export class PadEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private tone!: BiquadFilterNode;
  private layers = new Map<string, Layer>();
  private key: Key | null = null;

  volume = 0.7;
  reverb = 0.5;
  brightness = 0.5;
  crossfade = 3;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
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

  get playing(): boolean { return this.key !== null; }

  private buildVoice(ctx: AudioContext, key: Key, preset: PadPreset, dest: AudioNode): Voice {
    const out = ctx.createGain();
    out.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset.cutoff;
    filter.Q.value = 0.7;
    filter.connect(out).connect(dest);

    const sources: AudioScheduledSourceNode[] = [];
    if (preset.motion > 0) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const depth = ctx.createGain();
      depth.gain.value = preset.motion;
      lfo.connect(depth).connect(filter.frequency);
      lfo.start();
      sources.push(lfo);
    }

    const notes = voicingFor(key, preset);
    const norm = 1 / (5 * preset.layers.length);
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

  private fadeIn(layer: Layer, seconds: number) {
    const ctx = this.ctx!;
    if (!this.key) return;
    const v = this.buildVoice(ctx, this.key, layer.preset, layer.bus);
    const now = ctx.currentTime;
    v.out.gain.setValueAtTime(0, now);
    v.out.gain.linearRampToValueAtTime(1, now + Math.max(0.1, seconds));
    layer.voice = v;
  }

  private fadeOut(layer: Layer, seconds: number) {
    if (!this.ctx || !layer.voice) return;
    const now = this.ctx.currentTime;
    const g = layer.voice.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + Math.max(0.1, seconds));
    layer.voice.stop(now + seconds + 0.05);
    layer.voice = null;
  }

  /** Make the set of layers match `wanted` (preset + volume). */
  setLayers(wanted: { preset: PadPreset; volume: number }[]) {
    const ctx = this.ensure();
    const ids = new Set(wanted.map((w) => w.preset.id));
    for (const [id, layer] of this.layers) {
      if (!ids.has(id)) {
        this.fadeOut(layer, 1.5);
        const bus = layer.bus;
        window.setTimeout(() => bus.disconnect(), 2000);
        this.layers.delete(id);
      }
    }
    for (const w of wanted) {
      let layer = this.layers.get(w.preset.id);
      if (!layer) {
        const bus = ctx.createGain();
        bus.connect(this.tone);
        layer = { preset: w.preset, bus, voice: null };
        this.layers.set(w.preset.id, layer);
        if (this.key) this.fadeIn(layer, w.preset.attack);
      }
      layer.bus.gain.setTargetAtTime(w.volume, ctx.currentTime, 0.05);
    }
  }

  /** Start or crossfade every layer to a key. */
  async play(key: Key) {
    const ctx = this.ensure();
    if (ctx.state !== 'running') await ctx.resume();
    const first = !this.key;
    this.key = key;
    for (const layer of this.layers.values()) {
      const fade = first ? layer.preset.attack : this.crossfade;
      this.fadeOut(layer, fade);
      this.fadeIn(layer, fade);
    }
  }

  stop(fadeSeconds = 2) {
    for (const layer of this.layers.values()) this.fadeOut(layer, fadeSeconds);
    this.key = null;
  }

  /** Short preview of a single preset, independent of the main layers. */
  async preview(key: Key, preset: PadPreset, seconds = 8): Promise<() => void> {
    const ctx = this.ensure();
    if (ctx.state !== 'running') await ctx.resume();
    const v = this.buildVoice(ctx, key, preset, this.tone);
    const now = ctx.currentTime;
    v.out.gain.setValueAtTime(0, now);
    v.out.gain.linearRampToValueAtTime(1, now + 1);
    v.out.gain.setValueAtTime(1, now + seconds - 1.5);
    v.out.gain.linearRampToValueAtTime(0, now + seconds);
    v.stop(now + seconds + 0.05);
    return () => {
      const t = ctx.currentTime;
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setValueAtTime(v.out.gain.value, t);
      v.out.gain.linearRampToValueAtTime(0, t + 0.4);
      v.stop(t + 0.5);
    };
  }
}
