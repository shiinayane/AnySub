// 构建期离线脚本:从 KANJIDIC2 抽取「汉字 → 读音候选」压缩表,产物提交进仓库。
// 只取常用(grade 1-8)+ 人名用(grade 9-10)汉字,足够覆盖动画字幕。
// 读音全部归一到平假名,去 okurigana / 词缀标记,用于 furigana 逐字对齐。
//
// 用法: node scripts/build-readings.mjs <kanjidic2.xml> > src/kanji-readings.js
//
// 数据源: KANJIDIC2 (c) EDRDG, CC BY-SA 4.0 — https://www.edrdg.org/kanjidic/kanjidic2.xml.gz
import { readFileSync } from 'node:fs';

const xmlPath = process.argv[2];
if (!xmlPath) {
  console.error('usage: build-readings.mjs <kanjidic2.xml>');
  process.exit(1);
}
const xml = readFileSync(xmlPath, 'utf8');

// 片假名 → 平假名(逐字符 -0x60);丢弃长音符 ー / 非假名
function toHira(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x30a1 && c <= 0x30f6)
      out += String.fromCodePoint(c - 0x60); // カタ→ひら
    else if (c >= 0x3041 && c <= 0x3096)
      out += ch; // 已是平假名
    else if (c === 0x30fc) out += ''; // 长音符:on 读音里一般没有,丢弃
    // 其余(标点/罗马字)丢弃
  }
  return out;
}

// 规整单条读音:剥词缀 '-'、okurigana(取 '.' 之前)、归一平假名
function normReading(raw) {
  let r = raw.trim();
  r = r.replace(/-/g, ''); // 前/后缀标记
  const dot = r.indexOf('.');
  if (dot >= 0) r = r.slice(0, dot); // okurigana:只留汉字对应的读音部分
  return toHira(r);
}

const map = {};
const reChar = /<character>([\s\S]*?)<\/character>/g;
let m;
while ((m = reChar.exec(xml))) {
  const block = m[1];
  const lit = /<literal>(.*?)<\/literal>/.exec(block);
  if (!lit) continue;
  const kanji = lit[1];
  const grade = /<grade>(\d+)<\/grade>/.exec(block);
  if (!grade) continue; // 无年级 = 非常用/人名用,跳过
  const g = +grade[1];
  if (g < 1 || g > 10) continue;

  const readings = new Set();
  let r;
  const reOn = /<reading r_type="ja_on">(.*?)<\/reading>/g;
  while ((r = reOn.exec(block))) {
    const v = normReading(r[1]);
    if (v) readings.add(v);
  }
  const reKun = /<reading r_type="ja_kun">(.*?)<\/reading>/g;
  while ((r = reKun.exec(block))) {
    const v = normReading(r[1]);
    if (v) readings.add(v);
  }
  const reNan = /<nanori>(.*?)<\/nanori>/g;
  while ((r = reNan.exec(block))) {
    const v = normReading(r[1]);
    if (v) readings.add(v);
  }

  if (readings.size) map[kanji] = [...readings].join(',');
}

const count = Object.keys(map).length;
const json = JSON.stringify(map);
// 以「JSON 字符串常量」导出,懒 JSON.parse(避免每页注入都解析大对象)
const out = `// 自动生成,请勿手改。见 scripts/build-readings.mjs。
// 汉字读音表(常用+人名用,${count} 字),源自 KANJIDIC2 (c) EDRDG,CC BY-SA 4.0。
// 值为逗号分隔的平假名读音候选,供 furigana-align.js 逐字对齐。
export const KANJI_READINGS_JSON = ${JSON.stringify(json)};
`;
process.stdout.write(out);
process.stderr.write(
  `[build-readings] ${count} kanji, json ${(json.length / 1024).toFixed(1)}KB\n`,
);
