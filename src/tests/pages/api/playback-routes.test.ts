/**
 * Comprehensive tests for playback API routes.
 * Verifies parameter validation, upstream delegation, error translation, and response contracts.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("playback API routes", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	describe("/api/playback/resolve", () => {
		it("validates animeId parameter is a positive integer", async () => {
			const { GET } = await import("../../../pages/api/playback/resolve");

			const invalidCases = [
				new URL("http://localhost/api/playback/resolve"), // missing
				new URL("http://localhost/api/playback/resolve?animeId="), // empty
				new URL("http://localhost/api/playback/resolve?animeId=abc"), // non-numeric
				new URL("http://localhost/api/playback/resolve?animeId=1.5"), // decimal
				new URL("http://localhost/api/playback/resolve?animeId=0"), // zero
				new URL("http://localhost/api/playback/resolve?animeId=-5"), // negative
			];

			for (const url of invalidCases) {
				const response = await GET({ url } as Parameters<typeof GET>[0]);
				expect(response.status).toBe(400);
				const body = await response.json();
				expect(body.error).toContain("valid animeId");
			}
		});

		it("delegates to getAnime and resolvePlayback on valid input", async () => {
			const mockAnime = {
				id: "1",
				slug: "test",
				title: {
					english: "Test Anime",
					romaji: "Test",
					native: null,
					synonyms: [],
				},
				coverImage: { large: "", extraLarge: "" },
				bannerImage: null,
				description: null,
				genres: [],
				tags: [],
				status: "Completed" as const,
				format: "TV" as const,
				season: null,
				year: 2024,
				episodes: null,
				duration: null,
				score: null,
				popularity: null,
				rank: null,
				studios: [],
				producers: [],
				startDate: null,
				endDate: null,
				trailer: null,
				externalLinks: {},
			};

			vi.doMock("../../../lib/anilist/client", () => ({
				getAnime: vi.fn().mockResolvedValue({ anime: mockAnime, raw: {} }),
			}));

			vi.doMock("../../../lib/anisource/matcher", () => ({
				resolvePlayback: vi.fn().mockResolvedValue({
					state: "matched",
					sourceId: "aniwaves",
					animeId: "test-id",
					title: "Test Anime",
					confidence: 0.95,
				}),
			}));

			const { GET } = await import("../../../pages/api/playback/resolve");
			const url = new URL("http://localhost/api/playback/resolve?animeId=1");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.state).toBe("matched");
			expect(body.sourceId).toBe("aniwaves");
		});

		it("translates upstream errors to 502 with meaningful message", async () => {
			vi.doMock("../../../lib/anilist/client", () => ({
				getAnime: vi.fn().mockRejectedValue(new Error("AniList is temporarily unavailable.")),
			}));

			const { GET } = await import("../../../pages/api/playback/resolve");
			const url = new URL("http://localhost/api/playback/resolve?animeId=1");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(502);
			const body = await response.json();
			expect(body.error).toBe("AniList is temporarily unavailable.");
		});
	});

	describe("/api/playback/episodes", () => {
		it("validates required source and anime parameters", async () => {
			const { GET } = await import("../../../pages/api/playback/episodes");

			const invalidCases = [
				new URL("http://localhost/api/playback/episodes"), // both missing
				new URL("http://localhost/api/playback/episodes?source=aniwaves"), // anime missing
				new URL("http://localhost/api/playback/episodes?anime=test-id"), // source missing
			];

			for (const url of invalidCases) {
				const response = await GET({ url } as Parameters<typeof GET>[0]);
				expect(response.status).toBe(400);
				const body = await response.json();
				expect(body.error).toContain("source and anime are required");
			}
		});

		it("delegates to anisource.episodes with encoded parameters", async () => {
			const mockEpisodes = [
				{ id: "ep-1", number: 1, title: "Episode 1" },
				{ id: "ep-2", number: 2, title: "Episode 2" },
			];

			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					episodes: vi.fn().mockResolvedValue(mockEpisodes),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/episodes");
			const url = new URL("http://localhost/api/playback/episodes?source=aniwaves&anime=test-id");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(Array.isArray(body)).toBe(true);
			expect(body.length).toBe(2);
			expect(body[0].id).toBe("ep-1");
		});

		it("returns 502 with error message when anisource.episodes fails", async () => {
			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					episodes: vi.fn().mockRejectedValue(new Error("Playback data was not found.")),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/episodes");
			const url = new URL("http://localhost/api/playback/episodes?source=aniwaves&anime=test-id");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(502);
			const body = await response.json();
			expect(body.error).toBe("Playback data was not found.");
		});
	});

	describe("/api/playback/servers", () => {
		it("validates required source and episode parameters", async () => {
			const { GET } = await import("../../../pages/api/playback/servers");

			const invalidCases = [
				new URL("http://localhost/api/playback/servers"),
				new URL("http://localhost/api/playback/servers?source=aniwaves"),
				new URL("http://localhost/api/playback/servers?episode=ep-1"),
			];

			for (const url of invalidCases) {
				const response = await GET({ url } as Parameters<typeof GET>[0]);
				expect(response.status).toBe(400);
				const body = await response.json();
				expect(body.error).toContain("source and episode are required");
			}
		});

		it("returns server array from anisource.servers", async () => {
			const mockServers = [
				{ id: "server-1", name: "HD Server", type: "sub" },
				{ id: "server-2", name: "Backup", type: "sub" },
			];

			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					servers: vi.fn().mockResolvedValue(mockServers),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/servers");
			const url = new URL("http://localhost/api/playback/servers?source=aniwaves&episode=ep-1");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.length).toBe(2);
			expect(body[0].name).toBe("HD Server");
		});

		it("translates upstream failures to 502 status", async () => {
			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					servers: vi.fn().mockRejectedValue(new Error("Servers are unavailable.")),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/servers");
			const url = new URL("http://localhost/api/playback/servers?source=aniwaves&episode=ep-1");
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(502);
			const body = await response.json();
			expect(body.error).toBe("Servers are unavailable.");
		});
	});

	describe("/api/playback/streams", () => {
		it("validates all three required parameters", async () => {
			const { GET } = await import("../../../pages/api/playback/streams");

			const invalidCases = [
				new URL("http://localhost/api/playback/streams"), // all missing
				new URL("http://localhost/api/playback/streams?source=aniwaves"), // episode and server missing
				new URL("http://localhost/api/playback/streams?source=aniwaves&episode=ep-1"), // server missing
				new URL("http://localhost/api/playback/streams?episode=ep-1&server=s1"), // source missing
			];

			for (const url of invalidCases) {
				const response = await GET({ url } as Parameters<typeof GET>[0]);
				expect(response.status).toBe(400);
				const body = await response.json();
				expect(body.error).toContain("source, episode, and server are required");
			}
		});

		it("returns stream array as-is from anisource.streams", async () => {
			const mockStreams = [
				{
					url: "https://example.test/stream.m3u8",
					quality: "1080p",
					is_hls: true,
					headers: { Referer: "https://aniwaves.ru" },
					subtitles: [],
				},
				{
					url: "https://example.test/stream-720.m3u8",
					quality: "720p",
					is_hls: true,
					headers: {},
					subtitles: [],
				},
			];

			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					streams: vi.fn().mockResolvedValue(mockStreams),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/streams");
			const url = new URL(
				"http://localhost/api/playback/streams?source=aniwaves&episode=ep-1&server=hd",
			);
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body.length).toBe(2);
			expect(body[0].url).toMatch(/^https?:\/\//);
			expect(body[0].headers).toBeDefined();
			expect(typeof body[0].is_hls).toBe("boolean");
		});

		it("preserves AniSource proxy URLs and headers unchanged", async () => {
			const streamWithProxy = {
				url: "https://anisource-api.onrender.com/api/v1/proxy/hls/token123",
				quality: "1080p",
				is_hls: true,
				headers: { "X-Custom": "value", Referer: "https://upstream.test" },
				subtitles: [],
			};

			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					streams: vi.fn().mockResolvedValue([streamWithProxy]),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/streams");
			const url = new URL(
				"http://localhost/api/playback/streams?source=aniwaves&episode=ep-1&server=hd",
			);
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body[0].url).toBe("https://anisource-api.onrender.com/api/v1/proxy/hls/token123");
			expect(body[0].headers).toEqual(streamWithProxy.headers);
		});

		it("returns 502 when streams cannot be retrieved", async () => {
			vi.doMock("../../../lib/anisource/client", () => ({
				anisource: {
					streams: vi.fn().mockRejectedValue(new Error("Stream extraction failed")),
				},
			}));

			const { GET } = await import("../../../pages/api/playback/streams");
			const url = new URL(
				"http://localhost/api/playback/streams?source=aniwaves&episode=ep-1&server=hd",
			);
			const response = await GET({ url } as Parameters<typeof GET>[0]);

			expect(response.status).toBe(502);
			const body = await response.json();
			expect(body.error).toBe("Stream extraction failed");
		});
	});
});
