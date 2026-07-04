// 在线字幕编排:AniList 定位番剧 → Jimaku 取文件 → 下载 → 走统一载入路径。
import { searchAnime } from './anilist.js';
import { searchByAnilist, getFiles } from './jimaku.js';
import { loadFromBuffer } from './loader.js';

const SUB_RE = /\.(ass|ssa|srt|vtt|sub|sbv)$/i; // 只要字幕文件,跳过 .7z/.zip 等压缩包

export function animeCandidates(title) {
  return searchAnime(title);
}

// 给定 anilist_id + 集数,返回可用字幕文件(ass 优先)
export async function subtitleFiles(anilistId, episode) {
  const entries = await searchByAnilist(anilistId);
  if (!entries.length) return [];
  const out = [];
  for (const e of entries) {
    const files = await getFiles(e.id, episode);
    for (const f of files) {
      if (!SUB_RE.test(f.name)) continue;
      out.push({ name: f.name, url: f.url, size: f.size, entryName: e.japanese_name || e.name });
    }
  }
  out.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  return out;
}

function rank(n) {
  if (/\.(ass|ssa)$/i.test(n)) return 0;
  if (/\.srt$/i.test(n)) return 1;
  return 2;
}

export async function downloadAndLoad(url, name) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('下载失败 ' + res.status);
  const buf = await res.arrayBuffer();
  return loadFromBuffer(buf, name);
}
