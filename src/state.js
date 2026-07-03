// 全局共享状态(单例)
export const state = {
  video: null,
  cues: [],
  offset: 0,           // 秒,正 = 字幕延后
  fileName: '',
  active: false,       // 渲染循环是否运行
  style: {
    fontPct: 100,      // 字号百分比,100% = 视频高度的 4.5%
    bg: 'translucent', // 'outline' | 'translucent' | 'solid' | 'none'
    color: '#ffffff',
    bottomPct: 8,      // 距底部 = 视频高度的百分比
  },
};

// 100% 时字号占视频高度比例
export const FONT_BASE = 0.045;
