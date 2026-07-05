// 自动提示:在已知站点的「正片播放中」识别出番名(+集数),先真查 Jimaku 确认该集确有字幕,
// 才弹可点 toast「找到 N 份字幕 — 查找?」,点了打开候选让用户选(守住不静默加载)。
// 关键取舍:
//  · 只在「实质视频真正在播放」时触发(排除首页/详情页的 hero 预览,它们也用同款播放器)。
//  · 「查证后再提示」——没查过 Jimaku 就说「发现字幕」是撒谎;确实没有则静默,不空弹。
//  · 需 Jimaku key(在线取字幕本就依赖它);无 key 不自动提示(可手动搜索时再设)。
import { state } from './state.js';
import { refs } from './refs.js';
import { getSiteAdapter } from './site-adapters.js';
import { collectVideos } from './locator.js';
import { toastOffer } from './notify.js';
import { animeCandidates, subtitleFiles } from './online.js';
import { pickExactAnime } from './match.js';
import { showCandidates } from './search-ui.js';
import { isAutoContinuing } from './episode-watch.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from './i18n.js';

const MIN_DURATION = 120; // 秒:正片阈值,滤掉 hero 预览/短预告(动画正片均 20 分钟+)
const MIN_COVER = 0.6;    // 视口占比:主播放器 vs 横幅预览(给静音观看者兜底)
let lastOfferedKey = null;
let lastUrl = '';
let pollTimer = 0, retryTimer = 0, waitTries = 0, verifying = false;

export function initAutoOffer() {
  if (!getSiteAdapter()) return; // 非已知站点:完全不介入
  lastUrl = location.href;
  let tries = 0;
  const poll = () => {
    check();
    if (++tries < 8 && lastOfferedKey === null) pollTimer = setTimeout(poll, 1500); // 等 SPA 出视频/水合
  };
  pollTimer = setTimeout(poll, 1200);
  onEpisodeChange(check); // 切集后(由 episode-signal 统一探测)再探:新一集仍没字幕则再核实提示
}

// 「用户在看正片」判定(纯函数,便于单测):时长够长 + 已起播未暂停(排除首页预加载但暂停的
// 视频),且满足以下之一:有声(!muted && volume>0,自动播放的预览按浏览器策略必然静音,
// 带声音说明用户手势主动播放,URL 不变也能区分);或占据大半视口(给静音观看者兜底)。
export function isFeatureVideo(v, vw, vh) {
  if (!v || !(isFinite(v.duration) && v.duration > MIN_DURATION && !v.paused && v.currentTime > 0)) return false;
  const audible = !v.muted && v.volume > 0;
  const r = (v.getBoundingClientRect && v.getBoundingClientRect()) || { width: 0, height: 0 };
  const cover = (r.width * r.height) / ((vw || 1) * (vh || 1));
  return audible || cover > MIN_COVER;
}

function playingFeature() {
  const vids = [document.querySelector('video')].concat(collectVideos()).filter(Boolean);
  const vw = window.innerWidth || 1, vh = window.innerHeight || 1;
  return vids.find((v) => isFeatureVideo(v, vw, vh)) || null;
}

// 外部触发(轮询/切集信号)入口:重置「等待起播」重试计数
function check() { run(false); }

async function run(isRetry) {
  if (!isRetry) waitTries = 0;
  clearTimeout(retryTimer);
  if (location.href !== lastUrl) { lastUrl = location.href; lastOfferedKey = null; } // SPA 导航 → 新页可重新提示
  if (state.cues.length || verifying) return;    // 已有字幕 / 正在核实,不重入
  if (isAutoContinuing()) { retryTimer = setTimeout(() => run(true), 600); return; } // 同源接续在跑,等结果
  if (refs.searchPanel && refs.searchPanel.style.display === 'block') return; // 候选面板已开
  const ad = getSiteAdapter();
  if (!ad || !ad.isTarget()) return;             // 非播放页
  if (!playingFeature()) {                       // 关键时机:等到「正片真正在播放」
    if (waitTries < 15) { waitTries++; retryTimer = setTimeout(() => run(true), 1000); }
    return;
  }
  const info = ad.detect();
  if (!info || !info.series) return;
  const key = info.epKey || (info.series + '#' + (info.episode || ''));
  if (key === lastOfferedKey) return;            // 本集已尝试过,不重复
  if (!state.jimakuKey) return;                  // 无 key:在线取字幕不可用 → 不自动提示
  lastOfferedKey = key;                          // 标记已尝试(无论核实结果,不再重复核实)

  // 查证:真去 Jimaku 看这一集有没有字幕,有才提示、并如实报数量;没有则静默。
  verifying = true;
  try {
    const cands = await animeCandidates(info.series);
    const anime = pickExactAnime(cands, info.series) || cands[0];
    if (!anime) return;
    const files = await subtitleFiles(anime.anilistId, info.episode, [anime.native, anime.romaji, anime.english]);
    if (!files.length || state.cues.length) return; // 确实没字幕,或核实期间用户已手动加载 → 不弹
    const msg = info.episode
      ? t('offer.found', { title: info.series, ep: info.episode, n: files.length })
      : t('offer.foundMovie', { title: info.series, n: files.length });
    toastOffer(msg, t('offer.load'), () => showCandidates(info.series, files, anime.anilistId));
  } catch (_) { /* 网络/限流失败 → 静默,不弹 */ }
  finally { verifying = false; }
}
