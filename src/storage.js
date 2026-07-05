// 设置持久化。
// 普通偏好:localStorage(按站点隔离,故是「每站点」保存)。
// Jimaku API key:跨站共享——优先 GM 存储(GM_getValue/GM_setValue,按脚本而非按站点,
//   一处设置全站可用),回落 localStorage(按站点)。同时也写一份 localStorage 作本站缓存兜底。
import { state } from './state.js';

const KEY = 'anysub:settings:v1';
const KEY_JIMAKU = 'anysub:jimakuKey';

// GM 存储适配:优先异步 GM.getValue/GM.setValue(GM4/Userscripts/VM),再回落同步 GM_getValue/
// GM_setValue(TM),都没有则为 null(走 localStorage)。await 对同步返回值同样适用,故统一按异步用。
const gmGet = (typeof GM !== 'undefined' && GM && typeof GM.getValue === 'function') ? (k, d) => GM.getValue(k, d)
  : (typeof GM_getValue === 'function') ? (k, d) => GM_getValue(k, d) : null;
const gmSet = (typeof GM !== 'undefined' && GM && typeof GM.setValue === 'function') ? (k, v) => GM.setValue(k, v)
  : (typeof GM_setValue === 'function') ? (k, v) => GM_setValue(k, v) : null;

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

// 本站 localStorage 里的 key(同步,供启动时立即恢复本站缓存)
export function getLocalKey() {
  try { return localStorage.getItem(KEY_JIMAKU) || ''; } catch (_) { return ''; }
}

// 读跨站 Jimaku key(异步):GM 优先(全站共享),回落本站 localStorage。
export async function loadGlobalKey() {
  if (gmGet) {
    try {
      const v = await gmGet(KEY_JIMAKU, '');
      if (typeof v === 'string' && v) return v; // 防非字符串返回
    } catch (_) { /* 降级到 localStorage */ }
  }
  return getLocalKey();
}

// 写跨站 Jimaku key:GM(全站)+ localStorage(本站缓存兜底)都写。fire-and-forget。
export function saveGlobalKey(v) {
  const val = v || '';
  if (gmSet) { try { Promise.resolve(gmSet(KEY_JIMAKU, val)).catch(() => {}); } catch (_) { /* 忽略 */ } }
  try { localStorage.setItem(KEY_JIMAKU, val); } catch (_) { /* 忽略 */ }
}
