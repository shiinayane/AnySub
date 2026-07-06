// Cross-episode "same-source" matching (pure logic, no DOM dependency, easy to unit-test).
// Candidates of the same anime share the same series name, so it isn't used to distinguish them; what really identifies the "source" is the Latin tags in the filename
// (platform/group name/format/resolution/language). Compare only these "source-signature" tokens, ignoring the Japanese episode title that changes every episode.
import type { AnimeCandidate } from '../types.js';

// Episode-like / hash-like tokens (change across episodes, stripped out during matching)
const EP_TOK = /^(s\d{1,2}e\d{1,3}|e\d{1,3}|v\d+|\d{1,4}|[0-9a-f]{8})$/;

// "Source-signature" tokens: the Latin alphanumerics in the filename (episode numbers/hashes removed)
export function sourceTokens(name: string): Set<string> {
  const out = new Set<string>();
  for (const t of String(name || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)) {
    if (t && !EP_TOK.test(t)) out.add(t);
  }
  return out;
}

// Whole-name tokens (including CJK): the fallback when the source signature is empty (pure-Japanese naming)
export function fileTokens(name: string): string[] {
  return String(name || '')
    .toLowerCase()
    .replace(/\.(ass|ssa|srt|vtt|sub|sbv)$/i, '')
    .split(/[^a-z0-9぀-ヿ一-鿿]+/)
    .filter((t) => t && !EP_TOK.test(t));
}

// Pick the candidate that shares the source with the reference file: compare the "source signature" first, degrading to whole-name tokens when it's empty
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
  // Considered same-source if it reaches the threshold, or is clearly better than the runner-up (handles cases with very few source-signature tokens)
  if (best && (bestScore >= thresh || (bestScore >= 0.34 && bestScore - second >= 0.34)))
    return best;
  return null;
}

// Series-name normalization: NFKC (fullwidth→halfwidth, fullwidth space U+3000→halfwidth space) + lowercase + whitespace collapse + trim.
// Deliberately conservative — absorbs only meaningless differences like "fullwidth/halfwidth space differences, letter case", no fuzzy matching.
export function normTitle(s: unknown): string {
  return String(s == null ? '' : s)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Automatic anime selection: return a candidate only when "exactly one" candidate has some title (Japanese/romaji/English) that is "exactly equal" to the query;
// otherwise (0 or ≥2 exact hits) return null → fall back to manual selection, to avoid picking the wrong season / wrong work.
// Example: query "メイドインアビス 烈日の黄金郷" → hits only the second-season entry; query "メイドインアビス" won't hit it.
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
