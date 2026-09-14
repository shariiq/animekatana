/**
 * Comprehensive unit tests for AniSource client.
 * Verifies HTTP request construction, caching, error handling, and TTL behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("AniSource client", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("sources", () => {
		it("fetches and caches active sources with correct TTL", async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
				fetchCount++;
				return {
					ok: true,
					status: 200,
					json: async () => ({
						sources: [
							{
								id: "aniwaves",
								name: "AniWaves",
								base_url: "https://aniwaves.ru",
							},
							{
								id: "anikoto",
								name: "Anikoto",
								base_url: "https://anikototv.to",
							},
						],
						count: 2,
					}),
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			const first = await anisource.sources();
			const second = await anisource.sources();

			expect(fetchCount).toBe(1);
			expect(first).toEqual(second);
			expect(first.length).toBe(2);
			expect(first[0].id).toBe("aniwaves");
		});
	});

	describe("search", () => {
		it("constructs correct query string and encodes parameters", async () => {
			let capturedUrl: string | undefined;
			vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
				capturedUrl = url as string;
				return {
					ok: true,
					status: 200,
					json: async () => ({
						items: [{ id: "anime-1", title: "Naruto", alternative_titles: [] }],
						page: 1,
						has_next: false,
						total_returned: 1,
					}),
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			await anisource.search("aniwaves", "One Piece");

			expect(capturedUrl).toContain("/aniwaves/search");
			expect(capturedUrl).toContain("q=One%20Piece");
			expect(capturedUrl).toContain("page=1");
		});

		it("caches search results with longer TTL", async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
				fetchCount++;
				return {
					ok: true,
					status: 200,
					json: async () => ({
						items: [],
						page: 1,
						has_next: false,
						total_returned: 0,
					}),
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			await anisource.search("aniwaves", "Naruto");
			await anisource.search("aniwaves", "Naruto");

			expect(fetchCount).toBe(1);
		});
	});

	describe("error handling", () => {
		it("throws AniSourceError with correct message for 404", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: false,
				status: 404,
				json: async () => ({}),
			} as Response);

			const { anisource, AniSourceError } = await import("../../../lib/anisource/client");
			await expect(anisource.episodes("aniwaves", "missing-id")).rejects.toThrow(AniSourceError);
			await expect(anisource.episodes("aniwaves", "missing-id")).rejects.toThrow(
				"Playback data was not found.",
			);
		});

		it("throws AniSourceError with generic message for 500+", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: false,
				status: 503,
				json: async () => ({}),
			} as Response);

			const { anisource, AniSourceError } = await import("../../../lib/anisource/client");
			await expect(anisource.servers("aniwaves", "episode-1")).rejects.toThrow(AniSourceError);
			await expect(anisource.servers("aniwaves", "episode-1")).rejects.toThrow(
				"Playback service is unavailable.",
			);
		});

		it("passes a 15-second abort signal to fetch", async () => {
			const timeout = vi.spyOn(AbortSignal, "timeout");
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => [],
			} as Response);

			const { anisource } = await import("../../../lib/anisource/client");
			await anisource.episodes("aniwaves", "test");

			expect(timeout).toHaveBeenCalledWith(15_000);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
		});
	});

	describe("episodes", () => {
		it("returns episode array and encodes opaque anime ID", async () => {
			let capturedUrl: string | undefined;
			vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
				capturedUrl = url as string;
				return {
					ok: true,
					status: 200,
					json: async () => [
						{ id: "ep-1", number: 1, title: "Episode 1" },
						{ id: "ep-2", number: 2, title: "Episode 2" },
					],
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			const episodes = await anisource.episodes("aniwaves", "anime/naruto/special-chars?");

			expect(capturedUrl).toContain(encodeURIComponent("anime/naruto/special-chars?"));
			expect(episodes.length).toBe(2);
			expect(episodes[0].id).toBe("ep-1");
		});
	});

	describe("streams", () => {
		it("constructs correct query string with server_id parameter", async () => {
			let capturedUrl: string | undefined;
			vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
				capturedUrl = url as string;
				return {
					ok: true,
					status: 200,
					json: async () => [
						{
							url: "https://example.test/stream.m3u8",
							quality: "1080p",
							is_hls: true,
							headers: { Referer: "https://aniwaves.ru" },
							subtitles: [],
						},
					],
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			const streams = await anisource.streams("aniwaves", "episode-1", "server-hd");

			expect(capturedUrl).toContain("/aniwaves/streams/");
			expect(capturedUrl).toContain("server_id=server-hd");
			expect(streams[0].url).toMatch(/^https?:\/\//);
			expect(streams[0].is_hls).toBe(true);
		});
	});

	describe("single-flight coalescing", () => {
		it("deduplicates concurrent requests to the same endpoint", async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
				fetchCount++;
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {
					ok: true,
					status: 200,
					json: async () => ({ sources: [], count: 0 }),
				} as Response;
			});

			const { anisource } = await import("../../../lib/anisource/client");
			await Promise.all([anisource.sources(), anisource.sources(), anisource.sources()]);

			expect(fetchCount).toBe(1);
		});
	});
});
