// 文本字幕渲染器(SRT / VTT):把当前时刻的 cue 渲染进覆盖层。
// 双锚点:底部盒 + 顶部盒。全局位置(state.subPos)决定主锚点;
// 多人同时(state.multiSplit)时把最新一条留主锚点、其余放对侧,避免底部堆高挡画面。
// 实现统一 renderer 接口:{ mount, renderAt, applyStyle, setVisible, destroy }
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

// 一条 cue(内部多行以 <br> 分隔)→ 逐行语义排版。
// 从该 cue 载入时预计算的跨度状态(_spanIn)起,逐行推进,让跨行的画外音/书面/歌曲连续。
function cueToHtml(cue) {
  const text = String(cue.text == null ? '' : cue.text);
  if (!state.enhance) return text.split('<br>').map((l) => applyRuby(l, state.rubyParen)).join('<br>');
  let st = cue._spanIn || INIT_SPAN;
  const out = [];
  for (const line of text.split('<br>')) {
    const c = stepCueLine(line, state.speakers, st);
    out.push(typedHtml(line, c));
    st = c.state;
  }
  return out.join('<br>');
}

export function createTextRenderer() {
  let boxTop = null, boxBottom = null;
  let visible = true;

  function outline(c) {
    return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
  }
  function eachBox(fn) { if (boxTop) fn(boxTop); if (boxBottom) fn(boxBottom); }

  function makeBox(anchor) {
    const b = document.createElement('div');
    b.className = 'anysub-cuebox';
    b.dataset.anchor = anchor;
    b.style.display = 'none'; // 初始无字先隐藏,避免露出空的半透占位
    b.__lastKey = '';
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

  // 把一组 cue 画进某个盒子;按内容+开关指纹去重,cue 未变则跳过重排与 DOM。
  function paint(box, cues) {
    const key = (state.rubyParen ? '1' : '0') + (state.enhance ? '1' : '0') + '|' +
      cues.map((c) => (c._spanIn ? c._spanIn.span + (c._spanIn.lyric ? 'L' : '') : '') + ':' + c.text).join(String.fromCharCode(1));
    if (box.__lastKey === key) return;
    box.__lastKey = key;
    const html = cues.map(cueToHtml).join('<br>');
    box.innerHTML = html;
    box.style.display = html ? 'inline-block' : 'none';
  }

  return {
    mount() {
      boxTop = makeBox('top');
      boxBottom = makeBox('bottom');
      refs.overlay.appendChild(boxTop);
      refs.overlay.appendChild(boxBottom);
      this.applyStyle();
    },

    setVisible(v) {
      visible = v;
      if (!v) eachBox((b) => { b.style.display = 'none'; });
      else eachBox((b) => { b.__lastKey = ''; }); // 强制下次 renderAt 重渲染并恢复 display
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
      // 多人同时:最新开始的一条放主锚点(视线停留处),其余放对侧,避免底部堆高
      let primary = active, secondary = [];
      if (state.multiSplit && active.length >= 2) {
        primary = [active[active.length - 1]];
        secondary = active.slice(0, active.length - 1);
      }
      const pBox = state.subPos === 'top' ? boxTop : boxBottom;
      const sBox = state.subPos === 'top' ? boxBottom : boxTop;
      paint(pBox, primary);
      paint(sBox, secondary);
    },

    applyStyle() { eachBox(styleBox); },

    destroy() {
      eachBox((b) => b.remove());
      boxTop = boxBottom = null;
    },
  };
}
