// Jimaku API client. Requires an API key (Authorization header); CORS reflects Origin, so @grant none can connect directly.
import { state } from '../state.js';
import { t } from '../i18n.js';
import type { JimakuEntry, SubFile } from '../types.js';

const BASE = 'https://jimaku.cc/api';

function auth(): Record<string, string> {
  const key = state.jimakuKey;
  if (!key) throw new Error(t('err.jimakuNoKey'));
  return { Authorization: key };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: auth() });
  if (res.status === 401) throw new Error(t('err.jimakuBadKey'));
  if (res.status === 429) throw new Error(t('err.jimakuRateLimit'));
  if (!res.ok) throw new Error(t('err.jimakuFailed', { status: res.status }));
  return res.json() as Promise<T>;
}

// Find entries by AniList ID
export function searchByAnilist(anilistId: number | string): Promise<JimakuEntry[]> {
  return get('/entries/search?anilist_id=' + encodeURIComponent(anilistId));
}

// Free-text search for entries
export function searchByQuery(query: string): Promise<JimakuEntry[]> {
  return get('/entries/search?query=' + encodeURIComponent(query));
}

// List the files under an entry (optionally filtered by episode)
export function getFiles(entryId: number | string, episode?: string | number): Promise<SubFile[]> {
  let p = '/entries/' + encodeURIComponent(entryId) + '/files';
  if (episode != null && episode !== '') p += '?episode=' + encodeURIComponent(episode);
  return get(p);
}
