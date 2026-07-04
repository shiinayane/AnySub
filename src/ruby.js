// 把日文字幕里的注音转成 HTML <ruby>(仅文本渲染路径;overlay 的 div 原生支持)。
// 支持两种标记:
//   《》 青空文库式:｜base《かな》 或 漢字《かな》——明确表注音,始终转。
//   （）括号式:漢字（かな)——启发式(内容纯假名且紧贴汉字),可由 allowParen 关闭。
const KANJI = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\u3005';
const KANA = '\\u3041-\\u3096\\u30a1-\\u30fa\\u30fc';

const RE_AOZORA_BAR = new RegExp('｜([^｜《》]+)《([' + KANA + ']+)》', 'g');
const RE_AOZORA = new RegExp('([' + KANJI + ']+)《([' + KANA + ']+)》', 'g');
const RE_PAREN = new RegExp('([' + KANJI + ']+)[（(]([' + KANA + ']+)[）)]', 'g');

export function applyRuby(text, allowParen) {
  if (!text) return text;
  // 快速跳过:没有任何可能的注音标记时直接返回
  if (!/[《｜]/.test(text) && !(allowParen && /[（(]/.test(text))) return text;
  text = text.replace(RE_AOZORA_BAR, (m, base, ruby) => tag(base, ruby));
  text = text.replace(RE_AOZORA, (m, base, ruby) => tag(base, ruby));
  if (allowParen) text = text.replace(RE_PAREN, (m, base, ruby) => tag(base, ruby));
  return text;
}

function tag(base, ruby) {
  return '<ruby>' + base + '<rt>' + ruby + '</rt></ruby>';
}
