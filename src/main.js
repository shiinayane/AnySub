// AnySub 入口:初始化 UI + 动态视频监听
import { state } from './state.js';
import { injectStyle } from './styles.js';
import { buildUI, updateFabVisibility } from './ui.js';
import { pickBestVideo, isVisible } from './locator.js';
import { setVideo } from './controller.js';
import { loadSettings } from './storage.js';
import { initShortcuts } from './shortcuts.js';
import { setReactHandler, updateWatcher } from './watcher.js';

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
  setReactHandler(react);
  updateFabVisibility();
  updateWatcher(); // 按需连接:仅当开了悬浮球或已加载字幕才观察 DOM
}

// DOM 变化时:SPA 换视频后重挂(仅字幕已加载时)+ 刷新悬浮球可见性
function react() {
  if (state.cues.length && state.video &&
      (!state.video.isConnected || !isVisible(state.video))) {
    const nv = pickBestVideo();
    if (nv && nv !== state.video) setVideo(nv);
  }
  updateFabVisibility();
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
  if (typeof saved.jimakuKey === 'string') state.jimakuKey = saved.jimakuKey;
}
