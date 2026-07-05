// 悬浮 UI:设置面板(快捷键唤出)+ 可选悬浮球 + 拖拽吸附 + 手动选视频
import { state } from '../state.js';
import { refs } from '../refs.js';
import {
  refresh,
  applyStyle,
  clearSubtitle,
  setVideo,
  toggleSubtitles,
} from '../render/controller.js';
import { invalidateLayout } from '../render/overlay.js';
import { loadFile } from '../render/loader.js';
import { collectVideos, isVisible } from '../render/locator.js';
import { toast, updateStatus } from './notify.js';
import { saveState } from '../online/storage.js';
import { updateWatcher } from '../render/watcher.js';
import { buildSearchUI, relocalizeSearch, openSearch } from './search-ui.js';
import { t, setLang, LANG_OPTIONS } from '../i18n.js';
import type { SubStyle } from '../types.js';

const persist = saveState;

// 悬浮球带一个自定义标记位:区分「拖动后松手」与「真正点击」
type DraggableEl = HTMLElement & { __dragged?: boolean };

// 内联 SVG 图标(stroke 用 currentColor,随文字色走;16px 视觉)
const SVG = (p: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  file: SVG(
    '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/>',
  ),
  search: SVG('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>'),
  video: SVG('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  eye: SVG(
    '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  ),
  eyeOff: SVG(
    '<path d="M10 5.1A9.9 9.9 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-2.2 2.9M6.5 6.5A15 15 0 0 0 2 12s3.6 7 10 7a9.8 9.8 0 0 0 3.5-.6"/><path d="m3 3 18 18"/>',
  ),
  trash: SVG(
    '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  ),
  upload: SVG('<path d="M12 15V4M8 8l4-4 4 4M5 20h14"/>'),
};

function langOptions(): string {
  const cur = state.lang || '';
  return LANG_OPTIONS.map(
    (o) => `<option value="${o.value}"${o.value === cur ? ' selected' : ''}>${o.label}</option>`,
  ).join('');
}

// 面板 HTML 随语言生成(可运行时重建以切换语言)
function panelHtml(): string {
  return `
  <div class="as-head">
    <div class="as-brand"><span class="as-logo">字</span><span>AnySub</span></div>
    <button id="anysub-close" class="as-x" title="${t('panel.close')}">✕</button>
  </div>

  <div class="as-actions">
    <button id="anysub-choose" class="as-btn as-btn-primary">${ICON.file}<span>${t('panel.chooseFile')}</span></button>
    <button id="anysub-online" class="as-btn as-btn-primary">${ICON.search}<span>${t('panel.online')}</span></button>
  </div>
  <div class="as-drop" id="anysub-drop">${ICON.upload}<span>${t('panel.dropHint')}</span></div>

  <div class="as-status-row">
    <span class="as-status" id="anysub-status">${t('panel.statusEmpty')}</span>
    <div class="as-status-actions">
      <button id="anysub-pickvid" class="as-icon-btn" title="${t('panel.pickVideo')}">${ICON.video}</button>
      <button id="anysub-vis" class="as-icon-btn" title="${t('panel.hide')}"><span class="as-eye">${ICON.eye}</span><span class="as-eye-off">${ICON.eyeOff}</span></button>
      <button id="anysub-clear" class="as-icon-btn" title="${t('panel.clear')}">${ICON.trash}</button>
    </div>
  </div>

  <div class="as-divider"></div>

  <div class="as-field">
    <label class="as-label">${t('panel.offset')}</label>
    <div class="as-offset">
      <button data-off="-1" class="as-step">−1</button>
      <button data-off="-0.1" class="as-step">−.1</button>
      <input type="number" id="anysub-offset" value="0.0" step="0.1" title="${t('panel.offsetTitle')}">
      <button data-off="0.1" class="as-step">+.1</button>
      <button data-off="1" class="as-step">+1</button>
    </div>
  </div>

  <div class="as-field">
    <label class="as-label">${t('panel.fontSize')} <span class="as-val" id="anysub-fontval">100%</span></label>
    <input type="range" id="anysub-font" class="as-range" min="50" max="250" value="100" step="5">
  </div>

  <div class="as-field">
    <label class="as-label">${t('panel.margin')} <span class="as-val" id="anysub-posval">8%</span></label>
    <input type="range" id="anysub-pos" class="as-range" min="2" max="40" value="8" step="1">
  </div>

  <div class="as-field">
    <label class="as-label">${t('panel.speakerPos')}</label>
    <div class="as-seg" id="anysub-anchor">
      <button data-pos="bottom" class="on">${t('panel.posBottom')}</button>
      <button data-pos="top">${t('panel.posTop')}</button>
    </div>
  </div>

  <div class="as-field">
    <label class="as-label">${t('panel.background')}</label>
    <div class="as-seg" id="anysub-bg">
      <button data-bg="outline">${t('panel.bgOutline')}</button>
      <button data-bg="translucent" class="on">${t('panel.bgTranslucent')}</button>
      <button data-bg="solid">${t('panel.bgSolid')}</button>
      <button data-bg="none">${t('panel.bgNone')}</button>
    </div>
  </div>

  <div class="as-field">
    <label class="as-label">${t('panel.color')}</label>
    <div class="as-swatches" id="anysub-color">
      <button data-color="#ffffff" class="on" style="--sw:#ffffff" title="${t('panel.colWhite')}"></button>
      <button data-color="#ffe100" style="--sw:#ffe100" title="${t('panel.colYellow')}"></button>
      <button data-color="#00e5ff" style="--sw:#00e5ff" title="${t('panel.colCyan')}"></button>
      <button data-color="#7CFC00" style="--sw:#7cfc00" title="${t('panel.colGreen')}"></button>
    </div>
  </div>

  <div class="as-divider"></div>

  <div class="as-switch-row">
    <span class="as-switch-label">${t('panel.ruby')}</span>
    <button id="anysub-tg-ruby" class="as-switch" role="switch" title="${t('panel.rubyTitle')}"><span class="as-knob"></span></button>
  </div>
  <div class="as-switch-row">
    <span class="as-switch-label">${t('panel.enhance')}</span>
    <button id="anysub-tg-enh" class="as-switch" role="switch" title="${t('panel.enhanceTitle')}"><span class="as-knob"></span></button>
  </div>
  <div class="as-switch-row">
    <span class="as-switch-label">${t('panel.fab')}</span>
    <button id="anysub-tg-fab" class="as-switch" role="switch" title="${t('panel.fabTitle')}"><span class="as-knob"></span></button>
  </div>

  <div class="as-field as-field-lang">
    <label class="as-label">${t('panel.language')}</label>
    <select id="anysub-lang" class="as-select">${langOptions()}</select>
  </div>

  <div class="as-hints">
    <kbd>Ctrl/Alt</kbd>+<kbd>Shift</kbd> ${t('hint.then')} <kbd>S</kbd> ${t('hint.panel')} · <kbd>F</kbd> ${t('hint.online')} · <kbd>V</kbd> ${t('hint.toggle')} · <kbd>O</kbd> ${t('hint.local')} · <kbd>←/→</kbd> ${t('hint.offset')}
  </div>
`;
}

export function buildUI(): void {
  const uiRoot = document.createElement('div');
  uiRoot.id = 'anysub-root';

  const overlay = document.createElement('div');
  overlay.id = 'anysub-overlay';
  // 关键定位属性内联,即使站点 CSP 剥离了注入的 <style>,覆盖层也不会遮挡/拦截页面
  overlay.style.cssText =
    'display:none;position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;';

  const fab = document.createElement('div') as DraggableEl;
  fab.id = 'anysub-fab';
  fab.className = 'dock-right';
  fab.textContent = '字';
  fab.title = t('panel.fabTip');
  fab.style.display = 'none'; // 默认隐藏,靠快捷键;可在面板里开启

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.srt,.vtt,.ass,.ssa,.sub,.sbv,text/plain';
  fileInput.style.display = 'none';

  uiRoot.appendChild(overlay);
  uiRoot.appendChild(fab);
  uiRoot.appendChild(fileInput);
  document.body.appendChild(uiRoot);

  refs.uiRoot = uiRoot;
  refs.overlay = overlay;
  refs.fab = fab;
  refs.fileInput = fileInput;

  // 轻量事件(不依赖面板):悬浮球点击/拖拽、文件选择。面板与搜索 DOM 懒建,空闲页面省创建成本。
  fab.addEventListener('click', () => {
    if (fab.__dragged) {
      fab.__dragged = false;
      return;
    }
    togglePanel();
  });
  fileInput.addEventListener('change', () => {
    const f = fileInput.files && fileInput.files[0];
    if (f) loadFile(f);
    fileInput.value = '';
  });
  makeDraggable(fab);
}

// 懒建设置面板 + 搜索面板:首次打开(快捷键/悬浮球/在线搜索)时才创建 DOM 并接线。
let panelBuilt = false;
export function ensurePanel(): void {
  if (panelBuilt) return;
  panelBuilt = true;
  const panel = document.createElement('div');
  panel.id = 'anysub-panel';
  panel.style.display = 'none';
  panel.innerHTML = panelHtml();
  refs.uiRoot!.appendChild(panel);
  refs.panel = panel;
  refs.statusEl = panel.querySelector<HTMLElement>('#anysub-status');
  buildSearchUI();
  wirePanel();
  updateStatus(); // 首建即反映当前加载状态
}

// 运行时切换语言:重建面板+搜索 DOM 并重新接线/同步(无需刷新页面)
export function relocalize(): void {
  if (!panelBuilt) return;
  const panel = refs.panel!;
  panel.innerHTML = panelHtml();
  refs.statusEl = panel.querySelector<HTMLElement>('#anysub-status');
  wirePanel();
  relocalizeSearch();
  updateStatus();
  refs.fab!.title = t('panel.fabTip');
}

// 供快捷键调用:打开在线搜索
export { openSearch };

// ── 供快捷键调用的动作 ──
export function togglePanel(): void {
  ensurePanel();
  const p = refs.panel!;
  const show = p.style.display === 'none' || !p.style.display;
  if (show) openPanel();
  else p.style.display = 'none';
}

// 显式打开主面板(供快捷键 show 分支 + 搜索面板「返回主面板」复用)
export function openPanel(): void {
  ensurePanel();
  const p = refs.panel!;
  if (refs.searchPanel) refs.searchPanel.style.display = 'none'; // 与搜索面板互斥
  p.style.display = 'block';
  const inp = p.querySelector<HTMLInputElement>('#anysub-offset');
  if (inp) inp.value = state.offset.toFixed(1); // 偏移可能在加载时被记忆恢复
  syncVisBtn();
  positionPanel();
  p.classList.remove('as-in');
  void p.offsetWidth;
  p.classList.add('as-in'); // 重放入场动画(小面板,reflow 廉价)
}

export function openFilePicker(): void {
  refs.fileInput!.click();
}

export function adjustOffset(delta: number): void {
  state.offset = Math.round((state.offset + delta) * 10) / 10;
  const inp = refs.panel && refs.panel.querySelector<HTMLInputElement>('#anysub-offset');
  if (inp) inp.value = state.offset.toFixed(1);
  refresh();
  rememberOffset();
  toast(t('toast.offset', { v: state.offset.toFixed(1) }));
}

// 绝对设置偏移(供切集同源续播沿用上一集偏移):更新值 + 同步输入框 + 重渲染 + 记忆
export function setOffset(val: number): void {
  state.offset = Math.round(val * 10) / 10;
  const inp = refs.panel && refs.panel.querySelector<HTMLInputElement>('#anysub-offset');
  if (inp) inp.value = state.offset.toFixed(1);
  refresh();
  rememberOffset();
}

// 按「番剧|源特征」记住当前偏移(持久化);同番剧同源下次自动恢复
function rememberOffset(): void {
  if (!state.offsetKey) return;
  state.offsets[state.offsetKey] = state.offset;
  const keys = Object.keys(state.offsets);
  if (keys.length > 200) delete state.offsets[keys[0]]; // 软上限
  persist();
}

// 接线面板控件(懒建时调用一次)
function wirePanel(): void {
  const panel = refs.panel!;

  panel.querySelector('#anysub-close')!.addEventListener('click', () => {
    panel.style.display = 'none';
  });
  panel.querySelector('#anysub-choose')!.addEventListener('click', openFilePicker);
  panel.querySelector('#anysub-online')!.addEventListener('click', openSearch);
  panel.querySelector('#anysub-pickvid')!.addEventListener('click', startPickVideo);
  panel.querySelector('#anysub-clear')!.addEventListener('click', () => {
    clearSubtitle();
    syncVisBtn();
  });

  panel.querySelector('#anysub-vis')!.addEventListener('click', () => {
    toggleSubtitles();
    syncVisBtn();
  });

  panel
    .querySelectorAll<HTMLElement>('[data-off]')
    .forEach((b) =>
      b.addEventListener('click', () => adjustOffset(parseFloat(b.dataset.off || '0'))),
    );
  panel.querySelector('#anysub-offset')!.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val)) {
      state.offset = val;
      refresh();
      rememberOffset();
    }
  });

  const fontR = panel.querySelector<HTMLInputElement>('#anysub-font')!;
  fontR.addEventListener('input', () => {
    state.style.fontPct = parseInt(fontR.value, 10);
    panel.querySelector('#anysub-fontval')!.textContent = state.style.fontPct + '%';
    invalidateLayout();
    refresh();
    persist();
  });
  const posR = panel.querySelector<HTMLInputElement>('#anysub-pos')!;
  posR.addEventListener('input', () => {
    state.style.bottomPct = parseInt(posR.value, 10);
    panel.querySelector('#anysub-posval')!.textContent = state.style.bottomPct + '%';
    invalidateLayout();
    refresh();
    persist();
  });

  setupSeg('#anysub-bg', 'bg', (val) => {
    state.style.bg = val as SubStyle['bg'];
    applyStyle();
    persist();
  });
  setupSeg('#anysub-color', 'color', (val) => {
    state.style.color = val;
    applyStyle();
    persist();
  });
  setupSeg('#anysub-anchor', 'pos', (val) => {
    state.subPos = val as 'top' | 'bottom';
    refresh();
    persist();
  });

  const rubyBtn = panel.querySelector('#anysub-tg-ruby')!;
  rubyBtn.addEventListener('click', () => {
    state.rubyParen = !state.rubyParen;
    syncToggles();
    refresh();
    persist();
  });
  const enhBtn = panel.querySelector('#anysub-tg-enh')!;
  enhBtn.addEventListener('click', () => {
    state.enhance = !state.enhance;
    syncToggles();
    refresh();
    persist();
  });
  const fabBtn = panel.querySelector('#anysub-tg-fab')!;
  fabBtn.addEventListener('click', () => {
    state.showFab = !state.showFab;
    syncToggles();
    updateFabVisibility();
    updateWatcher();
    persist();
  });

  panel.querySelector('#anysub-lang')!.addEventListener('change', (e) => {
    setLang((e.target as HTMLSelectElement).value);
    persist();
    relocalize();
  });

  setupDrop(panel.querySelector<HTMLElement>('#anysub-drop')!); // 仅面板区域接收拖放,避免劫持页面拖放
  syncControls();
}

