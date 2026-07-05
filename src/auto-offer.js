// 自动提示:在已知站点(DMM)的播放页,识别出番名+集数且尚未加载字幕时,
// 弹一个可点 toast「发现字幕 — 加载?」,点了才打开搜索(仍让用户从候选选,守住不静默加载)。
// 仅在有适配器的站点启用,避免在任意页面打扰;同一集只提示一次。
import { state } from './state.js';
import { getSiteAdapter } from './site-adapters.js';
import { collectVideos } from './locator.js';
import { toastOffer } from './notify.js';
import { openSearch } from './search-ui.js';
import { t } from './i18n.js';

let lastOfferedKey = null;
let timer = 0;

export function initAutoOffer() {
  if (!getSiteAdapter()) return; // 非已知站点:完全不介入
  let tries = 0;
  const poll = () => {
    check();
    if (++tries < 8 && lastOfferedKey === null) timer = setTimeout(poll, 1500); // 等 SPA 出视频/水合
  };
  timer = setTimeout(poll, 1200);
  // 切集(标题变)后再探:新的一集若仍没字幕则再次提示
  const titleEl = document.querySelector('title');
  if (titleEl) {
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(check, 800); })
      .observe(titleEl, { childList: true, characterData: true, subtree: true });
  }
}

function check() {
  if (state.cues.length) return;                 // 已有字幕(含切集自动接续),不打扰
  const ad = getSiteAdapter();
  if (!ad || !ad.isTarget()) return;             // 非播放页
  const info = ad.detect();
  if (!info || !info.series || !info.episode) return;
  const key = info.epKey || (info.series + '#' + info.episode);
  if (key === lastOfferedKey) return;            // 同一集只提示一次(含被用户忽略后不再唠叨)
  if (!document.querySelector('video') && !collectVideos().length) return; // 得先有视频
  lastOfferedKey = key;
  toastOffer(
    t('offer.found', { title: info.series, ep: info.episode }),
    t('offer.load'),
    () => openSearch({ run: true }), // 打开搜索并自动检索(有 key+番名时)
  );
}
