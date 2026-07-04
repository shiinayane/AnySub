// furigana 逐字对齐:给定「汉字串 + 一段假名读音」,把读音切分并对齐到每个汉字。
// 用于修正「近接猟兵（りょうへい）」这类——括号读音只覆盖后缀汉字(猟兵),
// 而不是前面全部(近接猟兵)。纯逻辑,有单测。读音表懒加载 JSON.parse。
import { KANJI_READINGS_JSON } from './kanji-readings.js';

let READINGS = null; // { 汉字: [平假名读音候选,...] }
function readingsOf(kanji) {
  if (!READINGS) {
    READINGS = Object.create(null);
    const raw = JSON.parse(KANJI_READINGS_JSON);
    for (const k in raw) READINGS[k] = raw[k].split(',');
  }
  return READINGS[kanji];
}

// 片假名 → 平假名(读音可能以片假名书写);丢长音符/非假名
function toHira(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x30a1 && c <= 0x30f6) out += String.fromCodePoint(c - 0x60);
    else if (c >= 0x3041 && c <= 0x3096) out += ch;
    else if (c === 0x30fc) out += '';
  }
  return out;
}

// 连浊(rendaku):非首汉字的首音可浊化(か→が、は→ば/ぱ…),返回可能的替换形
const VOICE = {
  'か': ['が'], 'き': ['ぎ'], 'く': ['ぐ'], 'け': ['げ'], 'こ': ['ご'],
  'さ': ['ざ'], 'し': ['じ'], 'す': ['ず'], 'せ': ['ぜ'], 'そ': ['ぞ'],
  'た': ['だ'], 'ち': ['ぢ'], 'つ': ['づ'], 'て': ['で'], 'と': ['ど'],
  'は': ['ば', 'ぱ'], 'ひ': ['び', 'ぴ'], 'ふ': ['ぶ', 'ぷ'], 'へ': ['べ', 'ぺ'], 'ほ': ['ぼ', 'ぽ'],
};
function rendakuForms(s) {
  const v = VOICE[s[0]];
  if (!v) return [];
  return v.map((x) => x + s.slice(1));
}

// 促音便(gemination):非末汉字末音 く/き/つ/ち 可变 っ(学 がく+校→がっこう)
const GEMINATE_LAST = new Set(['く', 'き', 'つ', 'ち']);
function geminate(s) {
  return GEMINATE_LAST.has(s[s.length - 1]) ? s.slice(0, -1) + 'っ' : null;
}

// 某汉字在位置 index(是否末字 isLast)下,一条基础读音派生出的全部可匹配候选
function* variants(base, index, isLast) {
  const firsts = [base];
  if (index > 0) for (const r of rendakuForms(base)) firsts.push(r); // 连浊仅非首字
  for (const f of firsts) {
    yield f;
    if (!isLast) { const g = geminate(f); if (g) yield g; } // 促音仅非末字
  }
}

// 尝试把整个 kanjis(数组)对齐到 reading(平假名),要求「读音被完全消费」。
// 成功返回每个汉字对应的读音片段数组,失败返回 null。
function alignRun(kanjis, reading) {
  const n = kanjis.length;
  const out = new Array(n);
  function dfs(i, pos) {
    if (i === n) return pos === reading.length;
    const cands = readingsOf(kanjis[i]);
    if (!cands) return false;
    for (const base of cands) {
      for (const cand of variants(base, i, i === n - 1)) {
        if (cand && reading.startsWith(cand, pos)) {
          out[i] = cand;
          if (dfs(i + 1, pos + cand.length)) return true;
        }
      }
    }
    return false;
  }
  return dfs(0, 0) ? out : null;
}

// 对外:把 base(汉字串)与 reading(读音)对齐。
// 返回 { plain, pairs }:plain 为对不齐、留作纯文本的前缀汉字;
//   pairs 为 [[汉字,读音片段],...] 逐字注音(覆盖 base 的后缀)。
// 完全无法对齐时返回 null(调用方回退为整串注音)。
export function alignFurigana(base, rawReading) {
  const reading = toHira(rawReading);
  if (!reading) return null;
  const kanjis = [...base];
  // 从整串开始,逐个从左剥离,取「覆盖汉字最多」(前缀最短)的成功解
  for (let start = 0; start < kanjis.length; start++) {
    const suffix = kanjis.slice(start);
    const res = alignRun(suffix, reading);
    if (res) {
      return {
        plain: kanjis.slice(0, start).join(''),
        pairs: suffix.map((k, i) => [k, res[i]]),
      };
    }
  }
  return null;
}
