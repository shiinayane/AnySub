// Jimaku API 客户端。需 API key(Authorization 头);CORS 反射 Origin,@grant none 可直连。
import { state } from './state.js';
import type { JimakuEntry, SubFile } from './types.js';

const BASE = 'https://jimaku.cc/api';

function auth(): Record<string, string> {
  const key = state.jimakuKey;
  if (!key) throw new Error('未设置 Jimaku API key');
  return { Authorization: key };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path, { headers: auth() });
  if (res.status === 401) throw new Error('Jimaku API key 无效');
  if (res.status === 429) throw new Error('Jimaku 请求过于频繁,请稍后再试');
  if (!res.ok) throw new Error('Jimaku 请求失败 ' + res.status);
  return res.json() as Promise<T>;
}

// 按 AniList ID 找条目
export function searchByAnilist(anilistId: number | string): Promise<JimakuEntry[]> {
  return get('/entries/search?anilist_id=' + encodeURIComponent(anilistId));
}

// 自由文本搜索条目
export function searchByQuery(query: string): Promise<JimakuEntry[]> {
  return get('/entries/search?query=' + encodeURIComponent(query));
}

// 列出条目下的文件(可按集数过滤)
export function getFiles(entryId: number | string, episode?: string | number): Promise<SubFile[]> {
  let p = '/entries/' + encodeURIComponent(entryId) + '/files';
  if (episode != null && episode !== '') p += '?episode=' + encodeURIComponent(episode);
  return get(p);
}
