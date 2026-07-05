import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alignFurigana } from '../src/furigana-align.js';

// 整串对齐:每个汉字各注各的
test('整串音读对齐 温厚→おんこう', () => {
  const r = alignFurigana('温厚', 'おんこう');
  assert.equal(r.plain, '');
  assert.deepEqual(r.pairs, [
    ['温', 'おん'],
    ['厚', 'こう'],
  ]);
});

test('单字 使徒→しと', () => {
  const r = alignFurigana('使徒', 'しと');
  assert.equal(r.plain, '');
  assert.deepEqual(r.pairs, [
    ['使', 'し'],
    ['徒', 'と'],
  ]);
});

// 核心用例:读音只覆盖后缀 → 前缀留作纯文本
test('后缀读音 近接猟兵→りょうへい 只注 猟兵', () => {
  const r = alignFurigana('近接猟兵', 'りょうへい');
  assert.equal(r.plain, '近接');
  assert.deepEqual(r.pairs, [
    ['猟', 'りょう'],
    ['兵', 'へい'],
  ]);
});

// 连浊
test('连浊 立場→たちば(場: は→ば)', () => {
  const r = alignFurigana('立場', 'たちば');
  assert.equal(r.plain, '');
  assert.deepEqual(r.pairs, [
    ['立', 'たち'],
    ['場', 'ば'],
  ]);
});

test('连浊 花火→はなび(火: ひ→び)', () => {
  const r = alignFurigana('花火', 'はなび');
  assert.equal(r.plain, '');
  assert.deepEqual(r.pairs, [
    ['花', 'はな'],
    ['火', 'び'],
  ]);
});

// 促音便
test('促音 学校→がっこう(学: がく→がっ)', () => {
  const r = alignFurigana('学校', 'がっこう');
  assert.equal(r.plain, '');
  assert.deepEqual(r.pairs, [
    ['学', 'がっ'],
    ['校', 'こう'],
  ]);
});

// 熟字訓:逐字对不齐 → 返回 null(调用方回退整串注音)
test('熟字訓 今日→きょう 无法逐字对齐 → null', () => {
  assert.equal(alignFurigana('今日', 'きょう'), null);
});

// 片假名读音也能对齐(先归一平假名)
test('片假名读音 温厚→オンコウ', () => {
  const r = alignFurigana('温厚', 'オンコウ');
  assert.deepEqual(r.pairs, [
    ['温', 'おん'],
    ['厚', 'こう'],
  ]);
});

// 表外/生僻:对不齐返回 null,不抛错
test('表外字 → null 不抛错', () => {
  assert.equal(alignFurigana('々', 'のま'), null);
});

// 防 DoS:恶意超长 + 高分歧汉字串必须迅速返回,不得指数爆栈
test('超长汉字串/读音:超上限直接回退,不卡死', () => {
  const base = '生'.repeat(60); // 高分歧汉字(几十个读音)
  const reading = 'いく'.repeat(60); // 长且前缀重叠、无法完全消费
  const t0 = process.hrtime.bigint();
  const r = alignFurigana(base, reading);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.equal(r, null); // 超 MAX_KANJI → 回退
  assert.ok(ms < 50, `对齐耗时 ${ms.toFixed(1)}ms,应远小于 50ms`);
});

// 记忆化:临界长度(上限内)高分歧串必须快(失败节点记忆化,非指数),无论最终是否对齐
test('上限内高分歧串:记忆化保证快速返回', () => {
  const base = '生'.repeat(24); // = MAX_KANJI
  const reading = 'ずり'.repeat(24); // 前缀重叠、大量分支
  const t0 = process.hrtime.bigint();
  alignFurigana(base, reading); // 结果不重要,只验证不指数爆栈
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 50, `对齐耗时 ${ms.toFixed(1)}ms,应远小于 50ms`);
});
