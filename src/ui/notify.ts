// Lightweight notifications + status bar updates
import { refs } from '../refs.js';
import { state } from '../state.js';
import { t } from '../i18n.js';

let toastTimer: ReturnType<typeof setTimeout>;

export function toast(msg: string): void {
  let el = document.getElementById('anysub-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'anysub-toast';
    (refs.uiRoot || document.body).appendChild(el);
  }
  const box = el; // el is non-null here; bind to a const so the delayed-callback closure can reference it
  box.textContent = msg;
  box.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    box.style.opacity = '0';
  }, 2500);
}

// Clickable notification: one line + primary action button + close. Dismissed on action/close, or auto-dismisses after ~12s. Used for the "subtitles found" auto-prompt.
export function toastOffer(msg: string, actionLabel: string, onAction: () => void): void {
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
  let tm: ReturnType<typeof setTimeout>;
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

export function updateStatus(): void {
  if (!refs.statusEl) return;
  const loaded = state.cues.length > 0;
  refs.statusEl.textContent = loaded
    ? t('panel.statusLoaded', { name: state.fileName, n: state.cues.length })
    : t('panel.statusEmpty');
  refs.statusEl.classList.toggle('as-loaded', loaded);
  refs.statusEl.title = loaded ? state.fileName : ''; // hover to see the full name (the status line truncates it)
}
