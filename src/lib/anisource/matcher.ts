import type { Anime } from '../types';
import { TTLCache } from '../cache/ttl-cache';
import { anisource, type SourceAnime } from './client';

const MATCHER_VERSION = '2026-09-staged-v2';
const results = new TTLCache<Resolution>();

/** Clears process-local matcher results. Intended for cache invalidation and isolated tests. */
export function clearPlaybackResolutionCache(): void {
  results.clear();
}
export type Resolution =
  | { state: 'matched'; sourceId: string; animeId: string; title: string; confidence: number }
  | { state: 'ambiguous'; candidates: Candidate[] }
  | { state: 'unavailable'; reason: string };
type Candidate = { sourceId: string; animeId: string; title: string; confidence: number };

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/\b(season|part|cour)\s*(\d+|[ivxlcdm]+)\b/g, '$2')
    .replace(/\b(the|a|an)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}
function tokens(value: string) { return new Set(normalize(value).split(' ').filter(Boolean)); }
function similarity(a: string, b: string): number {
  const left = normalize(a); const right = normalize(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const aTokens = tokens(a); const bTokens = tokens(b);
  const intersection = [...aTokens].filter(token => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = union ? intersection / union : 0;
  const containment = left.includes(right) || right.includes(left) ? 0.18 : 0;
  const lengthPenalty = Math.min(left.length, right.length) / Math.max(left.length, right.length);
  return Math.min(0.92, jaccard * 0.68 + lengthPenalty * 0.22 + containment);
}
function aliases(anime: Anime, fallback: boolean) {
  const primary = [anime.title.english, anime.title.romaji].filter((title): title is string => Boolean(title));
  const later = [anime.title.native, ...anime.title.synonyms].filter((title): title is string => Boolean(title));
  return [...new Set(fallback ? [...primary, ...later] : primary)];
}
function scoreCandidate(anime: Anime, candidate: SourceAnime, query: string): number {
  const titles = [candidate.title, ...(candidate.alternative_titles ?? candidate.alternativeTitles ?? [])];
  return Math.max(...titles.map(title => similarity(query, title)), ...aliases(anime, true).map(title => similarity(title, candidate.title)));
}
async function searchSource(anime: Anime, sourceId: string, queries: string[]): Promise<Candidate[]> {
  const responses = await Promise.allSettled(queries.map(query => anisource.search(sourceId, query).then(items => ({ query, items }))));
  const byId = new Map<string, Candidate>();
  for (const response of responses) {
    if (response.status !== 'fulfilled') continue;
    for (const item of response.value.items) {
      const confidence = scoreCandidate(anime, item, response.value.query);
      const candidate = { sourceId, animeId: item.id, title: item.title, confidence };
      const current = byId.get(item.id);
      if (!current || candidate.confidence > current.confidence) byId.set(item.id, candidate);
    }
  }
  return [...byId.values()];
}

/** Strict, staged matching. It refuses automatic selection when scores are close. */
export async function resolvePlayback(anime: Anime, preferredSource?: string): Promise<Resolution> {
  const cacheKey = `${MATCHER_VERSION}:${anime.id}:${preferredSource ?? 'default'}`;
  const cached = results.get(cacheKey);
  if (cached) return cached;
  const sources = await anisource.sources();
  const preferred = sources.find(source => source.id === preferredSource) ?? sources[0];
  if (!preferred) return { state: 'unavailable', reason: 'No playback sources are currently available.' };
  const primary = aliases(anime, false);
  const first = await searchSource(anime, preferred.id, primary);
  const firstSorted = first.sort((a, b) => b.confidence - a.confidence);
  const firstBest = firstSorted[0];
  const firstRunnerUp = firstSorted[1];
  if (firstBest && firstBest.confidence >= 0.90 && (!firstRunnerUp || firstBest.confidence - firstRunnerUp.confidence >= 0.08)) {
    const match: Resolution = { state: 'matched', ...firstBest };
    results.set(cacheKey, match, 86_400); return match;
  }
  const fallbackSources = sources.filter(source => source.id !== preferred.id).slice(0, 3);
  const fallbackQueries = aliases(anime, true);
  const expanded = await Promise.all([searchSource(anime, preferred.id, fallbackQueries), ...fallbackSources.map(source => searchSource(anime, source.id, fallbackQueries))]);
  const candidates = [...new Map(expanded.flat().map(candidate => [`${candidate.sourceId}:${candidate.animeId}`, candidate])).values()].sort((a, b) => b.confidence - a.confidence);
  const best = candidates[0]; const next = candidates[1];
  if (best && best.confidence >= 0.82 && (!next || best.confidence - next.confidence >= 0.08)) {
    const match: Resolution = { state: 'matched', ...best };
    results.set(cacheKey, match, 86_400); return match;
  }
  const outcome: Resolution = candidates.filter(candidate => candidate.confidence >= 0.68).length
    ? { state: 'ambiguous', candidates: candidates.filter(candidate => candidate.confidence >= 0.68).slice(0, 5) }
    : { state: 'unavailable', reason: 'No safe playback match was found for this title.' };
  results.set(cacheKey, outcome, 21_600); return outcome;
}
