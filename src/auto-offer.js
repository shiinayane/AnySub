// 自动提示:在已知站点的「正片播放中」识别出番名(+集数)且尚未加载字幕时,
// 弹一个可点 toast「发现字幕 — 查找?」,点了才打开搜索(仍让用户从候选选,守住不静默加载)。
// 触发时机的关键:必须有「实质视频真正在播放」——排除首页/详情页的 hero 预览
// (它们也用同款播放器,isTarget 会误判)。仅在有适配器的站点启用;同一集只提示一次。
import { state } from './state.js';
import { refs } from './refs.js';
import { getSiteAdapter } from './site-adapters.js';
import { collectVideos } from './locator.js';
import { toastOffer } from './notify.js';
import { openSearch } from './search-ui.js';
import { isAutoContinuing } from './episode-watch.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from './i18n.js';

const MIN_DURATION = 120; // 秒:正片阈值,滤掉 hero 预览/短预告(动画正片均 20 分钟+)
let lastOfferedKey = null;
let lastUrl = '';
let pollTimer = 0, retryTimer = 0, waitTries = 0;

export function initAutoOffer() {
  if (!getSiteAdapter()) return; // 非已知站点:完全不介入
  lastUrl = location.href;
  let tries = 0;
  const poll = () => {
    check();
    if (++tries < 8 && lastOfferedKey === null) pollTimer = setTimeout(poll, 1500); // 等 SPA 出视频/水合
  };
  pollTimer = setTimeout(poll, 1200);
  onEpisodeChange(check); // 切集后(由 episode-signal 统一探测)再探:新一集仍没字幕则再提示
}

// 「正片在播放」判定:时长足够长、已开始播放且未暂停。首页/详情页的 hero 预览多为短循环 → 被滤掉。
function playingFeature() {
  const vids = [document.querySelector('video')].concat(collectVideos()).filter(Boolean);
  for (const v of vids) {
    if (isFinite(v.duration) && v.duration > MIN_DURATION && !v.paused && v.currentTime > 0) return v;
  }
  return null;
}

// 外部触发(轮询/切集信号)入口:重置「等待起播」重试计数
function check() { run(false); }

function run(isRetry) {
  if (!isRetry) waitTries = 0;
  clearTimeout(retryTimer);
  if (location.href !== lastUrl) { lastUrl = location.href; lastOfferedKey = null; } // SPA 导航 → 新页可重新提示,不被旧 key 压制
  if (state.cues.length) return;                 // 已有字幕(含切集自动接续),不打扰
  if (isAutoContinuing()) { retryTimer = setTimeout(() => run(true), 600); return; } // 同源接续在跑,等它出结果再判断
  if (refs.searchPanel && refs.searchPanel.style.display === 'block') return; // 候选面板已开,不重复
  const ad = getSiteAdapter();
  if (!ad || !ad.isTarget()) return;             // 非播放页
  if (!playingFeature()) {                       // 关键时机:等到「正片真正在播放」才提示
    if (waitTries < 15) { waitTries++; retryTimer = setTimeout(() => run(true), 1000); } // 刚进页面还没起播 → 稍后再看(有上限,详情页永不播则自动作罢)
    return;
  }
  const info = ad.detect();
  if (!info || !info.series) return;             // 番名是底线;集数可空(电影/剧场版)
  const key = info.epKey || (info.series + '#' + (info.episode || ''));
  if (key === lastOfferedKey) return;            // 同一集只提示一次(含被用户忽略后不再唠叨)
  lastOfferedKey = key;
  const msg = info.episode
    ? t('offer.found', { title: info.series, ep: info.episode })
    : t('offer.foundMovie', { title: info.series }); // 无集数按电影措辞
  toastOffer(msg, t('offer.load'), () => openSearch({ run: true }));
}
