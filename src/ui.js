// 悬浮 UI:非侵入胶囊 + 面板 + 拖拽吸附 + 手动选视频
import { state } from './state.js';
import { refs } from './refs.js';
import { renderTick, applyStyle, clearSubtitle, setVideo, invalidateLayout } from './render.js';
import { loadFile } from './loader.js';
import { collectVideos, isVisible } from './locator.js';
import { toast } from './notify.js';

const PANEL_HTML = `
  <div class="anysub-row anysub-head"><span>AnySub 字幕</span><span id="anysub-close">✕</span></div>
  <div class="anysub-row">
    <button id="anysub-choose">选择字幕文件</button>
    <button id="anysub-pickvid" title="页面多个视频时,点此再点视频画面指定">选视频</button>
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
  <div class="anysub-row anysub-status" id="anysub-status">未加载字幕</div>
`;

export function buildUI() {
  const uiRoot = document.createElement('div');
  uiRoot.id = 'anysub-root';

  const overlay = document.createElement('div');
  overlay.id = 'anysub-overlay';
  overlay.style.display = 'none';
  const cueBox = document.createElement('div');
  cueBox.id = 'anysub-cuebox';
  overlay.appendChild(cueBox);

  const fab = document.createElement('div');
  fab.id = 'anysub-fab';
  fab.className = 'dock-right';
  fab.textContent = '字';
  fab.title = 'AnySub · 点击打开字幕面板(可拖动,松手吸附到最近边缘)';

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

  // 填充共享引用
  refs.uiRoot = uiRoot;
  refs.overlay = overlay;
  refs.cueBox = cueBox;
  refs.fab = fab;
  refs.panel = panel;
  refs.fileInput = fileInput;
  refs.statusEl = panel.querySelector('#anysub-status');

  wireEvents();
  applyStyle();
}

function wireEvents() {
  const { fab, panel, fileInput } = refs;

  fab.addEventListener('click', () => {
    if (fab.__dragged) { fab.__dragged = false; return; }
    const show = panel.style.display === 'none';
    panel.style.display = show ? 'block' : 'none';
    if (show) positionPanel();
  });
  panel.querySelector('#anysub-close').addEventListener('click', () => { panel.style.display = 'none'; });
  panel.querySelector('#anysub-choose').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) loadFile(fileInput.files[0]); fileInput.value = ''; });
  panel.querySelector('#anysub-pickvid').addEventListener('click', startPickVideo);
  panel.querySelector('#anysub-clear').addEventListener('click', clearSubtitle);

  const offInput = panel.querySelector('#anysub-offset');
  panel.querySelectorAll('[data-off]').forEach((b) => b.addEventListener('click', () => {
    state.offset = Math.round((state.offset + parseFloat(b.dataset.off)) * 10) / 10;
    offInput.value = state.offset.toFixed(1);
    renderTick();
  }));
  offInput.addEventListener('input', () => {
    const val = parseFloat(offInput.value);
    if (!isNaN(val)) { state.offset = val; renderTick(); }
  });

  const fontR = panel.querySelector('#anysub-font');
  fontR.addEventListener('input', () => {
    state.style.fontPct = parseInt(fontR.value, 10);
    panel.querySelector('#anysub-fontval').textContent = state.style.fontPct + '%';
    invalidateLayout(); renderTick();
  });
  const posR = panel.querySelector('#anysub-pos');
  posR.addEventListener('input', () => {
    state.style.bottomPct = parseInt(posR.value, 10);
    panel.querySelector('#anysub-posval').textContent = state.style.bottomPct + '%';
    invalidateLayout(); renderTick();
  });

  setupSeg('#anysub-bg', 'bg', (val) => { state.style.bg = val; applyStyle(); });
  setupSeg('#anysub-color', 'color', (val) => { state.style.color = val; applyStyle(); });

  setupDrop(panel.querySelector('#anysub-drop'));
  setupDrop(document.body);
  makeDraggable(fab);
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

// 吸附:根据释放位置贴到最近的左/右边缘,保留竖直位置
function snapFab(el) {
  const r = el.getBoundingClientRect();
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const onRight = r.left + r.width / 2 >= W / 2;
  el.style.left = ''; el.style.right = ''; el.style.bottom = 'auto';
  el.style.top = Math.min(window.innerHeight - r.height - 4, Math.max(4, r.top)) + 'px';
  el.classList.add(onRight ? 'dock-right' : 'dock-left');
}

// 面板贴着胶囊所在的一侧弹出
function positionPanel() {
  const { fab, panel } = refs;
  const fr = fab.getBoundingClientRect();
  const W = window.innerWidth || document.documentElement.clientWidth || 1;
  const onRight = fr.left + fr.width / 2 >= W / 2;
  panel.style.left = ''; panel.style.right = ''; panel.style.top = ''; panel.style.bottom = '';
  if (onRight) panel.style.right = '12px'; else panel.style.left = '12px';
  const H = window.innerHeight || document.documentElement.clientHeight || 800;
  const ph = panel.offsetHeight || 380;
  panel.style.top = Math.max(10, Math.min(H - ph - 10, fr.top - ph / 2)) + 'px';
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
