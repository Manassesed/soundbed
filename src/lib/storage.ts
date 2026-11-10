export interface SetlistItem {
  id: string;
  title: string;
  key: string; // e.g. "G", "Em"
  preset: string;
}

export interface Setlist {
  id: string;
  name: string;
  items: SetlistItem[];
}

const KEY = 'soundbed.setlists.v1';

export function loadSetlists(): Setlist[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
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

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}
