// Subtitle parsing: SRT / VTT → unified cue structure {start,end,text}, sorted by time
import type { Cue } from '../types.js';

const TIME_RE =
  /(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;

export function parseSubtitle(text: string, fileName?: string): Cue[] {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const isVtt = /^﻿?WEBVTT/.test(text) || /\.vtt$/i.test(fileName || '');
  const cues = isVtt ? parseVtt(text) : parseSrt(text);
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

// "00:01:02,500" / "01:02.500" → seconds; invalid input (NaN / more than 3 segments) returns NaN
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

// Scan by timestamp lines: blank lines within a cue body are not mistaken for block boundaries (fixes data loss)
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
    // Strip trailing blank lines + the next cue's index line (which got wrapped into the end of this body)
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
    // VTT spec: a blank line is the cue separator
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

// XSS-safe: first escape all HTML, then restore only the "attribute-free" i/b/u tags, converting newlines to <br>
export function sanitize(s: string): string {
  s = s.replace(/\{\\[^}]*\}/g, ''); // ASS override {\...}
  s = s.replace(/\{[^}]*\}/g, ''); // SRT {...}
  s = s.replace(/<\/?font[^>]*>/gi, ''); // Common font tags: remove the tag, keep the content
  s = escapeHtml(s); // Key step: escape everything, blocking attribute/event injection
  s = s.replace(/&lt;(\/?)(i|b|u)&gt;/gi, '<$1$2>'); // Allow only bare tags through, with no attributes
  s = s.replace(/\n/g, '<br>');
  return s;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
