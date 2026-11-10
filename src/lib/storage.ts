export interface LayerSetting {
  preset: string;
  volume: number; // 0..1
}

export interface SetlistItem {
  id: string;
  title: string;
  key: string; // e.g. "G", "Em"
  layers: LayerSetting[];
}

export interface Setlist {
  id: string;
  name: string;
  items: SetlistItem[];
}

const KEY = 'soundbed.setlists.v1';
const STATE_KEY = 'soundbed.state.v1';

type RawItem = Partial<SetlistItem> & { preset?: string };

function normaliseItem(it: RawItem): SetlistItem {
  const layers =
    Array.isArray(it.layers) && it.layers.length
      ? it.layers
      : [{ preset: it.preset ?? 'aurora', volume: 1 }];
  return { id: it.id ?? uid(), title: it.title ?? '', key: it.key ?? 'C', layers };
}

export function loadSetlists(): Setlist[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: Setlist) => ({ ...s, items: (s.items ?? []).map(normaliseItem) }));
  } catch {
    return [];
  }
}

export function saveSetlists(lists: Setlist[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lists));
  } catch {
    /* storage unavailable: keep in memory only */
  }
}

export interface PlayerState {
  layers: LayerSetting[];
  volume: number;
  reverb: number;
  brightness: number;
  fade: number;
}

export const DEFAULT_STATE: PlayerState = {
  layers: [{ preset: 'aurora', volume: 1 }],
  volume: 0.7,
  reverb: 0.5,
  brightness: 0.5,
  fade: 3,
};

export function loadState(): PlayerState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(s: PlayerState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
