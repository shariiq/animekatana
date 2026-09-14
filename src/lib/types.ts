/**
 * Core domain models used across the application.
 */

export type AnimeId = string;
export type EpisodeId = string;
export type ServerId = string;
export type StreamId = string;

export interface Anime {
	id: AnimeId;
	slug: string;
	title: {
		english: string | null;
		romaji: string | null;
		native: string | null;
		synonyms: string[];
	};
	coverImage: {
		large: string;
		extraLarge: string;
	};
	bannerImage: string | null;
	description: string | null;
	genres: string[];
	tags: string[];
	status: "Ongoing" | "Completed" | "Not Yet Aired" | "Cancelled";
	format: "TV" | "MOVIE" | "OVA" | "ONA" | "SPECIAL";
	season: "WINTER" | "SPRING" | "SUMMER" | "FALL" | null;
	year: number | null;
	episodes: number | null;
	duration: number | null;
	score: number | null;
	popularity: number | null;
	rank: number | null;
	studios: string[];
	producers: string[];
	startDate: string | null;
	endDate: string | null;
	trailer: {
		url: string;
		thumbnail: string;
	} | null;
	externalLinks: Record<string, string>;
}

export interface Episode {
	id: EpisodeId;
	number: number;
	title: string;
	thumbnail: string | null;
	duration: number | null;
	releasedAt: string | null;
}

export interface Server {
	id: ServerId;
	name: string;
	type: string;
}

export interface Subtitle {
	url: string;
	label: string;
	language: string;
}

export interface Stream {
	id: StreamId;
	url: string;
	quality: string;
	isHls: boolean;
	headers: Record<string, string>;
	subtitles: Subtitle[];
}

export interface PaginatedResponse<T> {
	items: T[];
	page: number;
	hasNext: boolean;
	total: number;
}
