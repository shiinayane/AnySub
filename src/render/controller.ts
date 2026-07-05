// 渲染控制器:驱动渲染循环、管理当前渲染器与视频生命周期(格式无关)
import { state } from '../state.js';
import { refs } from '../refs.js';
import { positionOverlay, ensureMounted, hideOverlay, invalidateLayout } from './overlay.js';
import { toast, updateStatus } from '../ui/notify.js';
import { updateWatcher } from './watcher.js';
import { t } from '../i18n.js';
import type { Renderer } from '../types.js';

let intervalId: ReturnType<typeof setInterval> | undefined,
  driversAttached = false;
let renderer: Renderer | null = null;
let onScroll!: () => void, onResize!: () => void, onFs!: () => void, onVis!: () => void;

// 切换当前渲染器(为多格式预留):销毁旧的、挂载新的
export function setRenderer(r: Renderer | null): void {
  if (renderer) renderer.destroy();
  renderer = r;
  if (renderer) {
    renderer.mount();
    // 承接当前隐藏意图:否则用户按 V 隐藏后,切集/换字幕新建的渲染器会无视隐藏又冒出来
    if (renderer.setVisible) renderer.setVisible(!state.hidden);
  }
}

export function applyStyle(): void {
  if (renderer && renderer.applyStyle) renderer.applyStyle();
}
export function refresh(): void {
  renderTick();
}

export function startRender(): void {
  state.active = true;
  attachDrivers();
  if (!intervalId) intervalId = setInterval(renderTick, 250); // 兜底:文本切换 + 布局位移(timeupdate 负责播放时的实时性)
  renderTick();
}

export function stopRender(): void {
  state.active = false;
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = undefined;
  }
  detachDrivers();
  hideOverlay();
}

function attachDrivers(): void {
  if (driversAttached) return;
  driversAttached = true;
  onScroll = () => renderTick();
  onResize = () => {
    invalidateLayout();
    renderTick();
  };
  onFs = () => {
    invalidateLayout();
    renderTick();
  };
  onVis = () => {
    if (!document.hidden) renderTick();
  };
  window.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  document.addEventListener('fullscreenchange', onFs);
  document.addEventListener('webkitfullscreenchange', onFs);
  document.addEventListener('visibilitychange', onVis);
}

function detachDrivers(): void {
  if (!driversAttached) return;
  driversAttached = false;
  window.removeEventListener('scroll', onScroll, { capture: true });
  window.removeEventListener('resize', onResize);
  document.removeEventListener('fullscreenchange', onFs);
  document.removeEventListener('webkitfullscreenchange', onFs);
  document.removeEventListener('visibilitychange', onVis);
}

export function renderTick(): void {
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

export function setVideo(v: HTMLVideoElement): void {
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
export function toggleSubtitles(): boolean | undefined {
  if (!state.cues.length) {
    toast(t('toast.noSubs'));
    return;
  }
  state.hidden = !state.hidden;
  if (renderer && renderer.setVisible) renderer.setVisible(!state.hidden);
  renderTick();
  toast(state.hidden ? t('toast.hidden') : t('toast.shown'));
  return state.hidden;
}

export function clearSubtitle(): void {
  if (!state.cues.length) {
    toast(t('toast.noSubsNow'));
    return;
  }
  state.cues = [];
  state.fileName = '';
  stopRender();
  if (renderer) {
    renderer.destroy();
    renderer = null;
  }
  updateStatus();
  updateWatcher(); // 字幕已清除 → 若也没开悬浮球,断开观察器
  toast(t('toast.cleared'));
}
