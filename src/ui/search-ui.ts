// Online subtitle search panel (a standalone centered modal, sharing the main panel's visual language):
// enter API key + anime title + episode → anime candidates (with posters) → file candidates → download and load.
// Semi-automatic: at each step the candidates are laid out for the user to choose, never loaded silently.
// Mutually exclusive with the main panel (opening it collapses the main panel), and provides a "back to main panel" button to keep the mental flow coherent.
import { state } from '../state.js';
import { refs } from '../refs.js';
import { toast } from './notify.js';
import { saveGlobalKey } from '../online/storage.js';
import { animeCandidates, subtitleFiles, downloadAndLoad, markLoaded } from '../online/online.js';
import { detectShow } from '../sites/site-adapters.js';
import { pickExactAnime } from '../online/match.js';
import { openPanel, ensurePanel } from './ui.js';
import { t } from '../i18n.js';
import { errMessage } from '../errors.js';
import type { AnimeCandidate, SubFile } from '../types.js';

// Minimal anime info needed for the file-candidates header (showCandidates may supply only title/anilistId)
type AnimeLike = Partial<AnimeCandidate> & { title?: string };

let panel!: HTMLElement,
  titleInput!: HTMLInputElement,
  epInput!: HTMLInputElement,
  results!: HTMLElement;
let currentAnime: AnimeLike | null = null; // the anime whose file list is currently expanded (for recording the source)
let lastPrefillSig: string | null = null; // the "title#episode" fingerprint the last prefill was based on (used to refresh the prefill after switching episodes)
let keyEditing = false; // when a key is already saved, collapse to a single line by default; clicking "change" expands the input

const S = (p: string): string =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const IC = {
  back: S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  search: S('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>'),
  check: S('<path d="M20 6 9 17l-5-5"/>'),
  photo: S(
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  ),
  chev: S('<path d="m9 6 6 6-6 6"/>'),
};

function html(): string {
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

export function buildSearchUI(): void {
  panel = document.createElement('div');
  panel.id = 'anysub-search';
  panel.style.display = 'none';
  refs.uiRoot!.appendChild(panel);
  refs.searchPanel = panel; // used by the main panel for mutual exclusion
  wireSearch();
}

// Build/rebuild the search panel's internal DOM and events (reused when switching language)
function wireSearch(): void {
  panel.innerHTML = html();
  titleInput = panel.querySelector<HTMLInputElement>('#anysub-title')!;
  epInput = panel.querySelector<HTMLInputElement>('#anysub-ep')!;
  results = panel.querySelector<HTMLElement>('#anysub-results')!;

  panel.querySelector('#anysub-sc-back')!.addEventListener('click', backToPanel);
  panel.querySelector('#anysub-sc-close')!.addEventListener('click', close);
  panel.querySelector('#anysub-do-search')!.addEventListener('click', doSearch);
  titleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  epInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
  renderKeyArea();
}

// Language switch: rebuild the search panel DOM (discards uncommitted search results, returning to the initial state — switching language is rare anyway)
export function relocalizeSearch(): void {
  if (!panel) return;
  wireSearch();
  lastPrefillSig = null; // next open re-prefills based on the current page
}

// For external callers: after the cross-site key becomes ready asynchronously, refresh the key area display if the search panel is already built (no-op if not built; it will render correctly on open)
export function refreshKeyArea(): void {
  if (panel) renderKeyArea();
}

// The key area has two states: not stored → input + save; stored → a single line "connected · change", clicking change expands it again
function renderKeyArea(): void {
  const area = panel.querySelector<HTMLElement>('#anysub-key-area')!;
  if (state.jimakuKey && !keyEditing) {
    area.innerHTML = `<div class="as-sc-keyok">${IC.check}<span>${t('sc.keyOk')}</span><span class="as-sc-change" id="anysub-key-change">${t('sc.changeKey')}</span></div>`;
    area.querySelector('#anysub-key-change')!.addEventListener('click', () => {
      keyEditing = true;
      renderKeyArea();
    });
  } else {
    area.innerHTML = `<div class="as-sc-keyrow"><input id="anysub-key" type="password" placeholder="${t('sc.keyPlaceholder')}" autocomplete="off"><button id="anysub-key-save">${t('sc.keySave')}</button></div>
      <div class="as-sc-hint">${t('sc.keyHint')}</div>`;
    const ki = area.querySelector<HTMLInputElement>('#anysub-key')!;
    ki.value = state.jimakuKey || '';
    area.querySelector('#anysub-key-save')!.addEventListener('click', () => saveKey(ki.value));
    ki.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveKey(ki.value);
    });
  }
}

export function openSearch(): void {
  ensurePanel(); // lazily build the panel + search DOM (including this module's panel)
  if (refs.panel) refs.panel.style.display = 'none'; // mutually exclusive with the main panel
  show();
  renderKeyArea();
  // Prefill "anime title + episode" (via site adaptation). Fill it when empty on first open; afterward refresh only when the detected title/episode changes —
  // use the detectShow() fingerprint rather than document.title: on Prime, the <title> stays the same across episode changes while the episode lives in the DOM,
  // so judging by the title alone would leave stale info from the previous episode. Within the same episode, preserve the user's manual edits.
  const det = detectShow();
  const detSig = (det.series || '') + '#' + (det.episode || '');
  const first = !titleInput.value && !epInput.value;
  if (first || detSig !== lastPrefillSig) {
    titleInput.value = det.series;
    epInput.value = det.episode || '';
    lastPrefillSig = detSig;
    setResults(`<div class="as-sc-empty">${t('sc.prompt')}</div>`);
  }
  (state.jimakuKey
    ? titleInput
    : panel.querySelector<HTMLElement>('#anysub-key') || titleInput
  ).focus();
}

