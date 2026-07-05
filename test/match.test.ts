import { test } from 'vitest';
import assert from 'node:assert/strict';
import { pickSameSource, sourceTokens, pickExactAnime, normTitle } from '../src/online/match.js';

// 真实 Jimaku 文件名(EVA / 薬屋),回归 v0.11.2 的「按源特征匹配」修复。
const EVA_EP2 = [
  { name: '新世紀エヴァンゲリオン.S01E02.第弐話.見知らぬ、天井.WEBRip.Netflix.ja[cc].srt' },
  { name: '[Korean-Blog] Neon Genesis Evangelion 02.ass' },
  { name: '新世紀エヴァンゲリオン 02 (DMM TV).srt' },
  {
    name: '[McBalls] Neon Genesis Evangelion - S01E02 - Unfamiliar Ceilings (BD 1080p Hi10 FLAC) [67FBFEDE].ja.srt',
  },
  { name: '[Erai-raws] Neon Genesis Evangelion - 02 [720p][JPN].ass' },
];

test('EVA:各源 ep1 → 各自选中 ep2 同源(长集标题不再稀释)', () => {
  const cases = [
    ['新世紀エヴァンゲリオン.S01E01.第壱話.使徒、襲来.WEBRip.Netflix.ja[cc].srt', 'Netflix'],
    ['新世紀エヴァンゲリオン 01 (DMM TV).srt', 'DMM'],
    [
      '[McBalls] Neon Genesis Evangelion - S01E01 - Angel Attack (BD 1080p Hi10 FLAC) [9FA87534].ja.srt',
      'McBalls',
    ],
    ['[Erai-raws] Neon Genesis Evangelion - 01 [720p][JPN].ass', 'Erai'],
  ];
  const marker: Record<string, RegExp> = {
    Netflix: /Netflix/,
    DMM: /DMM/,
    McBalls: /McBalls/,
    Erai: /Erai/,
  };
  for (const [ref, src] of cases) {
    const picked = pickSameSource(EVA_EP2, ref);
    assert.ok(picked, `${src}: 应匹配到同源`);
    assert.match(picked.name, marker[src], `${src}: 匹配到了别的源 ${picked.name}`);
  }
});

test('EVA Netflix:忽略日文集标题,源特征即 netflix/webrip/ja/cc', () => {
  const sig = sourceTokens(
    '新世紀エヴァンゲリオン.S01E01.第壱話.使徒、襲来.WEBRip.Netflix.ja[cc].srt',
  );
  assert.deepEqual([...sig].sort(), ['cc', 'ja', 'netflix', 'srt', 'webrip']);
});

test('薬屋:Netflix ep1 → ep2 Netflix(回归,不误配字幕组)', () => {
  const ep2 = [
    { name: '[Moozzi2] Kusuriya no Hitorigoto - 02 (BD).srt' },
    { name: '薬屋のひとりごと.S01E02.無愛想な薬師.WEBRip.Netflix.ja[cc].srt' },
    { name: '[Nekomoe kissaten] Kusuriya no Hitorigoto [02][Web].JPSC.ass' },
  ];
  const picked = pickSameSource(ep2, '薬屋のひとりごと.S01E01.猫猫.WEBRip.Netflix.ja[cc].srt');
  assert.ok(picked);
  assert.match(picked.name, /Netflix/);
});

test('无同源(候选都是别的源)→ 返回 null', () => {
  const files = [{ name: '[SomeGroup] Show - 02 [1080p].ass' }];
  const picked = pickSameSource(files, '别的番.S01E01.WEBRip.Netflix.ja[cc].srt');
  assert.equal(picked, null);
});

test('空参考 → null', () => {
  assert.equal(pickSameSource([{ name: 'a.srt' }], ''), null);
});

// ── pickExactAnime:自动选番只在「唯一精确命中」时触发 ──
const MIA = [
  {
    native: 'メイドインアビス 烈日の黄金郷',
    romaji: 'Made in Abyss: Retsujitsu no Ougonkyou',
    english: 'Made in Abyss: The Golden City of the Scorching Sun',
    title: 'メイドインアビス 烈日の黄金郷',
  },
  {
    native: 'メイドインアビス',
    romaji: 'Made in Abyss',
    english: 'Made in Abyss',
    title: 'メイドインアビス',
  },
  {
    native: 'メイドインアビス 烈日の黄金郷「パパといっしょ」',
    romaji: 'Made in Abyss: Retsujitsu no Ougonkyou - Papa to Issho',
    english: '',
    title: 'メイドインアビス 烈日の黄金郷「パパといっしょ」',
  },
];

test('精确命中唯一:DMM 全角空格标题 → 自动选中第二季(不选第一季)', () => {
  const picked = pickExactAnime(MIA, 'メイドインアビス　烈日の黄金郷'); // U+3000 全角空格
  assert.ok(picked);
  assert.equal(picked.native, 'メイドインアビス 烈日の黄金郷');
});

test('精确命中唯一:查询第一季标题只命中第一季', () => {
  assert.equal(pickExactAnime(MIA, 'メイドインアビス')?.native, 'メイドインアビス');
});

test('罗马字大小写归一后精确命中', () => {
  assert.equal(pickExactAnime(MIA, 'made in abyss')?.romaji, 'Made in Abyss');
});

test('部分/不精确 → 不自动选(null)', () => {
  assert.equal(pickExactAnime(MIA, 'メイド'), null);
  assert.equal(pickExactAnime(MIA, '烈日'), null);
  assert.equal(pickExactAnime(MIA, ''), null);
});

test('多个精确同名 → 不自动选(歧义,回落人工)', () => {
  const dup = [
    { native: '同名作品', romaji: 'Onmei', title: '同名作品' },
    { native: '同名作品', romaji: 'Onmei Movie', title: '同名作品' }, // TV 与剧场版同名
  ];
  assert.equal(pickExactAnime(dup, '同名作品'), null);
});

test('normTitle:全角空格/大小写归一,但不做模糊', () => {
  assert.equal(
    normTitle('メイドインアビス　烈日の黄金郷'),
    normTitle('メイドインアビス 烈日の黄金郷'),
  );
  assert.equal(normTitle('Made In Abyss'), 'made in abyss');
  assert.notEqual(normTitle('メイドインアビス'), normTitle('メイドインアビス 烈日の黄金郷')); // 非子串匹配
});
