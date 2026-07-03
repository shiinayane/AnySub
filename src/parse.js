// 字幕解析:SRT / VTT → 统一 cue 结构 {start,end,text}

export function parseSubtitle(text, fileName) {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const isVtt = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || '');
  return isVtt ? parseVtt(text) : parseSrt(text);
}

// "00:01:02,500" / "00:01:02.500" / "01:02.500" → 秒
export function timeToSeconds(t) {
  t = t.trim().replace(',', '.');
  const parts = t.split(':').map(parseFloat);
  let s = 0;
  for (const p of parts) s = s * 60 + p;
  return s;
}

export function parseSrt(text) {
  const cues = [];
  const blocks = text.split(/\n{2,}/);
  const timeRe = /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;
  for (const block of blocks) {
    const lines = block.split('\n');
    let idx = 0;
    if (idx < lines.length && /^\d+$/.test(lines[idx].trim())) idx++;
    if (idx >= lines.length) continue;
    const m = lines[idx].match(timeRe);
    if (!m) continue;
    idx++;
    const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
    const body = lines.slice(idx).join('\n').trim();
    if (!body || end <= start) continue;
    cues.push({ start, end, text: sanitize(body) });
  }
  return cues;
}

export function parseVtt(text) {
  const cues = [];
  const timeRe = /(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}\.\d{1,3}|\d{1,2}:\d{2}\.\d{1,3})/;
  const blocks = text.split(/\n{2,}/);
  for (const block of blocks) {
    if (/^WEBVTT/.test(block) || /^NOTE/.test(block) || /^STYLE/.test(block) || /^REGION/.test(block)) continue;
    const lines = block.split('\n');
    let idx = 0;
    if (idx < lines.length && !timeRe.test(lines[idx])) idx++;
    if (idx >= lines.length) continue;
    const m = lines[idx].match(timeRe);
    if (!m) continue;
    idx++;
    const start = timeToSeconds(m[1]), end = timeToSeconds(m[2]);
    const body = lines.slice(idx).join('\n').trim();
    if (!body || end <= start) continue;
    cues.push({ start, end, text: sanitize(body) });
  }
  return cues;
}

// 剥离危险内容,仅保留基础排版标签,换行转 <br>
export function sanitize(s) {
  s = s.replace(/\{\\[^}]*\}/g, '');              // ASS override {\...}
  s = s.replace(/\{[^}]*\}/g, '');                 // SRT {...}
  s = s.replace(/<\/?font[^>]*>/gi, '');           // 去 font 标签保留内容
  s = s.replace(/<(?!\/?(i|b|u)\b)[^>]*>/gi, '');  // 只留 i/b/u
  s = s.replace(/\n/g, '<br>');
  return s;
}