function show(): void {
  panel.style.display = 'block';
  panel.classList.remove('as-in');
  void panel.offsetWidth;
  panel.classList.add('as-in'); // replay the entrance animation
}

function close(): void {
  panel.style.display = 'none';
}

// Back to main panel: collapse the search and explicitly open the main panel (distinct from "close" — close is a full dismiss)
function backToPanel(): void {
  panel.style.display = 'none';
  openPanel();
}

function saveKey(val: string): void {
  state.jimakuKey = (val || '').trim();
  saveGlobalKey(state.jimakuKey); // cross-site storage: set once, applies across all sites (DMM/Prime/U-NEXT, etc.)
  keyEditing = false;
  renderKeyArea();
  toast(state.jimakuKey ? t('toast.keySaved') : t('toast.keyCleared'));
  if (state.jimakuKey) titleInput.focus();
}

async function doSearch(): Promise<void> {
  const title = titleInput.value.trim();
  if (!state.jimakuKey) {
    toast(t('toast.keyNeeded'));
    keyEditing = true;
    renderKeyArea();
    return;
  }
  if (!title) {
    toast(t('toast.titleNeeded'));
    return;
  }
  setResults(`<div class="as-sc-empty">${t('sc.searching')}</div>`);
  try {
    const list = await animeCandidates(title);
    if (!list.length) {
      setResults(`<div class="as-sc-empty">${t('sc.notFound')}</div>`);
      return;
    }
    const exact = pickExactAnime(list, title); // a unique exact match → auto-select the anime, skipping manual selection (the user still chooses from the file candidates)
    if (exact) {
      loadFilesFor(exact);
      return;
    }
    renderAnime(list);
  } catch (err) {
    setResults(`<div class="as-sc-empty">${t('sc.error', { msg: esc(errMessage(err)) })}</div>`);
  }
}

// Poster: prefer the AniList cover; if loading fails (CSP/network), remove the img and fall back to the placeholder icon
function poster(url: string | null | undefined): string {
  return `<span class="as-sc-poster">${IC.photo}${url ? `<img src="${escAttr(url)}" alt="">` : ''}</span>`;
}
function metaOf(a: AnimeCandidate): string {
  const bits: string[] = [];
  if (a.format) bits.push(esc(a.format));
  if (a.year) bits.push(String(a.year));
  if (a.episodes) bits.push(t('sc.episodes', { n: a.episodes }));
  return bits.join(' · ');
}

function renderAnime(list: AnimeCandidate[]): void {
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

async function loadFilesFor(anime: AnimeCandidate): Promise<void> {
  setResults(`<div class="as-sc-empty">${t('sc.fetchingFiles')}</div>`);
  try {
    const files = await subtitleFiles(anime.anilistId, epInput.value.trim(), [
      anime.native,
      anime.romaji,
      anime.english,
    ]); // free-text search fallback when there is no entry for the anilist_id
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
    results.appendChild(empty(t('sc.error', { msg: esc(errMessage(err)) })));
  }
}

// Directly show the file candidates for a given anime (used as a fallback when the same source can't be found after switching episodes; also reused after the auto-prompt is confirmed).
// anilistId can be passed explicitly (the auto-prompt has already resolved the anime); if omitted, it reuses the last online source, so the source is recorded after the file loads (for episode-switch continuation).
export function showCandidates(
  seriesTitle: string,
  files: SubFile[],
  anilistId?: number | null,
): void {
  ensurePanel();
  if (refs.panel) refs.panel.style.display = 'none';
  show();
  renderKeyArea();
  if (seriesTitle) titleInput.value = seriesTitle;
  const d = detectShow();
  lastPrefillSig = (d.series || '') + '#' + (d.episode || ''); // treat as already prefilled for the current episode, to avoid being overwritten on reopen
  const id = anilistId != null ? anilistId : state.lastOnline?.anilistId;
  renderFiles({ title: seriesTitle, anilistId: id }, files);
}

function renderFiles(anime: AnimeLike, files: SubFile[]): void {
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

async function pickFile(f: SubFile, row: HTMLElement): Promise<void> {
  row.classList.add('loading');
  try {
    const ok = await downloadAndLoad(f.url, f.name);
    if (ok) {
      markLoaded(currentAnime && currentAnime.anilistId, f.name); // record the source, for automatic continuation across episode switches
      toast(t('toast.mountedFile', { name: f.name }));
      close();
    }
  } catch (err) {
    toast(t('toast.downloadFailed', { msg: errMessage(err) }));
  } finally {
    row.classList.remove('loading');
  }
}

// ── DOM helpers ──
function sec(text: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'as-sc-sec';
  d.textContent = text;
  return d;
}
function empty(htmlStr: string): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'as-sc-empty';
  d.innerHTML = htmlStr;
  return d;
}
function backLink(text: string, fn: () => void): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'as-sc-back2';
  d.innerHTML = `${IC.back}<span></span>`;
  d.querySelector('span')!.textContent = text.replace(/^←\s*/, '');
  d.addEventListener('click', fn);
  return d;
}
function wirePoster(row: HTMLElement): void {
  const img = row.querySelector<HTMLImageElement>('.as-sc-poster img');
  if (img) img.addEventListener('error', () => img.remove()); // on failure, fall back to the placeholder icon (which sits beneath the img)
}
function setResults(htmlStr: string): void {
  results.innerHTML = htmlStr;
}

function fmtSize(n?: number): string {
  if (!n) return '';
  return n > 1e6 ? (n / 1e6).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB';
}
function esc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
function escAttr(s: unknown): string {
  return esc(s).replace(/"/g, '&quot;');
}
