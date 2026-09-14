import { SingleFlight } from "../cache/single-flight";
import { TTLCache } from "../cache/ttl-cache";

const baseUrl = import.meta.env.ANISOURCE_API_URL ?? "https://anisource-api.onrender.com/api/v1";
const cache = new TTLCache<unknown>();
const flights = new SingleFlight<unknown>();

export class AniSourceError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(message);
	}
}

async function request<T>(path: string, ttl = 300): Promise<T> {
	const key = `anisource:${path}`;
	const existing = cache.get(key) as T | null;
	if (existing) return existing;
	return flights.getOrSet(key, async () => {
		const response = await fetch(`${baseUrl}${path}`, {
			headers: { accept: "application/json" },
			signal: AbortSignal.timeout(15_000),
		});
		if (!response.ok)
			throw new AniSourceError(
				response.status === 404
					? "Playback data was not found."
					: "Playback service is unavailable.",
				response.status,
			);
		const body = (await response.json()) as T;
		cache.set(key, body, ttl);
		return body;
	}) as Promise<T>;
}

export interface Source {
	id: string;
	name: string;
	base_url: string;
}
export interface SourceAnime {
	id: string;
	title: string;
	alternative_titles?: string[];
	alternativeTitles?: string[];
	thumbnail?: string;
	description?: string;
	status?: string;
	genres?: string[];
}
export interface SourceEpisode {
	id: string;
	number: number;
	title: string;
	has_sub?: boolean;
	has_dub?: boolean;
	released_at?: string;
}
export interface SourceServer {
	id: string;
	name: string;
	type: string;
}
export interface SourceStream {
	url: string;
	quality: string;
	headers: Record<string, string>;
	subtitles: { url: string; label: string; language: string }[];
	is_hls: boolean;
}

export const anisource = {
	sources: () => request<{ sources: Source[] }>("/sources", 900).then((result) => result.sources),
	search: (source: string, query: string) =>
		request<{ items: SourceAnime[] }>(
			`/${encodeURIComponent(source)}/search?q=${encodeURIComponent(query)}&page=1`,
			1_800,
		).then((result) => result.items),
	episodes: (source: string, animeId: string) =>
		request<SourceEpisode[]>(
			`/${encodeURIComponent(source)}/episodes/${encodeURIComponent(animeId)}`,
			1_800,
		),
	servers: (source: string, episodeId: string) =>
		request<SourceServer[]>(
			`/${encodeURIComponent(source)}/servers/${encodeURIComponent(episodeId)}`,
			600,
		),
	streams: (source: string, episodeId: string, serverId: string) =>
		request<SourceStream[]>(
			`/${encodeURIComponent(source)}/streams/${encodeURIComponent(episodeId)}?server_id=${encodeURIComponent(serverId)}`,
			120,
		),
};
