// 载入流程:读取 → 解码 → 解析 → 挂载渲染
import { state } from './state.js';
import { readSubtitleFile } from './decode.js';
import { parseSubtitle } from './parse.js';
import { pickBestVideo } from './locator.js';
import { setVideo, startRender, applyStyle, invalidateLayout } from './render.js';
import { toast, updateStatus } from './notify.js';

export function loadFile(file) {
  if (!file) return;
  if (!state.video || !state.video.isConnected) {
    const v = pickBestVideo();
    if (v) setVideo(v);
  }
  if (!state.video) { toast('未在页面找到视频元素'); return; }
  readSubtitleFile(file)
    .then((text) => {
      const cues = parseSubtitle(text, file.name);
      if (!cues.length) { toast('未解析出字幕(格式不支持或文件为空)'); return; }
      state.cues = cues;
      state.fileName = file.name;
      invalidateLayout();
      applyStyle();
      startRender();
      updateStatus();
      toast(`已挂载 ${cues.length} 条字幕`);
    })
    .catch((err) => { console.error('[AnySub]', err); toast('读取字幕失败:' + err.message); });
}
