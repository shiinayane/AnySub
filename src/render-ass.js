// ASS/SSA 渲染器:先用文本渲染器立即显示(保底,离线可用),
// 后台尝试加载 libass-wasm;成功则切换到高保真 canvas 渲染,失败则保留文本。
// 实现统一 renderer 接口 { mount, renderAt, applyStyle, destroy }。
import { state } from './state.js';
import { createTextRenderer } from './render-text.js';
import { loadOctopus } from './octopus-loader.js';
import { toast } from './notify.js';

export function createAssRenderer(assText) {
  const textRenderer = createTextRenderer(); // 文本保底,渲染 state.cues(loader 已用 parseAss 填充)
  let octopus = null;
  let usingLibass = false;
  let disposed = false;

  function tryLibass() {
    loadOctopus()
      .then(({ Octopus, workerUrl, fallbackFont }) => {
        if (disposed || !state.video) return;
        octopus = new Octopus({
          video: state.video,
          subContent: assText,
          workerUrl,
          fallbackFont,
          onReady: () => {
            if (disposed) { safeDispose(); return; }
            usingLibass = true;
            textRenderer.destroy(); // 交给 canvas,撤掉文本
            if (state.hidden) setCanvasDisplay('none'); // 保持隐藏态
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

  function safeDispose() {
    if (octopus) { try { octopus.dispose(); } catch (_) { /* ignore */ } octopus = null; }
  }

  function setCanvasDisplay(val) {
    const cv = octopus && octopus.canvas;
    if (cv) cv.style.display = val;
  }

  return {
    mount() {
      textRenderer.mount();
      tryLibass();
    },
    renderAt(v, rect, layoutChanged) {
      if (!usingLibass) textRenderer.renderAt(v, rect, layoutChanged); // libass 自行随视频同步
    },
    setVisible(v) {
      if (usingLibass) setCanvasDisplay(v ? '' : 'none');
      else textRenderer.setVisible(v);
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
