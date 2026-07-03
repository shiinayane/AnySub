// 自绘覆盖层渲染:事件驱动 + 定时兜底(不依赖 rAF),按播放器高度等比缩放字号
import { state, FONT_BASE } from './state.js';
import { refs } from './refs.js';
import { toast, updateStatus } from './notify.js';

let intervalId = 0, driversAttached = false;
let lastHtml = '', lastRectKey = '';

// 让下一帧强制重算位置/字号(样式或视频变更后调用)
export function invalidateLayout() { lastRectKey = ''; }

function fullscreenEl() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// 覆盖层与 UI 的挂载宿主:全屏时挂到全屏元素(否则会被顶层遮挡)
export function getHost() {
  const fs = fullscreenEl();
  if (fs && fs.tagName !== 'VIDEO') return fs;
  return document.body;
}

export function ensureMounted(el) {
  const host = getHost();
  if (el.parentNode !== host) host.appendChild(el);
}

export function startRender() {
  state.active = true;
  if (!driversAttached) {
    driversAttached = true;
    // 滚动/缩放时即时跟随(capture 以捕获内层滚动容器)
    window.addEventListener('scroll', renderTick, true);
    window.addEventListener('resize', renderTick, true);
    ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) =>
      document.addEventListener(ev, () => { lastRectKey = ''; renderTick(); }));
  }
  if (!intervalId) intervalId = setInterval(renderTick, 120); // 兜底:字幕文本 + 布局位移
  renderTick();
}

export function renderTick() {
  if (!state.active) return;
  const v = state.video;
  if (v && v.isConnected && state.cues.length) {
    ensureMounted(refs.overlay);
    ensureMounted(refs.uiRoot);
    positionOverlay(v);
    renderActiveCues(v);
  } else {
    refs.overlay.style.display = 'none';
  }
}

function positionOverlay(v) {
  const r = v.getBoundingClientRect();
  const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
  if (key === lastRectKey) return; // 位置未变则跳过写样式,避免抖动
  lastRectKey = key;
  const { overlay, cueBox } = refs;
  overlay.style.display = 'block';
  overlay.style.left = r.left + 'px';
  overlay.style.top = r.top + 'px';
  overlay.style.width = r.width + 'px';
  overlay.style.height = r.height + 'px';
  // 字号 / 底距随播放器高度等比缩放
  const fontPx = Math.max(10, r.height * FONT_BASE * (state.style.fontPct / 100));
  cueBox.style.fontSize = fontPx.toFixed(1) + 'px';
  cueBox.style.bottom = (r.height * state.style.bottomPct / 100) + 'px';
}

function renderActiveCues(v) {
  const t = v.currentTime - state.offset;
  const parts = [];
  for (const c of state.cues) {
    if (t >= c.start && t <= c.end) parts.push(c.text);
  }
  const html = parts.join('<br>');
  if (html === lastHtml) return;
  lastHtml = html;
  refs.cueBox.innerHTML = html;
  refs.cueBox.style.display = html ? 'inline-block' : 'none';
}

export function applyStyle() {
  const s = state.style;
  const cueBox = refs.cueBox;
  cueBox.style.color = s.color;
  cueBox.style.textShadow = 'none';
  cueBox.style.background = 'transparent';
  cueBox.style.padding = '0';
  if (s.bg === 'outline') {
    cueBox.style.textShadow = outline('#000');
  } else if (s.bg === 'translucent') {
    cueBox.style.background = 'rgba(0,0,0,.55)';
    cueBox.style.padding = '.08em .4em';
    cueBox.style.textShadow = outline('rgba(0,0,0,.5)');
  } else if (s.bg === 'solid') {
    cueBox.style.background = 'rgba(0,0,0,.92)';
    cueBox.style.padding = '.08em .4em';
  }
}

function outline(c) {
  return `-2px -2px 1px ${c},2px -2px 1px ${c},-2px 2px 1px ${c},2px 2px 1px ${c},0 0 3px ${c}`;
}

export function setVideo(v) {
  if (state.video && state.video !== v) {
    state.video.removeEventListener('timeupdate', renderTick);
    state.video.removeEventListener('seeking', renderTick);
  }
  state.video = v;
  lastRectKey = '';
  if (v) {
    v.addEventListener('timeupdate', renderTick);
    v.addEventListener('seeking', renderTick);
  }
  if (state.cues.length) startRender();
}

export function clearSubtitle() {
  if (!state.cues.length) { toast('当前没有字幕'); return; }
  state.cues = [];
  state.fileName = '';
  state.active = false;
  if (intervalId) { clearInterval(intervalId); intervalId = 0; }
  if (refs.overlay) refs.overlay.style.display = 'none';
  if (refs.cueBox) refs.cueBox.innerHTML = '';
  lastHtml = '';
  updateStatus();
  toast('已清除字幕');
}
