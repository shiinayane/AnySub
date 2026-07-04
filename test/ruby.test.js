import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyRuby } from '../src/ruby.js';

test('括号式 漢字（かな) → ruby(开启时)', () => {
  assert.equal(applyRuby('温厚（おんこう）な人', true), '<ruby>温厚<rt>おんこう</rt></ruby>な人');
});

test('括号式:关闭时不转', () => {
  assert.equal(applyRuby('温厚（おんこう）な人', false), '温厚（おんこう）な人');
});

test('《》式始终转(不受括号开关影响)', () => {
  assert.equal(applyRuby('使徒《しと》、襲来', false), '<ruby>使徒<rt>しと</rt></ruby>、襲来');
});

test('青空文库 ｜base《かな》', () => {
  assert.equal(applyRuby('｜地面師《じめんし》たち', true), '<ruby>地面師<rt>じめんし</rt></ruby>たち');
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
