// Lazily load JavascriptSubtitlesOctopus (libass-wasm). Only triggered when opening an ASS file.
// Under @grant none: the main script is injected via a blob <script>; the worker is wrapped in a blob with an injected locateFile pointing to the CDN;
// wasm / fonts are fetched by the worker from the CDN. If any step fails (network / CSP), it throws, and the caller falls back to text rendering.
import type { OctopusCtor } from '../types.js';

const VER = '4.1.0';
const CDN = `https://cdn.jsdelivr.net/npm/libass-wasm@${VER}/dist/js/`;
// libass-wasm has no built-in fonts; provide a broadly-covering fallback to avoid tofu boxes for missing glyphs.
// Anime is mostly Japanese, so the main fallback is Noto Sans JP; then add SC to fill in Chinese (translation lines / Chinese subtitles),
// libass will substitute for missing glyphs across all loaded fonts.
const FONT_JP =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.5/files/noto-sans-jp-japanese-400-normal.woff2';
const FONT_SC =
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.0.5/files/noto-sans-sc-chinese-simplified-400-normal.woff2';

interface OctopusBundle {
  Octopus: OctopusCtor;
  workerUrl: string;
  fallbackFont: string;
  fonts: string[];
}

let loadPromise: Promise<OctopusBundle> | null = null;

export function loadOctopus(): Promise<OctopusBundle> {
  if (loadPromise) return loadPromise;
  loadPromise = doLoad().catch((err) => {
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}

async function doLoad(): Promise<OctopusBundle> {
  // 1) main script: defines the global SubtitlesOctopus (injected via blob <script>, avoiding eval)
  if (!window.SubtitlesOctopus) {
    const mainText = await fetchText(CDN + 'subtitles-octopus.js');
    await injectScript(mainText);
    if (!window.SubtitlesOctopus)
      throw new Error('SubtitlesOctopus is undefined (possibly blocked by CSP)');
  }
  // 2) worker: wrap the whole thing in a blob, and preset Module.locateFile so wasm loads from the CDN
  const workerText = await fetchText(CDN + 'subtitles-octopus-worker.js');
  const prefix = 'var Module={locateFile:function(p){return ' + JSON.stringify(CDN) + '+p;}};\n';
  const workerUrl = URL.createObjectURL(
    new Blob([prefix + workerText], { type: 'text/javascript' }),
  );

  return {
    Octopus: window.SubtitlesOctopus,
    workerUrl,
    fallbackFont: FONT_JP,
    fonts: [FONT_JP, FONT_SC],
  };
}

function fetchText(url: string): Promise<string> {
  return fetch(url, { credentials: 'omit' }).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${r.status}: ${url}`);
    return r.text();
  });
}

function injectScript(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    s.src = url;
    // once the script has been fetched/executed, revoke the blob URL and remove the <script> node (the global SubtitlesOctopus is already defined,
    // so removing the node doesn't affect it); otherwise retries (calling loadOctopus again after a failure) would accumulate blobs and dead nodes.
    const cleanup = () => {
      URL.revokeObjectURL(url);
      s.remove();
    };
    s.onload = () => {
      cleanup();
      resolve();
    };
    s.onerror = () => {
      cleanup();
      reject(new Error('Main script injection failed (possibly blocked by CSP)'));
    };
    (document.head || document.documentElement).appendChild(s);
  });
}
