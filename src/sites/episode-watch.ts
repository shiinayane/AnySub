// Cross-episode continuation: on episode change (detected uniformly by episode-signal: site rules preferred, falling back to <title>), based on the episode-number change,
// clear the old subtitle and "same-source preferred" auto-load the next episode (if no same-source is found, show the candidate list).
import { state } from '../state.js';
import { clearSubtitle } from '../render/controller.js';
import { subtitleFiles, downloadAndLoad, markLoaded } from '../online/online.js';
import { pickSameSource } from '../online/match.js';
import { showCandidates } from '../ui/search-ui.js';
import { setOffset } from '../ui/ui.js';
import { toast } from '../ui/notify.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from '../i18n.js';
import { errMessage } from '../errors.js';
import type { DetectInfo, OnlineCtx } from '../types.js';

let busy = false;

// For use by auto-offer: during the same-source auto-continuation attempt (clearSubtitle has cleared the cues, the next episode hasn't finished downloading) it should not be
// pre-empted by the "subtitle found" offer — that offer might pop up as soon as it sees cues is empty, colliding with the auto-load here.
export function isAutoContinuing(): boolean {
  return busy;
}

export function initEpisodeWatch(): void {
  onEpisodeChange(onEpisode); // what to observe is decided by episode-signal per site, here we only handle continuation after an episode change
}

function onEpisode(info: DetectInfo): void {
  if (busy || !state.cues.length) return;
  const { series, episode } = info;
  if (episode === '') return; // if the episode number can't be determined, do nothing
  if (series === state.loadedSeries && String(episode) === String(state.loadedEpisode)) return; // unchanged

  // Same-source = same series name and there's a previous online source; use this to decide "auto-continue" vs "clear only"
  const ctx: OnlineCtx | null = series === state.loadedSeries ? state.lastOnline : null;
  clearSubtitle(); // clear the no-longer-matching old subtitle first, no matter what
  if (ctx) {
    // Record that we've switched to this episode first: even if continuation fails (no same-source found / download fails), state reflects the current episode, avoiding subsequent comparison confusion / repeated triggering
    state.loadedSeries = series;
    state.loadedEpisode = episode;
    autoContinue(ctx, series, episode);
  } else {
    state.loadedSeries = '';
    state.loadedEpisode = '';
    toast(t('toast.epCleared'));
  }
}

async function autoContinue(ctx: OnlineCtx, series: string, episode: string): Promise<void> {
  busy = true;
  // Same-source continuation carries over the previous episode's offset (per the user's convention "same series, same source is stable").
  // Must pass it explicitly: pickSameSource is a loose match, whereas offsetKey uses precise source tokens,
  // so when the two episodes' non-episode-number tokens differ slightly the key differs → loading would reset the offset to 0.
  const carryOffset = state.offset;
  toast(t('toast.epFinding', { ep: episode }));
  try {
    const files = await subtitleFiles(ctx.anilistId, episode, [series]); // fallback: free-text search using the page-title series name
    if (!files.length) {
      toast(t('toast.epNone', { ep: episode }));
      return;
    }
    const best = pickSameSource(files, ctx.name);
    if (best) {
      const ok = await downloadAndLoad(best.url, best.name);
      if (ok) {
        markLoaded(ctx.anilistId, best.name);
        if (carryOffset) setOffset(carryOffset); // same-source: carry the previous episode's offset to the new episode (and remember it under the new key)
        toast(t('toast.epAuto', { ep: episode }));
      }
    } else {
      toast(t('toast.epNoSame'));
      showCandidates(series, files); // fallback: show the candidate list for the user to pick
    }
  } catch (err) {
    toast(t('toast.epFailed', { msg: errMessage(err) }));
  } finally {
    busy = false;
  }
}
