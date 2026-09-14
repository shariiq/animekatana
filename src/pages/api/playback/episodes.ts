import type { APIRoute } from "astro";
import { anisource } from "../../../lib/anisource/client";

export const GET: APIRoute = async ({ url }) => {
	const source = url.searchParams.get("source");
	const anime = url.searchParams.get("anime");
	if (!source || !anime)
		return Response.json({ error: "source and anime are required." }, { status: 400 });

	try {
		return Response.json(await anisource.episodes(source, anime));
	} catch (error) {
		return Response.json(
			{ error: error instanceof Error ? error.message : "Episodes are unavailable." },
			{ status: 502 },
		);
	}
};
