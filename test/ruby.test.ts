import { test } from 'vitest';
import assert from 'node:assert/strict';
import { applyRuby } from '../src/ruby.js';

test('括号式 漢字（かな) → ruby(开启时,逐字对齐)', () => {
  assert.equal(
    applyRuby('温厚（おんこう）な人', true),
    '<ruby>温<rt>おん</rt>厚<rt>こう</rt></ruby>な人',
  );
});

test('括号式:关闭时不转', () => {
  assert.equal(applyRuby('温厚（おんこう）な人', false), '温厚（おんこう）な人');
});

test('《》式始终转(不受括号开关影响,逐字对齐)', () => {
  assert.equal(
    applyRuby('使徒《しと》、襲来', false),
    '<ruby>使<rt>し</rt>徒<rt>と</rt></ruby>、襲来',
  );
});

test('青空文库 ｜base《かな》(逐字对齐)', () => {
  assert.equal(
    applyRuby('｜地面師《じめんし》たち', true),
    '<ruby>地<rt>じ</rt>面<rt>めん</rt>師<rt>し</rt></ruby>たち',
  );
});

test('后缀读音:近接猟兵（りょうへい)→ 只注 猟兵,近接留白', () => {
  assert.equal(
    applyRuby('近接猟兵（りょうへい）', true),
    '近接<ruby>猟<rt>りょう</rt>兵<rt>へい</rt></ruby>',
  );
});

test('熟字訓 今日（きょう)→ 逐字对不齐,回退整串注音', () => {
  assert.equal(applyRuby('今日（きょう）は', true), '<ruby>今日<rt>きょう</rt></ruby>は');
});

test('误判规避:紧邻假名的括号不转', () => {
  assert.equal(applyRuby('彼は言った（うそだ）と', true), '彼は言った（うそだ）と');
});

test('误判规避:括号内非假名不转', () => {
  assert.equal(applyRuby('（笑）って感じ', true), '（笑）って感じ');
});

test('无标记原样返回', () => {
  assert.equal(applyRuby('普通のテキスト', true), '普通のテキスト');
});
