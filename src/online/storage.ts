// Settings persistence.
// Ordinary preferences: localStorage (isolated per site, hence saved "per site").
// Jimaku API key: shared across sites — GM storage preferred (GM_getValue/GM_setValue, per script rather than per site,
//   set once and usable everywhere), falling back to localStorage (per site). A copy is also written to localStorage as a per-site cache fallback.
import { state } from '../state.js';

const KEY = 'anysub:settings:v1';
const KEY_JIMAKU = 'anysub:jimakuKey';

// Access the userscript storage API via globalThis, compatible with the various managers (some only provide async GM.*, some only provide sync GM_*).
interface GmApi {
  getValue?: (key: string, def?: unknown) => unknown | Promise<unknown>;
  setValue?: (key: string, val: unknown) => unknown | Promise<unknown>;
}
const g = globalThis as unknown as {
  GM?: GmApi;
  GM_getValue?: (key: string, def?: unknown) => unknown;
  GM_setValue?: (key: string, val: unknown) => unknown;
};

// GM storage adapter: async GM.getValue/GM.setValue preferred (GM4/Userscripts/VM), then falling back to sync GM_getValue/
// GM_setValue (TM), null if neither exists (falls back to localStorage). await works on sync return values too, so treat everything uniformly as async.
const gmGet: ((k: string, d: string) => unknown) | null =
  g.GM && typeof g.GM.getValue === 'function'
    ? (k, d) => g.GM!.getValue!(k, d)
    : typeof g.GM_getValue === 'function'
      ? (k, d) => g.GM_getValue!(k, d)
      : null;
const gmSet: ((k: string, v: string) => unknown) | null =
  g.GM && typeof g.GM.setValue === 'function'
    ? (k, v) => g.GM!.setValue!(k, v)
    : typeof g.GM_setValue === 'function'
      ? (k, v) => g.GM_setValue!(k, v)
      : null;

// Write all the "per-site" fields in the current state that need persisting (jimakuKey is not here, it uses cross-site storage)
export function saveState(): void {
  const s = state.style;
  saveSettings({
    fontPct: s.fontPct,
    bottomPct: s.bottomPct,
    bg: s.bg,
    color: s.color,
    showFab: state.showFab,
    rubyParen: state.rubyParen,
    enhance: state.enhance,
    subPos: state.subPos,
    offsets: state.offsets,
    lang: state.lang,
  });
}

// Shape of the persisted settings (fields may be missing / hold old values when read back, so all optional)
export interface SavedSettings {
  fontPct?: number;
  bottomPct?: number;
  bg?: string;
  color?: string;
  showFab?: boolean;
  rubyParen?: boolean;
  enhance?: boolean;
  subPos?: string;
  offsets?: Record<string, number>;
  lang?: string | null;
  jimakuKey?: string; // legacy leftover (was stored per site); used for a one-time migration to cross-site storage
}

export function loadSettings(): SavedSettings {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || 'null') as SavedSettings) || {};
  } catch (_) {
    return {}; // silent degradation in private mode / when storage is disabled
  }
}

export function saveSettings(obj: SavedSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (_) {
    /* ignore write failures */
  }
}

// The key in this site's localStorage (sync, for immediately restoring the per-site cache at startup)
export function getLocalKey(): string {
  try {
    return localStorage.getItem(KEY_JIMAKU) || '';
  } catch (_) {
    return '';
  }
}

// Read the cross-site Jimaku key (async): GM preferred (shared across all sites), falling back to this site's localStorage.
export async function loadGlobalKey(): Promise<string> {
  if (gmGet) {
    try {
      const v = await gmGet(KEY_JIMAKU, '');
      if (typeof v === 'string' && v) return v; // guard against non-string returns
    } catch (_) {
      /* fall back to localStorage */
    }
  }
  return getLocalKey();
}

// Write the cross-site Jimaku key: write to both GM (all sites) + localStorage (per-site cache fallback). Fire-and-forget.
export function saveGlobalKey(v: string): void {
  const val = v || '';
  if (gmSet) {
    try {
      Promise.resolve(gmSet(KEY_JIMAKU, val)).catch(() => {});
    } catch (_) {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(KEY_JIMAKU, val);
  } catch (_) {
    /* ignore */
  }
}
