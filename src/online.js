// 在线字幕编排:AniList 定位番剧 → Jimaku 取文件 → 下载 → 走统一载入路径。
import { state } from './state.js';
import { parseVideoTitle } from './title-parse.js';
import { searchAnime } from './anilist.js';
import { searchByAnilist, searchByQuery, getFiles } from './jimaku.js';
import { loadFromBuffer } from './loader.js';

const SUB_RE = /\.(ass|ssa|srt|vtt|sub|sbv)$/i; // 只要字幕文件,跳过 .7z/.zip 等压缩包

export function animeCandidates(title) {
  return searchAnime(title);
}

// 给定 anilist_id + 集数,返回可用字幕文件(ass 优先)。
// fallbackTitles:anilist_id 在 Jimaku 无条目时,依次用这些标题(AniList 的日文/罗马字/英文)
// 走自由文本搜索兜底 —— Jimaku 未按该番建 anilist 映射时仍可能命中。半自动,用户仍需从候选选择。
export async function subtitleFiles(anilistId, episode, fallbackTitles = []) {
  let entries = await searchByAnilist(anilistId);
  if (!entries.length) {
    const seen = new Set();
    for (const q of fallbackTitles) {
      const query = (q || '').trim();
      if (!query || seen.has(query)) continue;
      seen.add(query);
      entries = await searchByQuery(query);
      if (entries.length) break; // 命中即止,不叠多次自由搜
    }
  }
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

// 记录本次在线加载的来源(番剧/集数取自页面标题),供切集「同源优先」自动接续
export function markLoaded(anilistId, fileName) {
  const p = parseVideoTitle(document.title);
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = (anilistId != null) ? { anilistId, name: fileName } : null;
}
