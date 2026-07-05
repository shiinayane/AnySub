// 共享类型定义(纯类型,无运行时代码;esbuild 构建时整体剥离)。
// 跨模块的数据形状集中在此,避免各处推断出过窄的字面量类型。

export type Locale = 'en' | 'zh' | 'ja';

// 跨度状态:画外音〈…〉/ 书面《…》/ 歌词 ♪ 的跨行·跨 cue 追踪
export interface SpanState {
  span: 'none' | 'voice' | 'book';
  lyric: boolean;
}

// 统一 cue 结构(SRT / VTT / ASS 解析后)
export interface Cue {
  start: number;
  end: number;
  text: string;
  // computeSpanStates 预计算写入:进入本 cue 时的跨度状态
  _spanIn?: SpanState;
}

export type LineType = 'dialogue' | 'speaker' | 'sfx' | 'voice' | 'book' | 'lyric' | 'plain';

// stepCueLine 的返回:分类 + 结束后的跨度状态
export interface LineClass {
  type: LineType;
  name?: string;
  rest?: string;
  state: SpanState;
}

// furigana 逐字对齐结果:plain=对不齐的前缀汉字;pairs=[汉字, 读音片段][]
export interface FuriganaAlign {
  plain: string;
  pairs: Array<[string, string]>;
}

// AniList 搜索候选(searchAnime 返回)
export interface AnimeCandidate {
  anilistId: number;
  title: string;
  native: string;
  romaji: string;
  english: string;
  episodes: number;
  format: string;
  year: number | string;
  cover: string;
}

// Jimaku 字幕文件(getFiles 返回项)
export interface SubFile {
  name: string;
  url: string;
  size?: number;
  last_modified?: string;
  entryName?: string; // 由 online.subtitleFiles 附加:所属条目名(候选列表分组显示用)
}

// Jimaku 条目(entries/search 返回项)
export interface JimakuEntry {
  id: number;
  name?: string;
  anilist_id?: number;
  english_name?: string;
  japanese_name?: string;
  [k: string]: unknown;
}

// 最近在线来源(切集续播同源优先用)
export interface OnlineCtx {
  anilistId: number;
  name: string; // 已加载字幕文件名(据此比对源特征)
  tokens?: string[];
}

// 站点探测结果(site-adapters detectShow / adapter.detect)
export interface DetectInfo {
  series: string;
  episode: string;
  showKey?: string;
  epKey?: string;
}

// 字幕样式
export interface SubStyle {
  fontPct: number;
  bg: 'outline' | 'translucent' | 'solid' | 'none';
  color: string;
  bottomPct: number;
}

// 全局共享状态(单例)
export interface State {
  video: HTMLVideoElement | null;
  cues: Cue[];
  offset: number;
  offsets: Record<string, number>;
  offsetKey: string;
  fileName: string;
  active: boolean;
  hidden: boolean;
  showFab: boolean;
  rubyParen: boolean;
  enhance: boolean;
  speakers: Set<string> | null;
  subPos: 'bottom' | 'top';
  jimakuKey: string;
  lang: Locale | null;
  loadedSeries: string;
  loadedEpisode: string;
  lastOnline: OnlineCtx | null;
  style: SubStyle;
}

// 共享 DOM 引用(由 ui.js 创建填充,其余模块只读)
export interface Refs {
  uiRoot: HTMLElement | null;
  overlay: HTMLElement | null;
  fab: HTMLElement | null;
  panel: HTMLElement | null;
  statusEl: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  searchPanel?: HTMLElement | null;
}

// 渲染器接口(文本 / ASS 渲染器共同实现;controller 只依赖此接口)
export interface Renderer {
  mount(): void;
  renderAt(v: HTMLVideoElement, rect: DOMRect | null, layoutChanged: boolean): void;
  destroy(): void;
  setVisible?(v: boolean): void;
  applyStyle?(): void;
}

// 站点适配器:识别「这是哪部番·第几话」
export interface SiteAdapter {
  name: string;
  match(): boolean;
  isTarget(): boolean;
  detect(): DetectInfo;
  watchEl?(): Element | null;
}

// resolveSubtitles 返回
export interface ResolveResult {
  anime: AnimeCandidate | null;
  candidates: AnimeCandidate[];
  files: SubFile[];
  exact: boolean;
}

// libass-wasm (JavascriptSubtitlesOctopus) 最小类型(外部库无类型声明)
export interface OctopusInstance {
  resize(width: number, height: number, top?: number, left?: number): void;
  setCurrentTime(time: number): void;
  dispose(): void;
}
export interface OctopusOptions {
  canvas: HTMLCanvasElement;
  subContent: string;
  workerUrl: string;
  fallbackFont: string;
  fonts?: string[];
  onReady?: () => void;
  onError?: (e: unknown) => void;
}
export type OctopusCtor = new (opts: OctopusOptions) => OctopusInstance;

declare global {
  interface Window {
    SubtitlesOctopus?: OctopusCtor;
    __ANYSUB_LOADED__?: boolean;
  }
}
