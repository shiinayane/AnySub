// 切集续播:换集时(由 episode-signal 统一探测:站点规则优先、回落 <title>)据集数变化,
// 清除旧字幕并「同源优先」自动加载下一集(找不到同源则弹候选)。
import { state } from './state.js';
import { clearSubtitle } from './controller.js';
import { subtitleFiles, downloadAndLoad, markLoaded } from './online.js';
import { pickSameSource } from './match.js';
import { showCandidates } from './search-ui.js';
import { setOffset } from './ui.js';
import { toast } from './notify.js';
import { onEpisodeChange } from './episode-signal.js';
import { t } from './i18n.js';

let busy = false;

// 供 auto-offer 用:同源自动接续尝试期间(clearSubtitle 已清空 cues、下一集尚未下完)不该被
// 「发现字幕」提示抢先打断——那份提示一判断 cues 为空就可能弹出,和这里的自动加载撞在一起。
export function isAutoContinuing() { return busy; }

export function initEpisodeWatch() {
  onEpisodeChange(onEpisode); // 观察什么由 episode-signal 按站点决定,这里只管切集后的续播
}

function onEpisode(info) {
  if (busy || !state.cues.length) return;
  const { series, episode } = info;
  if (episode === '') return; // 判断不出集数就不动
  if (series === state.loadedSeries && String(episode) === String(state.loadedEpisode)) return; // 没变

  const sameShow = series === state.loadedSeries && state.lastOnline;
  clearSubtitle(); // 无论如何先清掉不再匹配的旧字幕
  if (sameShow) {
    autoContinue(state.lastOnline, series, episode);
  } else {
    state.loadedSeries = ''; state.loadedEpisode = '';
    toast(t('toast.epCleared'));
  }
}

async function autoContinue(ctx, series, episode) {
  busy = true;
  // 同源续播沿用上一集偏移(用户约定「同剧集同源稳定」)。
  // 必须显式带过去:pickSameSource 是宽松匹配,而 offsetKey 用精确源 token,
  // 两集文件名的非集数 token 略有差异时 key 不同 → 加载会把 offset 重置为 0。
  const carryOffset = state.offset;
  toast(t('toast.epFinding', { ep: episode }));
  try {
    const files = await subtitleFiles(ctx.anilistId, episode, [series]); // 兜底:用页面标题番名自由搜
    if (!files.length) { toast(t('toast.epNone', { ep: episode })); return; }
    const best = pickSameSource(files, ctx.name);
    if (best) {
      const ok = await downloadAndLoad(best.url, best.name);
      if (ok) {
        markLoaded(ctx.anilistId, best.name);
        if (carryOffset) setOffset(carryOffset); // 同源:把上一集偏移带到新集(并记忆到新 key)
        toast(t('toast.epAuto', { ep: episode }));
      }
    } else {
      toast(t('toast.epNoSame'));
      showCandidates(series, files); // 回退:弹出候选让用户选
    }
  } catch (err) {
    toast(t('toast.epFailed', { msg: (err && err.message) }));
  } finally {
    busy = false;
  }
}
