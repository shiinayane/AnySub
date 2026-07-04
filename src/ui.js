// 悬浮 UI:设置面板(快捷键唤出)+ 可选悬浮球 + 拖拽吸附 + 手动选视频
import { state } from './state.js';
import { refs } from './refs.js';
import { refresh, applyStyle, clearSubtitle, setVideo, toggleSubtitles } from './controller.js';
import { invalidateLayout } from './overlay.js';
import { loadFile } from './loader.js';
import { collectVideos, isVisible } from './locator.js';
import { toast } from './notify.js';
import { saveSettings } from './storage.js';
import { updateWatcher } from './watcher.js';

// 持久化偏好(偏移与临时隐藏不入库)
function persist() {
  const s = state.style;
  saveSettings({
    fontPct: s.fontPct, bottomPct: s.bottomPct, bg: s.bg, color: s.color,
    shortcutsEnabled: state.shortcutsEnabled, showFab: state.showFab,
  });
}

const PANEL_HTML = `
  <div class="anysub-row anysub-head"><span>AnySub 字幕</span><span id="anysub-close">✕</span></div>
  <div class="anysub-row">
    <button id="anysub-choose">选择字幕文件</button>
    <button id="anysub-pickvid" title="页面多个视频时,点此再点视频画面指定">选视频</button>
  </div>
  <div class="anysub-row">
    <button id="anysub-vis">隐藏字幕</button>
    <button id="anysub-clear">清除</button>
  </div>
  <div class="anysub-row anysub-drop" id="anysub-drop">或将字幕文件拖到这里</div>
  <div class="anysub-row">
    <label>偏移</label>
    <button data-off="-1">−1</button><button data-off="-0.1">−0.1</button>
    <input type="number" id="anysub-offset" value="0.0" step="0.1" title="可手动输入,单位秒">
    <span class="anysub-unit">s</span>
    <button data-off="0.1">+0.1</button><button data-off="1">+1</button>
  </div>
  <div class="anysub-row">
    <label>字号</label>
    <input type="range" id="anysub-font" min="50" max="250" value="100" step="5">
    <span id="anysub-fontval">100%</span>
  </div>
  <div class="anysub-row">
    <label>位置</label>
    <input type="range" id="anysub-pos" min="2" max="40" value="8" step="1">
    <span id="anysub-posval">8%</span>
  </div>
  <div class="anysub-row">
    <label>背景</label>
    <div class="anysub-seg" id="anysub-bg">
      <button data-bg="outline">描边</button>
      <button data-bg="translucent" class="on">半透</button>
      <button data-bg="solid">黑底</button>
      <button data-bg="none">无</button>
    </div>
  </div>
  <div class="anysub-row">
    <label>颜色</label>
    <div class="anysub-seg" id="anysub-color">
      <button data-color="#ffffff" class="on" style="color:#fff">白</button>
      <button data-color="#ffe100" style="color:#ffe100">黄</button>
      <button data-color="#00e5ff" style="color:#00e5ff">青</button>
      <button data-color="#7CFC00" style="color:#7CFC00">绿</button>
    </div>
  </div>
  <div class="anysub-row anysub-toggles">
    <button id="anysub-tg-sc" class="anysub-toggle">快捷键:开</button>
    <button id="anysub-tg-fab" class="anysub-toggle">悬浮球:关</button>
  </div>
  <div class="anysub-legend">
    <div>Alt+Shift+S 面板 · V 显隐 · O 打开</div>
    <div>Alt+Shift+← / → 偏移 ∓0.1s</div>
  </div>
  <div class="anysub-row anysub-status" id="anysub-status">未加载字幕</div>
`;

