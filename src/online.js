// 在线字幕编排:AniList 定位番剧 → Jimaku 取文件 → 下载 → 走统一载入路径。
import { state } from './state.js';
import { parseVideoTitle } from './title-parse.js';
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

// 记录本次在线加载的来源(番剧/集数取自页面标题),供切集「同源优先」自动接续
export function markLoaded(anilistId, fileName) {
  const p = parseVideoTitle(document.title);
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = (anilistId != null) ? { anilistId, tokens: fileTokens(fileName) } : null;
}

// 提取文件名里的「源特征」token(丢弃集数样 token),用于跨集匹配同一字幕组/压制源
export function fileTokens(name) {
  return String(name || '').toLowerCase()
    .replace(/\.(ass|ssa|srt|vtt|sub|sbv)$/i, '')
    .split(/[^a-z0-9぀-ヿ一-鿿]+/)
    .filter((t) => t && !/^\d{1,3}$/.test(t) && !/^v\d+$/.test(t) && !/^s\d{1,2}e\d{1,3}$/.test(t) && !/^e\d{1,3}$/.test(t));
}

// 在候选文件里挑与参考 token 最相似的(Jaccard ≥ 0.6 才算同源,否则返回 null)
export function pickSameSource(files, refTokens) {
  if (!refTokens || !refTokens.length) return null;
  const ref = new Set(refTokens);
  let best = null, bestScore = 0;
  for (const f of files) {
    const s = jaccard(ref, new Set(fileTokens(f.name)));
    if (s > bestScore) { bestScore = s; best = f; }
  }
  return bestScore >= 0.6 ? best : null;
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}
