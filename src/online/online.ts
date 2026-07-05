// 在线字幕编排:AniList 定位番剧 → Jimaku 取文件 → 下载 → 走统一载入路径。
import { state } from '../state.js';
import { detectShow } from '../sites/site-adapters.js';
import { searchAnime } from './anilist.js';
import { searchByAnilist, searchByQuery, getFiles } from './jimaku.js';
import { pickExactAnime } from './match.js';
import { loadFromBuffer } from '../render/loader.js';
import type { AnimeCandidate, ResolveResult, SubFile } from '../types.js';

const SUB_RE = /\.(ass|ssa|srt|vtt|sub|sbv)$/i; // 只要字幕文件,跳过 .7z/.zip 等压缩包

export function animeCandidates(title: string): Promise<AnimeCandidate[]> {
  return searchAnime(title);
}

// 站点无关的统一入口:番名(+集数)→ 定位番剧(精确匹配优先,否则最相关候选)→ 该集字幕文件。
// 任何站点的 detectShow() 结果都走这一条路径;各触发点(自动提示核实、切集续播判断等)共用,
// 不再各自内联「候选→选番→取文件」。返回 { anime, candidates, files, exact }。
export async function resolveSubtitles(series: string, episode: string): Promise<ResolveResult> {
  const candidates = await animeCandidates(series);
  if (!candidates.length) return { anime: null, candidates: [], files: [], exact: false };
  const exactHit = pickExactAnime(candidates, series);
  const anime = exactHit || candidates[0];
  const files = await subtitleFiles(anime.anilistId, episode, [
    anime.native,
    anime.romaji,
    anime.english,
  ]);
  return { anime, candidates, files, exact: !!exactHit };
}

// 给定 anilist_id + 集数,返回可用字幕文件(ass 优先)。
// fallbackTitles:anilist_id 在 Jimaku 无条目时,依次用这些标题(AniList 的日文/罗马字/英文)
// 走自由文本搜索兜底 —— Jimaku 未按该番建 anilist 映射时仍可能命中。半自动,用户仍需从候选选择。
export async function subtitleFiles(
  anilistId: number | string,
  episode: string,
  fallbackTitles: string[] = [],
): Promise<SubFile[]> {
  let entries = await searchByAnilist(anilistId);
  if (!entries.length) {
    const seen = new Set<string>();
    for (const q of fallbackTitles) {
      const query = (q || '').trim();
      if (!query || seen.has(query)) continue;
      seen.add(query);
      entries = await searchByQuery(query);
      if (entries.length) break; // 命中即止,不叠多次自由搜
    }
  }
  if (!entries.length) return [];
  const out: SubFile[] = [];
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

function rank(n: string): number {
  if (/\.(ass|ssa)$/i.test(n)) return 0;
  if (/\.srt$/i.test(n)) return 1;
  return 2;
}

export async function downloadAndLoad(url: string, name: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('下载失败 ' + res.status);
  const buf = await res.arrayBuffer();
  return loadFromBuffer(buf, name);
}

// 记录本次在线加载的来源(番剧/集数用站点适配的 detectShow(),与切集信号同源),供切集「同源优先」自动接续
export function markLoaded(anilistId: number | null | undefined, fileName: string): void {
  const p = detectShow();
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = anilistId != null ? { anilistId, name: fileName } : null;
}