export function buildUI() {
  const uiRoot = document.createElement('div');
  uiRoot.id = 'anysub-root';

  const overlay = document.createElement('div');
  overlay.id = 'anysub-overlay';
  // 关键定位属性内联,即使站点 CSP 剥离了注入的 <style>,覆盖层也不会遮挡/拦截页面
  overlay.style.cssText = 'display:none;position:fixed;z-index:2147483640;pointer-events:none;overflow:hidden;';

  const fab = document.createElement('div');
  fab.id = 'anysub-fab';
  fab.className = 'dock-right';
  fab.textContent = '字';
  fab.title = 'AnySub · 点击打开字幕面板(可拖动)';
  fab.style.display = 'none'; // 默认隐藏,靠快捷键;可在面板里开启

  const panel = document.createElement('div');
  panel.id = 'anysub-panel';
  panel.style.display = 'none';
  panel.innerHTML = PANEL_HTML;

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.srt,.vtt,.ass,.ssa,.sub,.sbv,text/plain';
  fileInput.style.display = 'none';

  uiRoot.appendChild(overlay);
  uiRoot.appendChild(fab);
  uiRoot.appendChild(panel);
  uiRoot.appendChild(fileInput);
  document.body.appendChild(uiRoot);

  refs.uiRoot = uiRoot;
  refs.overlay = overlay;
  refs.fab = fab;
  refs.panel = panel;
  refs.fileInput = fileInput;
  refs.statusEl = panel.querySelector('#anysub-status');

  wireEvents();
}

// ── 供快捷键调用的动作 ──
export function togglePanel() {
  const p = refs.panel;
  const show = p.style.display === 'none' || !p.style.display;
  p.style.display = show ? 'block' : 'none';
  if (show) { syncVisBtn(); positionPanel(); }
}

export function openFilePicker() { refs.fileInput.click(); }

export function adjustOffset(delta) {
  state.offset = Math.round((state.offset + delta) * 10) / 10;
  const inp = refs.panel && refs.panel.querySelector('#anysub-offset');
  if (inp) inp.value = state.offset.toFixed(1);
  refresh();
  toast('偏移 ' + state.offset.toFixed(1) + 's');
}

function wireEvents() {
  const { fab, panel, fileInput } = refs;

  fab.addEventListener('click', () => {
    if (fab.__dragged) { fab.__dragged = false; return; }
    togglePanel();
  });
  panel.querySelector('#anysub-close').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.querySelector('#anysub-choose').addEventListener('click', openFilePicker);
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); fileInput.value = ''; });
  panel.querySelector('#anysub-pickvid').addEventListener('click', startPickVideo);
  panel.querySelector('#anysub-clear').addEventListener('click', () => { clearSubtitle(); syncVisBtn(); });

  panel.querySelector('#anysub-vis').addEventListener('click', () => { toggleSubtitles(); syncVisBtn(); });

  panel.querySelectorAll('[data-off]').forEach((b) =>
    b.addEventListener('click', () => adjustOffset(parseFloat(b.dataset.off))));
  panel.querySelector('#anysub-offset').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) { state.offset = val; refresh(); }
  });

  const fontR = panel.querySelector('#anysub-font');
  fontR.addEventListener('input', () => {
    state.style.fontPct = parseInt(fontR.value, 10);
    panel.querySelector('#anysub-fontval').textContent = state.style.fontPct + '%';
    invalidateLayout(); refresh(); persist();
  });
  const posR = panel.querySelector('#anysub-pos');
  posR.addEventListener('input', () => {
    state.style.bottomPct = parseInt(posR.value, 10);
    panel.querySelector('#anysub-posval').textContent = state.style.bottomPct + '%';
    invalidateLayout(); refresh(); persist();
  });

  setupSeg('#anysub-bg', 'bg', (val) => { state.style.bg = val; applyStyle(); persist(); });
  setupSeg('#anysub-color', 'color', (val) => { state.style.color = val; applyStyle(); persist(); });

  const scBtn = panel.querySelector('#anysub-tg-sc');
  scBtn.addEventListener('click', () => {
    state.shortcutsEnabled = !state.shortcutsEnabled;
    syncToggles(); persist();
  });
  const fabBtn = panel.querySelector('#anysub-tg-fab');
  fabBtn.addEventListener('click', () => {
    state.showFab = !state.showFab;
    syncToggles(); updateFabVisibility(); updateWatcher(); persist();
  });

  setupDrop(panel.querySelector('#anysub-drop')); // 仅面板区域接收拖放,避免劫持页面拖放
  makeDraggable(fab);
  syncControls();
}

// 仅当页面存在 <video> 且用户开启了悬浮球时才显示;先便宜地查 light-DOM,再深扫 Shadow DOM
export function updateFabVisibility() {
  // 悬浮球关闭时无需检测视频(球始终隐藏),直接返回,零开销
  if (!state.showFab) { refs.fab.style.display = 'none'; return; }
  const hasVideo = !!document.querySelector('video') || collectVideos().length > 0;
  refs.fab.style.display = hasVideo ? '' : 'none';
}

