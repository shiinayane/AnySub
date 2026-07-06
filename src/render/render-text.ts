// Text subtitle renderer (SRT / VTT): renders the cues active at the current time into the overlay.
// Dual anchors (bottom box + top box): speech (dialogue / speaker / voice-over / lyrics / spoken narration) goes to the primary anchor (bottom by default),
//   only true SFX (standalone （…）) always goes to the opposite side (top by default) — the bottom is always "where speech happens", for a consistent mental model.
//   Multiple speakers are no longer split top/bottom; they all stack at the primary anchor, distinguished by speaker name. Voice-over / written text / songs spanning lines or cues are kept continuous via _spanIn.
import { state, FONT_BASE } from '../state.js';
import { refs } from '../refs.js';
import { applyRuby } from '../subtitle/ruby.js';
import { stepCueLine, INIT_SPAN } from '../subtitle/cue-format.js';
import type { Cue, LineClass, Renderer } from '../types.js';

// A single line + its classification → HTML (semantic typesetting + ruby). text/rest are already escape-safe HTML.
// Exported for unit tests: every semantic type should correctly apply ruby (sfx once missed calling applyRuby, causing embedded ruby to be lost).
export function typedHtml(text: string, c: Pick<LineClass, 'type' | 'name' | 'rest'>): string {
  switch (c.type) {
    case 'sfx':
      return `<span class="anysub-sfx">${applyRuby(text, state.rubyParen)}</span>`;
    case 'voice':
      return `<span class="anysub-voice">${applyRuby(text, state.rubyParen)}</span>`;
    case 'book':
      return `<span class="anysub-book">${applyRuby(text, state.rubyParen)}</span>`;
    case 'lyric':
      return `<span class="anysub-lyric">${applyRuby(text, state.rubyParen)}</span>`;
    case 'speaker':
      return `<span class="anysub-spk">${applyRuby(text, state.rubyParen)}</span>`;
    case 'dialogue':
      return `<span class="anysub-spk">（${applyRuby(c.name ?? '', state.rubyParen)}）</span>${applyRuby(c.rest ?? '', state.rubyParen)}`;
    default:
      return applyRuby(text, state.rubyParen);
  }
}

// Split the currently active cues into "segments". A new segment starts at: the first line of each cue, a line beginning with a speaker name, or (when semantics are enabled) a standalone SFX line.
// Each segment carries a nonspeech flag (standalone （…）SFX), so that when splitting it can be moved to the opposite side, out of the way of the dialogue.
function buildSegments(active: Cue[]): Array<{ html: string; nonspeech: boolean }> {
  const segs: Array<{ lines: string[]; nonspeech: boolean }> = [];
  for (const cue of active) {
    let st = cue._spanIn || INIT_SPAN;
    let cur: { lines: string[]; nonspeech: boolean } | null = null; // reset at the start of each cue → the cue's first line always opens a new segment
    for (const line of String(cue.text == null ? '' : cue.text).split('<br>')) {
      const c = stepCueLine(line, state.speakers, st);
      st = c.state;
      const html = state.enhance ? typedHtml(line, c) : applyRuby(line, state.rubyParen);
      const nonspeech = state.enhance && c.type === 'sfx'; // only true SFX go to the top; written text is mostly spoken aloud → keep it at the bottom
      const turnStart = c.type === 'dialogue' || c.type === 'speaker' || nonspeech;
      if (cur === null || turnStart) {
        cur = { lines: [html], nonspeech };
        segs.push(cur);
      } else cur.lines.push(html);
    }
  }
  return segs.map((s) => ({ html: s.lines.join('<br>'), nonspeech: s.nonspeech }));
}

