// Overlay: format-agnostic positioning / fullscreen tracking. Both the text and (future) ASS renderers render into this box.
import { refs } from '../refs.js';

let lastRectKey = '',
  lastRect: DOMRect | null = null;

export function invalidateLayout(): void {
  lastRectKey = '';
}

function fullscreenEl(): Element | null {
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return d.fullscreenElement || d.webkitFullscreenElement || null;
}

// Mount host: when fullscreen, attach to the fullscreen element (otherwise it gets covered by the top layer); a bare <video> in fullscreen has nowhere to attach, so return body (known limitation)
export function getHost(): HTMLElement {
  const fs = fullscreenEl();
  if (fs && fs.tagName !== 'VIDEO') return fs as HTMLElement;
  return document.body;
}

export function ensureMounted(el: HTMLElement | null): void {
  if (!el) return;
  const host = getHost();
  if (el.parentNode !== host) host.appendChild(el);
}

export function hideOverlay(): void {
  if (refs.overlay) refs.overlay.style.display = 'none';
}

// Sync the overlay to the video's position; returns {rect, changed}, where changed indicates whether the size/position changed (so the renderer can decide whether to recompute the font size)
export function positionOverlay(v: HTMLVideoElement): { rect: DOMRect | null; changed: boolean } {
  const r = v.getBoundingClientRect();
  const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
  if (key === lastRectKey) return { rect: lastRect, changed: false };
  lastRectKey = key;
  lastRect = r;
  const o = refs.overlay;
  if (!o) return { rect: r, changed: true };
  o.style.display = 'block';
  o.style.left = r.left + 'px';
  o.style.top = r.top + 'px';
  o.style.width = r.width + 'px';
  o.style.height = r.height + 'px';
  return { rect: r, changed: true };
}
