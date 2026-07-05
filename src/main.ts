// AnySub 入口:初始化 UI + 动态视频监听
import { state } from './state.js';
import { injectStyle } from './styles.js';
import { buildUI, updateFabVisibility } from './ui.js';
import { pickBestVideo, isVisible } from './locator.js';
import { setVideo } from './controller.js';
import { loadSettings, getLocalKey, loadGlobalKey, saveGlobalKey } from './storage.js';
import { refreshKeyArea } from './search-ui.js';
import { initShortcuts } from './shortcuts.js';
import { setReactHandler, updateWatcher } from './watcher.js';
import { initEpisodeWatch } from './episode-watch.js';
import { initAutoOffer } from './auto-offer.js';
import { initEpisodeSignal } from './episode-signal.js';
import type { SubStyle } from './types.js';

// 避免在同一 window 重复注入
if (!window.__ANYSUB_LOADED__) {
  window.__ANYSUB_LOADED__ = true;
  init();
}

function init(): void {
  if (!document.body) {
    requestAnimationFrame(init);
    return;
  }
  restoreSettings();
  injectStyle();
  buildUI();
  initShortcuts();
  initEpisodeWatch(); // 注册切集续播订阅者
  initAutoOffer(); // 注册「发现字幕」订阅者(仅已知站点)
  initEpisodeSignal(); // 建立切集信号源(观察站点规则元素或回落 <title>)+ 基线
  setReactHandler(react);
  updateFabVisibility();
  updateWatcher(); // 按需连接:仅当开了悬浮球或已加载字幕才观察 DOM
}

// DOM 变化时:SPA 换视频后重挂(仅字幕已加载时)+ 刷新悬浮球可见性
function react(): void {
  if (state.cues.length && state.video && (!state.video.isConnected || !isVisible(state.video))) {
    const nv = pickBestVideo();
    if (nv && nv !== state.video) setVideo(nv);
  }
  updateFabVisibility();
}

// 恢复持久化偏好(仅接受已知字段,防脏数据)
function restoreSettings(): void {
  const saved = loadSettings();
  const s = state.style;
  if (typeof saved.fontPct === 'number') s.fontPct = saved.fontPct;
  if (typeof saved.bottomPct === 'number') s.bottomPct = saved.bottomPct;
  if (typeof saved.bg === 'string') s.bg = saved.bg as SubStyle['bg'];
  if (typeof saved.color === 'string') s.color = saved.color;
  if (typeof saved.showFab === 'boolean') state.showFab = saved.showFab;
  if (typeof saved.rubyParen === 'boolean') state.rubyParen = saved.rubyParen;
  if (typeof saved.enhance === 'boolean') state.enhance = saved.enhance;
  if (saved.subPos === 'top' || saved.subPos === 'bottom') state.subPos = saved.subPos;
  if (saved.lang === 'en' || saved.lang === 'zh' || saved.lang === 'ja') state.lang = saved.lang;
  // Jimaku key 走跨站存储(全站通用)。先用本站缓存立即恢复(若有),再异步取全站 key 覆盖
  // (GM 存储可能是异步的);若全站为空但旧版 key 存在每站点设置里,一次性迁移。
  const cachedKey = getLocalKey();
  state.jimakuKey = cachedKey;
  loadGlobalKey().then((k) => {
    if (state.jimakuKey !== cachedKey) return; // 启动期间用户已手动设/清 key → 不用异步旧值覆盖
    if (k) state.jimakuKey = k;
    else if (typeof saved.jimakuKey === 'string' && saved.jimakuKey) {
      state.jimakuKey = saved.jimakuKey;
      saveGlobalKey(saved.jimakuKey); // 迁移:旧的每站点 key → 全站
    }
    refreshKeyArea(); // 若搜索面板已开着(异步解析前),刷新 key 区显示
  });
  // 只接受「纯对象 + 有限数值」的偏移表:防脏数据(数组/字符串/嵌套/超大)污染并被回写
  if (saved.offsets && typeof saved.offsets === 'object' && !Array.isArray(saved.offsets)) {
    const clean: Record<string, number> = {};
    for (const k in saved.offsets) {
      const v = saved.offsets[k];
      if (typeof v === 'number' && isFinite(v)) clean[k] = v;
    }
    state.offsets = clean;
  }
}
