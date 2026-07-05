// 轻量提示 + 状态栏更新
import { refs } from './refs.js';
import { state } from './state.js';
import { t } from './i18n.js';

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
  toastTimer = setTimeout(() => {
    t.style.opacity = '0';
  }, 2500);
}

// 可点提示:一句话 + 主操作按钮 + 关闭。点操作/关闭即消,约 12s 自动消。用于「发现字幕」自动提示。
export function toastOffer(msg, actionLabel, onAction) {
  const old = document.getElementById('anysub-offer');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'anysub-offer';
  const text = document.createElement('span');
  text.className = 'as-offer-msg';
  text.textContent = msg;
  const act = document.createElement('button');
  act.className = 'as-offer-act';
  act.textContent = actionLabel;
  const x = document.createElement('button');
  x.className = 'as-offer-x';
  x.textContent = '✕';
  el.append(text, act, x);
  (refs.uiRoot || document.body).appendChild(el);
  let tm;
  const dismiss = () => {
    clearTimeout(tm);
    el.remove();
  };
  act.addEventListener('click', () => {
    dismiss();
    onAction();
  });
  x.addEventListener('click', dismiss);
  tm = setTimeout(dismiss, 12000);
}

export function updateStatus() {
  if (!refs.statusEl) return;
  const loaded = state.cues.length > 0;
  refs.statusEl.textContent = loaded
    ? t('panel.statusLoaded', { name: state.fileName, n: state.cues.length })
    : t('panel.statusEmpty');
  refs.statusEl.classList.toggle('as-loaded', loaded);
  refs.statusEl.title = loaded ? state.fileName : ''; // 悬停看全名(状态行会省略)
}
