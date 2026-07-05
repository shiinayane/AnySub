import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseSubtitle, timeToSeconds, sanitize } from '../src/parse.js';

test('timeToSeconds: SRT/VTT 时间戳', () => {
  assert.equal(timeToSeconds('00:01:02,500'), 62.5);
  assert.equal(timeToSeconds('00:01:02.500'), 62.5);
  assert.equal(timeToSeconds('01:02.500'), 62.5); // MM:SS.mmm
});

test('timeToSeconds: 非法 / 超 3 段 → NaN', () => {
  assert.ok(Number.isNaN(timeToSeconds('aa:bb')));
  assert.ok(Number.isNaN(timeToSeconds('00:00:01:12'))); // 帧式 4 段
});

test('sanitize: XSS —— 带属性标签被转义,不产生事件处理器', () => {
  for (const evil of [
    '<i onmouseover="alert(1)">x</i>',
    '<b onclick=alert(1)>x</b>',
    '<i/onmouseover=alert(1)>y',
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
  ]) {
    const out = sanitize(evil);
    // 关键:输出里不能有「携带事件处理器的真实标签」或真实 <script>
    // (转义后的 &lt;i onmouseover…&gt; 只是纯文本,无害)
    assert.doesNotMatch(out, /<[^>]*\son\w+\s*=/i, `事件处理器标签泄漏: ${out}`);
    assert.doesNotMatch(out, /<script/i, `script 标签泄漏: ${out}`);
    assert.doesNotMatch(out, /<img/i, `img 标签泄漏: ${out}`);
  }
});

test('sanitize: 保留裸 i/b/u,转义 & 与换行', () => {
  assert.equal(sanitize('正常<i>斜体</i>'), '正常<i>斜体</i>');
  assert.equal(sanitize('Tom & Jerry'), 'Tom &amp; Jerry');
  assert.equal(sanitize('第一行\n第二行'), '第一行<br>第二行');
});

test('SRT: cue 正文里的空行不被截断', () => {
  const cues = parseSubtitle('1\n00:00:01,000 --> 00:00:03,000\nLine A\n\nLine B', 'x.srt');
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, 'Line A<br><br>Line B');
});

test('SRT: NaN / 非法时间戳的 cue 被丢弃', () => {
  const cues = parseSubtitle(
    '1\n00:00:0X,000 --> 00:00:03,000\n坏\n\n2\n00:00:04,000 --> 00:00:06,000\n好',
    'x.srt',
  );
  assert.equal(cues.length, 1);
  assert.equal(cues[0].text, '好');
});

test('cue 按时间排序(乱序输入)', () => {
  const cues = parseSubtitle(
    '1\n00:00:05,000 --> 00:00:06,000\n晚\n\n2\n00:00:01,000 --> 00:00:02,000\n早',
    'x.srt',
  );
  assert.deepEqual(
    cues.map((c) => c.text),
    ['早', '晚'],
  );
});

test('VTT: 跳过 WEBVTT/NOTE 头与 cue 标识行,支持分钟级时间戳', () => {
  const vtt =
    'WEBVTT\n\nNOTE 注释\n\ncue-1\n00:00:01.000 --> 00:00:03.000\nHi\n\n00:01:02.500 --> 00:01:05.000\n分钟';
  const cues = parseSubtitle(vtt, 'x.vtt');
  assert.equal(cues.length, 2);
  assert.equal(cues[1].start, 62.5);
});
