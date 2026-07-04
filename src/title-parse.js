// 从页面标题解析「番剧名 + 集数」(面向 DMM/日文常见格式,也兼容通用写法)。
// 例:「新世紀エヴァンゲリオン 第壱話 使徒、襲来 (アニメ/1995年)」→ {series:'新世紀エヴァンゲリオン', episode:'1'}

const KANJI = { '〇': 0, '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
  // 大写/旧字体数字(EVA 等常用 第壱話/第弐話)
  '壱': 1, '弐': 2, '参': 3, '肆': 4, '伍': 5, '陸': 6, '漆': 7, '捌': 8, '玖': 9 };
const UNITS = { '十': 10, '拾': 10, '百': 100, '千': 1000 };

function toHalfDigits(s) {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

// 汉数字(含旧字体)→ 整数;纯数字直接转
export function jpNumToInt(s) {
  if (/^[0-9０-９]+$/.test(s)) return parseInt(toHalfDigits(s), 10);
  let total = 0, cur = 0, seen = false;
  for (const ch of s) {
    if (ch in KANJI) { cur = KANJI[ch]; seen = true; }
    else if (ch in UNITS) { total += (cur || 1) * UNITS[ch]; cur = 0; seen = true; }
  }
  total += cur;
  return seen ? total : NaN;
}

export function parseVideoTitle(raw) {
  let t = (raw || '').trim();
  // 去掉站点名(常见分隔符后半)
  t = t.split(/[|｜]/)[0].trim();
  // 去掉结尾的括号元数据:(アニメ/1995年)、【...】、[...] 等
  t = t.replace(/\s*[(（【\[][^)）】\]]*[)）】\]]\s*$/g, '').trim();

  let episode = '';
  // 第X話 / 第X话 / 第X回(X 为阿拉伯/全角/汉数字)
  let m = t.match(/第\s*([0-9０-９〇零一二三四五六七八九十百千壱弐参肆伍陸漆捌玖拾]+)\s*[話话回]/);
  if (!m) m = t.match(/(?:#|＃|Ep\.?\s*|Episode\s*|EP\s*)([0-9０-９]+)/i); // #12 / Ep.12 / Episode 12
  if (m) {
    const n = jpNumToInt(m[1]);
    if (isFinite(n)) episode = String(n);
    t = t.slice(0, m.index).trim(); // 番剧名 = 集数标记之前的部分
  }
  // 清理尾部残留的分隔符/空白
  t = t.replace(/[\s\-–—・:：~〜]+$/g, '').trim();
  return { series: t.slice(0, 60), episode };
}
