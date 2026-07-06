// U-NEXT adapter. Series name/episode are in the player's title block (styled-components): sc-6lwken is the component hash, dWSOjb/eIsrMu
// are generated classes (change every build); so use the stable displayName segment styles__TitleContainer- for a contains match, then take within it
// the h2 (series name) / h3 (episode title, shaped like "#1 …"). Using "container + h2/h3" is more stable than styles__Title alone (too broad, present site-wide).
import type { SiteAdapter } from '../../types.js';

export function parseUnextEpisode(text: string | null | undefined): string {
  const s = String(text || '');
  const m = s.match(/#\s*(\d+)/) || s.match(/第\s*(\d+)\s*話/) || s.match(/\bE(\d+)/i);
  return m ? String(parseInt(m[1], 10)) : '';
}

function unextBox(): Element | null {
  const boxes = document.querySelectorAll('[class*="styles__TitleContainer-"]');
  for (const b of boxes) if (b.querySelector('h2')) return b; // take the one containing the series-name h2 (excludes the same-named generic container)
  return null;
}

export const unext: SiteAdapter = {
  name: 'unext',
  match: () => /(^|\.)unext\.jp$/.test(location.hostname),
  isTarget: () => !!unextBox(),
  watchEl: () => unextBox(), // on episode change the title block's content changes (the h3 episode title)
  detect() {
    const box = unextBox();
    const h2 = box && box.querySelector('h2');
    const h3 = box && box.querySelector('h3');
    return {
      series: h2 ? (h2.textContent || '').trim() : '',
      episode: parseUnextEpisode(h3 ? h3.textContent : ''),
    };
  },
};
