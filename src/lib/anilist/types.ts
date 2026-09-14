/**
 * AniList API specific types.
 */
import type { Anime, PaginatedResponse } from '../types';

export interface AniListAnime {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
    englishDescription: string | null;
  };
  coverImage: {
    large: string;
    extraLarge: string;
  };
  bannerImage: string | null;
  genres: string[];
  tags: string[];
  status: string;
  format: string;
  season: string | null;
  year: number | null;
  episodes: number | null;
  duration: number | null;
  score: number | null;
  popularity: number | null;
  rank: number | null;
  studios: { name: string }[];
  producers: { name: string }[];
  startDate: { year: number; month: number; day: number } | null;
  endDate: { year: number; month: number; day: number } | null;
  trailers: { url: string; thumbnail: string }[];
  externalLinks: Record<string, string>;
}

export interface AniListPageInfo {
  currentPage: number;
  hasNextPage: boolean;
  perPage: number;
  pageInfo: {
    prev: string | null;
    next: string | null;
  };
}

export interface AniListResponse<T> {
  page: {
    pageInfo: AniListPageInfo;
    page: T[];
  };
}
