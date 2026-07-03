// 载入流程:读取 → 解码 → 按格式分派渲染器 → 挂载
import { state } from './state.js';
import { readSubtitleFile } from './decode.js';
import { parseSubtitle } from './parse.js';
import { pickBestVideo } from './locator.js';
import { setVideo, startRender, setRenderer, applyStyle } from './controller.js';
import { invalidateLayout } from './overlay.js';
import { createTextRenderer } from './render-text.js';
import { toast, updateStatus } from './notify.js';

// 格式注册表:决定用哪个渲染器 + 如何把文件变成 state.cues。
// 加 ASS 时:在前面插一条 { test: n => /\.(ass|ssa)$/i.test(n), parse: t => ({ ass: t }), create: createAssRenderer },
// 并把文本项的 test 收紧为 /\.(srt|vtt|sbv)$/i。
const FORMATS = [
  {
    test: () => true, // 目前文本渲染器作为兜底
    parse: (text, name) => ({ cues: parseSubtitle(text, name) }),
    create: createTextRenderer,
  },
];

export function loadFile(file) {
  if (!file) return;
  if (!state.video || !state.video.isConnected) {
    const v = pickBestVideo();
    if (v) setVideo(v);
  }
  if (!state.video) { toast('未在页面找到视频元素'); return; }

  readSubtitleFile(file)
    .then((text) => {
      const fmt = FORMATS.find((f) => f.test(file.name, text)) || FORMATS[FORMATS.length - 1];
      const parsed = fmt.parse(text, file.name);
      if (!parsed.cues || !parsed.cues.length) {
        toast('未解析出字幕(格式不支持或文件为空)');
        return;
      }
      state.cues = parsed.cues;
      state.fileName = file.name;
      invalidateLayout();
      setRenderer(fmt.create());
      applyStyle();
      startRender();
      updateStatus();
      toast(`已挂载 ${parsed.cues.length} 条字幕`);
    })
    .catch((err) => { console.error('[AnySub]', err); toast('读取字幕失败:' + err.message); });
}
