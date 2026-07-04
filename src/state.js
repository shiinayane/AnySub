// 全局共享状态(单例)
export const state = {
  video: null,
  cues: [],
  offset: 0,           // 秒,正 = 字幕延后
  fileName: '',
  active: false,       // 渲染循环是否运行
  hidden: false,       // 字幕临时隐藏(快捷键切换,不持久化)
  shortcutsEnabled: true, // 快捷键总开关(持久化)
  showFab: false,      // 是否显示常驻悬浮球(持久化,默认关,靠快捷键唤出面板)
  style: {
    fontPct: 100,      // 字号百分比,100% = 视频高度的 4.5%
    bg: 'translucent', // 'outline' | 'translucent' | 'solid' | 'none'
    color: '#ffffff',
    bottomPct: 8,      // 距底部 = 视频高度的百分比
  },
};

// 100% 时字号占视频高度比例
export const FONT_BASE = 0.045;
