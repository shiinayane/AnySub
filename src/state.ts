// Global shared state (singleton)
import type { State } from './types.js';

export const state: State = {
  video: null,
  cues: [],
  offset: 0, // Seconds, positive = subtitles delayed
  offsets: {}, // Offsets remembered by "anime|source characteristics" (persisted); auto-restored across episodes for the same anime and source
  offsetKey: '', // Offset key for the current subtitles (not persisted)
  fileName: '',
  active: false, // Whether the render loop is running
  hidden: false, // Subtitles temporarily hidden (toggled by shortcut, not persisted)
  showFab: false, // Whether to show the persistent floating button (persisted, off by default; the panel is summoned via shortcut)
  rubyParen: true, // Parenthesized-reading heuristic (温厚（おんこう）→ ruby; persisted, can be turned off. The 《》 form is always on)
  enhance: true, // Semantic formatting: dimming speaker names / italicizing non-speech, voice-over, written, lyrics, etc. (persisted, can be turned off)
  speakers: null, // Speaker-name vocabulary for the current subtitles (built on load, not persisted)
  subPos: 'bottom', // Speech (dialogue) anchor 'bottom' | 'top'; non-speech (SFX/written) always goes on the opposite side (persisted)
  jimakuKey: '', // Jimaku API key (shared across sites: GM storage as primary, localStorage as fallback cache, see online/storage.ts)
  lang: null, // UI language 'en'|'zh'|'ja'; null = follow the browser (persisted)
  loadedSeries: '', // Anime name for the current subtitles (taken from the page title, used for episode-change detection)
  loadedEpisode: '', // Episode number for the current subtitles
  lastOnline: null, // Most recent online source { anilistId, name } (used to auto-continue to the next episode on episode change, preferring the same source)
  style: {
    fontPct: 100, // Font size percentage, 100% = 4.5% of video height
    bg: 'translucent', // 'outline' | 'translucent' | 'solid' | 'none'
    color: '#ffffff',
    bottomPct: 8, // Distance from the bottom = percentage of video height
  },
};

// Font size as a fraction of video height at 100%
export const FONT_BASE = 0.045;
