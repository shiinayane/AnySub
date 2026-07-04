// 文本字幕渲染器(SRT / VTT):把当前时刻的 cue 渲染进覆盖层。
// 双锚点(底部盒 + 顶部盒)+ 按「话者段」分置:
//   段边界 = cue 边界 或 行首话者名（名前）。多人同时(≥2 段)时最新一段留主锚点、其余移对侧,
//   避免底部堆高挡画面。普通折行(无话者名)不拆。跨行/跨 cue 的画外音·书面·歌曲由 _spanIn 连续。
import { state, FONT_BASE } from './state.js';
import { refs } from './refs.js';
import { applyRuby } from './ruby.js';
import { stepCueLine, INIT_SPAN } from './cue-format.js';

// 单行 + 其分类 → HTML(语义排版 + 注音)。text/rest 已是转义安全的 HTML。
function typedHtml(text, c) {
  switch (c.type) {
    case 'sfx': return `<span class="anysub-sfx">${text}</span>`;
    case 'voice': return `<span class="anysub-voice">${applyRuby(text, state.rubyParen)}</span>`;
    case 'book': return `<span class="anysub-book">${applyRuby(text, state.rubyParen)}</span>`;
    case 'lyric': return `<span class="anysub-lyric">${applyRuby(text, state.rubyParen)}</span>`;
    case 'speaker': return `<span class="anysub-spk">${text}</span>`;
    case 'dialogue': return `<span class="anysub-spk">（${c.name}）</span>${applyRuby(c.rest, state.rubyParen)}`;
    default: return applyRuby(text, state.rubyParen);
  }
}

// 把当前活动 cue 拆成「话者段」(html 串数组)。新段起于:每条 cue 的首行、或行首带话者名的行。
function buildSegments(active) {
  const segs = [];
  for (const cue of active) {
    let st = cue._spanIn || INIT_SPAN;
    let cur = null; // 每条 cue 起始重置 → cue 首行必开新段
    for (const line of String(cue.text == null ? '' : cue.text).split('<br>')) {
      const c = stepCueLine(line, state.speakers, st);
      st = c.state;
      const html = state.enhance ? typedHtml(line, c) : applyRuby(line, state.rubyParen);
      const turnStart = c.type === 'dialogue' || c.type === 'speaker'; // 带话者名 → 新说话人
      if (cur === null || turnStart) { cur = [html]; segs.push(cur); }
      else cur.push(html);
    }
  }
  return segs.map((lines) => lines.join('<br>'));
}

export function createTextRenderer() {
  let boxTop = null, boxBottom = null;
  let visible = true;
  let lastKey = '';

  function outline(c) {
    return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
  }
  function eachBox(fn) { if (boxTop) fn(boxTop); if (boxBottom) fn(boxBottom); }

  function makeBox(anchor) {
    const b = document.createElement('div');
    b.className = 'anysub-cuebox';
    b.dataset.anchor = anchor;
    b.style.display = 'none';
    return b;
  }

  function styleBox(b) {
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
      refs.overlay.appendChild(boxTop);
      refs.overlay.appendChild(boxBottom);
      lastKey = '';
      this.applyStyle();
    },

    setVisible(v) {
      visible = v;
      if (!v) eachBox((b) => { b.style.display = 'none'; });
      else lastKey = ''; // 强制下次 renderAt 重渲染并恢复 display
    },

    renderAt(v, rect, layoutChanged) {
      if (!boxTop) return;
      if (!visible) { eachBox((b) => { b.style.display = 'none'; }); return; }
      if (layoutChanged && rect) {
        const fontPx = Math.max(10, rect.height * FONT_BASE * (state.style.fontPct / 100)).toFixed(1) + 'px';
        const edge = (rect.height * state.style.bottomPct / 100) + 'px';
        eachBox((b) => { b.style.fontSize = fontPx; });
        boxBottom.style.bottom = edge; boxBottom.style.top = 'auto';
        boxTop.style.top = edge; boxTop.style.bottom = 'auto';
      }
      const t = v.currentTime - state.offset;
      const active = [];
      // cues 已按 start 升序:start > t 之后不可能再命中,提前结束
      for (const c of state.cues) {
        if (c.start > t) break;
        if (t < c.end) active.push(c); // end 独占,避免相邻 cue 边界瞬间双显
      }
      // 内容+开关指纹去重:cue/开关未变则跳过重排与 DOM 写入(不在每个渲染 tick 重跑注音)
      const key = (state.rubyParen ? '1' : '0') + (state.enhance ? '1' : '0') +
        (state.multiSplit ? '1' : '0') + state.subPos + '|' +
        active.map((c) => (c._spanIn ? c._spanIn.span + (c._spanIn.lyric ? 'L' : '') : '') + ':' + c.text)
          .join(String.fromCharCode(1));
      if (key === lastKey) return;
      lastKey = key;

      const segs = buildSegments(active);
      let primary = segs, secondary = [];
      if (state.multiSplit && segs.length >= 2) {
        primary = [segs[segs.length - 1]];   // 最新一段留主锚点(视线停留处)
        secondary = segs.slice(0, -1);        // 其余移对侧
      }
      const pBox = state.subPos === 'top' ? boxTop : boxBottom;
      const sBox = state.subPos === 'top' ? boxBottom : boxTop;
      const pHtml = primary.join('<br>');
      const sHtml = secondary.join('<br>');
      pBox.innerHTML = pHtml; pBox.style.display = pHtml ? 'inline-block' : 'none';
      sBox.innerHTML = sHtml; sBox.style.display = sHtml ? 'inline-block' : 'none';
    },

    applyStyle() { eachBox(styleBox); },

    destroy() {
      eachBox((b) => b.remove());
      boxTop = boxBottom = null;
    },
  };
}
