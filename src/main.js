// AnySub 入口:初始化 UI + 动态视频监听
import { state } from './state.js';
import { injectStyle } from './styles.js';
import { buildUI, updateFabVisibility } from './ui.js';
import { pickBestVideo, isVisible } from './locator.js';
import { setVideo } from './controller.js';
import { loadSettings } from './storage.js';
import { initShortcuts } from './shortcuts.js';

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
  initShortcuts();
  updateFabVisibility();
  watchVideos();
}

// 恢复持久化偏好(仅接受已知字段,防脏数据)
function restoreSettings() {
  const saved = loadSettings();
  const s = state.style;
  if (typeof saved.fontPct === 'number') s.fontPct = saved.fontPct;
  if (typeof saved.bottomPct === 'number') s.bottomPct = saved.bottomPct;
  if (typeof saved.bg === 'string') s.bg = saved.bg;
  if (typeof saved.color === 'string') s.color = saved.color;
  if (typeof saved.shortcutsEnabled === 'boolean') state.shortcutsEnabled = saved.shortcutsEnabled;
  if (typeof saved.showFab === 'boolean') state.showFab = saved.showFab;
}

// 监听 DOM 变化:切换胶囊可见性 + SPA 换视频后自动重新挂载(防抖,避免频繁全 DOM 遍历)
function watchVideos() {
  let timer = 0;
  const react = () => {
    // SPA 场景:当前视频被移除,或变得不可见(被换成另一个视频/隐藏)时,改挂到当前最佳视频
    if (state.cues.length && state.video &&
        (!state.video.isConnected || !isVisible(state.video))) {
      const nv = pickBestVideo();
      if (nv && nv !== state.video) setVideo(nv);
    }
    updateFabVisibility();
  };
  const mo = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(react, 300);
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}