// 仅当页面存在 <video> 且用户开启了悬浮球时才显示;先便宜地查 light-DOM,再深扫 Shadow DOM
export function updateFabVisibility(): void {
  const fab = refs.fab;
  if (!fab) return;
  // 悬浮球关闭时无需检测视频(球始终隐藏),直接返回,零开销
  if (!state.showFab) {
    fab.style.display = 'none';
    return;
  }
  const hasVideo = !!document.querySelector('video') || collectVideos().length > 0;
  fab.style.display = hasVideo ? '' : 'none';
}

function syncVisBtn(): void {
  const b = refs.panel!.querySelector('#anysub-vis');
  if (!b) return;
  b.classList.toggle('off', state.hidden); // 图标切 eye/eye-off,不改结构
  (b as HTMLElement).title = state.hidden ? t('panel.show') : t('panel.hide');
}

function syncToggles(): void {
  const panel = refs.panel!;
  const rb = panel.querySelector('#anysub-tg-ruby')!;
  const en = panel.querySelector('#anysub-tg-enh')!;
  const fb = panel.querySelector('#anysub-tg-fab')!;
  rb.classList.toggle('on', state.rubyParen);
  rb.setAttribute('aria-checked', String(state.rubyParen));
  en.classList.toggle('on', state.enhance);
  en.setAttribute('aria-checked', String(state.enhance));
  fb.classList.toggle('on', state.showFab);
  fb.setAttribute('aria-checked', String(state.showFab));
}

