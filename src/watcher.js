// DOM 变化观察器的「按需」生命周期:仅在真正需要时才连接,空闲页面零开销。
// 需要的场景:开启了悬浮球(要随视频出现/消失切换),或已加载字幕(SPA 换视频要重挂)。
import { state } from './state.js';

let mo = null, timer = 0, onReact = () => {};

export function setReactHandler(fn) { onReact = fn; }

export function updateWatcher() {
  const need = state.showFab || state.cues.length > 0;
  if (need && !mo) {
    mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => onReact(), 300); // 防抖
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } else if (!need && mo) {
    mo.disconnect();
    mo = null;
    clearTimeout(timer);
  }
}
