// AnySub 入口:初始化 UI + 动态视频监听
import { state } from './state.js';
import { injectStyle } from './styles.js';
import { buildUI } from './ui.js';
import { pickBestVideo } from './locator.js';
import { setVideo } from './render.js';
import { loadSettings } from './storage.js';

// 避免在同一 window 重复注入
if (!window.__ANYSUB_LOADED__) {
  window.__ANYSUB_LOADED__ = true;
  init();
}

function init() {
  if (!document.body) { requestAnimationFrame(init); return; }
  restoreSettings();
  injectStyle();
  buildUI();
  watchVideos();
}

// 恢复持久化的样式偏好(仅接受已知字段,防脏数据)
function restoreSettings() {
  const saved = loadSettings();
  const s = state.style;
  if (typeof saved.fontPct === 'number') s.fontPct = saved.fontPct;
  if (typeof saved.bottomPct === 'number') s.bottomPct = saved.bottomPct;
  if (typeof saved.bg === 'string') s.bg = saved.bg;
  if (typeof saved.color === 'string') s.color = saved.color;
}

// SPA 切换视频后自动重新挂载
function watchVideos() {
  const mo = new MutationObserver(() => {
    if (state.video && !state.video.isConnected && state.cues.length) {
      const nv = pickBestVideo();
      if (nv && nv !== state.video) setVideo(nv);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
