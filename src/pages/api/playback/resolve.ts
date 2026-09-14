import type { APIRoute } from "astro";
import { getAnime } from "../../../lib/anilist/client";
import { resolvePlayback } from "../../../lib/anisource/matcher";

export const GET: APIRoute = async ({ url }) => {
	const animeId = Number(url.searchParams.get("animeId"));
	if (!Number.isInteger(animeId) || animeId <= 0) {
		return Response.json({ error: "A valid animeId is required." }, { status: 400 });
	}

	try {
		const { anime } = await getAnime(animeId);
		return Response.json(await resolvePlayback(anime));
	} catch (error) {
		const message = error instanceof Error ? error.message : "Playback matching failed.";
		return Response.json({ error: message }, { status: 502 });
	}
};
