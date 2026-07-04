// 载入流程:读取 → 解码 → 按格式分派渲染器 → 挂载
import { state } from './state.js';
import { readSubtitleFile, decodeBuffer } from './decode.js';
import { parseSubtitle } from './parse.js';
import { pickBestVideo } from './locator.js';
import { setVideo, startRender, setRenderer, applyStyle } from './controller.js';
import { invalidateLayout } from './overlay.js';
import { createTextRenderer } from './render-text.js';
import { createAssRenderer } from './render-ass.js';
import { parseAss } from './parse-ass.js';
import { toast, updateStatus } from './notify.js';
import { updateWatcher } from './watcher.js';

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
    .catch((err) => { console.error('[AnySub]', err); toast('读取字幕失败:' + err.message); });
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
  if (!state.video) { toast('未在页面找到视频元素'); return false; }

  const fmt = FORMATS.find((f) => f.test(name, text)) || FORMATS[FORMATS.length - 1];
  const parsed = fmt.parse(text, name);
  if (!parsed.cues || !parsed.cues.length) {
    toast('未解析出字幕(格式不支持或文件为空)');
    return false;
  }
  state.cues = parsed.cues;
  state.fileName = name;
  invalidateLayout();
  setRenderer(fmt.create(parsed));
  applyStyle();
  startRender();
  updateWatcher(); // 字幕已加载 → 需要观察 SPA 换视频
  updateStatus();
  toast(`已挂载 ${parsed.cues.length} 条字幕`);
  return true;
}
