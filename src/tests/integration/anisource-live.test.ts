import { describe, expect, it } from "vitest";

const apiBase = "https://anisource-api.onrender.com/api/v1";
const runLive = process.env.RUN_LIVE_TESTS === "true";
const describeLive = runLive ? describe : describe.skip;

type Source = { id: string; name: string; base_url: string };
type Anime = { id: string; title: string };
type Episode = { id: string; number: number; title: string };
type Server = { id: string; name: string; type: string };
type Stream = {
	url: string;
	quality: string;
	is_hls: boolean;
	headers?: Record<string, string>;
	subtitles?: Array<{ url: string; label: string; language: string }>;
};

async function getJson<T>(path: string): Promise<T> {
	const response = await fetch(`${apiBase}${path}`, {
		headers: { accept: "application/json" },
		signal: AbortSignal.timeout(30_000),
	});
	expect(response.ok, `${path} returned ${response.status}`).toBe(true);
	return (await response.json()) as T;
}

describeLive("AniSource deployed API contract", () => {
	it("lists active sources with the documented response contract", async () => {
		const response = await getJson<{ sources: Source[]; count: number }>("/sources");

		expect(response.count).toBe(response.sources.length);
		expect(response.sources.length).toBeGreaterThan(0);
		for (const source of response.sources) {
			expect(source.id).toMatch(/^[a-z0-9-]+$/);
			expect(source.name).not.toBe("");
			expect(source.base_url).toMatch(/^https?:\/\//);
		}
	});

	it("searches each deployed source and preserves its paginated response shape", async () => {
		const { sources } = await getJson<{ sources: Source[] }>("/sources");

		for (const source of sources) {
			const response = await getJson<{
				items: Anime[];
				page: number;
				has_next: boolean;
				total_returned: number;
			}>(`/${encodeURIComponent(source.id)}/search?q=Naruto&page=1`);

			expect(response.page).toBe(1);
			expect(response.total_returned).toBe(response.items.length);
			expect(typeof response.has_next).toBe("boolean");
			expect(response.items.length).toBeGreaterThan(0);
			for (const anime of response.items) {
				expect(anime.id).not.toBe("");
				expect(anime.title).not.toBe("");
			}
		}
	}, 90_000);

	it("supports the complete AniWaves search-to-stream workflow", async () => {
		const search = await getJson<{ items: Anime[] }>("/aniwaves/search?q=Naruto&page=1");
		expect(search.items.length).toBeGreaterThan(0);

		const anime = search.items[0];
		const episodes = await getJson<Episode[]>(`/aniwaves/episodes/${encodeURIComponent(anime.id)}`);
		expect(episodes.length).toBeGreaterThan(0);
		expect(episodes[0].id).not.toBe("");
		expect(episodes[0].number).toBeGreaterThan(0);

		const servers = await getJson<Server[]>(
			`/aniwaves/servers/${encodeURIComponent(episodes[0].id)}`,
		);
		expect(servers.length).toBeGreaterThan(0);
		expect(servers[0].id).not.toBe("");
		expect(servers[0].name).not.toBe("");
		expect(servers[0].type).not.toBe("");

		const streams = await getJson<Stream[]>(
			`/aniwaves/streams/${encodeURIComponent(episodes[0].id)}?server_id=${encodeURIComponent(servers[0].id)}`,
		);
		expect(streams.length).toBeGreaterThan(0);
		for (const stream of streams) {
			expect(stream.url).toMatch(/^https?:\/\//);
			expect(stream.quality).not.toBe("");
			expect(typeof stream.is_hls).toBe("boolean");
			if (stream.headers) expect(typeof stream.headers).toBe("object");
			if (stream.subtitles) {
				for (const subtitle of stream.subtitles) {
					expect(subtitle.url).toMatch(/^https?:\/\//);
					expect(subtitle.label).not.toBe("");
					expect(subtitle.language).not.toBe("");
				}
			}
		}
	}, 90_000);

	it("rejects invalid request shapes rather than pretending they succeeded", async () => {
		const missingSearch = await fetch(`${apiBase}/aniwaves/search`);
		expect(missingSearch.status).toBeGreaterThanOrEqual(400);
		expect(missingSearch.status).toBeLessThan(500);

		const missingServer = await fetch(`${apiBase}/aniwaves/streams/not-an-episode`);
		expect(missingServer.status).toBeGreaterThanOrEqual(400);
		expect(missingServer.status).toBeLessThan(500);
	});

	it("accepts opaque anime IDs encoded as path parameters", async () => {
		const search = await getJson<{ items: Anime[] }>("/aniwaves/search?q=One%20Piece&page=1");
		expect(search.items.length).toBeGreaterThan(0);

		const response = await fetch(
			`${apiBase}/aniwaves/episodes/${encodeURIComponent(search.items[0].id)}`,
			{ signal: AbortSignal.timeout(30_000) },
		);
		expect(response.ok).toBe(true);
		expect(Array.isArray(await response.json())).toBe(true);
	}, 60_000);
});
