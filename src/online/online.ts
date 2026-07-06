// Online subtitle orchestration: locate the anime via AniList → fetch files from Jimaku → download → go through the unified load path.
import { state } from '../state.js';
import { detectShow } from '../sites/site-adapters.js';
import { searchAnime } from './anilist.js';
import { searchByAnilist, searchByQuery, getFiles } from './jimaku.js';
import { pickExactAnime } from './match.js';
import { loadFromBuffer } from '../render/loader.js';
import type { AnimeCandidate, ResolveResult, SubFile } from '../types.js';

const SUB_RE = /\.(ass|ssa|srt|vtt|sub|sbv)$/i; // subtitle files only, skip .7z/.zip and other archives

export function animeCandidates(title: string): Promise<AnimeCandidate[]> {
  return searchAnime(title);
}

// Site-agnostic unified entry point: series name (+ episode) → locate the anime (exact match preferred, otherwise the most relevant candidate) → subtitle files for that episode.
// The detectShow() result of any site goes through this single path; the various trigger points (auto-offer verification, cross-episode continuation decisions, etc.) share it,
// no longer each inlining "candidates → pick anime → fetch files". Returns { anime, candidates, files, exact }.
export async function resolveSubtitles(series: string, episode: string): Promise<ResolveResult> {
  const candidates = await animeCandidates(series);
  if (!candidates.length) return { anime: null, candidates: [], files: [], exact: false };
  const exactHit = pickExactAnime(candidates, series);
  const anime = exactHit || candidates[0];
  const files = await subtitleFiles(anime.anilistId, episode, [
    anime.native,
    anime.romaji,
    anime.english,
  ]);
  return { anime, candidates, files, exact: !!exactHit };
}

// Given an anilist_id + episode, return the available subtitle files (ass preferred).
// fallbackTitles: when the anilist_id has no entry on Jimaku, use these titles in order (AniList's Japanese/romaji/English)
// as a free-text search fallback — may still hit when Jimaku has not created an anilist mapping for that anime. Semi-automatic; the user still needs to pick from the candidates.
export async function subtitleFiles(
  anilistId: number | string,
  episode: string,
  fallbackTitles: string[] = [],
): Promise<SubFile[]> {
  let entries = await searchByAnilist(anilistId);
  if (!entries.length) {
    const seen = new Set<string>();
    for (const q of fallbackTitles) {
      const query = (q || '').trim();
      if (!query || seen.has(query)) continue;
      seen.add(query);
      entries = await searchByQuery(query);
      if (entries.length) break; // stop on the first hit, don't stack multiple free-text searches
    }
  }
  if (!entries.length) return [];
  const out: SubFile[] = [];
  for (const e of entries) {
    const files = await getFiles(e.id, episode);
    for (const f of files) {
      if (!SUB_RE.test(f.name)) continue;
      out.push({ name: f.name, url: f.url, size: f.size, entryName: e.japanese_name || e.name });
    }
  }
  out.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  return out;
}

function rank(n: string): number {
  if (/\.(ass|ssa)$/i.test(n)) return 0;
  if (/\.srt$/i.test(n)) return 1;
  return 2;
}

export async function downloadAndLoad(url: string, name: string): Promise<boolean> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('下载失败 ' + res.status);
  const buf = await res.arrayBuffer();
  return loadFromBuffer(buf, name);
}

// Record the source of this online load (series/episode via the site-adapted detectShow(), same source as the episode-change signal), for "same-source preferred" auto-continuation on episode change
export function markLoaded(anilistId: number | null | undefined, fileName: string): void {
  const p = detectShow();
  state.loadedSeries = p.series;
  state.loadedEpisode = p.episode;
  state.lastOnline = anilistId != null ? { anilistId, name: fileName } : null;
}
