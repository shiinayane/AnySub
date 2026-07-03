// 设置持久化:localStorage(页面上下文,@grant none,跨浏览器通用)
// 注:localStorage 按站点隔离,故偏好是「每站点」保存。偏移不持久化。

const KEY = 'anysub:settings:v1';

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
