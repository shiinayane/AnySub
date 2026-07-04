// AniList GraphQL:番剧名 → 候选(id / 标题 / 集数 / 年份)。无需鉴权,CORS: *。
const ENDPOINT = 'https://graphql.anilist.co';
const QUERY = `query($s:String){Page(perPage:6){media(search:$s,type:ANIME){id title{romaji native english} episodes format startDate{year}}}}`;

export async function searchAnime(title) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: QUERY, variables: { s: title } }),
  });
  if (res.status === 429) throw new Error('AniList 请求过于频繁,请稍后再试');
  if (!res.ok) throw new Error('AniList 查询失败 ' + res.status);
  const data = await res.json();
  const media = (data && data.data && data.data.Page && data.data.Page.media) || [];
  return media.map((m) => ({
    anilistId: m.id,
    title: m.title.native || m.title.romaji || m.title.english || String(m.id),
    romaji: m.title.romaji || '',
    episodes: m.episodes || 0,
    format: m.format || '',
    year: (m.startDate && m.startDate.year) || '',
  }));
}
