// 切集检测:SPA 内换集时页面 <title> 会更新;据标题里的集数变化,
// 清除旧字幕并「同源优先」自动加载下一集(找不到同源则弹候选)。
import { state } from './state.js';
import { parseVideoTitle } from './title-parse.js';
import { clearSubtitle } from './controller.js';
import { subtitleFiles, downloadAndLoad, markLoaded } from './online.js';
import { pickSameSource } from './match.js';
import { showCandidates } from './search-ui.js';
import { setOffset } from './ui.js';
import { toast } from './notify.js';

let timer = 0;
let busy = false;

export function initEpisodeWatch() {
  const titleEl = document.querySelector('title');
  if (!titleEl) return;
  const mo = new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(onTitleChange, 500); // 防抖:标题可能连续变动
  });
  mo.observe(titleEl, { childList: true, characterData: true, subtree: true });
}

function onTitleChange() {
  if (busy || !state.cues.length) return;
  const { series, episode } = parseVideoTitle(document.title);
  if (episode === '') return; // 判断不出集数就不动
  if (series === state.loadedSeries && String(episode) === String(state.loadedEpisode)) return; // 没变

  const sameShow = series === state.loadedSeries && state.lastOnline;
  clearSubtitle(); // 无论如何先清掉不再匹配的旧字幕
  if (sameShow) {
    autoContinue(state.lastOnline, series, episode);
  } else {
    state.loadedSeries = ''; state.loadedEpisode = '';
    toast('已切集,已清除旧字幕');
  }
}

async function autoContinue(ctx, series, episode) {
  busy = true;
  // 同源续播沿用上一集偏移(用户约定「同剧集同源稳定」)。
  // 必须显式带过去:pickSameSource 是宽松匹配,而 offsetKey 用精确源 token,
  // 两集文件名的非集数 token 略有差异时 key 不同 → 加载会把 offset 重置为 0。
  const carryOffset = state.offset;
  toast(`检测到切集,正在找第 ${episode} 集字幕…`);
  try {
    const files = await subtitleFiles(ctx.anilistId, episode);
    if (!files.length) { toast(`第 ${episode} 集暂无字幕`); return; }
    const best = pickSameSource(files, ctx.name);
    if (best) {
      const ok = await downloadAndLoad(best.url, best.name);
      if (ok) {
        markLoaded(ctx.anilistId, best.name);
        if (carryOffset) setOffset(carryOffset); // 同源:把上一集偏移带到新集(并记忆到新 key)
        toast(`已自动加载第 ${episode} 集字幕`);
      }
    } else {
      toast('未找到同源字幕,请从候选中选择');
      showCandidates(series, files); // 回退:弹出候选让用户选
    }
  } catch (err) {
    toast('自动找字幕失败:' + (err && err.message));
  } finally {
    busy = false;
  }
}
