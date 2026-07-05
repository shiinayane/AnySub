import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseVideoTitle, jpNumToInt } from '../src/sites/title-parse.js';

test('jpNumToInt: 汉数字含旧字体', () => {
  assert.equal(jpNumToInt('壱'), 1);
  assert.equal(jpNumToInt('弐'), 2);
  assert.equal(jpNumToInt('二十六'), 26);
  assert.equal(jpNumToInt('12'), 12);
  assert.equal(jpNumToInt('１２'), 12); // 全角
});

test('parseVideoTitle: EVA 旧字体集号 + 元数据剥离', () => {
  const r = parseVideoTitle('新世紀エヴァンゲリオン 第壱話 使徒、襲来 (アニメ/1995年)');
  assert.equal(r.series, '新世紀エヴァンゲリオン');
  assert.equal(r.episode, '1');
});

test('parseVideoTitle: 保留季度,只吃集数', () => {
  const r = parseVideoTitle('薬屋のひとりごと 第2期 第14話 (アニメ/2025年)');
  assert.equal(r.series, '薬屋のひとりごと 第2期');
  assert.equal(r.episode, '14');
});

test('parseVideoTitle: #N / Episode N / 站点名剥离', () => {
  assert.equal(parseVideoTitle('ダンジョン飯 #12').episode, '12');
  const r = parseVideoTitle('SPY×FAMILY Season 2 Episode 5 | DMM TV');
  assert.equal(r.series, 'SPY×FAMILY Season 2');
  assert.equal(r.episode, '5');
});

test('parseVideoTitle: 二十六話 → 26', () => {
  assert.equal(parseVideoTitle('鬼滅の刃 第二十六話 新たなる任務').episode, '26');
});

test('parseVideoTitle: 无集数标记时 episode 为空', () => {
  assert.equal(parseVideoTitle('なにかの映画').episode, '');
});
