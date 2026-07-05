// 懒加载 JavascriptSubtitlesOctopus(libass-wasm)。仅在打开 ASS 文件时触发。
// @grant none 下:主脚本用 blob <script> 注入;worker 用 blob 包裹并注入 locateFile 指向 CDN;
// wasm / 字体由 worker 从 CDN 拉取。任一步失败(网络 / CSP)则抛错,由调用方降级到文本渲染。
import type { OctopusCtor } from './types.js';

const VER = '4.1.0';
const CDN = `https://cdn.jsdelivr.net/npm/libass-wasm@${VER}/dist/js/`;
// libass-wasm 未内置字体,提供覆盖广的 fallback,避免缺字形显示方块。
// 动画多为日文,主 fallback 用 Noto Sans JP;再加 SC 补足中文(翻译行/中字),
// libass 会在所有已加载字体里为缺失字形做替换。
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
  // 1) 主脚本:定义全局 SubtitlesOctopus(blob <script> 注入,避免 eval)
  if (!window.SubtitlesOctopus) {
    const mainText = await fetchText(CDN + 'subtitles-octopus.js');
    await injectScript(mainText);
    if (!window.SubtitlesOctopus) throw new Error('SubtitlesOctopus 未定义(可能被 CSP 拦截)');
  }
  // 2) worker:整段包进 blob,并预置 Module.locateFile 使 wasm 从 CDN 加载
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
    if (!r.ok) throw new Error(`加载失败 ${r.status}: ${url}`);
    return r.text();
  });
}

function injectScript(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = URL.createObjectURL(new Blob([text], { type: 'text/javascript' }));
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('主脚本注入失败(可能被 CSP 拦截)'));
    (document.head || document.documentElement).appendChild(s);
  });
}
