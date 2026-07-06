// Convert furigana in Japanese subtitles into HTML <ruby> (text rendering path only; the overlay's div supports it natively).
// Two notations are supported:
//   《》 Aozora Bunko style: ｜base《かな》 or 漢字《かな》 — an explicit furigana marker, always converted.
//   （）parenthesis style: 漢字（かな) — heuristic (content is pure kana and directly follows kanji), can be disabled via allowParen.
import { alignFurigana } from './furigana-align.js';

const KANJI = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005';
const KANA = '\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc';

const RE_AOZORA_BAR = new RegExp('｜([^｜《》]+)《([' + KANA + ']+)》', 'g');
const RE_AOZORA = new RegExp('([' + KANJI + ']+)《([' + KANA + ']+)》', 'g');
const RE_PAREN = new RegExp('([' + KANJI + ']+)[（(]([' + KANA + ']+)[）)]', 'g');

export function applyRuby(text: string, allowParen?: boolean): string {
  if (!text) return text;
  // Fast skip: return immediately when there is no possible furigana marker
  if (!/[《｜]/.test(text) && !(allowParen && /[（(]/.test(text))) return text;
  text = text.replace(RE_AOZORA_BAR, (_m, base, ruby) => tag(base, ruby));
  text = text.replace(RE_AOZORA, (_m, base, ruby) => tag(base, ruby));
  if (allowParen) text = text.replace(RE_PAREN, (_m, base, ruby) => tag(base, ruby));
  return text;
}

// Prefer per-character alignment (readings map precisely onto each kanji, so a suffix reading no longer spreads across the whole string); fall back to whole-string furigana when alignment fails.
// Both base/ruby come from the regex captures of "pure kanji / pure kana", and contain no characters that need escaping.
function tag(base: string, ruby: string): string {
  const a = alignFurigana(base, ruby);
  if (!a) return group(base, ruby);
  let html = a.plain; // Prefix kanji that could not be aligned, left as plain text
  html += '<ruby>';
  for (const [k, r] of a.pairs) html += k + '<rt>' + r + '</rt>';
  html += '</ruby>';
  return html;
}

function group(base: string, ruby: string): string {
  return '<ruby>' + base + '<rt>' + ruby + '</rt></ruby>';
}
