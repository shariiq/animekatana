import { beforeEach, describe, expect, it, vi } from "vitest";
import { anisource } from "../../../lib/anisource/client";
import { clearPlaybackResolutionCache, resolvePlayback } from "../../../lib/anisource/matcher";
import type { Anime } from "../../../lib/types";

const source = {
	id: "source-one",
	name: "Source One",
	base_url: "https://example.test",
};

function makeAnime(id = "1", title = "Test Anime"): Anime {
	return {
		id,
		slug: "test-anime",
		title: { english: title, romaji: title, native: null, synonyms: [] },
		coverImage: { large: "", extraLarge: "" },
		bannerImage: null,
		description: null,
		genres: [],
		tags: [],
		status: "Completed",
		format: "TV",
		season: null,
		year: 2024,
		episodes: 12,
		duration: 24,
		score: 80,
		popularity: 100,
		rank: 1,
		studios: [],
		producers: [],
		startDate: "2024-01-01",
		endDate: "2024-04-01",
		trailer: null,
		externalLinks: {},
	};
}

describe("resolvePlayback", () => {
	beforeEach(() => {
		clearPlaybackResolutionCache();
		vi.restoreAllMocks();
		vi.spyOn(anisource, "sources").mockResolvedValue([source]);
	});

	it("resolves a unique exact title match", async () => {
		vi.spyOn(anisource, "search").mockResolvedValue([
			{ id: "opaque/anime-id", title: "Test Anime", alternative_titles: [] },
		]);

		await expect(resolvePlayback(makeAnime())).resolves.toMatchObject({
			state: "matched",
			sourceId: source.id,
			animeId: "opaque/anime-id",
			title: "Test Anime",
			confidence: 1,
		});
	});

	it("refuses automatic resolution when top candidates are too close", async () => {
		vi.spyOn(anisource, "search").mockResolvedValue([
			{ id: "first", title: "Test Anime", alternative_titles: [] },
			{ id: "second", title: "Test Anime!", alternative_titles: [] },
		]);

		await expect(resolvePlayback(makeAnime())).resolves.toMatchObject({
			state: "ambiguous",
			candidates: expect.arrayContaining([
				expect.objectContaining({ animeId: "first" }),
				expect.objectContaining({ animeId: "second" }),
			]),
		});
	});

	it("reports unavailable when no source candidates meet the threshold", async () => {
		vi.spyOn(anisource, "search").mockResolvedValue([]);

		await expect(resolvePlayback(makeAnime())).resolves.toEqual({
			state: "unavailable",
			reason: "No safe playback match was found for this title.",
		});
	});

	it("caches a completed resolution for an identical request", async () => {
		const search = vi
			.spyOn(anisource, "search")
			.mockResolvedValue([{ id: "opaque-id", title: "Test Anime", alternative_titles: [] }]);

		await resolvePlayback(makeAnime());
		await resolvePlayback(makeAnime());

		expect(search).toHaveBeenCalledTimes(1);
	});
});
