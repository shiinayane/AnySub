// 设置持久化。
// 普通偏好:localStorage(按站点隔离,故是「每站点」保存)。
// Jimaku API key:跨站共享——优先 GM 存储(GM_getValue/GM_setValue,按脚本而非按站点,
//   一处设置全站可用),回落 localStorage(按站点)。同时也写一份 localStorage 作本站缓存兜底。
import { state } from './state.js';

const KEY = 'anysub:settings:v1';
const KEY_JIMAKU = 'anysub:jimakuKey';

// GM 存储是否可用(@grant GM_getValue/GM_setValue 时由管理器注入;普通 <script>/无 grant 时缺席)
const hasGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';

// 把当前 state 里所有需持久化的「每站点」字段写入(jimakuKey 不在此,它走跨站存储)
export function saveState() {
  const s = state.style;
  saveSettings({
    fontPct: s.fontPct, bottomPct: s.bottomPct, bg: s.bg, color: s.color,
    showFab: state.showFab, rubyParen: state.rubyParen, enhance: state.enhance,
    subPos: state.subPos, offsets: state.offsets, lang: state.lang,
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

// 读跨站 Jimaku key:GM 优先(全站共享),回落本站 localStorage。
export function getGlobalKey() {
  try {
    if (hasGM) {
      const v = GM_getValue(KEY_JIMAKU, '');
      if (typeof v === 'string' && v) return v; // 防个别管理器返回非字符串/Promise
    }
  } catch (_) { /* 降级到 localStorage */ }
  try {
    return localStorage.getItem(KEY_JIMAKU) || '';
  } catch (_) {
    return '';
  }
}

// 写跨站 Jimaku key:GM(全站)+ localStorage(本站缓存兜底)都写。
export function saveGlobalKey(v) {
  const val = v || '';
  try { if (hasGM) GM_setValue(KEY_JIMAKU, val); } catch (_) { /* 忽略 */ }
  try { localStorage.setItem(KEY_JIMAKU, val); } catch (_) { /* 忽略 */ }
}
