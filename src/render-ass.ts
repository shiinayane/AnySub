// ASS/SSA 渲染器:先文本保底,后台加载 libass-wasm。
// libass 渲染进「我们自己的 overlay canvas」(复用 overlay 的 fixed 定位/尺寸/全屏跟随,
// 与文本字幕同源,故在复杂播放器/DMM 上一致可显);采用 canvas-only 手动驱动模式
// (不给 octopus 传 video)—— 绕开它内部随视频事件触发、会解引用 null canvasParent 的自动 resize。
import { state } from './state.js';
import { refs } from './refs.js';
import { createTextRenderer } from './render-text.js';
import { loadOctopus } from './octopus-loader.js';
import { toast } from './notify.js';
import { t } from './i18n.js';
import type { OctopusInstance, Renderer } from './types.js';

export function createAssRenderer(assText: string): Renderer {
  const textRenderer = createTextRenderer(); // 文本保底,渲染 state.cues(loader 已用 parseAss 填充)
  let octopus: OctopusInstance | null = null;
  let assCanvas: HTMLCanvasElement | null = null;
  let usingLibass = false;
  let disposed = false;
  let lastSizeKey = '';
  let lastDriveT = -1;

  function tryLibass(): void {
    loadOctopus()
      .then(({ Octopus, workerUrl, fallbackFont, fonts }) => {
        if (disposed) return;
        assCanvas = document.createElement('canvas');
        assCanvas.id = 'anysub-ass-canvas';
        assCanvas.style.cssText =
          'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;';
        refs.overlay!.appendChild(assCanvas);
        octopus = new Octopus({
          canvas: assCanvas, // 只给 canvas,不给 video → 我们手动驱动时间轴与尺寸
          subContent: assText,
          workerUrl,
          fallbackFont,
          fonts, // 额外字体库,libass 为缺失字形做替换,减少方块
          onReady: () => {
            if (disposed) {
              safeDispose();
              return;
            }
            usingLibass = true;
            textRenderer.destroy(); // 交给 canvas,撤掉文本保底
            lastSizeKey = '';
            sizeCanvas(); // 首次定尺寸
            drive(); // 立即渲染当前帧
            if (state.hidden && assCanvas) assCanvas.style.display = 'none';
            toast(t('toast.assHiFi'));
          },
          onError: (e: unknown) => {
            console.warn('[AnySub] libass 渲染出错,保留文本', e);
          },
        });
      })
      .catch((err) => {
        console.warn('[AnySub] 无法加载 libass,使用文本渲染:', err && err.message);
        toast(t('toast.assText'));
      });
  }

  // 让 libass 渲染分辨率跟上 overlay(overlay 已同步到视频位置/尺寸)
  function sizeCanvas(): void {
    if (!octopus || !assCanvas || !refs.overlay) return;
    const w = refs.overlay.clientWidth,
      h = refs.overlay.clientHeight;
    if (!w || !h) return;
    const dpr = window.devicePixelRatio || 1;
    const bw = Math.round(w * dpr),
      bh = Math.round(h * dpr);
    const key = bw + 'x' + bh;
    if (key === lastSizeKey) return;
    lastSizeKey = key;
    lastDriveT = -1; // 尺寸变了需强制重绘(canvas 可能被清空),让下次 drive() 不因时间相同而跳过
    try {
      octopus.resize(bw, bh, 0, 0);
    } catch (_) {
      /* ignore */
    }
  }

  // 把视频当前时间(含偏移)推给 libass;时间未变则跳过(暂停+滚动/resize 时避免每 tick 重绘)
  function drive(): void {
    if (!octopus || !state.video) return;
    const time = Math.max(0, state.video.currentTime - state.offset);
    if (time === lastDriveT) return;
    lastDriveT = time;
    try {
      octopus.setCurrentTime(time);
    } catch (_) {
      /* ignore */
    }
  }

  function safeDispose(): void {
    if (octopus) {
      try {
        octopus.dispose();
      } catch (_) {
        /* ignore */
      }
      octopus = null;
    }
    if (assCanvas) {
      assCanvas.remove();
      assCanvas = null;
    }
  }

  return {
    mount() {
      textRenderer.mount();
      tryLibass();
    },
    renderAt(v: HTMLVideoElement, rect: DOMRect | null, layoutChanged: boolean) {
      if (!usingLibass) {
        textRenderer.renderAt(v, rect, layoutChanged);
        return;
      }
      // lastSizeKey 为空 = onReady 时 overlay 尚无尺寸(如当时视频 display:none),持续重试直到定尺寸,
      // 否则若之后 rect 未变(changed=false)canvas 会一直停在默认 300×150
      if (layoutChanged || lastSizeKey === '') sizeCanvas();
      drive();
    },
    setVisible(vis: boolean) {
      if (usingLibass) {
        if (assCanvas) assCanvas.style.display = vis ? '' : 'none';
      } else textRenderer.setVisible!(vis);
    },
    applyStyle() {
      if (!usingLibass) textRenderer.applyStyle!(); // ASS 用文件自带样式,libass 阶段忽略面板样式
    },
    destroy() {
      disposed = true;
      textRenderer.destroy();
      safeDispose();
    },
  };
}
