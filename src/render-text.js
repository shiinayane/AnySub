// 文本字幕渲染器(SRT / VTT):把当前时刻的 cue 文本渲染进覆盖层的 div。
// 实现统一 renderer 接口:{ mount, renderAt(v, rect, layoutChanged), applyStyle, destroy }
import { state, FONT_BASE } from './state.js';
import { refs } from './refs.js';

export function createTextRenderer() {
  let cueBox = null;
  let lastHtml = '';

  function outline(c) {
    return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
  }

  return {
    mount() {
      cueBox = document.createElement('div');
      cueBox.id = 'anysub-cuebox';
      refs.overlay.appendChild(cueBox);
      lastHtml = '';
      this.applyStyle();
    },

    renderAt(v, rect, layoutChanged) {
      if (!cueBox) return;
      if (layoutChanged && rect) {
        const fontPx = Math.max(10, rect.height * FONT_BASE * (state.style.fontPct / 100));
        cueBox.style.fontSize = fontPx.toFixed(1) + 'px';
        cueBox.style.bottom = (rect.height * state.style.bottomPct / 100) + 'px';
      }
      const t = v.currentTime - state.offset;
      const parts = [];
      // cues 已按 start 升序:start > t 之后不可能再命中,提前结束
      for (const c of state.cues) {
        if (c.start > t) break;
        if (t < c.end) parts.push(c.text); // end 独占,避免相邻 cue 边界瞬间双显
      }
      const html = parts.join('<br>');
      if (html === lastHtml) return;
      lastHtml = html;
      cueBox.innerHTML = html;
      cueBox.style.display = html ? 'inline-block' : 'none';
    },

    applyStyle() {
      if (!cueBox) return;
      const s = state.style;
      cueBox.style.color = s.color;
      cueBox.style.textShadow = 'none';
      cueBox.style.background = 'transparent';
      cueBox.style.padding = '0';
      if (s.bg === 'outline') {
        cueBox.style.textShadow = outline('#000');
      } else if (s.bg === 'translucent') {
        cueBox.style.background = 'rgba(0,0,0,.55)';
        cueBox.style.padding = '.08em .4em';
        cueBox.style.textShadow = outline('rgba(0,0,0,.5)');
      } else if (s.bg === 'solid') {
        cueBox.style.background = 'rgba(0,0,0,.92)';
        cueBox.style.padding = '.08em .4em';
      }
    },

    destroy() {
      if (cueBox) cueBox.remove();
      cueBox = null;
      lastHtml = '';
    },
  };
}
