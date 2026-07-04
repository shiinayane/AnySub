// 跨集「同源」匹配(纯逻辑,无 DOM 依赖,便于单测)。
// 同一番剧的候选番剧名相同,不用于区分;真正标识「源」的是文件名里的拉丁标签
// (平台/组名/格式/分辨率/语言)。只比这些「源特征」token,忽略每集都变的日文集标题。

// 集数样 / 哈希样 token(跨集会变,匹配时剔除)
const EP_TOK = /^(s\d{1,2}e\d{1,3}|e\d{1,3}|v\d+|\d{1,4}|[0-9a-f]{8})$/;

// 「源特征」token:文件名里的拉丁字母数字(剔除集号/哈希)
export function sourceTokens(name) {
  const out = new Set();
  for (const t of String(name || '').toLowerCase().split(/[^a-z0-9]+/)) {
    if (t && !EP_TOK.test(t)) out.add(t);
  }
  return out;
}

// 整体 token(含 CJK):源特征为空(纯日文命名)时的退路
export function fileTokens(name) {
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

export function jaccard(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const uni = a.size + b.size - inter;
  return uni ? inter / uni : 0;
}
