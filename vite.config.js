import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// 源码在 src/*,构建产物为单文件 dist/anysub.user.js(带 ==UserScript== 头)
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        // 多语言元数据:空串键 '' = 默认(无 locale 的 @name/@description),英文优先触达。
        // Greasyfork / Tampermonkey 按用户语言选 en/zh-CN/ja,无匹配时回落默认。
        name: {
          '': 'AnySub · Japanese Immersion Subtitles for Any Video',
          en: 'AnySub · Japanese Immersion Subtitles for Any Video',
          'zh-CN': 'AnySub · 日语沉浸式字幕挂载',
          ja: 'AnySub · どんな動画にも字幕を(日本語学習向け)',
        },
        namespace: 'https://github.com/shiinayane/anysub',
        version: '0.15.0',
        license: 'MIT',
        homepageURL: 'https://github.com/shiinayane/anysub',
        supportURL: 'https://github.com/shiinayane/anysub/issues',
        description: {
          '': 'Turn any video into a Japanese-immersion tool: accurate per-kanji furigana, one-click Jimaku subtitles with auto next-episode, and semantic CC formatting (speaker / SFX / inner-voice). Also loads any local SRT/VTT/ASS with full style control and fullscreen following. UI in English / 中文 / 日本語.',
          en: 'Turn any video into a Japanese-immersion tool: accurate per-kanji furigana, one-click Jimaku subtitles with auto next-episode, and semantic CC formatting (speaker / SFX / inner-voice). Also loads any local SRT/VTT/ASS with full style control and fullscreen following. UI in English / 中文 / 日本語.',
          'zh-CN': '把任意网站的 HTML5 视频变成日语沉浸学习工具:逐字精准注音(furigana)、一键 Jimaku 在线字幕并自动接续下一集、话者/音效/心声语义排版。也支持任意 SRT/VTT/ASS 本地字幕、样式可控、全屏跟随。EN/中/日界面。',
          ja: 'どんな動画も日本語イマージョン学習ツールに:漢字ごとに正確なふりがな、ワンクリックで Jimaku 字幕を取得し次話へ自動継続、話者・効果音・心の声のセマンティック整形。ローカルの SRT/VTT/ASS も読み込み可、スタイル調整・全画面追従対応。UI は英語/中国語/日本語。',
        },
        author: 'shiinayane',
        match: ['*://*/*'],
        grant: 'none',
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
