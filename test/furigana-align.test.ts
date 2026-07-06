import { test } from 'vitest';
import assert from 'node:assert/strict';
import { alignFurigana } from '../src/subtitle/furigana-align.js';

// Whole-string alignment: each kanji gets its own reading
test('整串音读对齐 温厚→おんこう', () => {
  const r = alignFurigana('温厚', 'おんこう');
  assert.equal(r!.plain, '');
  assert.deepEqual(r!.pairs, [
    ['温', 'おん'],
    ['厚', 'こう'],
  ]);
});

test('单字 使徒→しと', () => {
  const r = alignFurigana('使徒', 'しと');
  assert.equal(r!.plain, '');
  assert.deepEqual(r!.pairs, [
    ['使', 'し'],
    ['徒', 'と'],
  ]);
});

// Core case: the reading only covers the suffix → the prefix is left as plain text
test('后缀读音 近接猟兵→りょうへい 只注 猟兵', () => {
  const r = alignFurigana('近接猟兵', 'りょうへい');
  assert.equal(r!.plain, '近接');
  assert.deepEqual(r!.pairs, [
    ['猟', 'りょう'],
    ['兵', 'へい'],
  ]);
});

// Rendaku (sequential voicing)
test('连浊 立場→たちば(場: は→ば)', () => {
  const r = alignFurigana('立場', 'たちば');
  assert.equal(r!.plain, '');
  assert.deepEqual(r!.pairs, [
    ['立', 'たち'],
    ['場', 'ば'],
  ]);
});

test('连浊 花火→はなび(火: ひ→び)', () => {
  const r = alignFurigana('花火', 'はなび');
  assert.equal(r!.plain, '');
  assert.deepEqual(r!.pairs, [
    ['花', 'はな'],
    ['火', 'び'],
  ]);
});

// Sokuonbin (gemination)
test('促音 学校→がっこう(学: がく→がっ)', () => {
  const r = alignFurigana('学校', 'がっこう');
  assert.equal(r!.plain, '');
  assert.deepEqual(r!.pairs, [
    ['学', 'がっ'],
    ['校', 'こう'],
  ]);
});

// Jukujikun: cannot be aligned character by character → returns null (the caller falls back to whole-string furigana)
test('熟字訓 今日→きょう 无法逐字对齐 → null', () => {
  assert.equal(alignFurigana('今日', 'きょう'), null);
});

// Katakana readings can also be aligned (normalized to hiragana first)
test('片假名读音 温厚→オンコウ', () => {
  const r = alignFurigana('温厚', 'オンコウ');
  assert.deepEqual(r!.pairs, [
    ['温', 'おん'],
    ['厚', 'こう'],
  ]);
});

// Non-standard / rare characters: cannot be aligned, returns null without throwing
test('表外字 → null 不抛错', () => {
  assert.equal(alignFurigana('々', 'のま'), null);
});

// DoS protection: a maliciously long, highly ambiguous kanji string must return quickly and must not blow the stack exponentially
test('超长汉字串/读音:超上限直接回退,不卡死', () => {
  const base = '生'.repeat(60); // highly ambiguous kanji (dozens of readings)
  const reading = 'いく'.repeat(60); // long, with overlapping prefixes, impossible to fully consume
  const t0 = process.hrtime.bigint();
  const r = alignFurigana(base, reading);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(r, null); // exceeds MAX_KANJI → falls back
  assert.ok(ms < 50, `对齐耗时 ${ms.toFixed(1)}ms,应远小于 50ms`);
});

// Memoization: a highly ambiguous string at the critical length (within the limit) must be fast (failed nodes are memoized, not exponential), regardless of whether it ultimately aligns
test('上限内高分歧串:记忆化保证快速返回', () => {
  const base = '生'.repeat(24); // = MAX_KANJI
  const reading = 'ずり'.repeat(24); // overlapping prefixes, many branches
  const t0 = process.hrtime.bigint();
  alignFurigana(base, reading); // the result does not matter, this only verifies there is no exponential stack blowup
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 50, `对齐耗时 ${ms.toFixed(1)}ms,应远小于 50ms`);
});
