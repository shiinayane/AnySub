// Episode-change signal (single source): centralize one MutationObserver, observing "the element specified by the site adapter" (watchEl)
// preferentially, otherwise falling back to <title>; after debouncing, re-read detectShow(), and notify subscribers only when the series/episode fingerprint changes.
// Benefit: the episode-change listener leaves "what to observe" up to the site rules (extending to a new site only changes the adapter), and subscribers (cross-episode continuation / auto-offer)
// share the same signal and are deduplicated by fingerprint — irrelevant title jitter no longer triggers redundant work.
import { detectShow, getSiteAdapter } from './site-adapters.js';
import type { DetectInfo } from '../types.js';

type EpisodeSub = (info: DetectInfo) => void;

const subs: EpisodeSub[] = [];
let mo: MutationObserver | null = null,
  debounce: ReturnType<typeof setTimeout> | undefined,
  poll: ReturnType<typeof setInterval> | undefined,
  armed: Node | null = null,
  lastSig: string | null = null;

// Subscribe to episode changes (the callback receives the latest detectShow() result)
export function onEpisodeChange(fn: EpisodeSub): void {
  subs.push(fn);
}

function sig(info: DetectInfo): string {
  return (info.series || '') + '#' + (info.episode || '');
}

// Observation target: site rules (the watchEl the adapter provides on the target page) preferred, falling back to <title>
function target(): Node | null {
  const ad = getSiteAdapter();
  if (ad && ad.isTarget() && ad.watchEl) {
    const el = ad.watchEl();
    if (el) return el;
  }
  return document.querySelector('title');
}

function fire(): void {
  const info = detectShow();
  const s = sig(info);
  if (s === lastSig) return; // fingerprint unchanged → not an episode change, ignore
  lastSig = s;
  for (const fn of subs) {
    try {
      fn(info);
    } catch (_) {
      /* one subscriber's error doesn't affect the rest */
    }
  }
}

function arm(): void {
  const node = target();
  if (!node || node === armed) return; // don't re-attach if the target hasn't changed
  if (mo) mo.disconnect();
  armed = node;
  mo = new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(fire, 500);
  });
  mo.observe(node, { childList: true, characterData: true, subtree: true });
}

export function initEpisodeSignal(): void {
  lastSig = sig(detectShow()); // record the baseline, the first time doesn't count as an episode change
  arm();
  const ad = getSiteAdapter();
  // Pure-<title> sites (including DMM and ordinary sites): the target is stable, arming once suffices, zero heartbeat → keeps idle overhead low.
  if (!ad || !ad.watchEl) return;
  // When the observation target is a dynamic element (e.g. Prime, appears late / replaced by the SPA) → polling fallback: re-attach the observer + proactively recompute the fingerprint.
  // Key: on episode change Prime often "wholesale-replaces" the episode-info element, so an observer attached to the old node goes dead and misses the change;
  // fire() is fingerprint-deduplicated, so calling it proactively on a schedule catches the episode change within ≤1.5s, without relying on that mutation.
  // If we never reach a playback page (e.g. an amazon shopping page), the probing stops after ~30s of no result, so it doesn't occupy resources long-term.
  let n = 0;
  poll = setInterval(() => {
    arm();
    fire();
    if (ad.isTarget())
      n = 0; // on a playback page → reset the counter (so it doesn't permanently stall after a while of normal browsing)
    else if (++n > 20) {
      clearInterval(poll);
      poll = undefined;
    } // stop only after "~30s of continuously not reaching a playback page", to keep idle
  }, 1500);
}
