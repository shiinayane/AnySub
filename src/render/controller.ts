// Render controller: drives the render loop, manages the current renderer and the video lifecycle (format-agnostic)
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

// Switch the current renderer (reserved for multi-format): destroy the old one, mount the new one
export function setRenderer(r: Renderer | null): void {
  if (renderer) renderer.destroy();
  renderer = r;
  if (renderer) {
    renderer.mount();
    // carry over the current hidden intent: otherwise, after the user presses V to hide, a renderer newly created on an episode/subtitle switch would ignore the hidden state and pop back up
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
  if (!intervalId) intervalId = setInterval(renderTick, 250); // fallback: text switching + layout shifts (timeupdate handles real-time responsiveness during playback)
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

// Temporarily hide/show subtitles (not cleared, not persisted)
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
  updateWatcher(); // subtitles cleared → if the floating button is also off, disconnect the observer
  toast(t('toast.cleared'));
}
