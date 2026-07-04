// ASS/SSA 渲染器:先文本保底,后台加载 libass-wasm。
// libass 渲染进「我们自己的 overlay canvas」(复用 overlay 的 fixed 定位/尺寸/全屏跟随,
// 与文本字幕同源,故在复杂播放器/DMM 上一致可显);采用 canvas-only 手动驱动模式
// (不给 octopus 传 video)—— 绕开它内部随视频事件触发、会解引用 null canvasParent 的自动 resize。
import { state } from './state.js';
import { refs } from './refs.js';
import { createTextRenderer } from './render-text.js';
import { loadOctopus } from './octopus-loader.js';
import { toast } from './notify.js';

export function createAssRenderer(assText) {
  const textRenderer = createTextRenderer(); // 文本保底,渲染 state.cues(loader 已用 parseAss 填充)
  let octopus = null;
  let assCanvas = null;
  let usingLibass = false;
  let disposed = false;
  let lastSizeKey = '';

  function tryLibass() {
    loadOctopus()
      .then(({ Octopus, workerUrl, fallbackFont }) => {
        if (disposed) return;
        assCanvas = document.createElement('canvas');
        assCanvas.id = 'anysub-ass-canvas';
        assCanvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
        refs.overlay.appendChild(assCanvas);
        octopus = new Octopus({
          canvas: assCanvas,   // 只给 canvas,不给 video → 我们手动驱动时间轴与尺寸
          subContent: assText,
          workerUrl,
          fallbackFont,
          onReady: () => {
            if (disposed) { safeDispose(); return; }
            usingLibass = true;
            textRenderer.destroy();   // 交给 canvas,撤掉文本保底
            lastSizeKey = '';
            sizeCanvas();             // 首次定尺寸
            drive();                  // 立即渲染当前帧
            if (state.hidden) assCanvas.style.display = 'none';
            toast('已启用 ASS 高保真渲染');
          },
          onError: (e) => { console.warn('[AnySub] libass 渲染出错,保留文本', e); },
        });
      })
      .catch((err) => {
        console.warn('[AnySub] 无法加载 libass,使用文本渲染:', err && err.message);
        toast('ASS 按文本显示(高保真渲染不可用)');
      });
  }

  // 让 libass 渲染分辨率跟上 overlay(overlay 已同步到视频位置/尺寸)
  function sizeCanvas() {
    if (!octopus || !assCanvas) return;
    const w = refs.overlay.clientWidth, h = refs.overlay.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    const key = bw + 'x' + bh;
    if (key === lastSizeKey) return;
    lastSizeKey = key;
    try { octopus.resize(bw, bh, 0, 0); } catch (_) { /* ignore */ }
  }

  // 把视频当前时间(含偏移)推给 libass
  function drive() {
    if (!octopus || !state.video) return;
    try { octopus.setCurrentTime(Math.max(0, state.video.currentTime - state.offset)); } catch (_) { /* ignore */ }
  }

  function safeDispose() {
    if (octopus) { try { octopus.dispose(); } catch (_) { /* ignore */ } octopus = null; }
    if (assCanvas) { assCanvas.remove(); assCanvas = null; }
  }

  return {
    mount() {
      textRenderer.mount();
      tryLibass();
    },
    renderAt(v, rect, layoutChanged) {
      if (!usingLibass) { textRenderer.renderAt(v, rect, layoutChanged); return; }
      if (layoutChanged) sizeCanvas();
      drive();
    },
    setVisible(vis) {
      if (usingLibass) { if (assCanvas) assCanvas.style.display = vis ? '' : 'none'; }
      else textRenderer.setVisible(vis);
    },
    applyStyle() {
      if (!usingLibass) textRenderer.applyStyle(); // ASS 用文件自带样式,libass 阶段忽略面板样式
    },
    destroy() {
      disposed = true;
      textRenderer.destroy();
      safeDispose();
    },
  };
}
