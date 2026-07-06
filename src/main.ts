// AnySub entry point: initialize UI + dynamic video watching
import { state } from './state.js';
import { injectStyle } from './render/styles.js';
import { buildUI, updateFabVisibility } from './ui/ui.js';
import { pickBestVideo, isVisible } from './render/locator.js';
import { setVideo } from './render/controller.js';
import { loadSettings, getLocalKey, loadGlobalKey, saveGlobalKey } from './online/storage.js';
import { refreshKeyArea } from './ui/search-ui.js';
import { initShortcuts } from './ui/shortcuts.js';
import { setReactHandler, updateWatcher } from './render/watcher.js';
import { initEpisodeWatch } from './sites/episode-watch.js';
import { initAutoOffer } from './sites/auto-offer.js';
import { initEpisodeSignal } from './sites/episode-signal.js';
import type { SubStyle } from './types.js';

// Avoid re-injecting into the same window
if (!window.__ANYSUB_LOADED__) {
  window.__ANYSUB_LOADED__ = true;
  init();
}

function init(): void {
  if (!document.body) {
    requestAnimationFrame(init);
    return;
  }
  restoreSettings();
  injectStyle();
  buildUI();
  initShortcuts();
  initEpisodeWatch(); // Register the episode-change continuation subscriber
  initAutoOffer(); // Register the "subtitles found" subscriber (known sites only)
  initEpisodeSignal(); // Set up the episode-change signal source (watch a site-specific element or fall back to <title>) + baseline
  setReactHandler(react);
  updateFabVisibility();
  updateWatcher(); // Connect on demand: only observe the DOM when the floating button is enabled or subtitles are loaded
}

// On DOM change: re-attach after an SPA swaps the video (only when subtitles are loaded) + refresh floating-button visibility
function react(): void {
  if (state.cues.length && state.video && (!state.video.isConnected || !isVisible(state.video))) {
    const nv = pickBestVideo();
    if (nv && nv !== state.video) setVideo(nv);
  }
  updateFabVisibility();
}

// Restore persisted preferences (only accept known fields, to guard against dirty data)
function restoreSettings(): void {
  const saved = loadSettings();
  const s = state.style;
  if (typeof saved.fontPct === 'number') s.fontPct = saved.fontPct;
  if (typeof saved.bottomPct === 'number') s.bottomPct = saved.bottomPct;
  if (typeof saved.bg === 'string') s.bg = saved.bg as SubStyle['bg'];
  if (typeof saved.color === 'string') s.color = saved.color;
  if (typeof saved.showFab === 'boolean') state.showFab = saved.showFab;
  if (typeof saved.rubyParen === 'boolean') state.rubyParen = saved.rubyParen;
  if (typeof saved.enhance === 'boolean') state.enhance = saved.enhance;
  if (saved.subPos === 'top' || saved.subPos === 'bottom') state.subPos = saved.subPos;
  if (saved.lang === 'en' || saved.lang === 'zh' || saved.lang === 'ja') state.lang = saved.lang;
  // The Jimaku key uses cross-site storage (shared across all sites). First restore immediately from the per-site cache (if any), then asynchronously fetch the global key and override
  // (GM storage may be async); if the global key is empty but a legacy key exists in the per-site settings, migrate it once.
  const cachedKey = getLocalKey();
  state.jimakuKey = cachedKey;
  loadGlobalKey().then((k) => {
    if (state.jimakuKey !== cachedKey) return; // User manually set/cleared the key during startup → don't override with the stale async value
    if (k) state.jimakuKey = k;
    else if (typeof saved.jimakuKey === 'string' && saved.jimakuKey) {
      state.jimakuKey = saved.jimakuKey;
      saveGlobalKey(saved.jimakuKey); // Migration: old per-site key → global
    }
    refreshKeyArea(); // If the search panel is already open (before async resolution), refresh the key-area display
  });
  // Only accept an offsets table that is a "plain object + finite numbers": guard against dirty data (arrays/strings/nested/oversized) polluting it and being written back
  if (saved.offsets && typeof saved.offsets === 'object' && !Array.isArray(saved.offsets)) {
    const clean: Record<string, number> = {};
    for (const k in saved.offsets) {
      const v = saved.offsets[k];
      if (typeof v === 'number' && isFinite(v)) clean[k] = v;
    }
    state.offsets = clean;
  }
}
