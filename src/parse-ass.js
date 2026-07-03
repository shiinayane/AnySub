// ASS / SSA → 统一 cue 结构(文本保底渲染用):解析 [Events] 的 Dialogue 行
import { sanitize } from './parse.js';

export function parseAss(text) {
  const lines = text.split(/\r?\n/);
  const cues = [];
  let inEvents = false;
  let idxStart = 1, idxEnd = 2, idxText = 9; // 标准 Format 顺序的默认下标
  for (const raw of lines) {
    const line = raw.trim();
    if (/^\[/.test(line)) { inEvents = /^\[events\]/i.test(line); continue; }
    if (!inEvents) continue;
    if (/^format\s*:/i.test(line)) {
      const cols = line.slice(line.indexOf(':') + 1).split(',').map((s) => s.trim().toLowerCase());
      const s = cols.indexOf('start'), e = cols.indexOf('end'), t = cols.indexOf('text');
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
      body = sanitize(body); // 去 {\...} 特效标记 + 转义 + 换行转 <br>
      if (body) cues.push({ start, end, text: body });
    }
  }
  cues.sort((a, b) => a.start - b.start);
  return cues;
}

// 在前 textIdx 个逗号处切分;Text 字段(可能含逗号)作为最后一段
function splitFields(rest, textIdx) {
  const out = [];
  let start = 0;
  for (let i = 0; i < textIdx; i++) {
    const c = rest.indexOf(',', start);
    if (c < 0) { out.push(rest.slice(start)); return out; }
    out.push(rest.slice(start, c));
    start = c + 1;
  }
  out.push(rest.slice(start));
  return out;
}

// "0:00:01.50" / "1:02:03,456" → 秒
function assTime(t) {
  if (!t) return NaN;
  const m = t.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if (!m) return NaN;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + parseFloat('0.' + m[4]);
}
