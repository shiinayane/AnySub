// 在线字幕搜索面板:输入 API key + 番剧名 + 集数 → 番剧候选 → 文件候选 → 下载载入。
// 半自动:每一步都把候选摆出来让用户选,不静默加载。
import { state } from './state.js';
import { refs } from './refs.js';
import { toast } from './notify.js';
import { saveState } from './storage.js';
import { animeCandidates, subtitleFiles, downloadAndLoad } from './online.js';
import { parseVideoTitle } from './title-parse.js';

let panel, keyInput, titleInput, epInput, results;

const HTML = `
  <div class="anysub-row anysub-head"><span>在线字幕 · Jimaku</span><span id="anysub-sc-close">✕</span></div>
  <div class="anysub-row">
    <input id="anysub-key" type="password" placeholder="Jimaku API key" autocomplete="off">
    <button id="anysub-key-save">保存</button>
  </div>
  <div class="anysub-key-hint">key 在 jimaku.cc 登录后账号页生成,仅存于本机</div>
  <div class="anysub-row">
    <input id="anysub-title" placeholder="番剧名(日文最准)">
    <input id="anysub-ep" placeholder="集" title="集数">
    <button id="anysub-do-search">搜索</button>
  </div>
  <div id="anysub-results" class="anysub-results"><div class="anysub-empty">输入番剧名后点搜索</div></div>
`;

export function buildSearchUI() {
  panel = document.createElement('div');
  panel.id = 'anysub-search';
  panel.style.display = 'none';
  panel.innerHTML = HTML;
  refs.uiRoot.appendChild(panel);

  keyInput = panel.querySelector('#anysub-key');
  titleInput = panel.querySelector('#anysub-title');
  epInput = panel.querySelector('#anysub-ep');
  results = panel.querySelector('#anysub-results');

  panel.querySelector('#anysub-sc-close').addEventListener('click', close);
  panel.querySelector('#anysub-key-save').addEventListener('click', saveKey);
  panel.querySelector('#anysub-do-search').addEventListener('click', doSearch);
  titleInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  epInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
}

export function openSearch() {
  if (refs.panel) refs.panel.style.display = 'none';
  panel.style.display = 'block';
  keyInput.value = state.jimakuKey || '';
  // 从页面标题预填「番剧名 + 集数」(用户没手动填过才填,避免覆盖)
  if (!titleInput.value && !epInput.value) {
    const { series, episode } = parseVideoTitle(document.title);
    titleInput.value = series;
    if (episode) epInput.value = episode;
  }
  (state.jimakuKey ? titleInput : keyInput).focus();
}

function close() { panel.style.display = 'none'; }

function saveKey() {
  state.jimakuKey = keyInput.value.trim();
  saveState();
  toast(state.jimakuKey ? 'API key 已保存' : 'API key 已清空');
}

async function doSearch() {
  const title = titleInput.value.trim();
  if (!state.jimakuKey) { toast('请先填写并保存 Jimaku API key'); keyInput.focus(); return; }
  if (!title) { toast('请输入番剧名'); return; }
  setResults('<div class="anysub-empty">搜索中…</div>');
  try {
    const list = await animeCandidates(title);
    if (!list.length) { setResults('<div class="anysub-empty">未找到番剧,换个写法试试</div>'); return; }
    renderAnime(list);
  } catch (err) {
    setResults(`<div class="anysub-empty">出错:${esc(err.message)}</div>`);
  }
}

function renderAnime(list) {
  results.innerHTML = '';
  const hint = document.createElement('div');
  hint.className = 'anysub-sec';
  hint.textContent = '选择番剧:';
  results.appendChild(hint);
  for (const a of list) {
    const row = document.createElement('div');
    row.className = 'anysub-item';
    row.innerHTML = `<div class="anysub-item-t">${esc(a.title)}</div>
      <div class="anysub-item-s">${esc(a.romaji)} · ${esc(a.format)} ${a.year || ''} · ${a.episodes || '?'}话</div>`;
    row.addEventListener('click', () => loadFilesFor(a));
    results.appendChild(row);
  }
}

async function loadFilesFor(anime) {
  setResults('<div class="anysub-empty">获取字幕文件中…</div>');
  try {
    const files = await subtitleFiles(anime.anilistId, epInput.value.trim());
    if (!files.length) { setResults(`<div class="anysub-empty">${esc(anime.title)} 暂无字幕${epInput.value ? '(第' + esc(epInput.value) + '集)' : ''}</div><div class="anysub-back">← 返回</div>`); wireBack(); return; }
    renderFiles(anime, files);
  } catch (err) {
    setResults(`<div class="anysub-empty">出错:${esc(err.message)}</div><div class="anysub-back">← 返回</div>`);
    wireBack();
  }
}

function renderFiles(anime, files) {
  results.innerHTML = '';
  const back = document.createElement('div');
  back.className = 'anysub-back';
  back.textContent = '← 返回番剧列表';
  back.addEventListener('click', doSearch);
  results.appendChild(back);
  const hint = document.createElement('div');
  hint.className = 'anysub-sec';
  hint.textContent = `${anime.title} · 选择字幕文件(${files.length}):`;
  results.appendChild(hint);
  for (const f of files) {
    const row = document.createElement('div');
    row.className = 'anysub-item';
    row.innerHTML = `<div class="anysub-item-t">${esc(f.name)}</div>
      <div class="anysub-item-s">${fmtSize(f.size)}${f.entryName ? ' · ' + esc(f.entryName) : ''}</div>`;
    row.addEventListener('click', () => pickFile(f, row));
    results.appendChild(row);
  }
}

async function pickFile(f, row) {
  row.classList.add('loading');
  try {
    const ok = await downloadAndLoad(f.url, f.name);
    if (ok) { toast('已挂载:' + f.name); close(); }
  } catch (err) {
    toast('下载失败:' + err.message);
  } finally {
    row.classList.remove('loading');
  }
}

function wireBack() {
  const b = results.querySelector('.anysub-back');
  if (b) b.addEventListener('click', doSearch);
}

function setResults(html) { results.innerHTML = html; }

function fmtSize(n) {
  if (!n) return '';
  return n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB';
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
