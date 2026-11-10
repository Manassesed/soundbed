import { useEffect, useRef, useState } from 'react';
import { PadEngine } from './audio/engine';
import { PRESETS, getPreset } from './audio/presets';
import { Key, Mode, NOTE_NAMES, keyId, parseKeyId } from './lib/music';
import {
  LayerSetting,
  PlayerState,
  Setlist,
  loadSetlists,
  loadState,
  saveSetlists,
  saveState,
  uid,
} from './lib/storage';
import './App.css';

const engine = new PadEngine();
const MAX_LAYERS = 3;
type Tab = 'player' | 'timbres' | 'efeitos' | 'listas';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'player', label: 'Tocar', icon: '▶' },
  { id: 'timbres', label: 'Timbres', icon: '◫' },
  { id: 'efeitos', label: 'Efeitos', icon: '≋' },
  { id: 'listas', label: 'Setlists', icon: '☰' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('player');
  const [state, setState] = useState<PlayerState>(() => loadState());
  const [mode, setMode] = useState<Mode>('major');
  const [active, setActive] = useState<Key | null>(null);
  const [setlists, setSetlists] = useState<Setlist[]>(() => loadSetlists());
  const [openList, setOpenList] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [previewing, setPreviewing] = useState<string | null>(null);
  const stopPreview = useRef<(() => void) | null>(null);

  const { layers, volume, reverb, brightness, fade } = state;
  const patch = (p: Partial<PlayerState>) => setState((s) => ({ ...s, ...p }));

  useEffect(() => engine.setVolume(volume), [volume]);
  useEffect(() => engine.setReverb(reverb), [reverb]);
  useEffect(() => engine.setBrightness(brightness), [brightness]);
  useEffect(() => engine.setCrossfade(fade), [fade]);
  useEffect(() => {
    engine.setLayers(layers.map((l) => ({ preset: getPreset(l.preset), volume: l.volume })));
  }, [layers]);
  useEffect(() => saveState(state), [state]);
  useEffect(() => saveSetlists(setlists), [setlists]);

  const playKey = (key: Key) => {
    if (active && keyId(active) === keyId(key)) {
      engine.stop(fade);
      setActive(null);
      return;
    }
    engine.play(key);
    setActive(key);
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Pad em ${keyId(key)}`,
        artist: layers.map((l) => getPreset(l.preset).name).join(' + '),
      });
    }
  };

  const stopAll = () => {
    engine.stop(fade);
    setActive(null);
  };

  const toggleLayer = (id: string) => {
    if (layers.some((l) => l.preset === id)) {
      if (layers.length > 1) patch({ layers: layers.filter((l) => l.preset !== id) });
    } else if (layers.length < MAX_LAYERS) {
      patch({ layers: [...layers, { preset: id, volume: 0.8 }] });
    }
  };

  const setLayerVolume = (id: string, v: number) =>
    patch({ layers: layers.map((l) => (l.preset === id ? { ...l, volume: v } : l)) });

  const preview = async (id: string) => {
    stopPreview.current?.();
    stopPreview.current = null;
    if (previewing === id) {
      setPreviewing(null);
      return;
    }
    setPreviewing(id);
    const key = active ?? { root: 0, mode };
    stopPreview.current = await engine.preview(key, getPreset(id), 8);
    window.setTimeout(() => setPreviewing((p) => (p === id ? null : p)), 8000);
  };

  const loadItem = (it: { key: string; layers: LayerSetting[] }) => {
    const k = parseKeyId(it.key);
    if (!k) return;
    patch({ layers: it.layers });
    engine.setLayers(it.layers.map((l) => ({ preset: getPreset(l.preset), volume: l.volume })));
    setMode(k.mode);
    engine.play(k);
    setActive(k);
  };

  const current = setlists.find((s) => s.id === openList) ?? null;
  const updateList = (id: string, fn: (s: Setlist) => Setlist) =>
    setSetlists((ls) => ls.map((s) => (s.id === id ? fn(s) : s)));

  const addSetlist = () => {
    const list: Setlist = { id: uid(), name: `Setlist ${setlists.length + 1}`, items: [] };
    setSetlists([...setlists, list]);
    setOpenList(list.id);
  };

  const addCurrentToList = () => {
    if (!current || !active) return;
    updateList(current.id, (s) => ({
      ...s,
      items: [
        ...s.items,
        { id: uid(), title: songTitle.trim() || `Música ${s.items.length + 1}`, key: keyId(active), layers },
      ],
    }));
    setSongTitle('');
  };

  const keys: Key[] = NOTE_NAMES.map((_, root) => ({ root, mode }));
  const isActive = (k: Key) => active !== null && keyId(active) === keyId(k);

  return (
    <div className="shell">
      <header className="top">
        <div className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} />
          <h1>Soundbed</h1>
        </div>
        <div className={`status ${active ? 'live' : ''}`}>
          {active ? <>Tocando <strong>{keyId(active)}</strong></> : 'Em silêncio'}
          {active && <button className="stop" onClick={stopAll}>Parar</button>}
        </div>
      </header>

      <main className="content">
        {tab === 'player' && (
          <>
            <section className="layers" aria-label="Camadas">
              {layers.map((l) => {
                const p = getPreset(l.preset);
                return (
                  <div className="layer" key={l.preset} style={{ '--c1': p.colors[0], '--c2': p.colors[1] } as React.CSSProperties}>
                    <div className="layer-head">
                      <span className="dot" />
                      <strong>{p.name}</strong>
                      {layers.length > 1 && (
                        <button className="icon" aria-label={`Remover ${p.name}`} onClick={() => toggleLayer(l.preset)}>✕</button>
                      )}
                    </div>
                    <input
                      type="range" min={0} max={1} step={0.01} value={l.volume}
                      aria-label={`Volume de ${p.name}`}
                      onChange={(e) => setLayerVolume(l.preset, Number(e.target.value))}
                    />
                    <output>{Math.round(l.volume * 100)}%</output>
                  </div>
                );
              })}
              {layers.length < MAX_LAYERS && (
                <button className="layer add-layer" onClick={() => setTab('timbres')}>
                  + Camada
                </button>
              )}
            </section>

            <div className="mode" role="radiogroup" aria-label="Modo">
              {(['major', 'minor'] as Mode[]).map((m) => (
                <button key={m} role="radio" aria-checked={mode === m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>
                  {m === 'major' ? 'Maior' : 'Menor'}
                </button>
              ))}
            </div>

            <section className="grid" aria-label="Tons">
              {keys.map((k) => (
                <button key={keyId(k)} className={`key ${isActive(k) ? 'on' : ''}`} aria-pressed={isActive(k)} onClick={() => playKey(k)}>
                  {keyId(k)}
                </button>
              ))}
            </section>
          </>
        )}

        {tab === 'timbres' && (
          <section>
            <h2>Timbres</h2>
            <p className="muted">Toque até {MAX_LAYERS} timbres juntos. Cada um vem nos 24 tons.</p>
            <div className="catalog">
              {PRESETS.map((p) => {
                const on = layers.some((l) => l.preset === p.id);
                return (
                  <article key={p.id} className={`card ${on ? 'on' : ''}`}>
                    <div className="art" style={{ background: `radial-gradient(circle at 30% 30%, ${p.colors[0]}, transparent 60%), radial-gradient(circle at 70% 70%, ${p.colors[1]}, #0b0d12 75%)` }} />
                    <div className="card-body">
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <div className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
                      <div className="card-actions">
                        <button onClick={() => preview(p.id)}>{previewing === p.id ? '■ Parar' : '▶ Prévia'}</button>
                        <button
                          className={on ? 'primary' : ''}
                          disabled={(!on && layers.length >= MAX_LAYERS) || (on && layers.length === 1)}
                          onClick={() => toggleLayer(p.id)}
                        >
                          {on ? 'Na mixagem' : '+ Adicionar'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {tab === 'efeitos' && (
          <section className="controls">
            <h2>Efeitos</h2>
            <Slider label="Volume geral" value={volume} onChange={(v) => patch({ volume: v })} />
            <Slider label="Reverb" value={reverb} onChange={(v) => patch({ reverb: v })} />
            <Slider label="Brilho" value={brightness} onChange={(v) => patch({ brightness: v })} />
            <Slider label="Crossfade" value={fade} min={0.5} max={10} step={0.5} unit="s" onChange={(v) => patch({ fade: v })} />
            <p className="muted">O crossfade é o tempo da transição quando você troca de tom.</p>
          </section>
        )}

        {tab === 'listas' && (
          <section>
            <div className="row-between">
              <h2>Setlists</h2>
              <button onClick={addSetlist}>+ Nova</button>
            </div>
            {setlists.length === 0 && <p className="muted">Crie uma setlist para guardar o tom e as camadas de cada música.</p>}
            <div className="tabs">
              {setlists.map((s) => (
                <button key={s.id} className={`chip ${s.id === openList ? 'on' : ''}`} onClick={() => setOpenList(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
            {current && (
              <div className="setlist">
                <div className="row-between">
                  <input className="name" value={current.name} aria-label="Nome da setlist"
                    onChange={(e) => updateList(current.id, (s) => ({ ...s, name: e.target.value }))} />
                  <button className="danger" onClick={() => { setSetlists((ls) => ls.filter((s) => s.id !== current.id)); setOpenList(null); }}>
                    Excluir
                  </button>
                </div>
                <ol>
                  {current.items.map((it, i) => (
                    <li key={it.id}>
                      <button className="song" onClick={() => loadItem(it)}>
                        <span>{it.title}</span>
                        <em>{it.key} · {it.layers.map((l) => getPreset(l.preset).name).join(' + ')}</em>
                      </button>
                      <button className="icon" aria-label="Subir" disabled={i === 0}
                        onClick={() => updateList(current.id, (s) => {
                          const items = [...s.items];
                          [items[i - 1], items[i]] = [items[i], items[i - 1]];
                          return { ...s, items };
                        })}>↑</button>
                      <button className="icon" aria-label="Remover"
                        onClick={() => updateList(current.id, (s) => ({ ...s, items: s.items.filter((x) => x.id !== it.id) }))}>✕</button>
                    </li>
                  ))}
                </ol>
                <div className="add">
                  <input placeholder="Nome da música" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} />
                  <button onClick={addCurrentToList} disabled={!active}>
                    Salvar {active ? keyId(active) : 'tom atual'}
                  </button>
                </div>
                {!active && <p className="muted">Toque um tom para poder salvá-lo na setlist.</p>}
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="tabbar" aria-label="Navegação">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id ? 'page' : undefined} onClick={() => setTab(t.id)}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function Slider(props: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
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
