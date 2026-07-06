import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  buildSpeakers,
  classifyCueLine,
  stepCueLine,
  computeSpanStates,
  INIT_SPAN,
} from '../src/subtitle/cue-format.js';
import type { Cue } from '../src/types.js';

// Step through a block of text line by line, returning the array of per-line types (starting from the initial state)
function run(lines: string[]) {
  let st = INIT_SPAN;
  return lines.map((l) => {
    const r = stepCueLine(l, null, st);
    st = r.state;
    return r.type;
  });
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
  assert.equal(spk.has('ドアが開く音'), false); // standalone sound effects are not added to the speaker vocabulary
});

test('行首话者名+台词 → dialogue', () => {
  assert.deepEqual(classifyCueLine('（マオマオ）何ですか', spk), {
    type: 'dialogue',
    name: 'マオマオ',
    rest: '何ですか',
  });
});

test('独立括号:名字在词表 → speaker', () => {
  assert.deepEqual(classifyCueLine('（マオマオ）', spk), { type: 'speaker', name: 'マオマオ' });
});

test('话者名内嵌注音 （千束（ちさと))台词 → dialogue,name 保留注音', () => {
  assert.deepEqual(classifyCueLine('（千束（ちさと））今日の天気もいいな', new Set<string>()), {
    type: 'dialogue',
    name: '千束（ちさと）',
    rest: '今日の天気もいいな',
  });
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
  assert.deepEqual(classifyCueLine('(Rin) hello', new Set(['Rin'])), {
    type: 'dialogue',
    name: 'Rin',
    rest: 'hello',
  });
});

test('过长括号内容不当作标记(避免吞正文)', () => {
  const long = '（' + 'あ'.repeat(30) + '）';
  assert.equal(classifyCueLine(long, spk).type, 'plain');
});

test('空行 → plain', () => {
  assert.equal(classifyCueLine('', spk).type, 'plain');
  assert.equal(classifyCueLine(null, spk).type, 'plain');
});

// ── Cross-line / cross-cue spans ──
test('画外音跨行:〈 开在首行,〉 闭在末行,中间也算 voice', () => {
  assert.deepEqual(run(['〈これは長い', '独白で', '何行も続く〉', '普通の台詞']), [
    'voice',
    'voice',
    'voice',
    'plain',
  ]);
});

test('书面跨行:《 未闭合则延续到 》', () => {
  assert.deepEqual(run(['《薬草大全 巻三', 'その効能は', 'かくのごとし》', 'ただの台詞']), [
    'book',
    'book',
    'book',
    'plain',
  ]);
});

test('歌曲块 ♪…～♪:中间无 ♪ 的行也算歌词', () => {
  assert.deepEqual(run(['♪～ 遠い日の', '約束を', '今も歌う ♪', 'セリフ']), [
    'lyric',
    'lyric',
    'lyric',
    'plain',
  ]);
});

test('每行前缀 ♪ 的歌词都算 lyric', () => {
  assert.deepEqual(run(['♪ 一行目', '♪ 二行目']), ['lyric', 'lyric']);
});

test('注音 漢字《かな》整行内平衡,不触发 book 跨度', () => {
  assert.deepEqual(run(['温厚《おんこう》な人', 'ただの台詞']), ['plain', 'plain']);
});

// ── 双层括号 （（…）） = 特殊人声(说出来的话)→ voice(底部),不是 sfx(顶部) ──
test('单 cue 整行 （（…）） → voice(不再误判为 sfx)', () => {
  assert.equal(classifyCueLine('（（ファプタ：あ！））', spk).type, 'voice');
});

test('跨行 （（… 未闭合开 dparen 跨度,遇 ）） 闭合,全程 voice', () => {
  assert.deepEqual(run(['（（ファプタ：あなたは→', 'なに？））', 'ただの台詞']), [
    'voice',
    'voice',
    'plain',
  ]);
});

test('half-width (( … )) 同样识别', () => {
  assert.equal(classifyCueLine('((Faputa: ah!))', spk).type, 'voice');
});

test('（千束（ちさと）） 仍是话者名而非 dparen(无连续双括号)', () => {
  assert.equal(classifyCueLine('（千束（ちさと））', new Set(['千束'])).type, 'speaker');
});

test('computeSpanStates:双层括号跨 cue 相邻延续', () => {
  const cues: Cue[] = [
    { start: 0, end: 3, text: '（（ファプタ：あなたは→' }, // opens dparen, not closed
    { start: 3, end: 6, text: 'なに？））' }, // adjacent → inherits dparen, then closes
    { start: 6, end: 9, text: 'ただの台詞' }, // dparen closed → none
  ];
  computeSpanStates(cues);
  assert.equal(cues[0]._spanIn!.span, 'none');
  assert.equal(cues[1]._spanIn!.span, 'dparen'); // inherited
  assert.equal(cues[2]._spanIn!.span, 'none');
});

test('computeSpanStates:跨 cue 相邻延续,重叠/大间隔则重置', () => {
  const cues: Cue[] = [
    { start: 0, end: 3, text: '〈声が' }, // opens voice, not yet closed
    { start: 3, end: 6, text: '続いている〉' }, // adjacent → inherits voice
    { start: 6, end: 9, text: 'ただの台詞' }, // voice already closed → none
    { start: 20, end: 23, text: '〈遠くの声' }, // starts a new voice after a large gap
    { start: 21, end: 24, text: '別の人の声' }, // overlaps the previous cue → reset, does not inherit
  ];
  computeSpanStates(cues);
  assert.equal(cues[0]._spanIn!.span, 'none');
  assert.equal(cues[1]._spanIn!.span, 'voice'); // inherited
  assert.equal(cues[2]._spanIn!.span, 'none');
  assert.equal(cues[3]._spanIn!.span, 'none');
  assert.equal(cues[4]._spanIn!.span, 'none'); // overlap → does not inherit
});
