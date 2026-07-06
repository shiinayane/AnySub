// Build-time offline script: extract a compressed "kanji → reading candidates" table from KANJIDIC2, with the output committed to the repo.
// Only takes common (grade 1-8) + name-use (grade 9-10) kanji, which is enough to cover anime subtitles.
// All readings are normalized to hiragana, with okurigana / affix markers stripped, for use in per-character furigana alignment.
//
// Usage: node scripts/build-readings.mjs <kanjidic2.xml> > src/subtitle/kanji-readings.ts
//
// Data source: KANJIDIC2 (c) EDRDG, CC BY-SA 4.0 — https://www.edrdg.org/kanjidic/kanjidic2.xml.gz
import { readFileSync } from 'node:fs';

const xmlPath = process.argv[2];
if (!xmlPath) {
  console.error('usage: build-readings.mjs <kanjidic2.xml>');
  process.exit(1);
}
const xml = readFileSync(xmlPath, 'utf8');

// Katakana → hiragana (per character, -0x60); drop the long-vowel mark ー / non-kana
function toHira(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x30a1 && c <= 0x30f6)
      out += String.fromCodePoint(c - 0x60); // katakana → hiragana
    else if (c >= 0x3041 && c <= 0x3096)
      out += ch; // already hiragana
    else if (c === 0x30fc) out += ''; // long-vowel mark: generally absent from on readings, drop it
    // everything else (punctuation/romaji) is dropped
  }
  return out;
}

// Normalize a single reading: strip affix '-', okurigana (keep the part before '.'), normalize to hiragana
function normReading(raw) {
  let r = raw.trim();
  r = r.replace(/-/g, ''); // prefix/suffix markers
  const dot = r.indexOf('.');
  if (dot >= 0) r = r.slice(0, dot); // okurigana: keep only the reading part corresponding to the kanji
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
  if (!grade) continue; // no grade = not common/name-use, skip
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
// Export as a "JSON string constant", lazily JSON.parse'd (avoids parsing a large object on every page injection)
const out = `// Auto-generated, do not edit by hand. See scripts/build-readings.mjs.
// Kanji reading table (common-use + name-use kanji, ${count} characters), derived from KANJIDIC2 (c) EDRDG, CC BY-SA 4.0.
// Values are comma-separated hiragana reading candidates, used by furigana-align.js for per-character alignment.
export const KANJI_READINGS_JSON = ${JSON.stringify(json)};
`;
process.stdout.write(out);
process.stderr.write(
  `[build-readings] ${count} kanji, json ${(json.length / 1024).toFixed(1)}KB\n`,
);
