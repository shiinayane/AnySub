// 载入流程:读取 → 解码 → 按格式分派渲染器 → 挂载
import { state } from './state.js';
import { readSubtitleFile, decodeBuffer } from './decode.js';
import { parseSubtitle } from './parse.js';
import { detectShow } from './site-adapters.js';
import { sourceTokens } from './match.js';
import { buildSpeakers, computeSpanStates } from './cue-format.js';
import { pickBestVideo } from './locator.js';
import { setVideo, startRender, setRenderer, applyStyle } from './controller.js';
import { invalidateLayout } from './overlay.js';
import { createTextRenderer } from './render-text.js';
import { createAssRenderer } from './render-ass.js';
import { parseAss } from './parse-ass.js';
import { toast, updateStatus } from './notify.js';
import { updateWatcher } from './watcher.js';
import { t } from './i18n.js';

// 格式注册表:test 命中即用其 parse(填充文本保底 cues)+ create(渲染器)。
const FORMATS = [
  {
    test: (name) => /\.(ass|ssa)$/i.test(name || ''),
    parse: (text) => ({ cues: parseAss(text), assText: text }),
    create: (parsed) => createAssRenderer(parsed.assText),
  },
  {
    test: () => true, // 文本渲染器兜底(SRT / VTT / 其它)
    parse: (text, name) => ({ cues: parseSubtitle(text, name) }),
    create: () => createTextRenderer(),
  },
];

export function loadFile(file) {
  if (!file) return;
  readSubtitleFile(file)
    .then((text) => loadFromText(text, file.name))
    .catch((err) => { console.error('[AnySub]', err); toast(t('toast.readFailed', { msg: err.message })); });
}

// 从字节流载入(在线下载复用:先做编码探测再走统一路径)
export function loadFromBuffer(buffer, name) {
  return loadFromText(decodeBuffer(new Uint8Array(buffer)), name);
}

// 从已解码文本载入(本地/在线共用的核心路径)
export function loadFromText(text, name) {
  if (!state.video || !state.video.isConnected) {
    const v = pickBestVideo();
    if (v) setVideo(v);
  }
  if (!state.video) { toast(t('toast.noVideoOnPage')); return false; }

  const fmt = FORMATS.find((f) => f.test(name, text)) || FORMATS[FORMATS.length - 1];
  const parsed = fmt.parse(text, name);
  if (!parsed.cues || !parsed.cues.length) {
    toast(t('toast.noCues'));
    return false;
  }
  state.cues = parsed.cues;
  state.speakers = buildSpeakers(parsed.cues); // 话者名词表(供语义排版消歧独立括号)
  computeSpanStates(parsed.cues);              // 预计算跨行/跨 cue 的画外音/书面/歌曲跨度状态
  state.fileName = name;
  // 记录当前番剧/集数(用于切集检测);用站点适配的 detectShow(),与切集信号同源,
  // 否则 Prime 等「集数不在 <title> 里」的站点会记错 → 切集时番名对不上、不自动接续。
  const p = detectShow();
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = null;
  // 偏移记忆:按「番剧|源特征」恢复上次的偏移(同番剧同源跨集稳定);无记录则归 0
  state.offsetKey = (p.series || '') + '|' + [...sourceTokens(name)].sort().join(',');
  const remembered = state.offsets[state.offsetKey];
  state.offset = (typeof remembered === 'number') ? remembered : 0;
  invalidateLayout();
  setRenderer(fmt.create(parsed));
  applyStyle();
  startRender();
  updateWatcher(); // 字幕已加载 → 需要观察 SPA 换视频
  updateStatus();
  toast(t('toast.mounted', { n: parsed.cues.length }));
  return true;
}
