// Auto-offer: when a series name (+ episode) is recognized during "feature playback" on a known site, first actually query Jimaku to confirm that episode really has subtitles,
// only then pop a clickable toast "Found N subtitles — search?", and clicking opens the candidate list for the user to pick (holding the line on never loading silently).
// Key trade-offs:
//  · Trigger only when "a substantial video is actually playing" (excludes the hero previews on home/detail pages, which use the same player).
//  · "Verify before offering" — saying "subtitles found" without having queried Jimaku is a lie; if there really are none, stay silent, no empty popups.
//  · Requires a Jimaku key (fetching subtitles online depends on it anyway); no key means no auto-offer (set it later when doing a manual search).
import { state } from '../state.js';
import { refs } from '../refs.js';
import { getSiteAdapter, detectShow } from './site-adapters.js';
import { collectVideos } from '../render/locator.js';
import { toastOffer } from '../ui/notify.js';
import { resolveSubtitles } from '../online/online.js';
import { showCandidates } from '../ui/search-ui.js';
import { isAutoContinuing } from './episode-watch.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from '../i18n.js';

const MIN_DURATION = 120; // seconds: feature threshold, filters out hero previews/short trailers (anime feature episodes are all 20 minutes+)
const MIN_COVER = 0.6; // viewport coverage ratio: main player vs banner preview (a fallback for muted viewers)
let lastOfferedKey: string | null = null;
let lastUrl = '';
let retryTimer: ReturnType<typeof setTimeout> | undefined,
  waitTries = 0,
  verifying = false;

export function initAutoOffer(): void {
  if (!getSiteAdapter()) return; // not a known site: don't intervene at all
  lastUrl = location.href;
  let tries = 0;
  const poll = () => {
    check();
    if (++tries < 8 && lastOfferedKey === null) setTimeout(poll, 1500); // wait for the SPA to produce the video/hydrate (bounded, self-stopping, no need to hold a handle)
  };
  setTimeout(poll, 1200);
  onEpisodeChange(check); // after an episode change (detected uniformly by episode-signal) check again: if the new episode still has no subtitles, verify and offer again
  // Key timing: check as soon as the video "starts playing" — unaffected by how long you've stayed after entering the page (the episode-change signal won't fire within the same episode,
  // and the polling retry window expires too). The play event doesn't bubble, so listen globally in the capture phase. A preview's muted autoplay also triggers it,
  // but is filtered out by playingFeature's "audible/large viewport" check.
  document.addEventListener('play', check, true);
}

// isFeatureVideo reads only the following fields (a structural type, easy to unit-test with a minimal mock; HTMLVideoElement satisfies it)
interface FeatureVid {
  duration: number;
  paused: boolean;
  currentTime: number;
  muted: boolean;
  volume: number;
  getBoundingClientRect?: () => { width: number; height: number };
}

// "User is watching the feature" decision (pure function, easy to unit-test): duration long enough + already started and not paused (excludes home-page preloaded but paused
// videos), and satisfying one of: audible (!muted && volume>0; an autoplayed preview is necessarily muted per browser policy,
// so having sound means the user actively played it via a gesture, distinguishable even when the URL doesn't change); or covering more than half the viewport (a fallback for muted viewers).
export function isFeatureVideo(v: FeatureVid | null, vw: number, vh: number): boolean {
  if (!v || !(isFinite(v.duration) && v.duration > MIN_DURATION && !v.paused && v.currentTime > 0))
    return false;
  const audible = !v.muted && v.volume > 0;
  const r = (v.getBoundingClientRect && v.getBoundingClientRect()) || { width: 0, height: 0 };
  const cover = (r.width * r.height) / ((vw || 1) * (vh || 1));
  return audible || cover > MIN_COVER;
}

function playingFeature(): HTMLVideoElement | null {
  const vids = [document.querySelector<HTMLVideoElement>('video')]
    .concat(collectVideos())
    .filter(Boolean);
  const vw = window.innerWidth || 1,
    vh = window.innerHeight || 1;
  return vids.find((v) => isFeatureVideo(v, vw, vh)) || null;
}

// External-trigger (polling/episode-change signal) entry point: reset the "waiting for playback to start" retry counter
function check(): void {
  run(false);
}

async function run(isRetry: boolean): Promise<void> {
  if (!isRetry) waitTries = 0;
  clearTimeout(retryTimer);
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    lastOfferedKey = null;
  } // SPA navigation → the new page can offer again
  if (state.cues.length || verifying) return; // already have subtitles / verification in progress, don't re-enter
  if (isAutoContinuing()) {
    retryTimer = setTimeout(() => run(true), 600);
    return;
  } // same-source continuation is running, wait for its result
  if (refs.searchPanel && refs.searchPanel.style.display === 'block') return; // candidate panel already open
  const ad = getSiteAdapter();
  if (!ad || !ad.isTarget()) return; // not a playback page
  if (!playingFeature()) {
    // Key timing: wait until "the feature is actually playing"
    if (waitTries < 15) {
      waitTries++;
      retryTimer = setTimeout(() => run(true), 1000);
    }
    return;
  }
  const info = detectShow(); // same source as episode-signal/cross-episode continuation, to avoid key/fingerprint mismatch
  if (!info || !info.series) return;
  const key = info.epKey || info.series + '#' + (info.episode || '');
  if (key === lastOfferedKey) return; // this episode has already been verified, don't repeat
  if (!state.jimakuKey) return; // no key: online subtitle fetching is unavailable → no auto-offer

  // Verification: go through the unified entry point to actually query Jimaku, offer only if that episode has subtitles, and report the count truthfully; if none, stay silent.
  verifying = true;
  try {
    const { anime, files, exact } = await resolveSubtitles(info.series, info.episode);
    lastOfferedKey = key; // claim the slot only on successful verification (no throw); if it threw, don't claim it, retry on the next trigger
    if (!anime || !exact) return; // not an exact hit → don't offer proactively (to avoid the wrong anime), the user can search and pick manually
    if (!info.episode && anime.episodes > 1) return; // a series but no episode number recognized → can't locate it, don't pop (avoids listing the whole series / mislabeling a movie)
    if (!files.length || state.cues.length) return; // no subtitles, or the user manually loaded during verification → don't pop
    const msg = info.episode
      ? t('offer.found', { title: info.series, ep: info.episode, n: files.length })
      : t('offer.foundMovie', { title: info.series, n: files.length });
    toastOffer(msg, t('offer.load'), () => showCandidates(info.series, files, anime.anilistId));
  } catch (_) {
    /* network/rate-limit failure → don't claim the slot, retry on the next trigger */
  } finally {
    verifying = false;
  }
}
