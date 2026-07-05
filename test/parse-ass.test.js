import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseAss } from '../src/parse-ass.js';

const ASS = `[Script Info]
ScriptType: v4.00+
[V4+ Styles]
Format: Name, Fontname, Fontsize
Style: Default,Arial,20
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:03.50,Default,,0,0,0,,{\\pos(100,200)}你好,世界
Dialogue: 0,0:00:04.00,0:00:06.00,Default,,0,0,0,,第一行\\N第二行
Dialogue: 0,0:00:07.00,0:00:09.00,Default,Bob,0,0,0,,含逗号,的对白 <i>斜体</i>
Dialogue: 0,0:00:09.00,0:00:09.00,Default,,0,0,0,,零时长丢弃
Comment: 0,0:00:10.00,0:00:12.00,Default,,0,0,0,,注释行不算
Dialogue: 0,0:00:99:bad,0:00:11.00,Default,,0,0,0,,坏时间戳`;

test('parseAss: 有效 Dialogue 数', () => {
  const cues = parseAss(ASS);
  assert.equal(cues.length, 3);
});

test('parseAss: 剥离 {\\pos} 特效标记', () => {
  const cues = parseAss(ASS);
  assert.equal(cues[0].text, '你好,世界');
});

test('parseAss: \\N → 换行,含逗号 Text 保留,legit 标签保留', () => {
  const cues = parseAss(ASS);
  assert.equal(cues[1].text, '第一行<br>第二行');
  assert.equal(cues[2].text, '含逗号,的对白 <i>斜体</i>');
});

test('parseAss: 零时长 / Comment / 坏时间戳 均丢弃', () => {
  const cues = parseAss(ASS);
  assert.ok(!cues.some((c) => /丢弃|注释|坏时间/.test(c.text)));
});
