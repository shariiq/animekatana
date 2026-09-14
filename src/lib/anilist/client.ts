import { SingleFlight } from '../cache/single-flight';
import { TTLCache } from '../cache/ttl-cache';
import type { Anime, PaginatedResponse } from '../types';
import { CATALOGUE_QUERY, DETAIL_QUERY, HOME_QUERY, SCHEDULE_QUERY } from './queries';

const endpoint = 'https://graphql.anilist.co';
const cache = new TTLCache<unknown>();
const singleFlight = new SingleFlight<unknown>();

export class AniListError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); }
}

type DateParts = { year: number | null; month: number | null; day: number | null } | null;
type RawMedia = Record<string, any>;

export function date(parts: DateParts): string | null {
  if (!parts?.year) return null;
  return [parts.year, parts.month ?? 1, parts.day ?? 1].map((value, index) => index ? String(value).padStart(2, '0') : value).join('-');
}

export function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9-￿]+/g, '-').replace(/(^-|-$)/g, '');
}

export function mapAnime(media: RawMedia): Anime {
  const title = media.title ?? {};
  const primary = title.english || title.romaji || title.native || `anime-${media.id}`;
  const rank = (media.rankings ?? []).find((entry: any) => entry.type === 'RATED' && entry.allTime)?.rank ?? null;
  return {
    id: String(media.id), slug: slugify(primary),
    title: { english: title.english ?? null, romaji: title.romaji ?? null, native: title.native ?? null, synonyms: media.synonyms ?? [] },
    coverImage: { large: media.coverImage?.large ?? '', extraLarge: media.coverImage?.extraLarge ?? media.coverImage?.large ?? '' },
    bannerImage: media.bannerImage ?? null, description: media.description ?? null,
    genres: media.genres ?? [], tags: (media.tags ?? []).filter((tag: any) => !tag.isMediaSpoiler).map((tag: any) => tag.name),
    status: ({ FINISHED: 'Completed', RELEASING: 'Ongoing', NOT_YET_RELEASED: 'Not Yet Aired', CANCELLED: 'Cancelled', HIATUS: 'Ongoing' } as Record<string, Anime['status']>)[String(media.status)] ?? 'Not Yet Aired',
    format: ({ TV: 'TV', MOVIE: 'MOVIE', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'SPECIAL' } as Record<string, Anime['format']>)[String(media.format)] ?? 'SPECIAL',
    season: media.season ?? null, year: media.seasonYear ?? media.startDate?.year ?? null, episodes: media.episodes ?? null, duration: media.duration ?? null,
    score: media.averageScore ?? null, popularity: media.popularity ?? null, rank,
    studios: media.studios?.nodes?.map((studio: any) => studio.name) ?? [], producers: [],
    startDate: date(media.startDate), endDate: date(media.endDate),
    trailer: media.trailer?.site === 'youtube' ? { url: `https://www.youtube.com/watch?v=${media.trailer.id}`, thumbnail: media.trailer.thumbnail ?? '' } : null,
    externalLinks: Object.fromEntries((media.externalLinks ?? []).map((link: any) => [link.site, link.url])),
  };
}

async function execute<T>(query: string, variables: Record<string, unknown>, ttl: number): Promise<T> {
  const key = `anilist:${JSON.stringify({ query, variables })}`;
  const stored = cache.get(key) as T | null;
  if (stored) return stored;
  return singleFlight.getOrSet(key, async () => {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new AniListError(response.status === 429 ? 'AniList is rate-limiting requests. Please try again shortly.' : 'AniList is temporarily unavailable.', response.status);
    const body = await response.json();
    if (body.errors?.length) throw new AniListError(body.errors[0].message);
    cache.set(key, body.data as T, ttl);
    return body.data as T;
  }) as Promise<T>;
}

function page(raw: any): PaginatedResponse<Anime> {
  return { items: raw.media.map(mapAnime), page: raw.pageInfo.currentPage, hasNext: raw.pageInfo.hasNextPage, total: raw.pageInfo.total };
}

export async function getHome(year: number, season: string) {
  const data = await execute<any>(HOME_QUERY, { year, season }, 300);
  return { trending: page(data.trending), popular: page(data.popular), seasonal: page(data.seasonal), upcoming: page(data.upcoming) };
}

export async function getCatalogue(input: { page?: number; search?: string; season?: string; year?: number; format?: string; status?: string; genre?: string; tag?: string; sort?: string[] }) {
  const data = await execute<any>(CATALOGUE_QUERY, { page: input.page ?? 1, perPage: 24, search: input.search || null, season: input.season || null, seasonYear: input.year || null, format: input.format || null, status: input.status || null, genre: input.genre || null, tag: input.tag || null, sort: input.sort ?? ['POPULARITY_DESC'] }, input.search ? 900 : 300);
  return page(data.Page);
}

export async function getAnime(id: number): Promise<{ anime: Anime; raw: any }> {
  const data = await execute<any>(DETAIL_QUERY, { id }, 21_600);
  if (!data.Media) throw new AniListError('This anime could not be found.', 404);
  return { anime: mapAnime(data.Media), raw: data.Media };
}

export async function getSchedule(from: number, to: number, pageNumber = 1) {
  const data = await execute<any>(SCHEDULE_QUERY, { from, to, page: pageNumber }, 120);
  return { pageInfo: data.Page.pageInfo, items: data.Page.airingSchedules.map((item: any) => ({ ...item, media: mapAnime(item.media) })) };
}
