// ASS/SSA 渲染器:先用文本渲染器立即显示(保底,离线可用),
// 后台加载 libass-wasm;成功则切到 SubtitlesOctopus 的 canvas 高保真渲染,失败则保留文本。
// canvas 由 octopus 自建(其内部 resize 依赖自建的 canvasParent,故不传外部 canvas);
// 就绪后把它的 canvasParent 提到极高 z-index 且不拦点击,尽量对付复杂播放器的遮挡。
import { state } from './state.js';
import { createTextRenderer } from './render-text.js';
import { loadOctopus } from './octopus-loader.js';
import { toast } from './notify.js';

const Z = '2147483640';

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
            textRenderer.destroy(); // 交给 canvas,撤掉文本保底
            hardenCanvas();
            if (state.hidden) setCanvasDisplay('none');
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

  // 把 octopus 的画布容器提到最上层且不拦截点击,减小被播放器控件/浮层遮挡的概率
  function hardenCanvas() {
    const p = octopus && octopus.canvasParent;
    if (p) { p.style.zIndex = Z; p.style.pointerEvents = 'none'; }
    if (octopus && octopus.canvas) octopus.canvas.style.pointerEvents = 'none';
  }

  function setCanvasDisplay(val) {
    if (octopus && octopus.canvas) octopus.canvas.style.display = val;
  }

  function safeDispose() {
    if (octopus) { try { octopus.dispose(); } catch (_) { /* ignore */ } octopus = null; }
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
