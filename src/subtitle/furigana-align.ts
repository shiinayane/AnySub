// Per-character furigana alignment: given "a kanji string + a run of kana reading", split the reading and align it onto each kanji.
// Used to fix cases like 「近接猟兵（りょうへい）」 — where the parenthesized reading only covers the suffix kanji (猟兵),
// not all of the preceding kanji (近接猟兵). Pure logic, with unit tests. The reading table is lazily loaded via JSON.parse.
import { KANJI_READINGS_JSON } from './kanji-readings.js';
import type { FuriganaAlign } from '../types.js';

// Hard limits: prevent malicious/abnormal subtitles from triggering deep recursion via an overlong kanji string + reading (remotely controllable input, so we must guard against DoS).
// Real furigana kanji strings are generally ≤8 characters, so 24/48 are already extremely generous; beyond that we simply give up on per-character alignment (falling back to whole-string furigana).
const MAX_KANJI = 24;
const MAX_READING = 48;

let READINGS: Record<string, string[]> | null = null; // { kanji: [hiragana reading candidates, ...] }
function readingsOf(kanji: string): string[] | undefined {
  if (!READINGS) {
    READINGS = Object.create(null) as Record<string, string[]>;
    try {
      const raw = JSON.parse(KANJI_READINGS_JSON) as Record<string, string>;
      for (const k in raw) READINGS[k] = raw[k].split(',');
    } catch (_) {
      /* Corrupt data: leave the table empty, so alignment always fails and falls back to whole-string furigana, without affecting the rest of the rendering */
    }
  }
  return READINGS[kanji];
}

// Katakana → hiragana (readings may be written in katakana); drop the long-vowel mark / non-kana characters
function toHira(s: string): string {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x30a1 && c <= 0x30f6) out += String.fromCodePoint(c - 0x60);
    else if (c >= 0x3041 && c <= 0x3096) out += ch;
    else if (c === 0x30fc) out += '';
  }
  return out;
}

// Rendaku (sequential voicing): the initial sound of a non-first kanji can be voiced (か→が, は→ば/ぱ…); returns the possible substituted forms
const VOICE: Record<string, string[]> = {
  か: ['が'],
  き: ['ぎ'],
  く: ['ぐ'],
  け: ['げ'],
  こ: ['ご'],
  さ: ['ざ'],
  し: ['じ'],
  す: ['ず'],
  せ: ['ぜ'],
  そ: ['ぞ'],
  た: ['だ'],
  ち: ['ぢ'],
  つ: ['づ'],
  て: ['で'],
  と: ['ど'],
  は: ['ば', 'ぱ'],
  ひ: ['び', 'ぴ'],
  ふ: ['ぶ', 'ぷ'],
  へ: ['べ', 'ぺ'],
  ほ: ['ぼ', 'ぽ'],
};
function rendakuForms(s: string): string[] {
  const v = VOICE[s[0]];
  if (!v) return [];
  return v.map((x) => x + s.slice(1));
}

// Gemination (sokuon): the final sound く/き/つ/ち of a non-final kanji can become っ (学 がく + 校 → がっこう)
const GEMINATE_LAST = new Set(['く', 'き', 'つ', 'ち']);
function geminate(s: string): string | null {
  return GEMINATE_LAST.has(s[s.length - 1]) ? s.slice(0, -1) + 'っ' : null;
}

// For a given kanji at position index (whether it is the last character, isLast), all matchable candidates derived from one base reading
function* variants(base: string, index: number, isLast: boolean): Generator<string> {
  const firsts = [base];
  if (index > 0) for (const r of rendakuForms(base)) firsts.push(r); // Rendaku only for non-first characters
  for (const f of firsts) {
    yield f;
    if (!isLast) {
      const g = geminate(f);
      if (g) yield g;
    } // Gemination only for non-final characters
  }
}

// Attempt to align the entire kanjis (array) onto reading (hiragana), requiring that "the reading is fully consumed".
// On success returns an array of reading segments for each kanji; on failure returns null.
// Memoize failed nodes (i,pos): without it, highly ambiguous kanji (e.g. 「生」 with 37 readings) + a long reading would backtrack exponentially.
function alignRun(kanjis: string[], reading: string): string[] | null {
  const n = kanjis.length;
  const out: string[] = new Array(n);
  const stride = reading.length + 1;
  const failed = new Set<number>(); // (i,pos) nodes known to be unable to reach the end, to avoid re-expanding them
  function dfs(i: number, pos: number): boolean {
    if (i === n) return pos === reading.length;
    const memo = i * stride + pos;
    if (failed.has(memo)) return false;
    const cands = readingsOf(kanjis[i]);
    if (cands) {
      for (const base of cands) {
        for (const cand of variants(base, i, i === n - 1)) {
          if (cand && reading.startsWith(cand, pos)) {
            out[i] = cand;
            if (dfs(i + 1, pos + cand.length)) return true;
          }
        }
      }
    }
    failed.add(memo);
    return false;
  }
  return dfs(0, 0) ? out : null;
}

// Public API: align base (kanji string) with reading (the reading).
// Returns { plain, pairs }: plain is the prefix kanji that could not be aligned, left as plain text;
//   pairs is [[kanji, reading segment], ...], the per-character furigana (covering the suffix of base).
// Returns null when alignment is entirely impossible (the caller falls back to whole-string furigana).
export function alignFurigana(base: string, rawReading: string): FuriganaAlign | null {
  const reading = toHira(rawReading);
  if (!reading) return null;
  const kanjis = [...base];
  if (kanjis.length > MAX_KANJI || reading.length > MAX_READING) return null; // DoS guard: fall back immediately when overlong

  // Start from the full string and peel characters off the left one by one, taking the successful solution that "covers the most kanji" (shortest prefix)
  for (let start = 0; start < kanjis.length; start++) {
    const suffix = kanjis.slice(start);
    const res = alignRun(suffix, reading);
    if (res) {
      return {
        plain: kanjis.slice(0, start).join(''),
        pairs: suffix.map((k, i) => [k, res[i]] as [string, string]),
      };
    }
  }
  return null;
}
