import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeakers, classifyCueLine } from '../src/cue-format.js';

const cues = [
  { text: '（マオマオ）何ですか' },
  { text: '（ドアが開く音）' },
  { text: '（マオマオ）' },
  { text: 'ただの台詞です' },
  { text: '♪～ 君の名は' },
  { text: '温厚（おんこう）な人' },
];
const spk = buildSpeakers(cues);

test('buildSpeakers 只收「行首(名)+台词」的名字', () => {
  assert.ok(spk.has('マオマオ'));
  assert.equal(spk.has('ドアが開く音'), false); // 独立音效不进词表
});

test('行首话者名+台词 → dialogue', () => {
  assert.deepEqual(classifyCueLine('（マオマオ）何ですか', spk), { type: 'dialogue', name: 'マオマオ', rest: '何ですか' });
});

test('独立括号:名字在词表 → speaker', () => {
  assert.deepEqual(classifyCueLine('（マオマオ）', spk), { type: 'speaker', name: 'マオマオ' });
});

test('独立括号:不在词表 → sfx(非语音)', () => {
  assert.deepEqual(classifyCueLine('（ドアが開く音）', spk), { type: 'sfx' });
  assert.deepEqual(classifyCueLine('（ざわざわ）', spk), { type: 'sfx' });
});

test('歌词 ♪ → lyric', () => {
  assert.equal(classifyCueLine('♪～ 君の名は', spk).type, 'lyric');
});

test('画外音〈…〉／＜…＞ → voice', () => {
  assert.equal(classifyCueLine('〈これは夢なのか〉', spk).type, 'voice');
  assert.equal(classifyCueLine('＜もしもし 俺だ＞', spk).type, 'voice');
});

test('书面《…》整行 → book', () => {
  assert.equal(classifyCueLine('《薬草大全 巻三より》', spk).type, 'book');
});

test('注音 漢字《かな》(非整行)不误判为 book → plain', () => {
  assert.equal(classifyCueLine('使徒《しと》が来た', spk).type, 'plain');
});

test('普通台词 → plain', () => {
  assert.equal(classifyCueLine('ただの台詞です', spk).type, 'plain');
});

test('注音 漢字（かな) 不误判为括号标记(前有汉字)→ plain', () => {
  assert.equal(classifyCueLine('温厚（おんこう）な人', spk).type, 'plain');
});

test('半角括号也识别', () => {
  assert.deepEqual(classifyCueLine('(Rin) hello', new Set(['Rin'])), { type: 'dialogue', name: 'Rin', rest: 'hello' });
});

test('过长括号内容不当作标记(避免吞正文)', () => {
  const long = '（' + 'あ'.repeat(30) + '）';
  assert.equal(classifyCueLine(long, spk).type, 'plain');
});

test('空行 → plain', () => {
  assert.equal(classifyCueLine('', spk).type, 'plain');
  assert.equal(classifyCueLine(null, spk).type, 'plain');
});
