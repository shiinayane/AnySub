// ASS / SSA → unified cue structure (for the text fallback rendering path): parse the Dialogue lines in [Events]
import { sanitize } from './parse.js';
import type { Cue } from '../types.js';

export function parseAss(text: string): Cue[] {
  const lines = text.split(/\r?\n/);
  const cues: Cue[] = [];
  let inEvents = false;
  let idxStart = 1,
    idxEnd = 2,
    idxText = 9; // Default indices for the standard Format ordering
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\[/.test(line)) {
      inEvents = /^\[events\]/i.test(line);
      continue;
    }
    if (!inEvents) continue;
    if (/^format\s*:/i.test(line)) {
      const cols = line
        .slice(line.indexOf(':') + 1)
        .split(',')
        .map((s) => s.trim().toLowerCase());
      const s = cols.indexOf('start'),
        e = cols.indexOf('end'),
        t = cols.indexOf('text');
      if (s >= 0) idxStart = s;
      if (e >= 0) idxEnd = e;
      if (t >= 0) idxText = t;
      continue;
    }
    if (/^dialogue\s*:/i.test(line)) {
      const rest = line.slice(line.indexOf(':') + 1);
      const fields = splitFields(rest, idxText);
      const start = assTime(fields[idxStart]);
      const end = assTime(fields[idxEnd]);
      if (!isFinite(start) || !isFinite(end) || end <= start) continue;
      let body = (fields[idxText] || '').replace(/\\N/gi, '\n').replace(/\\h/gi, ' ');
      body = sanitize(body); // Strip {\...} effect tags + escape + convert newlines to <br>
      if (body) cues.push({ start, end, text: body });
    }
  }
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

// Split at the first textIdx commas; the Text field (which may contain commas) is taken as the last segment
function splitFields(rest: string, textIdx: number): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < textIdx; i++) {
    const c = rest.indexOf(',', start);
    if (c < 0) {
      out.push(rest.slice(start));
      return out;
    }
    out.push(rest.slice(start, c));
    start = c + 1;
  }
  out.push(rest.slice(start));
  return out;
}

// "0:00:01.50" / "1:02:03,456" → seconds
function assTime(t: string): number {
  if (!t) return NaN;
  const m = t.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!m) return NaN;
  return +m[1] * 3600 + +m[2] * 60 + +m[3] + parseFloat('0.' + m[4]);
}
