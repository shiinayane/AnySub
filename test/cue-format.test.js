import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeakers, classifyCueLine, stepCueLine, computeSpanStates, INIT_SPAN } from '../src/cue-format.js';

// 逐行推进一段文本,返回每行 type 数组(从初始状态起)
function run(lines) {
  let st = INIT_SPAN;
  return lines.map((l) => { const r = stepCueLine(l, null, st); st = r.state; return r.type; });
}

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

test('话者名内嵌注音 （千束（ちさと))台词 → dialogue,name 保留注音', () => {
  assert.deepEqual(classifyCueLine('（千束（ちさと））今日の天気もいいな', new Set()),
    { type: 'dialogue', name: '千束（ちさと）', rest: '今日の天気もいいな' });
});

test('buildSpeakers 对内嵌注音话者名去注音归一化,独立形/无注音形都命中', () => {
  const s = buildSpeakers([{ text: '（千束（ちさと））おはよう' }]);
  assert.ok(s.has('千束'));
  assert.equal(classifyCueLine('（千束（ちさと））', s).type, 'speaker');
  assert.equal(classifyCueLine('（千束）', s).type, 'speaker');
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

// ── 跨行/跨 cue 跨度 ──
test('画外音跨行:〈 开在首行,〉 闭在末行,中间也算 voice', () => {
  assert.deepEqual(run(['〈これは長い', '独白で', '何行も続く〉', '普通の台詞']),
    ['voice', 'voice', 'voice', 'plain']);
});

test('书面跨行:《 未闭合则延续到 》', () => {
  assert.deepEqual(run(['《薬草大全 巻三', 'その効能は', 'かくのごとし》', 'ただの台詞']),
    ['book', 'book', 'book', 'plain']);
});

test('歌曲块 ♪…～♪:中间无 ♪ 的行也算歌词', () => {
  assert.deepEqual(run(['♪～ 遠い日の', '約束を', '今も歌う ♪', 'セリフ']),
    ['lyric', 'lyric', 'lyric', 'plain']);
});

test('每行前缀 ♪ 的歌词都算 lyric', () => {
  assert.deepEqual(run(['♪ 一行目', '♪ 二行目']), ['lyric', 'lyric']);
});

test('注音 漢字《かな》整行内平衡,不触发 book 跨度', () => {
  assert.deepEqual(run(['温厚《おんこう》な人', 'ただの台詞']), ['plain', 'plain']);
});

test('computeSpanStates:跨 cue 相邻延续,重叠/大间隔则重置', () => {
  const cues = [
    { start: 0, end: 3, text: '〈声が' },        // 开 voice 未闭
    { start: 3, end: 6, text: '続いている〉' },   // 相邻 → 继承 voice
    { start: 6, end: 9, text: 'ただの台詞' },     // voice 已闭 → none
    { start: 20, end: 23, text: '〈遠くの声' },   // 大间隔后另起 voice
    { start: 21, end: 24, text: '別の人の声' },   // 与上一条重叠 → 重置,不继承
  ];
  computeSpanStates(cues);
  assert.equal(cues[0]._spanIn.span, 'none');
  assert.equal(cues[1]._spanIn.span, 'voice'); // 继承
  assert.equal(cues[2]._spanIn.span, 'none');
  assert.equal(cues[3]._spanIn.span, 'none');
  assert.equal(cues[4]._spanIn.span, 'none'); // 重叠 → 不继承
});
