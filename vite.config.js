import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

// 源码在 src/*,构建产物为单文件 dist/anysub.user.js(带 ==UserScript== 头)
export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.js',
      userscript: {
        name: 'AnySub · 通用字幕挂载',
        'name:en': 'AnySub · Universal Subtitle Loader',
        namespace: 'https://github.com/shiinayane/anysub',
        version: '0.9.1',
        description:
          '给任意网站的 HTML5 视频挂载本地字幕文件(SRT / VTT),自绘覆盖层渲染:样式可控、字号随播放器等比缩放、全屏跟随。Chrome / Edge / Safari / Firefox 通用。',
        'description:en':
          'Load local subtitle files (SRT/VTT) onto any HTML5 video with a custom overlay renderer: full style control, player-relative font scaling, fullscreen following.',
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
