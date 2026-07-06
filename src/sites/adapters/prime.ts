// Prime Video adapter. Series name/episode come from the player SDK elements: the class names have a hash suffix (f6gi9c2/bFCPl8 change per build),
// so use the stable atvwebplayersdk- prefix for a "contains" match, not relying on the hash. The episode info looks like "S1 E1 第1話 …".
import type { SiteAdapter } from '../../types.js';

export function parsePrimeEpisode(text: string | null | undefined): string {
  const s = String(text || '');
  const m = s.match(/\bE(\d+)/i) || s.match(/第\s*(\d+)\s*話/); // prefer the SDK's E number, fall back to 第X話
  return m ? String(parseInt(m[1], 10)) : '';
}

// Clean up Prime's <title>: "Amazon.co.jp: <series name>を観る | Prime Video" → series name
export function cleanPrimeTitle(raw: string | null | undefined): string {
  return String(raw || '')
    .split(/[|｜]/)[0] // strip "| Prime Video"
    .replace(/^\s*Amazon\.[a-z.]+:\s*/i, '') // strip the "Amazon.co.jp: " prefix
    .replace(/\s*(を観る|を視聴|を見る)\s*$/, '') // strip the "を観る" suffix
    .trim();
}

export const prime: SiteAdapter = {
  name: 'prime',
  match: () => /(^|\.)(primevideo\.com|amazon\.[a-z.]+)$/.test(location.hostname),
  // The presence of the player SDK element means we're on a playback page (more stable than URL detection, since Prime's playback paths vary by region)
  isTarget: () => !!document.querySelector('[class*="atvwebplayersdk-"]'),
  // Episode-change signal source: Prime's <title> often doesn't change on episode switch, so observe changes to the episode-info element instead (the episode number is inside it)
  watchEl: () => document.querySelector('[class*="atvwebplayersdk-episode-info"]'),
  detect() {
    const info = document.querySelector('[class*="atvwebplayersdk-episode-info"]');
    const episode = info ? parsePrimeEpisode(info.textContent) : ''; // movies lack this element → empty
    const titleEl = document.querySelector('[class*="atvwebplayersdk-title-text"]'); // stable class name (the suffix like f52hj7o is a hash, ignored); more precise than the -title prefix, avoiding sibling elements like title-image
    const series = titleEl?.textContent?.trim() || cleanPrimeTitle(document.title);
    return { series, episode };
  },
};
