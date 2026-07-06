// Shared type definitions (pure types, no runtime code; entirely stripped by esbuild at build time).
// Cross-module data shapes are centralized here to avoid narrow literal types being inferred all over the place.

export type Locale = 'en' | 'zh' | 'ja';

// Span state: cross-line, cross-cue tracking of voice-over 〈…〉 / written 《…》 / double-paren voice （（…）） / lyrics ♪
export interface SpanState {
  span: 'none' | 'voice' | 'book' | 'dparen';
  lyric: boolean;
}

// Unified cue structure (after parsing SRT / VTT / ASS)
export interface Cue {
  start: number;
  end: number;
  text: string;
  // Precomputed and written by computeSpanStates: the span state on entering this cue
  _spanIn?: SpanState;
}

export type LineType = 'dialogue' | 'speaker' | 'sfx' | 'voice' | 'book' | 'lyric' | 'plain';

// Return of stepCueLine: classification + span state after processing
export interface LineClass {
  type: LineType;
  name?: string;
  rest?: string;
  state: SpanState;
}

// Furigana per-character alignment result: plain = leading kanji that couldn't be aligned; pairs = [kanji, reading segment][]
export interface FuriganaAlign {
  plain: string;
  pairs: Array<[string, string]>;
}

// AniList search candidate (returned by searchAnime)
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

// Jimaku subtitle file (item returned by getFiles)
export interface SubFile {
  name: string;
  url: string;
  size?: number;
  last_modified?: string;
  entryName?: string; // Attached by online.subtitleFiles: the owning entry name (used to group the candidate list for display)
}

// Jimaku entry (item returned by entries/search)
export interface JimakuEntry {
  id: number;
  name?: string;
  anilist_id?: number;
  english_name?: string;
  japanese_name?: string;
  [k: string]: unknown;
}

// Most recent online source (used to prefer the same source when continuing to the next episode)
export interface OnlineCtx {
  anilistId: number;
  name: string; // Loaded subtitle file name (used to compare source characteristics)
  tokens?: string[];
}

// Site detection result (site-adapters detectShow / adapter.detect)
export interface DetectInfo {
  series: string;
  episode: string;
  showKey?: string;
  epKey?: string;
}

// Subtitle style
export interface SubStyle {
  fontPct: number;
  bg: 'outline' | 'translucent' | 'solid' | 'none';
  color: string;
  bottomPct: number;
}

// Global shared state (singleton)
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

// Shared DOM references (created and populated by ui.js, read-only for other modules)
export interface Refs {
  uiRoot: HTMLElement | null;
  overlay: HTMLElement | null;
  fab: HTMLElement | null;
  panel: HTMLElement | null;
  statusEl: HTMLElement | null;
  fileInput: HTMLInputElement | null;
  searchPanel?: HTMLElement | null;
}

// Renderer interface (implemented by both the text and ASS renderers; controller depends only on this interface)
export interface Renderer {
  mount(): void;
  renderAt(v: HTMLVideoElement, rect: DOMRect | null, layoutChanged: boolean): void;
  destroy(): void;
  setVisible?(v: boolean): void;
  applyStyle?(): void;
}

// Site adapter: identifies "which anime this is and which episode"
export interface SiteAdapter {
  name: string;
  match(): boolean;
  isTarget(): boolean;
  detect(): DetectInfo;
  watchEl?(): Element | null;
}

// Return of resolveSubtitles
export interface ResolveResult {
  anime: AnimeCandidate | null;
  candidates: AnimeCandidate[];
  files: SubFile[];
  exact: boolean;
}

// libass-wasm (JavascriptSubtitlesOctopus) minimal types (the external library has no type declarations)
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
