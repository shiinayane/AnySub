// 文本字幕渲染器(SRT / VTT):把当前时刻的 cue 渲染进覆盖层。
// 双锚点(底部盒 + 顶部盒):说话(台词/话者/画外音/歌词/书面念白)放主锚点(默认底部),
//   仅真·音效(独立（…))恒放对侧(默认顶部)——底部永远是"说话的地方",心智统一。
//   多说话人不上下拆分,一律主锚点叠放靠话者名区分。跨行/跨 cue 的画外音·书面·歌曲由 _spanIn 连续。
import { state, FONT_BASE } from './state.js';
import { refs } from './refs.js';
import { applyRuby } from './ruby.js';
import { stepCueLine, INIT_SPAN } from './cue-format.js';

// 单行 + 其分类 → HTML(语义排版 + 注音)。text/rest 已是转义安全的 HTML。
// 导出供单测:每种语义类型都应正确套用注音(sfx 曾漏调 applyRuby 导致内嵌注音丢失)。
export function typedHtml(text, c) {
  switch (c.type) {
    case 'sfx': return `<span class="anysub-sfx">${applyRuby(text, state.rubyParen)}</span>`;
    case 'voice': return `<span class="anysub-voice">${applyRuby(text, state.rubyParen)}</span>`;
    case 'book': return `<span class="anysub-book">${applyRuby(text, state.rubyParen)}</span>`;
    case 'lyric': return `<span class="anysub-lyric">${applyRuby(text, state.rubyParen)}</span>`;
    case 'speaker': return `<span class="anysub-spk">${applyRuby(text, state.rubyParen)}</span>`;
    case 'dialogue': return `<span class="anysub-spk">（${applyRuby(c.name, state.rubyParen)}）</span>${applyRuby(c.rest, state.rubyParen)}`;
    default: return applyRuby(text, state.rubyParen);
  }
}

// 把当前活动 cue 拆成「段」。新段起于:每条 cue 的首行、行首带话者名的行、或(启用语义时)独立音效行。
// 每段带 nonspeech 标记(独立（…）音效),供分置时把它移到对侧、避让台词。
function buildSegments(active) {
  const segs = [];
  for (const cue of active) {
    let st = cue._spanIn || INIT_SPAN;
    let cur = null; // 每条 cue 起始重置 → cue 首行必开新段
    for (const line of String(cue.text == null ? '' : cue.text).split('<br>')) {
      const c = stepCueLine(line, state.speakers, st);
      st = c.state;
      const html = state.enhance ? typedHtml(line, c) : applyRuby(line, state.rubyParen);
      const nonspeech = state.enhance && c.type === 'sfx'; // 仅真·音效置顶;书面多是念出来的→留底部
      const turnStart = c.type === 'dialogue' || c.type === 'speaker' || nonspeech;
      if (cur === null || turnStart) { cur = { lines: [html], nonspeech }; segs.push(cur); }
      else cur.lines.push(html);
    }
  }
  return segs.map((s) => ({ html: s.lines.join('<br>'), nonspeech: s.nonspeech }));
}

export function createTextRenderer() {
  let boxTop = null, boxBottom = null;
  let visible = true;
  let lastKey = '';
  let cursor = 0;   // 活动 cue 扫描起点:前进播放时越过已结束的前缀,免每帧从头扫(O(N)→摊还 O(1))
  let prevT = -1;

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
      const cues = state.cues;
      if (t < prevT - 0.05) cursor = 0; // 回退/跳转 → 重置游标
      prevT = t;
      // 游标越过「已结束的前缀 cue」(前进播放中不会再命中);遇到仍活动的 cue 即停,不越过它
      while (cursor < cues.length && cues[cursor].end <= t) cursor++;
      const active = [];
      // cues 按 start 升序:从游标扫到 start > t;游标之后仍可能有已结束的(重叠 cue),故仍判 end
      for (let i = cursor; i < cues.length; i++) {
        const c = cues[i];
        if (c.start > t) break;
        if (t < c.end) active.push(c); // end 独占,避免相邻 cue 边界瞬间双显
      }
      // 内容+开关指纹去重:cue/开关未变则跳过重排与 DOM 写入(不在每个渲染 tick 重跑注音)
      const key = (state.rubyParen ? '1' : '0') + (state.enhance ? '1' : '0') + state.subPos + '|' +
        active.map((c) => (c._spanIn ? c._spanIn.span + (c._spanIn.lyric ? 'L' : '') : '') + ':' + c.text)
          .join(String.fromCharCode(1));
      if (key === lastKey) return;
      lastKey = key;

      // 说话(台词/话者/画外音/歌词)→ 主锚点(默认底部);非语音(音效/书面)→ 对侧(默认顶部)。
      // 多说话人不再上下拆分,一律在主锚点叠放,靠话者名区分。
      const segs = buildSegments(active);
      const speech = segs.filter((s) => !s.nonspeech).map((s) => s.html);
      const meta = segs.filter((s) => s.nonspeech).map((s) => s.html);
      const pBox = state.subPos === 'top' ? boxTop : boxBottom;
      const sBox = state.subPos === 'top' ? boxBottom : boxTop;
      const pHtml = speech.join('<br>');
      const sHtml = meta.join('<br>');
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
