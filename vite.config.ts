import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// Single source of truth for the version: package.json. To release, just bump package.json + push the matching tag (the release workflow verifies they agree).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Script icon (matches the floating button's "字"): rounded blue background + white text. Converted to a base64 data-URI at build time and embedded as @icon.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c8dff"/><stop offset="1" stop-color="#2b6cff"/></linearGradient></defs><rect width="64" height="64" rx="14" fill="url(#g)"/><text x="32" y="45" font-family="'Hiragino Sans','Yu Gothic','PingFang SC','Microsoft YaHei',sans-serif" font-size="40" font-weight="700" fill="#fff" text-anchor="middle">字</text></svg>`;
const ICON_DATA_URI = 'data:image/svg+xml;base64,' + Buffer.from(ICON_SVG).toString('base64');

// Source lives in src/*; the build output is a single file dist/anysub.user.js (with a ==UserScript== header)
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        // Multilingual metadata: the empty-string key '' = default (the locale-less @name/@description), English prioritized for reach.
        // Greasyfork / Tampermonkey pick en/zh-CN/ja by the user's language, falling back to the default when there's no match.
        name: {
          '': 'AnySub · Japanese Immersion Subtitles for Any Video',
          en: 'AnySub · Japanese Immersion Subtitles for Any Video',
          'zh-CN': 'AnySub · 日语沉浸式字幕挂载',
          ja: 'AnySub · どんな動画にも字幕を(日本語学習向け)',
        },
        namespace: 'https://github.com/shiinayane/anysub',
        version: pkg.version,
        license: 'MIT',
        icon: ICON_DATA_URI,
        homepageURL: 'https://github.com/shiinayane/anysub',
        supportURL: 'https://github.com/shiinayane/anysub/issues',
        description: {
          '': 'Turn any video into a Japanese-immersion tool: accurate per-kanji furigana, one-click Jimaku subtitles with auto next-episode, and semantic CC formatting (speaker / SFX / inner-voice). Also loads any local SRT/VTT/ASS with full style control and fullscreen following. UI in English / 中文 / 日本語.',
          en: 'Turn any video into a Japanese-immersion tool: accurate per-kanji furigana, one-click Jimaku subtitles with auto next-episode, and semantic CC formatting (speaker / SFX / inner-voice). Also loads any local SRT/VTT/ASS with full style control and fullscreen following. UI in English / 中文 / 日本語.',
          'zh-CN':
            '把任意网站的 HTML5 视频变成日语沉浸学习工具:逐字精准注音(furigana)、一键 Jimaku 在线字幕并自动接续下一集、话者/音效/心声语义排版。也支持任意 SRT/VTT/ASS 本地字幕、样式可控、全屏跟随。EN/中/日界面。',
          ja: 'どんな動画も日本語イマージョン学習ツールに:漢字ごとに正確なふりがな、ワンクリックで Jimaku 字幕を取得し次話へ自動継続、話者・効果音・心の声のセマンティック整形。ローカルの SRT/VTT/ASS も読み込み可、スタイル調整・全画面追従対応。UI は英語/中国語/日本語。',
        },
        author: 'shiinayane',
        match: ['*://*/*'],
        // Only request cross-site storage (for the site-wide Jimaku key); everything else stays pure DOM. GM storage is shared per script,
        // supported by all major managers + Safari Userscripts. With no manager (e.g. a demo loading directly via <script>), it falls back to localStorage.
        grant: ['GM_getValue', 'GM_setValue', 'GM.getValue', 'GM.setValue'],
        'run-at': 'document-idle',
        noframes: true,
      },
    }),
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: { entryFileNames: 'anysub.user.js' },
    },
  },
});
