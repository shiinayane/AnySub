// 跨集「同源」匹配(纯逻辑,无 DOM 依赖,便于单测)。
// 同一番剧的候选番剧名相同,不用于区分;真正标识「源」的是文件名里的拉丁标签
// (平台/组名/格式/分辨率/语言)。只比这些「源特征」token,忽略每集都变的日文集标题。
import type { AnimeCandidate } from '../types.js';

// 集数样 / 哈希样 token(跨集会变,匹配时剔除)
const EP_TOK = /^(s\d{1,2}e\d{1,3}|e\d{1,3}|v\d+|\d{1,4}|[0-9a-f]{8})$/;

// 「源特征」token:文件名里的拉丁字母数字(剔除集号/哈希)
export function sourceTokens(name: string): Set<string> {
  const out = new Set<string>();
  for (const t of String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)) {
    if (t && !EP_TOK.test(t)) out.add(t);
  }
  return out;
}

// 整体 token(含 CJK):源特征为空(纯日文命名)时的退路
export function fileTokens(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/\.(ass|ssa|srt|vtt|sub|sbv)$/i, '')
    .split(/[^a-z0-9぀-ヿ一-鿿]+/)
    .filter((t) => t && !EP_TOK.test(t));
}

// 在候选里挑与参考文件同源者:优先比「源特征」,为空时退化到整体 token
export function pickSameSource<T extends { name: string }>(files: T[], refName: string): T | null {
  if (!refName) return null;
  const refSig = sourceTokens(refName);
  const useSig = refSig.size >= 1;
  const refFull = new Set(fileTokens(refName));
  let best: T | null = null,
    bestScore = -1,
    second = -1;
  for (const f of files) {
    const s = useSig
      ? jaccard(refSig, sourceTokens(f.name))
      : jaccard(refFull, new Set(fileTokens(f.name)));
    if (s > bestScore) {
      second = bestScore;
      bestScore = s;
      best = f;
    } else if (s > second) {
      second = s;
    }
  }
  const thresh = useSig ? 0.5 : 0.6;
  // 达阈值,或明显优于次优(应对源特征很少的情况),即认为同源
  if (best && (bestScore >= thresh || (bestScore >= 0.34 && bestScore - second >= 0.34)))
    return best;
  return null;
}

// 番名归一:NFKC(全角→半角、全角空格 U+3000→半角空格)+ 小写 + 空白折叠 + trim。
// 刻意保守——只吸收「全/半角空格差异、大小写」这类无意义差异,不做模糊匹配。
export function normTitle(s: unknown): string {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// 自动选番:仅当「唯一」一个候选的某个标题(日文/罗马字/英文)与查询「精确相等」才返回它;
// 否则(0 个或 ≥2 个精确命中)返回 null → 回落人工选,避免选错季/错作品。
// 例:查询「メイドインアビス 烈日の黄金郷」→ 只命中第二季条目;查询「メイドインアビス」不会命中它。
type TitleFields = Partial<Pick<AnimeCandidate, 'native' | 'romaji' | 'english' | 'title'>>;

export function pickExactAnime<T extends TitleFields>(candidates: T[], query: string): T | null {
  const q = normTitle(query);
  if (!q || !candidates || !candidates.length) return null;
  const hits = candidates.filter((a) =>
    [a.native, a.romaji, a.english, a.title].some((t) => t && normTitle(t) === q),
  );
  return hits.length === 1 ? hits[0] : null;
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}
