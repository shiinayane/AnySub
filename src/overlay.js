// 覆盖层:格式无关的定位 / 全屏跟随。文本与(未来的)ASS 渲染器都渲染进这个盒子。
import { refs } from './refs.js';

let lastRectKey = '', lastRect = null;

export function invalidateLayout() { lastRectKey = ''; }

function fullscreenEl() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

// 挂载宿主:全屏时挂到全屏元素(否则会被顶层遮挡);裸 <video> 全屏时无处可挂,返回 body(已知限制)
export function getHost() {
  const fs = fullscreenEl();
  if (fs && fs.tagName !== 'VIDEO') return fs;
  return document.body;
}

export function ensureMounted(el) {
  const host = getHost();
  if (el.parentNode !== host) host.appendChild(el);
}

export function hideOverlay() {
  if (refs.overlay) refs.overlay.style.display = 'none';
}

// 同步覆盖层到视频位置;返回 {rect, changed},changed 表示尺寸/位置是否变化(供渲染器决定是否重算字号)
export function positionOverlay(v) {
  const r = v.getBoundingClientRect();
  const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
  if (key === lastRectKey) return { rect: lastRect, changed: false };
  lastRectKey = key;
  lastRect = r;
  const o = refs.overlay;
  o.style.display = 'block';
  o.style.left = r.left + 'px';
  o.style.top = r.top + 'px';
  o.style.width = r.width + 'px';
  o.style.height = r.height + 'px';
  return { rect: r, changed: true };
}
