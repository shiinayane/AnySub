// Jimaku API 客户端。需 API key(Authorization 头);CORS 反射 Origin,@grant none 可直连。
import { state } from './state.js';

const BASE = 'https://jimaku.cc/api';

function auth() {
  const key = state.jimakuKey;
  if (!key) throw new Error('未设置 Jimaku API key');
  return { Authorization: key };
}

async function get(path) {
  const res = await fetch(BASE + path, { headers: auth() });
  if (res.status === 401) throw new Error('Jimaku API key 无效');
  if (res.status === 429) throw new Error('Jimaku 请求过于频繁,请稍后再试');
  if (!res.ok) throw new Error('Jimaku 请求失败 ' + res.status);
  return res.json();
}

// 按 AniList ID 找条目
export function searchByAnilist(anilistId) {
  return get('/entries/search?anilist_id=' + encodeURIComponent(anilistId));
}

// 自由文本搜索条目
export function searchByQuery(query) {
  return get('/entries/search?query=' + encodeURIComponent(query));
}

// 列出条目下的文件(可按集数过滤)
export function getFiles(entryId, episode) {
  let p = '/entries/' + encodeURIComponent(entryId) + '/files';
  if (episode != null && episode !== '') p += '?episode=' + encodeURIComponent(episode);
  return get(p);
}