// 用(可能已从持久化恢复的)state 同步各控件初始显示
function syncControls(): void {
  const panel = refs.panel!;
  const s = state.style;
  panel.querySelector<HTMLInputElement>('#anysub-font')!.value = String(s.fontPct);
  panel.querySelector('#anysub-fontval')!.textContent = s.fontPct + '%';
  panel.querySelector<HTMLInputElement>('#anysub-pos')!.value = String(s.bottomPct);
  panel.querySelector('#anysub-posval')!.textContent = s.bottomPct + '%';
  setSegActive('#anysub-bg', 'bg', s.bg);
  setSegActive('#anysub-color', 'color', s.color);
  setSegActive('#anysub-anchor', 'pos', state.subPos);
  syncToggles();
  syncVisBtn();
}

function setSegActive(sel: string, attr: string, val: string): void {
  refs
    .panel!.querySelectorAll<HTMLElement>(`${sel} button`)
    .forEach((b) => b.classList.toggle('on', b.dataset[attr] === val));
}

function setupSeg(sel: string, attr: string, cb: (val: string) => void): void {
  const group = refs.panel!.querySelector(sel)!;
  group.querySelectorAll<HTMLElement>('button').forEach((b) =>
    b.addEventListener('click', () => {
      group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      cb(b.dataset[attr] || '');
    }),
  );
}

