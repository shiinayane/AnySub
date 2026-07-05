// 把日文字幕里的注音转成 HTML <ruby>(仅文本渲染路径;overlay 的 div 原生支持)。
// 支持两种标记:
//   《》 青空文库式:｜base《かな》 或 漢字《かな》——明确表注音,始终转。
//   （）括号式:漢字（かな)——启发式(内容纯假名且紧贴汉字),可由 allowParen 关闭。
import { alignFurigana } from './furigana-align.js';

const KANJI = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005';
const KANA = '\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc';

const RE_AOZORA_BAR = new RegExp('｜([^｜《》]+)《([' + KANA + ']+)》', 'g');
const RE_AOZORA = new RegExp('([' + KANJI + ']+)《([' + KANA + ']+)》', 'g');
const RE_PAREN = new RegExp('([' + KANJI + ']+)[（(]([' + KANA + ']+)[）)]', 'g');

export function applyRuby(text: string, allowParen?: boolean): string {
  if (!text) return text;
  // 快速跳过:没有任何可能的注音标记时直接返回
  if (!/[《｜]/.test(text) && !(allowParen && /[（(]/.test(text))) return text;
  text = text.replace(RE_AOZORA_BAR, (_m, base, ruby) => tag(base, ruby));
  text = text.replace(RE_AOZORA, (_m, base, ruby) => tag(base, ruby));
  if (allowParen) text = text.replace(RE_PAREN, (_m, base, ruby) => tag(base, ruby));
  return text;
}

// 优先逐字对齐(读音精确落到各汉字,后缀读音不再铺满整串);对不齐则整串注音回退。
// base/ruby 均来自正则捕获的「纯汉字 / 纯假名」,不含需转义字符。
function tag(base: string, ruby: string): string {
  const a = alignFurigana(base, ruby);
  if (!a) return group(base, ruby);
  let html = a.plain; // 对不齐、留作纯文本的前缀汉字
  html += '<ruby>';
  for (const [k, r] of a.pairs) html += k + '<rt>' + r + '</rt>';
  html += '</ruby>';
  return html;
}

function group(base: string, ruby: string): string {
  return '<ruby>' + base + '<rt>' + ruby + '</rt></ruby>';
}