function syncVisBtn() {
  const b = refs.panel.querySelector('#anysub-vis');
  if (b) b.textContent = state.hidden ? '显示字幕' : '隐藏字幕';
}

function syncToggles() {
  const sc = refs.panel.querySelector('#anysub-tg-sc');
  const fb = refs.panel.querySelector('#anysub-tg-fab');
  sc.textContent = '快捷键:' + (state.shortcutsEnabled ? '开' : '关');
  sc.classList.toggle('on', state.shortcutsEnabled);
  fb.textContent = '悬浮球:' + (state.showFab ? '开' : '关');
  fb.classList.toggle('on', state.showFab);
}

// 用(可能已从持久化恢复的)state 同步各控件初始显示
function syncControls() {
  const { panel } = refs;
  const s = state.style;
  panel.querySelector('#anysub-font').value = s.fontPct;
  panel.querySelector('#anysub-fontval').textContent = s.fontPct + '%';
  panel.querySelector('#anysub-pos').value = s.bottomPct;
  panel.querySelector('#anysub-posval').textContent = s.bottomPct + '%';
  setSegActive('#anysub-bg', 'bg', s.bg);
  setSegActive('#anysub-color', 'color', s.color);
  syncToggles();
  syncVisBtn();
}

function setSegActive(sel, attr, val) {
  refs.panel.querySelectorAll(`${sel} button`).forEach((b) =>
    b.classList.toggle('on', b.dataset[attr] === val));
}

function setupSeg(sel, attr, cb) {
  const group = refs.panel.querySelector(sel);
  group.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    group.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    cb(b.dataset[attr]);
  }));
}

function setupDrop(el) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); });
  el.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    const f = e.dataTransfer.files[0];
    if (/\.(srt|vtt|ass|ssa|sub|sbv|txt)$/i.test(f.name)) { e.preventDefault(); loadFile(f); }
  });
}

// 胶囊拖动 + 松手吸附到最近的左右边缘
function makeDraggable(el) {
  let sx, sy, ox, oy, moved;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; moved = false;
    el.classList.add('dragging');
    el.classList.remove('dock-left', 'dock-right');
    el.style.left = r.left + 'px'; el.style.top = r.top + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
    el.setPointerCapture(e.pointerId);
    const move = (ev) => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
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

function snapFab(el) {
  const r = el.getBoundingClientRect();
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const onRight = r.left + r.width / 2 >= W / 2;
  el.style.left = ''; el.style.right = ''; el.style.bottom = 'auto';
  el.style.top = Math.min(window.innerHeight - r.height - 4, Math.max(4, r.top)) + 'px';
  el.classList.add(onRight ? 'dock-right' : 'dock-left');
}

// 面板定位:有悬浮球贴其一侧;否则屏幕居中
function positionPanel() {
  const { fab, panel } = refs;
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const H = window.innerHeight || document.documentElement.clientHeight || 800;
  panel.style.left = ''; panel.style.right = ''; panel.style.top = ''; panel.style.bottom = '';
  const ph = panel.offsetHeight || 460, pw = panel.offsetWidth || 270;
  if (state.showFab) {
    const fr = fab.getBoundingClientRect();
    const onRight = fr.left + fr.width / 2 >= W / 2;
    if (onRight) panel.style.right = '12px'; else panel.style.left = '12px';
    panel.style.top = Math.max(10, Math.min(H - ph - 10, fr.top - ph / 2)) + 'px';
  } else {
    panel.style.left = Math.max(10, (W - pw) / 2) + 'px';
    panel.style.top = Math.max(10, (H - ph) / 2) + 'px';
  }
}

// 手动选视频
let picking = false;
function startPickVideo() {
  if (picking) return;
  const vids = collectVideos().filter(isVisible);
  if (!vids.length) { toast('未找到视频'); return; }
  picking = true;
  toast('点击要挂载字幕的视频画面');
  const overlays = vids.map((v) => {
    const r = v.getBoundingClientRect();
    const o = document.createElement('div');
    o.className = 'anysub-vidpick';
    o.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
    o.addEventListener('click', (e) => {
      e.stopPropagation(); e.preventDefault();
      setVideo(v); cleanup(); toast('已选定视频');
    });
    refs.uiRoot.appendChild(o);
    return o;
  });
  function cleanup() { overlays.forEach((o) => o.remove()); picking = false; }
  const esc = (e) => { if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); } };
  document.addEventListener('keydown', esc);
}
