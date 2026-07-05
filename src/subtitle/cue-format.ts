// 动画字幕语义排版:识别「话者名 / 非语音 / 画外音 / 书面 / 歌词」并分别标记。
// 纯逻辑(有单测)。只重排不删字。两个难点:
//   1) 话者名与音效都用 （　）:两遍扫描消歧——buildSpeakers 先收「行首（X）+台词」的 X 成词表,
//      独立（X）若 X 在词表 → 话者名,否则 → 非语音。
//   2) 画外音〈…〉/书面《…》/歌曲 ♪…♪ 可能跨行、跨 cue 断成几句:用状态机跟踪未闭合的跨度——
//      未闭合的 〈 / 《 会把后续行也标成同类直到闭合;♪ 用奇偶切换。跨 cue 仅在相邻不重叠时延续。
import type { Cue, SpanState, LineClass } from '../types.js';

const NAME = 20; // 名字/音效单元数上限;过长不认,避免吞掉正文
// 名字内容单元:非括号字符,或一层嵌套括号(话者名内嵌注音,如 千束（ちさと))
const NONP = '[^（）()]';
const INNER = '(?:' + NONP + '|[（(]' + NONP + '*[）)])';
const RE_LEAD = new RegExp('^[（(](' + INNER + '{1,' + NAME + '})[）)]\\s*(\\S[\\s\\S]*)$');
const RE_ALONE = new RegExp('^[（(](' + INNER + '{1,' + NAME + '})[）)]$');

const count = (s: string, re: RegExp): number => {
  const m = s.match(re);
  return m ? m.length : 0;
};

// 话者名归一化 key:去掉内嵌注音（かな)/《かな》,让「千束（ちさと)」与「千束」对得上词表
export function speakerKey(name: string): string {
  return String(name)
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/《[^》]*》/g, '')
    .trim();
}

// 扫全部 cue,收集确定的话者名(仅取「行首（X）+台词」形态)。cue 内多行以 <br> 分隔。
export function buildSpeakers(
  cues: ReadonlyArray<Pick<Cue, 'text'>> | null | undefined,
): Set<string> {
  const set = new Set<string>();
  for (const c of cues || []) {
    const raw = c && c.text != null ? String(c.text) : '';
    for (const line of raw.split('<br>')) {
      const m = RE_LEAD.exec(line.trim());
      if (m) set.add(speakerKey(m[1]));
    }
  }
  return set;
}

export const INIT_SPAN: SpanState = { span: 'none', lyric: false };

// 带状态分类单行。st = { span:'none'|'voice'|'book', lyric:bool } = 进入本行前的跨度状态。
// 返回 { type, name?, rest?, state }:state 为本行结束后的跨度状态(供下一行/下一 cue)。
//   type: dialogue | speaker | sfx | voice | book | lyric | plain
export function stepCueLine(
  raw: string | null | undefined,
  speakers: Set<string> | null,
  st?: SpanState,
): LineClass {
  st = st || INIT_SPAN;
  const t = (raw == null ? '' : String(raw)).trim();
  const next: SpanState = { span: st.span, lyric: st.lyric };
  if (!t) return { type: 'plain', state: next };

  // 歌曲:♪ 标记(每行前缀式)或 ♪…♪ 块(奇偶切换)。含 ♪ 或处于歌曲块内 → 歌词。
  const notes = count(t, /[♪♫]/g);
  if (st.lyric || notes > 0) {
    if (notes % 2 === 1) next.lyric = !st.lyric; // 奇数个 ♪ 翻转块状态
    return { type: 'lyric', state: next };
  }

  // 续接未闭合的画外音/书面跨度:直到某行的闭括号多于开括号才结束
  if (st.span === 'voice') {
    if (count(t, /[〉＞]/g) > count(t, /[〈＜]/g)) next.span = 'none';
    return { type: 'voice', state: next };
  }
  if (st.span === 'book') {
    if (count(t, /》/g) > count(t, /《/g)) next.span = 'none';
    return { type: 'book', state: next };
  }

  // 起新跨度:开括号多于闭括号 → 未闭合,后续行延续;整行被包裹 → 自闭合。
  const vO = count(t, /[〈＜]/g),
    vC = count(t, /[〉＞]/g);
  if (vO > vC) {
    next.span = 'voice';
    return { type: 'voice', state: next };
  }
  if ((vO || vC) && /^[〈＜][\s\S]*[〉＞]$/.test(t)) return { type: 'voice', state: next };
  const bO = count(t, /《/g),
    bC = count(t, /》/g);
  if (bO > bC) {
    next.span = 'book';
    return { type: 'book', state: next };
  }
  // 整行 《…》 → 书面;而注音「漢字《かな》」非整行,不会命中
  if (bO === 1 && bC === 1 && /^《[\s\S]*》$/.test(t)) return { type: 'book', state: next };

  // 单行括号:话者名 / 音效
  let m = RE_ALONE.exec(t);
  if (m) {
    const inner = m[1];
    if (speakers && speakers.has(speakerKey(inner)))
      return { type: 'speaker', name: inner, state: next };
    return { type: 'sfx', state: next };
  }
  m = RE_LEAD.exec(t);
  if (m) return { type: 'dialogue', name: m[1], rest: m[2], state: next };

  return { type: 'plain', state: next };
}

// 无状态分类(整行独立):供简单调用/测试。等价于从初始状态跑一行。
export function classifyCueLine(
  raw: string | null | undefined,
  speakers: Set<string> | null,
): Pick<LineClass, 'type' | 'name' | 'rest'> {
  const r = stepCueLine(raw, speakers, INIT_SPAN);
  const out: Pick<LineClass, 'type' | 'name' | 'rest'> = { type: r.type };
  if (r.name !== undefined) out.name = r.name;
  if (r.rest !== undefined) out.rest = r.rest;
  return out;
}

// 预计算每条 cue「进入时」的跨度状态,写到 cue._spanIn。cues 需按 start 升序。
// 跨 cue 仅在「相邻、不重叠」时延续:与前一条重叠(=多人同时)或间隔过大(>2s)则重置,
// 避免未闭合跨度污染并行说话或不相关的后续字幕。
export function computeSpanStates(cues: Cue[] | null | undefined): void {
  let st = INIT_SPAN;
  let prevEnd = -Infinity;
  for (const c of cues || []) {
    if (c.start < prevEnd - 0.05 || c.start - prevEnd > 2) st = INIT_SPAN;
    c._spanIn = st;
    let s = st;
    for (const line of String(c.text == null ? '' : c.text).split('<br>'))
      s = stepCueLine(line, null, s).state;
    st = s;
    prevEnd = Math.max(prevEnd, c.end);
  }
}