export function createTextRenderer(): Renderer {
  let boxTop: HTMLDivElement | null = null,
    boxBottom: HTMLDivElement | null = null;
  let visible = true;
  let lastKey = '';
  let cursor = 0; // scan start for active cues: during forward playback, skip past the already-ended prefix to avoid scanning from the start every frame (O(N) → amortized O(1))
  let prevT = -1;

  function outline(c: string): string {
    return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
  }
  function eachBox(fn: (b: HTMLDivElement) => void): void {
    if (boxTop) fn(boxTop);
    if (boxBottom) fn(boxBottom);
  }

  function makeBox(anchor: string): HTMLDivElement {
    const b = document.createElement('div');
    b.className = 'anysub-cuebox';
    b.dataset.anchor = anchor;
    b.style.display = 'none';
    return b;
  }

  function styleBox(b: HTMLDivElement): void {
    const s = state.style;
    b.style.color = s.color;
    b.style.textShadow = 'none';
    b.style.background = 'transparent';
    b.style.padding = '0';
    if (s.bg === 'outline') {
      b.style.textShadow = outline('#000');
    } else if (s.bg === 'translucent') {
      b.style.background = 'rgba(0,0,0,.55)';
      b.style.padding = '.08em .4em';
      b.style.textShadow = outline('rgba(0,0,0,.5)');
    } else if (s.bg === 'solid') {
      b.style.background = 'rgba(0,0,0,.92)';
      b.style.padding = '.08em .4em';
    }
  }

  return {
    mount() {
      boxTop = makeBox('top');
      boxBottom = makeBox('bottom');
      refs.overlay!.appendChild(boxTop);
      refs.overlay!.appendChild(boxBottom);
      lastKey = '';
      eachBox(styleBox); // = applyStyle(): apply the current panel style
    },

    setVisible(v: boolean) {
      visible = v;
      if (!v)
        eachBox((b) => {
          b.style.display = 'none';
        });
      else lastKey = ''; // force the next renderAt to re-render and restore display
    },

    renderAt(v: HTMLVideoElement, rect: DOMRect | null, layoutChanged: boolean) {
      if (!boxTop || !boxBottom) return;
      if (!visible) {
        eachBox((b) => {
          b.style.display = 'none';
        });
        return;
      }
      if (layoutChanged && rect) {
        const fontPx =
          Math.max(10, rect.height * FONT_BASE * (state.style.fontPct / 100)).toFixed(1) + 'px';
        const edge = (rect.height * state.style.bottomPct) / 100 + 'px';
        eachBox((b) => {
          b.style.fontSize = fontPx;
        });
        boxBottom.style.bottom = edge;
        boxBottom.style.top = 'auto';
        boxTop.style.top = edge;
        boxTop.style.bottom = 'auto';
      }
      const t = v.currentTime - state.offset;
      const cues = state.cues;
      if (t < prevT - 0.05) cursor = 0; // rewind/seek → reset the cursor
      prevT = t;
      // advance the cursor past the "already-ended prefix cues" (which won't be hit again during forward playback); stop at the first still-active cue without skipping it
      while (cursor < cues.length && cues[cursor].end <= t) cursor++;
      const active: Cue[] = [];
      // cues are sorted ascending by start: scan from the cursor until start > t; cues after the cursor may still be already-ended (overlapping cues), so still check end
      for (let i = cursor; i < cues.length; i++) {
        const c = cues[i];
        if (c.start > t) break;
        if (t < c.end) active.push(c); // end is exclusive, avoiding a momentary double display at the boundary between adjacent cues
      }
      // content + toggle fingerprint dedup: if the cues/toggles are unchanged, skip re-layout and DOM writes (don't re-run ruby on every render tick)
      const key =
        (state.rubyParen ? '1' : '0') +
        (state.enhance ? '1' : '0') +
        state.subPos +
        '|' +
        active
          .map(
            (c) => (c._spanIn ? c._spanIn.span + (c._spanIn.lyric ? 'L' : '') : '') + ':' + c.text,
          )
          .join(String.fromCharCode(1));
      if (key === lastKey) return;
      lastKey = key;

      // speech (dialogue / speaker / voice-over / lyrics) → primary anchor (bottom by default); non-speech (SFX / written text) → opposite side (top by default).
      // multiple speakers are no longer split top/bottom; they all stack at the primary anchor, distinguished by speaker name.
      const segs = buildSegments(active);
      const speech = segs.filter((s) => !s.nonspeech).map((s) => s.html);
      const meta = segs.filter((s) => s.nonspeech).map((s) => s.html);
      const pBox = state.subPos === 'top' ? boxTop : boxBottom;
      const sBox = state.subPos === 'top' ? boxBottom : boxTop;
      const pHtml = speech.join('<br>');
      const sHtml = meta.join('<br>');
      pBox.innerHTML = pHtml;
      pBox.style.display = pHtml ? 'inline-block' : 'none';
      sBox.innerHTML = sHtml;
      sBox.style.display = sHtml ? 'inline-block' : 'none';
    },

    applyStyle() {
      eachBox(styleBox);
    },

    destroy() {
      eachBox((b) => b.remove());
      boxTop = boxBottom = null;
    },
  };
}
