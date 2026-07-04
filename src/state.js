// 全局共享状态(单例)
export const state = {
  video: null,
  cues: [],
  offset: 0,           // 秒,正 = 字幕延后
  offsets: {},         // 按「番剧|源特征」记住的偏移(持久化);同番剧同源跨集自动恢复
  offsetKey: '',       // 当前字幕的偏移 key(不持久化)
  fileName: '',
  active: false,       // 渲染循环是否运行
  hidden: false,       // 字幕临时隐藏(快捷键切换,不持久化)
  showFab: false,      // 是否显示常驻悬浮球(持久化,默认关,靠快捷键唤出面板)
  rubyParen: true,     // 括号注音启发式(温厚（おんこう）→ ruby;持久化,可关。《》式始终开)
  enhance: true,       // 语义排版:话者名淡化 / 非语音斜体 / 歌词斜体(持久化,可关)
  speakers: null,      // 当前字幕的话者名词表(载入时构建,不持久化)
  jimakuKey: '',       // Jimaku API key(持久化,按站点)
  loadedSeries: '',    // 当前字幕对应的番剧名(取自页面标题,用于切集检测)
  loadedEpisode: '',   // 当前字幕对应的集数
  lastOnline: null,    // 最近一次在线来源 { anilistId, tokens }(用于切集自动接下一集·同源优先)
  style: {
    fontPct: 100,      // 字号百分比,100% = 视频高度的 4.5%
    bg: 'translucent', // 'outline' | 'translucent' | 'solid' | 'none'
    color: '#ffffff',
    bottomPct: 8,      // 距底部 = 视频高度的百分比
  },
};

// 100% 时字号占视频高度比例
export const FONT_BASE = 0.045;
