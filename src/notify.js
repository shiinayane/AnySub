// 轻量提示 + 状态栏更新
import { refs } from './refs.js';
import { state } from './state.js';

let toastTimer;

export function toast(msg) {
  let t = document.getElementById('anysub-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'anysub-toast';
    (refs.uiRoot || document.body).appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 2500);
}

export function updateStatus() {
  if (!refs.statusEl) return;
  const loaded = state.cues.length > 0;
  refs.statusEl.textContent = loaded
    ? `${state.fileName} · ${state.cues.length} 条`
    : '未加载字幕';
  refs.statusEl.classList.toggle('as-loaded', loaded);
  refs.statusEl.title = loaded ? state.fileName : ''; // 悬停看全名(状态行会省略)
}
