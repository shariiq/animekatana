import { describe, expect, it } from "vitest";

const runLive = process.env.RUN_LIVE_TESTS === "true";
const describeLive = runLive ? describe : describe.skip;

describeLive("live AniList to AniSource playback workflow", () => {
	it("resolves a real AniList title and, when safely matched, reaches a stream URL", async () => {
		const [{ getAnime }, { resolvePlayback }, { anisource }] = await Promise.all([
			import("../../lib/anilist/client"),
			import("../../lib/anisource/matcher"),
			import("../../lib/anisource/client"),
		]);

		// Naruto is a long-lived catalogue entry with multiple alternate titles, which
		// exercises the matcher rather than relying on an opaque AniSource identifier.
		const { anime } = await getAnime(20);
		expect(anime.title.english).toBe("Naruto");

		const resolution = await resolvePlayback(anime);
		expect(["matched", "ambiguous", "unavailable"]).toContain(resolution.state);

		if (resolution.state !== "matched") return;

		expect(resolution.sourceId).toMatch(/^[a-z0-9-]+$/);
		expect(resolution.animeId).not.toBe("");
		expect(resolution.confidence).toBeGreaterThanOrEqual(0.82);

		const episodes = await anisource.episodes(resolution.sourceId, resolution.animeId);
		expect(episodes.length).toBeGreaterThan(0);
		expect(episodes[0].id).not.toBe("");
		expect(episodes[0].number).toBeGreaterThan(0);

		const servers = await anisource.servers(resolution.sourceId, episodes[0].id);
		expect(servers.length).toBeGreaterThan(0);
		expect(servers[0].id).not.toBe("");

		const streams = await anisource.streams(resolution.sourceId, episodes[0].id, servers[0].id);
		expect(streams.length).toBeGreaterThan(0);
		expect(streams[0].url).toMatch(/^https?:\/\//);
		expect(typeof streams[0].is_hls).toBe("boolean");
	}, 90_000);

	it("preserves the matcher result for the same anime during its cache lifetime", async () => {
		const [{ getAnime }, { resolvePlayback }] = await Promise.all([
			import("../../lib/anilist/client"),
			import("../../lib/anisource/matcher"),
		]);
		const { anime } = await getAnime(20);

		const first = await resolvePlayback(anime);
		const second = await resolvePlayback(anime);

		expect(second).toEqual(first);
	}, 60_000);
});
