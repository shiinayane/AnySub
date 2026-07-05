// 字幕解析:SRT / VTT → 统一 cue 结构 {start,end,text},按时间排序
import type { Cue } from './types.js';

const TIME_RE =
  /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;

export function parseSubtitle(text: string, fileName?: string): Cue[] {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const isVtt = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || '');
  const cues = isVtt ? parseVtt(text) : parseSrt(text);
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

// "00:01:02,500" / "01:02.500" → 秒;非法(NaN / 超过 3 段)返回 NaN
export function timeToSeconds(t: string): number {
  t = t.trim().replace(',', '.');
  const parts = t.split(':');
  if (parts.length > 3) return NaN;
  let s = 0;
  for (const p of parts) {
    const n = parseFloat(p);
    if (!isFinite(n)) return NaN;
    s = s * 60 + n;
  }
  return s;
}

// 按时间戳行扫描:cue 正文里的空行不会被误当作块边界(修正数据丢失)
export function parseSrt(text: string): Cue[] {
  const lines = text.split('\n');
  const cues: Cue[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(TIME_RE);
    if (!m) {
      i++;
      continue;
    }
    i++;
    const body: string[] = [];
    while (i < lines.length && !TIME_RE.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    // 去掉尾部空行 + 下一条 cue 的序号行(它被裹进了本 body 末尾)
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    if (body.length && /^\d+$/.test(body[body.length - 1].trim())) body.pop();
    while (body.length && body[body.length - 1].trim() === '') body.pop();
    pushCue(cues, m, body);
  }
  return cues;
}

export function parseVtt(text: string): Cue[] {
  const lines = text.split('\n');
  const cues: Cue[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(TIME_RE);
    if (!m) {
      i++;
      continue;
    }
    i++;
    // VTT 规范:空行即 cue 分隔符
    const body: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !TIME_RE.test(lines[i])) {
      body.push(lines[i]);
      i++;
    }
    pushCue(cues, m, body);
  }
  return cues;
}

function pushCue(cues: Cue[], m: RegExpMatchArray, bodyLines: string[]): void {
  const start = timeToSeconds(m[1]);
  const end = timeToSeconds(m[2]);
  const body = bodyLines.join('\n').trim();
  if (!body || !isFinite(start) || !isFinite(end) || end <= start) return;
  cues.push({ start, end, text: sanitize(body) });
}

// XSS 安全:先转义所有 HTML,再仅还原「无属性」的 i/b/u 标签,换行转 <br>
export function sanitize(s: string): string {
  s = s.replace(/\{\\[^}]*\}/g, ''); // ASS override {\...}
  s = s.replace(/\{[^}]*\}/g, ''); // SRT {...}
  s = s.replace(/<\/?font[^>]*>/gi, ''); // 常见 font 标签:去标签留内容
  s = escapeHtml(s); // 关键:转义一切,杜绝属性/事件注入
  s = s.replace(/&lt;(\/?)(i|b|u)&gt;/gi, '<$1$2>'); // 只放行裸标签,不含任何属性
  s = s.replace(/\n/g, '<br>');
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
