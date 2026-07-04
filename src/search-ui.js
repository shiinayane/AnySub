// 在线字幕搜索面板(独立居中模态,与主面板同一视觉语言):
// 输入 API key + 番剧名 + 集数 → 番剧候选(带海报)→ 文件候选 → 下载载入。
// 半自动:每一步都把候选摆出来让用户选,不静默加载。
// 与主面板互斥(打开时收起主面板),并提供「返回主面板」按钮保持心智连贯。
import { state } from './state.js';
import { refs } from './refs.js';
import { toast } from './notify.js';
import { saveState } from './storage.js';
import { animeCandidates, subtitleFiles, downloadAndLoad, markLoaded } from './online.js';
import { parseVideoTitle } from './title-parse.js';
import { openPanel } from './ui.js';

let panel, titleInput, epInput, results;
let currentAnime = null;    // 当前展开文件列表的番剧(供记录来源)
let lastPrefillTitle = null; // 上次预填所依据的页面标题(用于检测切集后刷新预填)
let keyEditing = false;      // key 已保存时默认折叠为一行;点「更换」展开输入

const S = (p) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  back: S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>'),
  check: S('<path d="M20 6 9 17l-5-5"/>'),
  photo: S('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  chev: S('<path d="m9 6 6 6-6 6"/>'),
};

const HTML = `
  <div class="as-sc-head">
    <button id="anysub-sc-back" class="as-sc-back" title="返回主面板">${IC.back}<span>主面板</span></button>
    <button id="anysub-sc-close" class="as-x" title="关闭">✕</button>
  </div>
  <div class="as-sc-title"><span class="as-logo">字</span><span>在线字幕</span><span class="as-sc-tag">Jimaku</span></div>
  <div id="anysub-key-area"></div>
  <div class="as-sc-search">
    <input id="anysub-title" placeholder="番剧名(日文最准)">
    <input id="anysub-ep" class="as-sc-ep" placeholder="集" title="集数">
    <button id="anysub-do-search">${IC.search}<span>搜索</span></button>
  </div>
  <div id="anysub-results" class="as-sc-results"><div class="as-sc-empty">输入番剧名后点搜索</div></div>
`;

export function buildSearchUI() {
  panel = document.createElement('div');
  panel.id = 'anysub-search';
  panel.style.display = 'none';
  panel.innerHTML = HTML;
  refs.uiRoot.appendChild(panel);
  refs.searchPanel = panel; // 供主面板互斥用

  titleInput = panel.querySelector('#anysub-title');
  epInput = panel.querySelector('#anysub-ep');
  results = panel.querySelector('#anysub-results');

  panel.querySelector('#anysub-sc-back').addEventListener('click', backToPanel);
  panel.querySelector('#anysub-sc-close').addEventListener('click', close);
  panel.querySelector('#anysub-do-search').addEventListener('click', doSearch);
  titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  epInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  renderKeyArea();
}

// key 区两态:未存 → 输入框 + 保存;已存 → 一行「已连接 · 更换」,点更换再展开
function renderKeyArea() {
  const area = panel.querySelector('#anysub-key-area');
  if (state.jimakuKey && !keyEditing) {
    area.innerHTML = `<div class="as-sc-keyok">${IC.check}<span>已连接 Jimaku</span><span class="as-sc-change" id="anysub-key-change">更换 key</span></div>`;
    area.querySelector('#anysub-key-change').addEventListener('click', () => { keyEditing = true; renderKeyArea(); });
  } else {
    area.innerHTML = `<div class="as-sc-keyrow"><input id="anysub-key" type="password" placeholder="Jimaku API key" autocomplete="off"><button id="anysub-key-save">保存</button></div>
      <div class="as-sc-hint">key 在 jimaku.cc 登录后账号页生成,仅存于本机</div>`;
    const ki = area.querySelector('#anysub-key');
    ki.value = state.jimakuKey || '';
    area.querySelector('#anysub-key-save').addEventListener('click', () => saveKey(ki.value));
    ki.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(ki.value); });
  }
}

export function openSearch() {
  if (refs.panel) refs.panel.style.display = 'none'; // 与主面板互斥
  show();
  renderKeyArea();
  // 从页面标题预填「番剧名 + 集数」。首次为空时填;此后仅当页面标题变化(=切集/换番)才刷新
  // 预填并清空旧结果,同一集内保留用户的手动修改。
  const curTitle = document.title;
  const first = !titleInput.value && !epInput.value;
  if (first || curTitle !== lastPrefillTitle) {
    const { series, episode } = parseVideoTitle(curTitle);
    titleInput.value = series;
    epInput.value = episode || '';
    lastPrefillTitle = curTitle;
    setResults('<div class="as-sc-empty">输入番剧名后点搜索</div>');
  }
  (state.jimakuKey ? titleInput : (panel.querySelector('#anysub-key') || titleInput)).focus();
}

function show() {
  panel.style.display = 'block';
  panel.classList.remove('as-in'); void panel.offsetWidth; panel.classList.add('as-in'); // 重放入场动画
}

function close() { panel.style.display = 'none'; }

// 返回主面板:收起搜索,显式打开主面板(与「关闭」区分——关闭是彻底 dismiss)
function backToPanel() { panel.style.display = 'none'; openPanel(); }

