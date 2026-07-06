// Site detection mechanism (decoupled from any specific site): pick the current site's adapter from the registry, "use it if it matches, otherwise fall back to title parsing".
// Each site's extraction logic lives in ./adapters/*.ts (one file per site), the registry is in ./adapters/index.ts;
// for adding a site see the README "Adding a site adapter".
import { parseVideoTitle } from './title-parse.js';
import { ADAPTERS } from './adapters/index.js';
import type { DetectInfo, SiteAdapter } from '../types.js';

// The current site's adapter (null if none). Used to: enable "auto-offer" only on known sites, to avoid interrupting on arbitrary pages.
export function getSiteAdapter(): SiteAdapter | null {
  return ADAPTERS.find((a) => a.match()) || null;
}

// Generic detection: if an adapter matches and we're on its target page, use it, otherwise fall back to title parsing. Returns { series, episode, showKey?, epKey? }.
export function detectShow(): DetectInfo {
  const ad = getSiteAdapter();
  if (ad && ad.isTarget()) {
    const info = ad.detect();
    if (info && info.series) return info;
  }
  return parseVideoTitle(document.title);
}
