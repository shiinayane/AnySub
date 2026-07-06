// Parse "series name + episode" from the page title (aimed at DMM/common Japanese formats, also handles generic forms).
// Example: "新世紀エヴァンゲリオン 第壱話 使徒、襲来 (アニメ/1995年)" → {series:'新世紀エヴァンゲリオン', episode:'1'}
import type { DetectInfo } from '../types.js';

const KANJI: Record<string, number> = {
  〇: 0,
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  // Uppercase/old-form numerals (EVA and others often use 第壱話/第弐話)
  壱: 1,
  弐: 2,
  参: 3,
  肆: 4,
  伍: 5,
  陸: 6,
  漆: 7,
  捌: 8,
  玖: 9,
};
const UNITS: Record<string, number> = { 十: 10, 拾: 10, 百: 100, 千: 1000 };

function toHalfDigits(s: string): string {
  return s.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

// Kanji numerals (including old forms) → integer; plain digits convert directly
export function jpNumToInt(s: string): number {
  if (/^[0-9０-９]+$/.test(s)) return parseInt(toHalfDigits(s), 10);
  let total = 0,
    cur = 0,
    seen = false;
  for (const ch of s) {
    if (ch in KANJI) {
      cur = KANJI[ch];
      seen = true;
    } else if (ch in UNITS) {
      total += (cur || 1) * UNITS[ch];
      cur = 0;
      seen = true;
    }
  }
  total += cur;
  return seen ? total : NaN;
}

export function parseVideoTitle(raw: string): DetectInfo {
  let t = (raw || '').trim();
  // Strip the site name (the part after common separators)
  t = t.split(/[|｜]/)[0].trim();
  // Strip trailing parenthetical metadata: (アニメ/1995年), 【...】, [...] etc.
  t = t.replace(/\s*[(（【[][^)）】\]]*[)）】\]]\s*$/g, '').trim();

  let episode = '';
  // 第X話 / 第X话 / 第X回 (X being Arabic/fullwidth/kanji numerals)
  let m = t.match(/第\s*([0-9０-９〇零一二三四五六七八九十百千壱弐参肆伍陸漆捌玖拾]+)\s*[話话回]/);
  if (!m) m = t.match(/(?:#|＃|Ep\.?\s*|Episode\s*|EP\s*)([0-9０-９]+)/i); // #12 / Ep.12 / Episode 12
  if (m) {
    const n = jpNumToInt(m[1]);
    if (isFinite(n)) episode = String(n);
    t = t.slice(0, m.index).trim(); // series name = the part before the episode marker
  }
  // Clean up leftover trailing separators/whitespace
  t = t.replace(/[\s\-–—・:：~〜]+$/g, '').trim();
  return { series: t.slice(0, 60), episode };
}