function saveKey(val) {
  state.jimakuKey = (val || '').trim();
  saveState();
  keyEditing = false;
  renderKeyArea();
  toast(state.jimakuKey ? 'API key 已保存' : 'API key 已清空');
  if (state.jimakuKey) titleInput.focus();
}

async function doSearch() {
  const title = titleInput.value.trim();
  if (!state.jimakuKey) { toast('请先填写并保存 Jimaku API key'); keyEditing = true; renderKeyArea(); return; }
  if (!title) { toast('请输入番剧名'); return; }
  setResults('<div class="as-sc-empty">搜索中…</div>');
  try {
    const list = await animeCandidates(title);
    if (!list.length) { setResults('<div class="as-sc-empty">未找到番剧,换个写法试试</div>'); return; }
    renderAnime(list);
  } catch (err) {
    setResults(`<div class="as-sc-empty">出错:${esc(err.message)}</div>`);
  }
}

// 海报:优先 AniList 封面,加载失败(CSP/网络)则移除 img 回落到占位图标
function poster(url) {
  return `<span class="as-sc-poster">${IC.photo}${url ? `<img src="${escAttr(url)}" alt="">` : ''}</span>`;
}
function metaOf(a) {
  const bits = [];
  if (a.format) bits.push(esc(a.format));
  if (a.year) bits.push(String(a.year));
  if (a.episodes) bits.push(a.episodes + ' 话');
  return bits.join(' · ');
}

function renderAnime(list) {
  results.innerHTML = '';
  results.appendChild(sec('选择番剧'));
  for (const a of list) {
    const row = document.createElement('div');
    row.className = 'as-sc-anime';
    if (a.romaji) row.title = a.romaji;
    row.innerHTML = `${poster(a.cover)}
      <div class="as-sc-anime-main">
        <div class="as-sc-anime-t">${esc(a.title)}</div>
        <div class="as-sc-anime-s">${metaOf(a)}</div>
      </div>
      <span class="as-sc-chev">${IC.chev}</span>`;
    wirePoster(row);
    row.addEventListener('click', () => loadFilesFor(a));
    results.appendChild(row);
  }
}

async function loadFilesFor(anime) {
  setResults('<div class="as-sc-empty">获取字幕文件中…</div>');
  try {
    const files = await subtitleFiles(anime.anilistId, epInput.value.trim());
    if (!files.length) {
      results.innerHTML = '';
      results.appendChild(backLink('← 返回番剧列表', doSearch));
      results.appendChild(empty(`${esc(anime.title)} 暂无字幕${epInput.value ? '(第 ' + esc(epInput.value) + ' 集)' : ''}`));
      return;
    }
    renderFiles(anime, files);
  } catch (err) {
    results.innerHTML = '';
    results.appendChild(backLink('← 返回番剧列表', doSearch));
    results.appendChild(empty('出错:' + esc(err.message)));
  }
}

// 直接展示某番剧的文件候选(切集找不到同源时回退用)
export function showCandidates(seriesTitle, files) {
  if (refs.panel) refs.panel.style.display = 'none';
  show();
  renderKeyArea();
  if (seriesTitle) titleInput.value = seriesTitle;
  lastPrefillTitle = document.title; // 视为已按当前页预填,避免重开时被覆盖
  const anilistId = state.lastOnline && state.lastOnline.anilistId;
  renderFiles({ title: seriesTitle, anilistId }, files);
}

function renderFiles(anime, files) {
  currentAnime = anime;
  results.innerHTML = '';
  results.appendChild(backLink('← 返回番剧列表', doSearch));
  results.appendChild(sec(`${esc(anime.title)} · 选择字幕(${files.length})`));
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'as-sc-file';
    row.innerHTML = `<div class="as-sc-file-t">${esc(f.name)}</div>
      <div class="as-sc-file-s">${fmtSize(f.size)}${f.entryName ? ' · ' + esc(f.entryName) : ''}</div>`;
    row.addEventListener('click', () => pickFile(f, row));
    results.appendChild(row);
  }
}

async function pickFile(f, row) {
  row.classList.add('loading');
  try {
    const ok = await downloadAndLoad(f.url, f.name);
    if (ok) {
      markLoaded(currentAnime && currentAnime.anilistId, f.name); // 记录来源,供切集自动接续
      toast('已挂载:' + f.name);
      close();
    }
  } catch (err) {
    toast('下载失败:' + err.message);
  } finally {
    row.classList.remove('loading');
  }
}

// ── DOM 小工具 ──
function sec(text) { const d = document.createElement('div'); d.className = 'as-sc-sec'; d.textContent = text; return d; }
function empty(html) { const d = document.createElement('div'); d.className = 'as-sc-empty'; d.innerHTML = html; return d; }
function backLink(text, fn) {
  const d = document.createElement('div');
  d.className = 'as-sc-back2';
  d.innerHTML = `${IC.back}<span></span>`;
  d.querySelector('span').textContent = text.replace(/^←\s*/, '');
  d.addEventListener('click', fn);
  return d;
}
function wirePoster(row) {
  const img = row.querySelector('.as-sc-poster img');
  if (img) img.addEventListener('error', () => img.remove()); // 失败回落占位图标(位于 img 之下)
}
function setResults(html) { results.innerHTML = html; }

function fmtSize(n) {
  if (!n) return '';
  return n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escAttr(s) {
  return esc(s).replace(/"/g, '&quot;');
}
