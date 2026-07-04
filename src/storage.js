// 设置持久化:localStorage(页面上下文,@grant none,跨浏览器通用)
// 注:localStorage 按站点隔离,故偏好是「每站点」保存。偏移与临时隐藏不持久化。
import { state } from './state.js';

const KEY = 'anysub:settings:v1';

// 把当前 state 里所有需持久化的字段写入(供各处调用,避免各写一份互相覆盖)
export function saveState() {
  const s = state.style;
  saveSettings({
    fontPct: s.fontPct, bottomPct: s.bottomPct, bg: s.bg, color: s.color,
    shortcutsEnabled: state.shortcutsEnabled, showFab: state.showFab, jimakuKey: state.jimakuKey,
  });
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch (_) {
    return {}; // 隐私模式 / 禁用 storage 时静默降级
  }
}

export function saveSettings(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (_) { /* 忽略写入失败 */ }
}
