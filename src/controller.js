// 渲染控制器:驱动渲染循环、管理当前渲染器与视频生命周期(格式无关)
import { state } from './state.js';
import { refs } from './refs.js';
import { positionOverlay, ensureMounted, hideOverlay, invalidateLayout } from './overlay.js';
import { toast, updateStatus } from './notify.js';

let intervalId = 0, driversAttached = false;
let renderer = null;
let onScroll, onResize, onFs, onVis;

// 切换当前渲染器(为多格式预留):销毁旧的、挂载新的
export function setRenderer(r) {
  if (renderer) renderer.destroy();
  renderer = r;
  if (renderer) renderer.mount();
}

export function applyStyle() { if (renderer && renderer.applyStyle) renderer.applyStyle(); }
export function refresh() { renderTick(); }

export function startRender() {
  state.active = true;
  attachDrivers();
  if (!intervalId) intervalId = setInterval(renderTick, 250); // 兜底:文本切换 + 布局位移(timeupdate 负责播放时的实时性)
  renderTick();
}

export function stopRender() {
  state.active = false;
  if (intervalId) { clearInterval(intervalId); intervalId = 0; }
  detachDrivers();
  hideOverlay();
}

function attachDrivers() {
  if (driversAttached) return;
  driversAttached = true;
  onScroll = () => renderTick();
  onResize = () => { invalidateLayout(); renderTick(); };
  onFs = () => { invalidateLayout(); renderTick(); };
  onVis = () => { if (!document.hidden) renderTick(); };
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  document.addEventListener('visibilitychange', onVis);
}

function detachDrivers() {
  if (!driversAttached) return;
  driversAttached = false;
  window.removeEventListener('scroll', onScroll, { capture: true });
  window.removeEventListener('resize', onResize);
  document.removeEventListener('fullscreenchange', onFs);
  document.removeEventListener('webkitfullscreenchange', onFs);
  document.removeEventListener('visibilitychange', onVis);
}

export function renderTick() {
  if (!state.active || !renderer) return;
  const v = state.video;
  if (v && v.isConnected && state.cues.length) {
    ensureMounted(refs.overlay);
    ensureMounted(refs.uiRoot);
    const { rect, changed } = positionOverlay(v);
    renderer.renderAt(v, rect, changed);
  } else {
    hideOverlay();
  }
}

export function setVideo(v) {
  if (state.video && state.video !== v) {
    state.video.removeEventListener('timeupdate', renderTick);
    state.video.removeEventListener('seeking', renderTick);
    state.video.removeEventListener('play', renderTick);
  }
  state.video = v;
  invalidateLayout();
  if (v) {
    v.addEventListener('timeupdate', renderTick);
    v.addEventListener('seeking', renderTick);
    v.addEventListener('play', renderTick);
  }
  if (state.cues.length) startRender();
}

// 临时隐藏/显示字幕(不清除,不持久化)
export function toggleSubtitles() {
  if (!state.cues.length) { toast('未加载字幕'); return; }
  state.hidden = !state.hidden;
  if (renderer && renderer.setVisible) renderer.setVisible(!state.hidden);
  renderTick();
  toast(state.hidden ? '字幕已隐藏' : '字幕已显示');
  return state.hidden;
}

export function clearSubtitle() {
  if (!state.cues.length) { toast('当前没有字幕'); return; }
  state.cues = [];
  state.fileName = '';
  stopRender();
  if (renderer) { renderer.destroy(); renderer = null; }
  updateStatus();
  toast('已清除字幕');
}