function setupDrop(el: HTMLElement): void {
  const on = () => el.classList.add('as-dragover');
  const off = () => el.classList.remove('as-dragover');
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    on();
  });
  el.addEventListener('dragleave', off);
  el.addEventListener('drop', (e) => {
    off();
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    const f = e.dataTransfer.files[0];
    if (/\.(srt|vtt|ass|ssa|sub|sbv|txt)$/i.test(f.name)) {
      e.preventDefault();
      loadFile(f);
    }
  });
}

// 胶囊拖动 + 松手吸附到最近的左右边缘
function makeDraggable(el: DraggableEl): void {
  let sx: number, sy: number, ox: number, oy: number, moved: boolean;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    sx = e.clientX;
    sy = e.clientY;
    ox = r.left;
    oy = r.top;
    moved = false;
    el.classList.add('dragging');
    el.classList.remove('dock-left', 'dock-right');
    el.style.left = r.left + 'px';
    el.style.top = r.top + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - sx,
        dy = ev.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      el.style.left = Math.min(window.innerWidth - r.width, Math.max(0, ox + dx)) + 'px';
      el.style.top = Math.min(window.innerHeight - r.height, Math.max(0, oy + dy)) + 'px';
    };
    const up = () => {
      el.__dragged = moved;
      el.classList.remove('dragging');
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      snapFab(el);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  });
}

