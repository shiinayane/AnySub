// Semantic layout for anime subtitles: identify "speaker name / non-speech / off-screen voice / written text / lyrics" and mark each accordingly.
// Pure logic (with unit tests). Only reorders, never deletes characters. Two hard problems:
//   1) Both speaker names and sound effects use （　）: disambiguate with a two-pass scan — buildSpeakers first collects a vocabulary of X from "line-leading（X）+ dialogue" forms,
//      then for a standalone（X), if X is in the vocabulary → speaker name, otherwise → non-speech.
//   2) Off-screen voice 〈…〉 / written text 《…》 / song ♪…♪ may span lines and be broken across cues into several fragments: a state machine tracks the unclosed span —
//      an unclosed 〈 / 《 marks the following lines as the same class until it closes; ♪ toggles on even/odd count. Spans continue across cues only when they are adjacent and non-overlapping.
import type { Cue, SpanState, LineClass } from '../types.js';

const NAME = 20; // Upper bound on the number of name/SFX units; anything longer is rejected, to avoid swallowing the main text
// A name-content unit: a non-parenthesis character, or one level of nested parentheses (a speaker name with embedded furigana, e.g. 千束（ちさと))
const NONP = '[^（）()]';
const INNER = '(?:' + NONP + '|[（(]' + NONP + '*[）)])';
const RE_LEAD = new RegExp('^[（(](' + INNER + '{1,' + NAME + '})[）)]\\s*(\\S[\\s\\S]*)$');
const RE_ALONE = new RegExp('^[（(](' + INNER + '{1,' + NAME + '})[）)]$');

const count = (s: string, re: RegExp): number => {
  const m = s.match(re);
  return m ? m.length : 0;
};

// Speaker-name normalization key: strip embedded furigana（かな) / 《かな》 so that 「千束（ちさと)」 and 「千束」 match up in the vocabulary
export function speakerKey(name: string): string {
  return String(name)
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/《[^》]*》/g, '')
    .trim();
}

// Scan all cues and collect the confirmed speaker names (only from the "line-leading（X）+ dialogue" form). Multiple lines within a cue are separated by <br>.
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

// Classify a single line with state. st = { span:'none'|'voice'|'book', lyric:bool } = the span state on entering this line.
// Returns { type, name?, rest?, state }: state is the span state after this line ends (for the next line / next cue).
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

  // Song: ♪ marker (per-line prefix style) or ♪…♪ block (even/odd toggle). Contains ♪ or is inside a song block → lyric.
  const notes = count(t, /[♪♫]/g);
  if (st.lyric || notes > 0) {
    if (notes % 2 === 1) next.lyric = !st.lyric; // An odd number of ♪ flips the block state
    return { type: 'lyric', state: next };
  }

  // Continue an unclosed off-screen-voice / written-text span: it ends only once a line has more closing brackets than opening ones
  if (st.span === 'voice') {
    if (count(t, /[〉＞]/g) > count(t, /[〈＜]/g)) next.span = 'none';
    return { type: 'voice', state: next };
  }
  if (st.span === 'book') {
    if (count(t, /》/g) > count(t, /《/g)) next.span = 'none';
    return { type: 'book', state: next };
  }

  // Start a new span: more opening brackets than closing → unclosed, continues onto following lines; the whole line is wrapped → self-closing.
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
  // A whole-line 《…》 → written text; whereas furigana 「漢字《かな》」 is not a whole line, so it won't match
  if (bO === 1 && bC === 1 && /^《[\s\S]*》$/.test(t)) return { type: 'book', state: next };

  // Single-line parentheses: speaker name / sound effect
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

// Stateless classification (each line independent): for simple calls / tests. Equivalent to running a single line from the initial state.
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

// Precompute the span state "on entry" for each cue, writing it to cue._spanIn. cues must be in ascending start order.
// A span continues across cues only when they are "adjacent and non-overlapping": if it overlaps the previous cue (= simultaneous speakers) or the gap is too large (>2s), reset,
// to avoid an unclosed span contaminating parallel speech or unrelated later subtitles.
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
