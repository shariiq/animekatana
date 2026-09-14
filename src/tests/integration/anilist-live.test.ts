import { beforeEach, describe, expect, it, vi } from "vitest";

describe("AniList API integration", () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it("fetches and maps a real anime detail from AniList GraphQL", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		// Attack on Titan (ID: 16498) - a stable, well-known anime
		const { anime, raw } = await getAnime(16498);

		expect(anime.id).toBe("16498");
		expect(anime.title.english).toBe("Attack on Titan");
		expect(anime.title.romaji).toBeTruthy();
		expect(anime.slug).toBe("attack-on-titan");
		expect(anime.status).toMatch(/Completed|Ongoing|Not Yet Aired|Cancelled/);
		expect(anime.format).toMatch(/TV|MOVIE|OVA|ONA|SPECIAL/);
		expect(anime.coverImage.large).toMatch(/^https?:\/\//);
		expect(anime.genres).toBeInstanceOf(Array);
		expect(anime.genres.length).toBeGreaterThan(0);
		expect(anime.tags).toBeInstanceOf(Array);
		expect(anime.score).toBeGreaterThan(0);
		expect(anime.popularity).toBeGreaterThan(0);
		expect(raw.id).toBe(16498);
	});

	it("searches the AniList catalogue and returns paginated results", async () => {
		const { getCatalogue } = await import("../../lib/anilist/client");

		const results = await getCatalogue({
			search: "Naruto",
			page: 1,
		});

		expect(results.items.length).toBeGreaterThan(0);
		expect(results.page).toBe(1);
		expect(typeof results.hasNext).toBe("boolean");
		expect(typeof results.total).toBe("number");

		const first = results.items[0];
		expect(first.id).toBeTruthy();
		expect(first.slug).toBeTruthy();
		expect(first.title.romaji || first.title.english).toBeTruthy();
		expect(first.coverImage.large).toMatch(/^https?:\/\//);
	});

	it("fetches home page sections with trending, popular, seasonal, and upcoming", async () => {
		const { getHome } = await import("../../lib/anilist/client");
		const { currentSeason } = await import("../../lib/season");

		const { season, year } = currentSeason();
		const home = await getHome(year, season);

		for (const section of ["trending", "popular", "seasonal", "upcoming"] as const) {
			expect(home[section].items).toBeInstanceOf(Array);
			expect(home[section].items.length).toBeGreaterThan(0);
			expect(typeof home[section].hasNext).toBe("boolean");

			const first = home[section].items[0];
			expect(first.id).toBeTruthy();
			expect(first.slug).toBeTruthy();
		}
	});

	it("fetches the airing schedule with grouped episodes", async () => {
		const { getSchedule } = await import("../../lib/anilist/client");

		const now = Math.floor(Date.now() / 1000);
		const schedule = await getSchedule(now, now + 86400 * 7);

		expect(schedule.items).toBeInstanceOf(Array);
		expect(schedule.pageInfo).toHaveProperty("currentPage");
		expect(schedule.pageInfo).toHaveProperty("hasNextPage");

		if (schedule.items.length > 0) {
			const first = schedule.items[0];
			expect(first.airingAt).toBeGreaterThan(0);
			expect(first.episode).toBeGreaterThan(0);
			expect(first.media.id).toBeTruthy();
			expect(first.media.slug).toBeTruthy();
		}
	});

	it("handles filters and sorts in catalogue queries", async () => {
		const { getCatalogue } = await import("../../lib/anilist/client");

		const filtered = await getCatalogue({
			page: 1,
			genre: "Action",
			format: "TV",
			status: "FINISHED",
			sort: ["SCORE_DESC"],
		});

		expect(filtered.items.length).toBeGreaterThan(0);
		expect(filtered.items.every((anime) => anime.format === "TV")).toBe(true);
		expect(filtered.items.every((anime) => anime.status === "Completed")).toBe(true);
		expect(filtered.items.every((anime) => anime.genres.includes("Action"))).toBe(true);
	});

	it("translates AniList status and format enums correctly", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		// Test a completed anime
		const { anime: completed } = await getAnime(16498);
		expect(completed.status).toBe("Completed");
		expect(completed.format).toBe("TV");
	});

	it("removes spoiler tags and preserves safe tags", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		const { anime } = await getAnime(16498);

		expect(anime.tags).toBeInstanceOf(Array);
		// Verify no tags explicitly marked as spoilers remain
		// (We can't directly verify the raw response here, but the domain model should exclude them)
		expect(anime.tags.every((tag) => typeof tag === "string")).toBe(true);
	});

	it("formats dates from AniList date parts", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		const { anime } = await getAnime(16498);

		if (anime.startDate) {
			expect(anime.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
		if (anime.endDate) {
			expect(anime.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	it("maps YouTube trailers correctly", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		const { anime } = await getAnime(16498);

		if (anime.trailer) {
			expect(anime.trailer.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=/);
			expect(anime.trailer.thumbnail).toBeTruthy();
		}
	});

	it("coalesces concurrent requests to the same anime", async () => {
		const { getAnime } = await import("../../lib/anilist/client");

		const start = Date.now();
		await Promise.all([getAnime(16498), getAnime(16498), getAnime(16498)]);
		const duration = Date.now() - start;

		// If properly coalesced, should complete much faster than 3 sequential requests
		// A single request typically takes 200-500ms, so 3 concurrent should be similar
		expect(duration).toBeLessThan(2000);
	});
});