function snapFab(el: HTMLElement): void {
  const r = el.getBoundingClientRect();
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const onRight = r.left + r.width / 2 >= W / 2;
  el.style.left = '';
  el.style.right = '';
  el.style.bottom = 'auto';
  el.style.top = Math.min(window.innerHeight - r.height - 4, Math.max(4, r.top)) + 'px';
  el.classList.add(onRight ? 'dock-right' : 'dock-left');
}

// 面板定位:有悬浮球贴其一侧;否则屏幕居中
function positionPanel(): void {
  const fab = refs.fab!,
    panel = refs.panel!;
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const H = window.innerHeight || document.documentElement.clientHeight || 800;
  // bottom 显式 auto:否则回落到 CSS 的 bottom:54px,与下面设的 top 同时生效会把面板纵向拉伸
  panel.style.left = '';
  panel.style.right = '';
  panel.style.top = '';
  panel.style.bottom = 'auto';
  const ph = panel.offsetHeight || 500,
    pw = panel.offsetWidth || 300;
  if (state.showFab) {
    const fr = fab.getBoundingClientRect();
    const onRight = fr.left + fr.width / 2 >= W / 2;
    if (onRight) panel.style.right = '12px';
    else panel.style.left = '12px';
    panel.style.top = Math.max(10, Math.min(H - ph - 10, fr.top - ph / 2)) + 'px';
  } else {
    panel.style.left = Math.max(10, (W - pw) / 2) + 'px';
    panel.style.top = Math.max(10, (H - ph) / 2) + 'px';
  }
}

// 手动选视频
let picking = false;
function startPickVideo(): void {
  if (picking) return;
  const vids = collectVideos().filter(isVisible);
  if (!vids.length) {
    toast(t('toast.noVideo'));
    return;
  }
  picking = true;
  toast(t('toast.clickVideo'));
  const overlays = vids.map((v) => {
    const r = v.getBoundingClientRect();
    const o = document.createElement('div');
    o.className = 'anysub-vidpick';
    o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    o.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      setVideo(v);
      cleanup();
      toast(t('toast.videoSelected'));
    });
    refs.uiRoot!.appendChild(o);
    return o;
  });
  // cleanup 里统一移除 keydown 监听:点击选中视频也会 cleanup,避免遗留悬空的 document 监听
  function cleanup(): void {
    overlays.forEach((o) => o.remove());
    picking = false;
    document.removeEventListener('keydown', esc);
  }
  const esc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup();
  };
  document.addEventListener('keydown', esc);
}
