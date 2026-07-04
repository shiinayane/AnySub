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
  state.lastOnline = (anilistId != null) ? { anilistId, name: fileName } : null;
}

// 集数样 / 哈希样 token(跨集会变,匹配时剔除)
const EP_TOK = /^(s\d{1,2}e\d{1,3}|e\d{1,3}|v\d+|\d{1,4}|[0-9a-f]{8})$/;

// 「源特征」token:文件名里的拉丁字母数字(平台/组名/格式/分辨率/语言等)。
// 同一番剧不同集,源特征稳定,而集标题(多为日文)每集不同——只比源特征即可跨集稳配同源,
// 不被集标题稀释(EVA 的 使徒襲来/見知らぬ天井 之类曾把整段 Jaccard 拉到 0.45 而误判)。
function sourceTokens(name) {
  const out = new Set();
  for (const t of String(name || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (t && !EP_TOK.test(t)) out.add(t);
  }
  return out;
}

// 整体 token(含 CJK):源特征为空(纯日文命名)时的退路
function fileTokens(name) {
  return String(name || '').toLowerCase()
    .replace(/\.(ass|ssa|srt|vtt|sub|sbv)$/i, '')
    .split(/[^a-z0-9぀-ヿ一-鿿]+/)
    .filter((t) => t && !EP_TOK.test(t));
}

// 在候选里挑与参考文件同源者:优先比「源特征」,为空时退化到整体 token
export function pickSameSource(files, refName) {
  if (!refName) return null;
  const refSig = sourceTokens(refName);
  const useSig = refSig.size >= 1;
  const refFull = new Set(fileTokens(refName));
  let best = null, bestScore = -1, second = -1;
  for (const f of files) {
    const s = useSig ? jaccard(refSig, sourceTokens(f.name))
                     : jaccard(refFull, new Set(fileTokens(f.name)));
    if (s > bestScore) { second = bestScore; bestScore = s; best = f; }
    else if (s > second) { second = s; }
  }
  const thresh = useSig ? 0.5 : 0.6;
  // 达阈值,或明显优于次优(应对源特征很少的情况),即认为同源
  if (best && (bestScore >= thresh || (bestScore >= 0.34 && bestScore - second >= 0.34))) return best;
  return null;
}

function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}
