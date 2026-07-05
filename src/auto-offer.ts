// 自动提示:在已知站点的「正片播放中」识别出番名(+集数),先真查 Jimaku 确认该集确有字幕,
// 才弹可点 toast「找到 N 份字幕 — 查找?」,点了打开候选让用户选(守住不静默加载)。
// 关键取舍:
//  · 只在「实质视频真正在播放」时触发(排除首页/详情页的 hero 预览,它们也用同款播放器)。
//  · 「查证后再提示」——没查过 Jimaku 就说「发现字幕」是撒谎;确实没有则静默,不空弹。
//  · 需 Jimaku key(在线取字幕本就依赖它);无 key 不自动提示(可手动搜索时再设)。
import { state } from './state.js';
import { refs } from './refs.js';
import { getSiteAdapter, detectShow } from './site-adapters.js';
import { collectVideos } from './locator.js';
import { toastOffer } from './notify.js';
import { resolveSubtitles } from './online.js';
import { showCandidates } from './search-ui.js';
import { isAutoContinuing } from './episode-watch.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from './i18n.js';

const MIN_DURATION = 120; // 秒:正片阈值,滤掉 hero 预览/短预告(动画正片均 20 分钟+)
const MIN_COVER = 0.6; // 视口占比:主播放器 vs 横幅预览(给静音观看者兜底)
let lastOfferedKey: string | null = null;
let lastUrl = '';
let retryTimer: ReturnType<typeof setTimeout> | undefined,
  waitTries = 0,
  verifying = false;

export function initAutoOffer(): void {
  if (!getSiteAdapter()) return; // 非已知站点:完全不介入
  lastUrl = location.href;
  let tries = 0;
  const poll = () => {
    check();
    if (++tries < 8 && lastOfferedKey === null) setTimeout(poll, 1500); // 等 SPA 出视频/水合(有界自停,无需持句柄)
  };
  setTimeout(poll, 1200);
  onEpisodeChange(check); // 切集后(由 episode-signal 统一探测)再探:新一集仍没字幕则再核实提示
  // 关键时机:视频「开始播放」即检查——不受进页面后停留多久影响(切集信号在同集内不会触发,
  // 轮询重试窗口也会过期)。play 事件不冒泡,capture 阶段全局监听。预览的静音自动播放也会触发,
  // 但被 playingFeature 的「有声/大视口」过滤掉。
  document.addEventListener('play', check, true);
}

// isFeatureVideo 只读取以下字段(结构化类型,便于用最小 mock 单测;HTMLVideoElement 满足之)
interface FeatureVid {
  duration: number;
  paused: boolean;
  currentTime: number;
  muted: boolean;
  volume: number;
  getBoundingClientRect?: () => { width: number; height: number };
}

// 「用户在看正片」判定(纯函数,便于单测):时长够长 + 已起播未暂停(排除首页预加载但暂停的
// 视频),且满足以下之一:有声(!muted && volume>0,自动播放的预览按浏览器策略必然静音,
// 带声音说明用户手势主动播放,URL 不变也能区分);或占据大半视口(给静音观看者兜底)。
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

// 外部触发(轮询/切集信号)入口:重置「等待起播」重试计数
function check(): void {
  run(false);
}

async function run(isRetry: boolean): Promise<void> {
  if (!isRetry) waitTries = 0;
  clearTimeout(retryTimer);
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    lastOfferedKey = null;
  } // SPA 导航 → 新页可重新提示
  if (state.cues.length || verifying) return; // 已有字幕 / 正在核实,不重入
  if (isAutoContinuing()) {
    retryTimer = setTimeout(() => run(true), 600);
    return;
  } // 同源接续在跑,等结果
  if (refs.searchPanel && refs.searchPanel.style.display === 'block') return; // 候选面板已开
  const ad = getSiteAdapter();
  if (!ad || !ad.isTarget()) return; // 非播放页
  if (!playingFeature()) {
    // 关键时机:等到「正片真正在播放」
    if (waitTries < 15) {
      waitTries++;
      retryTimer = setTimeout(() => run(true), 1000);
    }
    return;
  }
  const info = detectShow(); // 与 episode-signal/切集续播同源,避免键/指纹不一致
  if (!info || !info.series) return;
  const key = info.epKey || info.series + '#' + (info.episode || '');
  if (key === lastOfferedKey) return; // 本集已核实过,不重复
  if (!state.jimakuKey) return; // 无 key:在线取字幕不可用 → 不自动提示

  // 查证:走统一入口真查 Jimaku,有该集字幕才提示、并如实报数量;没有则静默。
  verifying = true;
  try {
    const { anime, files, exact } = await resolveSubtitles(info.series, info.episode);
    lastOfferedKey = key; // 核实成功(未抛错)才占位;抛错则不占,下次触发重试
    if (!anime || !exact) return; // 非精确命中 → 不主动提示(避免错番),用户可手动搜索选番
    if (!info.episode && anime.episodes > 1) return; // 剧集却没识别出集数 → 无法定位,不弹(避免列全集/错标电影)
    if (!files.length || state.cues.length) return; // 无字幕,或核实期间用户已手动加载 → 不弹
    const msg = info.episode
      ? t('offer.found', { title: info.series, ep: info.episode, n: files.length })
      : t('offer.foundMovie', { title: info.series, n: files.length });
    toastOffer(msg, t('offer.load'), () => showCandidates(info.series, files, anime.anilistId));
  } catch (_) {
    /* 网络/限流失败 → 不占位,下次触发重试 */
  } finally {
    verifying = false;
  }
}
