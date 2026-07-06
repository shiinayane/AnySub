// Load flow: read → decode → dispatch a renderer by format → mount
import { state } from '../state.js';
import { readSubtitleFile, decodeBuffer } from '../subtitle/decode.js';
import { parseSubtitle } from '../subtitle/parse.js';
import { detectShow } from '../sites/site-adapters.js';
import { sourceTokens } from '../online/match.js';
import { buildSpeakers, computeSpanStates } from '../subtitle/cue-format.js';
import { pickBestVideo } from './locator.js';
import { setVideo, startRender, setRenderer, applyStyle } from './controller.js';
import { invalidateLayout } from './overlay.js';
import { createTextRenderer } from './render-text.js';
import { createAssRenderer } from './render-ass.js';
import { parseAss } from '../subtitle/parse-ass.js';
import { toast, updateStatus } from '../ui/notify.js';
import { updateWatcher } from './watcher.js';
import { t } from '../i18n.js';
import { errMessage } from '../errors.js';
import type { Cue, Renderer } from '../types.js';

interface Parsed {
  cues: Cue[];
  assText?: string;
}
interface Format {
  test: (name?: string, text?: string) => boolean;
  parse: (text: string, name?: string) => Parsed;
  create: (parsed: Parsed) => Renderer;
}

// Format registry: on a test match, use its parse (populates the text-fallback cues) + create (renderer).
const FORMATS: Format[] = [
  {
    test: (name) => /\.(ass|ssa)$/i.test(name || ''),
    parse: (text) => ({ cues: parseAss(text), assText: text }),
    create: (parsed) => createAssRenderer(parsed.assText || ''),
  },
  {
    test: () => true, // text renderer fallback (SRT / VTT / others)
    parse: (text, name) => ({ cues: parseSubtitle(text, name) }),
    create: () => createTextRenderer(),
  },
];

export function loadFile(file?: File | null): void {
  if (!file) return;
  readSubtitleFile(file)
    .then((text) => loadFromText(text, file.name))
    .catch((err) => {
      console.error('[AnySub]', err);
      toast(t('toast.readFailed', { msg: errMessage(err) }));
    });
}

// Load from a byte stream (reused by online downloads: detect the encoding first, then follow the unified path)
export function loadFromBuffer(buffer: ArrayBuffer, name: string): boolean {
  return loadFromText(decodeBuffer(new Uint8Array(buffer)), name);
}

// Load from already-decoded text (the core path shared by local/online)
export function loadFromText(text: string, name: string): boolean {
  if (!state.video || !state.video.isConnected) {
    const v = pickBestVideo();
    if (v) setVideo(v);
  }
  if (!state.video) {
    toast(t('toast.noVideoOnPage'));
    return false;
  }

  const fmt = FORMATS.find((f) => f.test(name, text)) || FORMATS[FORMATS.length - 1];
  const parsed = fmt.parse(text, name);
  if (!parsed.cues || !parsed.cues.length) {
    toast(t('toast.noCues'));
    return false;
  }
  state.cues = parsed.cues;
  state.speakers = buildSpeakers(parsed.cues); // speaker-name vocabulary (used by semantic typesetting to disambiguate standalone parentheses)
  computeSpanStates(parsed.cues); // precompute the voice-over / written / song span states across lines and cues
  state.fileName = name;
  // record the current series/episode (used for episode-switch detection); use the site-adapted detectShow(), same source as the episode-switch signal,
  // otherwise sites like Prime where "the episode isn't in the <title>" would record wrongly → on an episode switch the series name wouldn't match and it wouldn't auto-continue.
  const p = detectShow();
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = null;
  // offset memory: restore the last offset keyed by "series|source signature" (stable across episodes for the same series and source); default to 0 if there's no record
  state.offsetKey = (p.series || '') + '|' + [...sourceTokens(name)].sort().join(',');
  const remembered = state.offsets[state.offsetKey];
  state.offset = typeof remembered === 'number' ? remembered : 0;
  invalidateLayout();
  setRenderer(fmt.create(parsed));
  applyStyle();
  startRender();
  updateWatcher(); // subtitles loaded → need to watch for SPA video switches
  updateStatus();
  toast(t('toast.mounted', { n: parsed.cues.length }));
  return true;
}
