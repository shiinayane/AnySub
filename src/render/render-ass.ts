// ASS/SSA renderer: text fallback first, load libass-wasm in the background.
// libass renders into "our own overlay canvas" (reusing the overlay's fixed positioning / sizing / fullscreen tracking,
// same origin as the text subtitles, so it displays consistently on complex players / DMM); uses canvas-only manual-drive mode
// (don't pass video to octopus) — bypassing its internal auto-resize that fires on video events and would dereference a null canvasParent.
import { state } from '../state.js';
import { refs } from '../refs.js';
import { createTextRenderer } from './render-text.js';
import { loadOctopus } from './octopus-loader.js';
import { toast } from '../ui/notify.js';
import { t } from '../i18n.js';
import type { OctopusInstance, Renderer } from '../types.js';

export function createAssRenderer(assText: string): Renderer {
  const textRenderer = createTextRenderer(); // text fallback, renders state.cues (the loader already populated them via parseAss)
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
          canvas: assCanvas, // only give it the canvas, not the video → we manually drive the timeline and sizing
          subContent: assText,
          workerUrl,
          fallbackFont,
          fonts, // extra font library; libass substitutes for missing glyphs, reducing tofu boxes
          onReady: () => {
            if (disposed) {
              safeDispose();
              return;
            }
            usingLibass = true;
            textRenderer.destroy(); // hand off to the canvas, remove the text fallback
            lastSizeKey = '';
            sizeCanvas(); // set the size for the first time
            drive(); // render the current frame immediately
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

  // keep libass's render resolution in step with the overlay (the overlay is already synced to the video position/size)
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
    lastDriveT = -1; // a size change requires a forced redraw (the canvas may have been cleared), so the next drive() isn't skipped just because the time is the same
    try {
      octopus.resize(bw, bh, 0, 0);
    } catch (_) {
      /* ignore */
    }
  }

  // push the video's current time (including offset) to libass; skip if the time is unchanged (avoids redrawing every tick while paused + scrolling/resizing)
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
      // lastSizeKey empty = the overlay had no size at onReady time (e.g. the video was display:none then); keep retrying until sized,
      // otherwise if the rect doesn't change afterwards (changed=false) the canvas would stay stuck at the default 300×150
      if (layoutChanged || lastSizeKey === '') sizeCanvas();
      drive();
    },
    setVisible(vis: boolean) {
      if (usingLibass) {
        if (assCanvas) assCanvas.style.display = vis ? '' : 'none';
      } else textRenderer.setVisible!(vis);
    },
    applyStyle() {
      if (!usingLibass) textRenderer.applyStyle!(); // ASS uses the file's own styles; in the libass stage the panel style is ignored
    },
    destroy() {
      disposed = true;
      textRenderer.destroy();
      safeDispose();
    },
  };
}
