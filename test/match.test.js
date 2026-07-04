import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSameSource, sourceTokens } from '../src/match.js';

// 真实 Jimaku 文件名(EVA / 薬屋),回归 v0.11.2 的「按源特征匹配」修复。
const EVA_EP2 = [
  { name: '新世紀エヴァンゲリオン.S01E02.第弐話.見知らぬ、天井.WEBRip.Netflix.ja[cc].srt' },
  { name: '[Korean-Blog] Neon Genesis Evangelion 02.ass' },
  { name: '新世紀エヴァンゲリオン 02 (DMM TV).srt' },
  { name: '[McBalls] Neon Genesis Evangelion - S01E02 - Unfamiliar Ceilings (BD 1080p Hi10 FLAC) [67FBFEDE].ja.srt' },
  { name: '[Erai-raws] Neon Genesis Evangelion - 02 [720p][JPN].ass' },
];

test('EVA:各源 ep1 → 各自选中 ep2 同源(长集标题不再稀释)', () => {
  const cases = [
    ['新世紀エヴァンゲリオン.S01E01.第壱話.使徒、襲来.WEBRip.Netflix.ja[cc].srt', 'Netflix'],
    ['新世紀エヴァンゲリオン 01 (DMM TV).srt', 'DMM'],
    ['[McBalls] Neon Genesis Evangelion - S01E01 - Angel Attack (BD 1080p Hi10 FLAC) [9FA87534].ja.srt', 'McBalls'],
    ['[Erai-raws] Neon Genesis Evangelion - 01 [720p][JPN].ass', 'Erai'],
  ];
  const marker = { Netflix: /Netflix/, DMM: /DMM/, McBalls: /McBalls/, Erai: /Erai/ };
  for (const [ref, src] of cases) {
    const picked = pickSameSource(EVA_EP2, ref);
    assert.ok(picked, `${src}: 应匹配到同源`);
    assert.match(picked.name, marker[src], `${src}: 匹配到了别的源 ${picked.name}`);
  }
});

test('EVA Netflix:忽略日文集标题,源特征即 netflix/webrip/ja/cc', () => {
  const sig = sourceTokens('新世紀エヴァンゲリオン.S01E01.第壱話.使徒、襲来.WEBRip.Netflix.ja[cc].srt');
  assert.deepEqual([...sig].sort(), ['cc', 'ja', 'netflix', 'srt', 'webrip']);
});

test('薬屋:Netflix ep1 → ep2 Netflix(回归,不误配字幕组)', () => {
  const ep2 = [
    { name: '[Moozzi2] Kusuriya no Hitorigoto - 02 (BD).srt' },
    { name: '薬屋のひとりごと.S01E02.無愛想な薬師.WEBRip.Netflix.ja[cc].srt' },
    { name: '[Nekomoe kissaten] Kusuriya no Hitorigoto [02][Web].JPSC.ass' },
  ];
  const picked = pickSameSource(ep2, '薬屋のひとりごと.S01E01.猫猫.WEBRip.Netflix.ja[cc].srt');
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
