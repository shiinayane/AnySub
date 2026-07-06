// AniList GraphQL: anime title → candidates (id / title / episode count / year). No auth needed, CORS: *.
import { t } from '../i18n.js';
import type { AnimeCandidate } from '../types.js';

const ENDPOINT = 'https://graphql.anilist.co';
const QUERY = `query($s:String){Page(perPage:6){media(search:$s,type:ANIME){id title{romaji native english} episodes format startDate{year} coverImage{medium}}}}`;

interface AniMedia {
  id: number;
  title: { romaji?: string | null; native?: string | null; english?: string | null };
  episodes?: number | null;
  format?: string | null;
  startDate?: { year?: number | null } | null;
  coverImage?: { medium?: string | null } | null;
}
interface AniResponse {
  data?: { Page?: { media?: AniMedia[] } };
}

export async function searchAnime(title: string): Promise<AnimeCandidate[]> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { s: title } }),
  });
  if (res.status === 429) throw new Error(t('err.anilistRateLimit'));
  if (!res.ok) throw new Error(t('err.anilistFailed', { status: res.status }));
  const data = (await res.json()) as AniResponse;
  const media = data?.data?.Page?.media || [];
  return media.map((m) => ({
    anilistId: m.id,
    title: m.title.native || m.title.romaji || m.title.english || String(m.id),
    native: m.title.native || '',
    romaji: m.title.romaji || '',
    english: m.title.english || '',
    episodes: m.episodes || 0,
    format: m.format || '',
    year: m.startDate?.year || '',
    cover: m.coverImage?.medium || '',
  }));
}
