// 设置持久化。
// 普通偏好:localStorage(按站点隔离,故是「每站点」保存)。
// Jimaku API key:跨站共享——优先 GM 存储(GM_getValue/GM_setValue,按脚本而非按站点,
//   一处设置全站可用),回落 localStorage(按站点)。同时也写一份 localStorage 作本站缓存兜底。
import { state } from './state.js';

const KEY = 'anysub:settings:v1';
const KEY_JIMAKU = 'anysub:jimakuKey';

// 通过 globalThis 访问油猴存储 API,兼容各管理器(有的只提供异步 GM.*,有的只提供同步 GM_*)。
interface GmApi {
  getValue?: (key: string, def?: unknown) => unknown | Promise<unknown>;
  setValue?: (key: string, val: unknown) => unknown | Promise<unknown>;
}
const g = globalThis as unknown as {
  GM?: GmApi;
  GM_getValue?: (key: string, def?: unknown) => unknown;
  GM_setValue?: (key: string, val: unknown) => unknown;
};

// GM 存储适配:优先异步 GM.getValue/GM.setValue(GM4/Userscripts/VM),再回落同步 GM_getValue/
// GM_setValue(TM),都没有则为 null(走 localStorage)。await 对同步返回值同样适用,故统一按异步用。
const gmGet: ((k: string, d: string) => unknown) | null =
  g.GM && typeof g.GM.getValue === 'function'
    ? (k, d) => g.GM!.getValue!(k, d)
    : typeof g.GM_getValue === 'function'
      ? (k, d) => g.GM_getValue!(k, d)
      : null;
const gmSet: ((k: string, v: string) => unknown) | null =
  g.GM && typeof g.GM.setValue === 'function'
    ? (k, v) => g.GM!.setValue!(k, v)
    : typeof g.GM_setValue === 'function'
      ? (k, v) => g.GM_setValue!(k, v)
      : null;

// 把当前 state 里所有需持久化的「每站点」字段写入(jimakuKey 不在此,它走跨站存储)
export function saveState(): void {
  const s = state.style;
  saveSettings({
    fontPct: s.fontPct,
    bottomPct: s.bottomPct,
    bg: s.bg,
    color: s.color,
    showFab: state.showFab,
    rubyParen: state.rubyParen,
    enhance: state.enhance,
    subPos: state.subPos,
    offsets: state.offsets,
    lang: state.lang,
  });
}

// 已持久化设置的形状(读回时字段可能缺失/为旧值,故全部可选)
export interface SavedSettings {
  fontPct?: number;
  bottomPct?: number;
  bg?: string;
  color?: string;
  showFab?: boolean;
  rubyParen?: boolean;
  enhance?: boolean;
  subPos?: string;
  offsets?: Record<string, number>;
  lang?: string | null;
  jimakuKey?: string; // 旧版遗留(每站点存过);用于一次性迁移到跨站存储
}

export function loadSettings(): SavedSettings {
  try {
    return (JSON.parse(localStorage.getItem(KEY) || 'null') as SavedSettings) || {};
  } catch (_) {
    return {}; // 隐私模式 / 禁用 storage 时静默降级
  }
}

export function saveSettings(obj: SavedSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (_) {
    /* 忽略写入失败 */
  }
}

// 本站 localStorage 里的 key(同步,供启动时立即恢复本站缓存)
export function getLocalKey(): string {
  try {
    return localStorage.getItem(KEY_JIMAKU) || '';
  } catch (_) {
    return '';
  }
}

// 读跨站 Jimaku key(异步):GM 优先(全站共享),回落本站 localStorage。
export async function loadGlobalKey(): Promise<string> {
  if (gmGet) {
    try {
      const v = await gmGet(KEY_JIMAKU, '');
      if (typeof v === 'string' && v) return v; // 防非字符串返回
    } catch (_) {
      /* 降级到 localStorage */
    }
  }
  return getLocalKey();
}

// 写跨站 Jimaku key:GM(全站)+ localStorage(本站缓存兜底)都写。fire-and-forget。
export function saveGlobalKey(v: string): void {
  const val = v || '';
  if (gmSet) {
    try {
      Promise.resolve(gmSet(KEY_JIMAKU, val)).catch(() => {});
    } catch (_) {
      /* 忽略 */
    }
  }
  try {
    localStorage.setItem(KEY_JIMAKU, val);
  } catch (_) {
    /* 忽略 */
  }
}
