// DMM TV adapter. <title>/og:title already contain a clean series name + 第X話, so parseVideoTitle works directly;
// the URL's season/content are stable IDs — content differs per episode (= episode-change signal), season stays constant within a season (= same-source key).
import { parseVideoTitle } from '../title-parse.js';
import type { SiteAdapter } from '../../types.js';

// og:title has a cleaner separator (… | DMM TV…), so prefer it; fall back to document.title
function ogTitle(): string {
  const m = document.querySelector('meta[property="og:title"]');
  return (m && m.getAttribute('content')) || document.title;
}
function urlParam(name: string): string {
  try {
    return new URL(location.href).searchParams.get(name) || '';
  } catch (_) {
    return '';
  }
}

export const dmm: SiteAdapter = {
  name: 'dmm',
  match: () => /(^|\.)tv\.dmm\.(com|co\.jp)$/.test(location.hostname),
  isTarget: () => location.pathname.includes('/vod/playback/'),
  detect() {
    const { series, episode } = parseVideoTitle(ogTitle());
    return { series, episode, showKey: urlParam('season'), epKey: urlParam('content') };
  },
};
