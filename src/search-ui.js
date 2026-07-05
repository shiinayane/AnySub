// 在线字幕搜索面板(独立居中模态,与主面板同一视觉语言):
// 输入 API key + 番剧名 + 集数 → 番剧候选(带海报)→ 文件候选 → 下载载入。
// 半自动:每一步都把候选摆出来让用户选,不静默加载。
// 与主面板互斥(打开时收起主面板),并提供「返回主面板」按钮保持心智连贯。
import { state } from './state.js';
import { refs } from './refs.js';
import { toast } from './notify.js';
import { saveState } from './storage.js';
import { animeCandidates, subtitleFiles, downloadAndLoad, markLoaded } from './online.js';
import { detectShow } from './site-adapters.js';
import { openPanel, ensurePanel } from './ui.js';
import { t } from './i18n.js';

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

function html() {
  return `
  <div class="as-sc-head">
    <button id="anysub-sc-back" class="as-sc-back" title="${t('sc.backTitle')}">${IC.back}<span>${t('sc.back')}</span></button>
    <button id="anysub-sc-close" class="as-x" title="${t('sc.close')}">✕</button>
  </div>
  <div class="as-sc-title"><span class="as-logo">字</span><span>${t('sc.title')}</span><span class="as-sc-tag">Jimaku</span></div>
  <div id="anysub-key-area"></div>
  <div class="as-sc-search">
    <input id="anysub-title" placeholder="${t('sc.titlePlaceholder')}">
    <input id="anysub-ep" class="as-sc-ep" placeholder="${t('sc.epPlaceholder')}" title="${t('sc.epTitle')}">
    <button id="anysub-do-search">${IC.search}<span>${t('sc.search')}</span></button>
  </div>
  <div id="anysub-results" class="as-sc-results"><div class="as-sc-empty">${t('sc.prompt')}</div></div>
`;
}

export function buildSearchUI() {
  panel = document.createElement('div');
  panel.id = 'anysub-search';
  panel.style.display = 'none';
  refs.uiRoot.appendChild(panel);
  refs.searchPanel = panel; // 供主面板互斥用
  wireSearch();
}

// 建立/重建搜索面板内部 DOM 与事件(语言切换时复用)
function wireSearch() {
  panel.innerHTML = html();
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

// 语言切换:重建搜索面板 DOM(丢弃未提交的搜索结果,回到初始态——切语言本就少见)
export function relocalizeSearch() {
  if (!panel) return;
  wireSearch();
  lastPrefillTitle = null; // 下次打开按当前页重新预填
}

// key 区两态:未存 → 输入框 + 保存;已存 → 一行「已连接 · 更换」,点更换再展开
function renderKeyArea() {
  const area = panel.querySelector('#anysub-key-area');
  if (state.jimakuKey && !keyEditing) {
    area.innerHTML = `<div class="as-sc-keyok">${IC.check}<span>${t('sc.keyOk')}</span><span class="as-sc-change" id="anysub-key-change">${t('sc.changeKey')}</span></div>`;
    area.querySelector('#anysub-key-change').addEventListener('click', () => { keyEditing = true; renderKeyArea(); });
  } else {
    area.innerHTML = `<div class="as-sc-keyrow"><input id="anysub-key" type="password" placeholder="${t('sc.keyPlaceholder')}" autocomplete="off"><button id="anysub-key-save">${t('sc.keySave')}</button></div>
      <div class="as-sc-hint">${t('sc.keyHint')}</div>`;
    const ki = area.querySelector('#anysub-key');
    ki.value = state.jimakuKey || '';
    area.querySelector('#anysub-key-save').addEventListener('click', () => saveKey(ki.value));
    ki.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveKey(ki.value); });
  }
}

// opts.run:预填后自动发起检索(有 key + 番名时)——供「发现字幕」自动提示一键直达候选。
export function openSearch(opts) {
  ensurePanel(); // 懒建面板+搜索 DOM(含本模块的 panel)
  if (refs.panel) refs.panel.style.display = 'none'; // 与主面板互斥
  show();
  renderKeyArea();
  // 预填「番剧名 + 集数」(站点适配优先,回落标题解析)。首次为空时填;此后仅当页面标题变化才刷新
  // 预填并清空旧结果,同一集内保留用户的手动修改。
  const curTitle = document.title;
  const first = !titleInput.value && !epInput.value;
  if (first || curTitle !== lastPrefillTitle) {
    const { series, episode } = detectShow();
    titleInput.value = series;
    epInput.value = episode || '';
    lastPrefillTitle = curTitle;
    setResults(`<div class="as-sc-empty">${t('sc.prompt')}</div>`);
  }
  if (opts && opts.run && state.jimakuKey && titleInput.value.trim()) { doSearch(); return; }
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
  toast(state.jimakuKey ? t('toast.keySaved') : t('toast.keyCleared'));
  if (state.jimakuKey) titleInput.focus();
}

async function doSearch() {
  const title = titleInput.value.trim();
  if (!state.jimakuKey) { toast(t('toast.keyNeeded')); keyEditing = true; renderKeyArea(); return; }
  if (!title) { toast(t('toast.titleNeeded')); return; }
  setResults(`<div class="as-sc-empty">${t('sc.searching')}</div>`);
  try {
    const list = await animeCandidates(title);
    if (!list.length) { setResults(`<div class="as-sc-empty">${t('sc.notFound')}</div>`); return; }
    renderAnime(list);
  } catch (err) {
    setResults(`<div class="as-sc-empty">${t('sc.error', { msg: esc(err.message) })}</div>`);
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
  if (a.episodes) bits.push(t('sc.episodes', { n: a.episodes }));
  return bits.join(' · ');
}

function renderAnime(list) {
  results.innerHTML = '';
  results.appendChild(sec(t('sc.selectAnime')));
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
  setResults(`<div class="as-sc-empty">${t('sc.fetchingFiles')}</div>`);
  try {
    const files = await subtitleFiles(anime.anilistId, epInput.value.trim(),
      [anime.native, anime.romaji, anime.english]); // anilist_id 无条目时的自由搜兜底
    if (!files.length) {
      results.innerHTML = '';
      results.appendChild(backLink(t('sc.backToAnime'), doSearch));
      const ep = epInput.value ? t('sc.epSuffix', { ep: esc(epInput.value) }) : '';
      results.appendChild(empty(t('sc.noSubsFor', { title: esc(anime.title), ep })));
      return;
    }
    renderFiles(anime, files);
  } catch (err) {
    results.innerHTML = '';
    results.appendChild(backLink(t('sc.backToAnime'), doSearch));
    results.appendChild(empty(t('sc.error', { msg: esc(err.message) })));
  }
}

// 直接展示某番剧的文件候选(切集找不到同源时回退用)
export function showCandidates(seriesTitle, files) {
  ensurePanel();
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
  results.appendChild(backLink(t('sc.backToAnime'), doSearch));
  results.appendChild(sec(t('sc.selectSub', { title: esc(anime.title), n: files.length })));
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
      toast(t('toast.mountedFile', { name: f.name }));
      close();
    }
  } catch (err) {
    toast(t('toast.downloadFailed', { msg: err.message }));
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
