/**
 * Comprehensive unit tests for AniList client.
 * Verifies GraphQL query construction, response mapping, error handling, and caching.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("AniList client", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.restoreAllMocks();
	});

	describe("getAnime", () => {
		it("constructs correct GraphQL request and maps response fields", async () => {
			const mockResponse = {
				data: {
					Media: {
						id: 16498,
						title: {
							romaji: "Shingeki no Kyojin",
							english: "Attack on Titan",
							native: "進撃の巨人",
						},
						synonyms: ["AoT"],
						coverImage: {
							large: "https://example.test/cover.jpg",
							extraLarge: "https://example.test/cover-xl.jpg",
						},
						bannerImage: "https://example.test/banner.jpg",
						description: "Humans vs Titans",
						genres: ["Action", "Drama"],
						tags: [
							{ name: "War", isMediaSpoiler: false },
							{ name: "Plot Twist", isMediaSpoiler: true },
						],
						status: "FINISHED",
						format: "TV",
						season: "SPRING",
						seasonYear: 2013,
						episodes: 25,
						duration: 24,
						averageScore: 85,
						popularity: 500000,
						rankings: [{ type: "RATED", allTime: true, rank: 5 }],
						studios: { nodes: [{ name: "Wit Studio" }] },
						startDate: { year: 2013, month: 4, day: 7 },
						endDate: { year: 2013, month: 9, day: 29 },
						trailer: {
							site: "youtube",
							id: "dQw4w9WgXcQ",
							thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
						},
						externalLinks: [{ site: "Official Site", url: "https://shingeki.tv/" }],
					},
				},
			};

			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => mockResponse,
			} as Response);

			const { getAnime } = await import("../../../lib/anilist/client");
			const { anime, raw } = await getAnime(16498);

			expect(anime.id).toBe("16498");
			expect(anime.title.english).toBe("Attack on Titan");
			expect(anime.title.romaji).toBe("Shingeki no Kyojin");
			expect(anime.title.native).toBe("進撃の巨人");
			expect(anime.title.synonyms).toEqual(["AoT"]);
			expect(anime.slug).toBe("attack-on-titan");
			expect(anime.status).toBe("Completed");
			expect(anime.format).toBe("TV");
			expect(anime.genres).toEqual(["Action", "Drama"]);
			expect(anime.tags).toEqual(["War"]); // spoiler tags excluded
			expect(anime.score).toBe(85);
			expect(anime.rank).toBe(5);
			expect(anime.startDate).toBe("2013-04-07");
			expect(anime.endDate).toBe("2013-09-29");
			expect(anime.trailer?.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
			expect(anime.externalLinks["Official Site"]).toBe("https://shingeki.tv/");
			expect(raw).toBe(mockResponse.data.Media);
		});

		it("throws AniListError when anime does not exist", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ data: { Media: null } }),
			} as Response);

			const { getAnime, AniListError } = await import("../../../lib/anilist/client");
			await expect(getAnime(99999999)).rejects.toThrow(AniListError);
			await expect(getAnime(99999999)).rejects.toThrow("This anime could not be found.");
		});

		it("throws AniListError when GraphQL returns errors", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ errors: [{ message: "Invalid ID format" }] }),
			} as Response);

			const { getAnime, AniListError } = await import("../../../lib/anilist/client");
			await expect(getAnime(-1)).rejects.toThrow(AniListError);
			await expect(getAnime(-1)).rejects.toThrow("Invalid ID format");
		});

		it("throws AniListError with rate-limit message on HTTP 429", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: false,
				status: 429,
				json: async () => ({}),
			} as Response);

			const { getAnime, AniListError } = await import("../../../lib/anilist/client");
			await expect(getAnime(1)).rejects.toThrow(AniListError);
			await expect(getAnime(1)).rejects.toThrow(/rate-limiting/i);
		});

		it("coalesces concurrent requests for the same anime into one upstream call", async () => {
			let fetchCount = 0;
			vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
				fetchCount++;
				await new Promise((resolve) => setTimeout(resolve, 50));
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							Media: {
								id: 1,
								title: { romaji: "Test", english: null, native: null },
								synonyms: [],
								coverImage: { large: "", extraLarge: "" },
								genres: [],
								tags: [],
								status: "FINISHED",
								format: "TV",
								rankings: [],
								studios: { nodes: [] },
								startDate: null,
								endDate: null,
								externalLinks: [],
							},
						},
					}),
				} as Response;
			});

			const { getAnime } = await import("../../../lib/anilist/client");
			await Promise.all([getAnime(1), getAnime(1), getAnime(1)]);

			expect(fetchCount).toBe(1);
		});
	});

	describe("getCatalogue", () => {
		it("omits null filters from the GraphQL query to avoid restrictive behavior", async () => {
			let capturedBody: string | undefined;
			vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
				capturedBody = (init as RequestInit).body as string;
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							Page: {
								pageInfo: {
									currentPage: 1,
									hasNextPage: false,
									total: 0,
									perPage: 24,
								},
								media: [],
							},
						},
					}),
				} as Response;
			});

			const { getCatalogue } = await import("../../../lib/anilist/client");
			await getCatalogue({ search: "Naruto", page: 1 });

			if (capturedBody === undefined) throw new Error("fetch body was not captured");
			const parsed = JSON.parse(capturedBody);
			expect(parsed.query).not.toContain("$format");
			expect(parsed.query).not.toContain("$status");
			expect(parsed.variables.format).toBeUndefined();
			expect(parsed.variables.status).toBeUndefined();
		});

		it("includes only provided filters in query and variables", async () => {
			let capturedBody: string | undefined;
			vi.spyOn(globalThis, "fetch").mockImplementation(async (_, init) => {
				capturedBody = (init as RequestInit).body as string;
				return {
					ok: true,
					status: 200,
					json: async () => ({
						data: {
							Page: {
								pageInfo: {
									currentPage: 1,
									hasNextPage: true,
									total: 100,
									perPage: 24,
								},
								media: Array.from({ length: 24 }, (_, index) => ({
									id: index + 1,
									title: {
										romaji: `Title ${index}`,
										english: null,
										native: null,
									},
									synonyms: [],
									coverImage: { large: "", extraLarge: "" },
									genres: ["Action"],
									tags: [],
									status: "FINISHED",
									format: "TV",
									rankings: [],
									studios: { nodes: [] },
									startDate: null,
									endDate: null,
									externalLinks: [],
								})),
							},
						},
					}),
				} as Response;
			});

			const { getCatalogue } = await import("../../../lib/anilist/client");
			await getCatalogue({
				page: 2,
				genre: "Action",
				format: "TV",
				status: "FINISHED",
				sort: ["SCORE_DESC"],
			});

			if (capturedBody === undefined) throw new Error("fetch body was not captured");
			const parsed = JSON.parse(capturedBody);
			expect(parsed.query).toContain("$genre");
			expect(parsed.query).toContain("$format");
			expect(parsed.query).toContain("$status");
			expect(parsed.variables.genre).toBe("Action");
			expect(parsed.variables.format).toBe("TV");
			expect(parsed.variables.status).toBe("FINISHED");
			expect(parsed.variables.sort).toEqual(["SCORE_DESC"]);
		});

		it("returns paginated response with correct shape", async () => {
			vi.spyOn(globalThis, "fetch").mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					data: {
						Page: {
							pageInfo: {
								currentPage: 2,
								hasNextPage: true,
								total: 150,
								perPage: 24,
							},
							media: [
								{
									id: 25,
									title: {
										romaji: "Test Anime",
										english: "Test",
										native: null,
									},
									synonyms: [],
									coverImage: {
										large: "https://example.test/cover.jpg",
										extraLarge: "",
									},
									genres: [],
									tags: [],
									status: "FINISHED",
									format: "TV",
									rankings: [],
									studios: { nodes: [] },
									startDate: null,
									endDate: null,
									externalLinks: [],
								},
							],
						},
					},
				}),
			} as Response);

			const { getCatalogue } = await import("../../../lib/anilist/client");
			const result = await getCatalogue({ page: 2 });

			expect(result.page).toBe(2);
			expect(result.hasNext).toBe(true);
			expect(result.total).toBe(150);
			expect(result.items.length).toBe(1);
			expect(result.items[0].id).toBe("25");
		});
	});

	describe("slugify", () => {
		it("converts titles to URL-safe slugs", async () => {
			const { slugify } = await import("../../../lib/anilist/client");

			expect(slugify("Attack on Titan: The Final Season")).toBe("attack-on-titan-the-final-season");
			expect(slugify("My Hero Academia!!!")).toBe("my-hero-academia");
			expect(slugify("  Spaced   Title  ")).toBe("spaced-title");
			expect(slugify("Café Latté")).toBe("cafe-latte");
		});

		it("removes leading and trailing dashes", async () => {
			const { slugify } = await import("../../../lib/anilist/client");

			expect(slugify(" -Title- ")).toBe("title");
			expect(slugify("---Test---")).toBe("test");
		});
	});

	describe("date", () => {
		it("formats complete date parts to ISO date string", async () => {
			const { date } = await import("../../../lib/anilist/client");

			expect(date({ year: 2024, month: 1, day: 15 })).toBe("2024-01-15");
			expect(date({ year: 2024, month: 12, day: 31 })).toBe("2024-12-31");
		});

		it("defaults missing month and day to 01", async () => {
			const { date } = await import("../../../lib/anilist/client");

			expect(date({ year: 2024, month: null, day: null })).toBe("2024-01-01");
			expect(date({ year: 2024, month: 5, day: null })).toBe("2024-05-01");
		});

		it("returns null when year is missing", async () => {
			const { date } = await import("../../../lib/anilist/client");

			expect(date(null)).toBeNull();
			expect(date({ year: null, month: 1, day: 1 })).toBeNull();
		});
	});
});
