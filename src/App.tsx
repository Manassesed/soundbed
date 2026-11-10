import { useEffect, useMemo, useRef, useState } from 'react';
import { PadEngine } from './audio/engine';
import { PRESETS, getPreset } from './audio/presets';
import { ALL_KEYS, Key, keyId, parseKeyId } from './lib/music';
import { Setlist, loadSetlists, saveSetlists, uid } from './lib/storage';
import './App.css';

const engine = new PadEngine();

export default function App() {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [active, setActive] = useState<Key | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [reverb, setReverb] = useState(0.5);
  const [brightness, setBrightness] = useState(0.5);
  const [fade, setFade] = useState(3);
  const [setlists, setSetlists] = useState<Setlist[]>(() => loadSetlists());
  const [openList, setOpenList] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const presetRef = useRef(presetId);
  presetRef.current = presetId;

  useEffect(() => engine.setVolume(volume), [volume]);
  useEffect(() => engine.setReverb(reverb), [reverb]);
  useEffect(() => engine.setBrightness(brightness), [brightness]);
  useEffect(() => engine.setCrossfade(fade), [fade]);
  useEffect(() => saveSetlists(setlists), [setlists]);

  const play = (key: Key, preset = presetRef.current) => {
    if (active && keyId(active) === keyId(key) && preset === presetRef.current && engine.playing) {
      engine.stop(fade);
      setActive(null);
      return;
    }
    setPresetId(preset);
    engine.play(key, getPreset(preset));
    setActive(key);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Pad em ${keyId(key)}`,
        artist: getPreset(preset).name,
      });
    }
  };

  const stopAll = () => {
    engine.stop(fade);
    setActive(null);
  };

  const changePreset = (id: string) => {
    setPresetId(id);
    if (active) engine.play(active, getPreset(id));
  };

  const current = useMemo(() => setlists.find((s) => s.id === openList) ?? null, [setlists, openList]);

  const addSetlist = () => {
    const list: Setlist = { id: uid(), name: `Setlist ${setlists.length + 1}`, items: [] };
    setSetlists([...setlists, list]);
    setOpenList(list.id);
  };

  const updateList = (id: string, fn: (s: Setlist) => Setlist) =>
    setSetlists((ls) => ls.map((s) => (s.id === id ? fn(s) : s)));

  const addCurrentToList = () => {
    if (!current || !active) return;
    updateList(current.id, (s) => ({
      ...s,
      items: [...s.items, { id: uid(), title: songTitle.trim() || `Música ${s.items.length + 1}`, key: keyId(active), preset: presetId }],
    }));
    setSongTitle('');
  };

  const majors = ALL_KEYS.filter((k) => k.mode === 'major');
  const minors = ALL_KEYS.filter((k) => k.mode === 'minor');
  const isActive = (k: Key) => active !== null && keyId(active) === keyId(k);

  const renderRow = (keys: Key[], label: string) => (
    <div className="key-row" role="group" aria-label={label}>
      {keys.map((k) => (
        <button
          key={keyId(k)}
          className={`key ${isActive(k) ? 'on' : ''}`}
          aria-pressed={isActive(k)}
          onClick={() => play(k)}
        >
          {keyId(k)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>◐</span>
          <h1>Soundbed</h1>
        </div>
        <p className="tag">Pads contínuos para o louvor</p>
      </header>

      <section className="panel">
        <div className="now">
          <span className="label">Tocando</span>
          <strong>{active ? `${keyId(active)} · ${getPreset(presetId).name}` : 'Nada'}</strong>
          <button className="stop" onClick={stopAll} disabled={!active}>Parar</button>
        </div>
        <h2>Maiores</h2>
        {renderRow(majors, 'Tons maiores')}
        <h2>Menores</h2>
        {renderRow(minors, 'Tons menores')}
      </section>

      <section className="panel">
        <h2>Timbre</h2>
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p.id} className={`preset ${p.id === presetId ? 'on' : ''}`} onClick={() => changePreset(p.id)}>
              <strong>{p.name}</strong>
              <span>{p.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel controls">
        <h2>Mixagem</h2>
        <Slider label="Volume" value={volume} onChange={setVolume} />
        <Slider label="Reverb" value={reverb} onChange={setReverb} />
        <Slider label="Brilho" value={brightness} onChange={setBrightness} />
        <Slider label="Crossfade" value={fade} min={0.5} max={10} step={0.5} unit="s" onChange={setFade} />
      </section>

      <section className="panel">
        <div className="row-between">
          <h2>Setlists</h2>
          <button onClick={addSetlist}>+ Nova</button>
        </div>
        {setlists.length === 0 && <p className="muted">Crie uma setlist para guardar o tom e o timbre de cada música.</p>}
        <div className="tabs">
          {setlists.map((s) => (
            <button key={s.id} className={`tab ${s.id === openList ? 'on' : ''}`} onClick={() => setOpenList(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        {current && (
          <div className="setlist">
            <div className="row-between">
              <input
                className="name"
                value={current.name}
                aria-label="Nome da setlist"
                onChange={(e) => updateList(current.id, (s) => ({ ...s, name: e.target.value }))}
              />
              <button
                className="danger"
                onClick={() => {
                  setSetlists((ls) => ls.filter((s) => s.id !== current.id));
                  setOpenList(null);
                }}
              >
                Excluir
              </button>
            </div>
            <ol>
              {current.items.map((it, i) => {
                const k = parseKeyId(it.key);
                return (
                  <li key={it.id}>
                    <button className="song" onClick={() => k && play(k, it.preset)}>
                      <span>{it.title}</span>
                      <em>{it.key} · {getPreset(it.preset).name}</em>
                    </button>
                    <button
                      aria-label="Subir"
                      disabled={i === 0}
                      onClick={() =>
                        updateList(current.id, (s) => {
                          const items = [...s.items];
                          [items[i - 1], items[i]] = [items[i], items[i - 1]];
                          return { ...s, items };
                        })
                      }
                    >↑</button>
                    <button
                      aria-label="Remover"
                      onClick={() => updateList(current.id, (s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}
                    >✕</button>
                  </li>
                );
              })}
            </ol>
            <div className="add">
              <input
                placeholder="Nome da música"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
              />
              <button onClick={addCurrentToList} disabled={!active}>
                Adicionar {active ? keyId(active) : 'tom atual'}
              </button>
            </div>
          </div>
        )}
      </section>

      <footer className="foot">Sons sintetizados no aparelho · funciona offline</footer>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}) {
  const { label, value, onChange, min = 0, max = 1, step = 0.01, unit } = props;
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{unit ? `${value}${unit}` : `${Math.round(value * 100)}%`}</output>
    </label>
  );
}
