import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../src/state.js';
import { typedHtml } from '../src/render-text.js';

// typedHtml 读 state.rubyParen 决定括号式注音是否生效
state.rubyParen = true;

test('回归:独立音效内嵌注音会渲染 ruby（曾因 sfx 漏调 applyRuby 而丢失）', () => {
  const h = typedHtml('（扉（とびら）が開く音）', { type: 'sfx' });
  assert.match(h, /anysub-sfx/);
  assert.match(h, /<ruby>扉<rt>とびら<\/rt><\/ruby>/);
});

test('纯假名音效不产生 ruby（无可注汉字）', () => {
  const h = typedHtml('（ざわざわ）', { type: 'sfx' });
  assert.match(h, /anysub-sfx/);
  assert.doesNotMatch(h, /<ruby>/);
});

// 每种承载文本的语义类型都应套用注音——防止再出现 sfx 那类「某分支漏调 applyRuby」
for (const type of ['sfx', 'voice', 'book', 'lyric', 'speaker', 'plain']) {
  test(`类型 ${type}:汉字（かな）应产生 ruby`, () => {
    const h = typedHtml('薬草（やくそう）', { type });
    assert.match(h, /<ruby>/, `${type} 未套用注音`);
  });
}

test('各类型套用对应语义 class', () => {
  assert.match(typedHtml('〈心の声〉', { type: 'voice' }), /anysub-voice/);
  assert.match(typedHtml('《書面》', { type: 'book' }), /anysub-book/);
  assert.match(typedHtml('♪ 歌詞', { type: 'lyric' }), /anysub-lyric/);
  assert.match(typedHtml('（マオマオ）', { type: 'speaker' }), /anysub-spk/);
});

test('dialogue:话者名与台词都套用注音,名字包在 spk', () => {
  const h = typedHtml('', { type: 'dialogue', name: '猫猫（マオマオ）', rest: 'この薬草（やくそう）を' });
  assert.match(h, /anysub-spk/);
  assert.match(h, /<ruby>猫猫<rt>マオマオ<\/rt><\/ruby>/); // 话者名内嵌注音(整串回退)
  assert.ok(h.includes('<rt>やく</rt>') && h.includes('<rt>そう</rt>'), '台词未逐字注音'); // 薬草→薬/草 逐字对齐
});

test('rubyParen 关闭时括号式不注音（但类型 class 仍在）', () => {
  state.rubyParen = false;
  const h = typedHtml('（扉（とびら）が開く音）', { type: 'sfx' });
  assert.match(h, /anysub-sfx/);
  assert.doesNotMatch(h, /<ruby>/);
  state.rubyParen = true; // 复原,避免影响后续用例
});
