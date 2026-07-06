// "On-demand" lifecycle for the DOM mutation observer: only connect when actually needed, so idle pages have zero overhead.
// Cases where it's needed: the floating button is enabled (must toggle as the video appears/disappears), or subtitles are loaded (SPA video switches require re-mounting).
import { state } from '../state.js';

let mo: MutationObserver | null = null,
  timer: ReturnType<typeof setTimeout> | undefined,
  onReact: () => void = () => {};

export function setReactHandler(fn: () => void): void {
  onReact = fn;
}

export function updateWatcher(): void {
  const need = state.showFab || state.cues.length > 0;
  if (need && !mo) {
    mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => onReact(), 300); // debounce
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } else if (!need && mo) {
    mo.disconnect();
    mo = null;
    clearTimeout(timer);
  }
}
