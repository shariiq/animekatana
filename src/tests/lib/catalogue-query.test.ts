import { describe, expect, it } from "vitest";
import {
	catalogueHref,
	parseCatalogueQuery,
	parseRankingsQuery,
	rankingsHref,
} from "../../lib/catalogue-query";

describe("catalogue query helpers", () => {
	it("validates values and defaults unsupported input", () => {
		const query = parseCatalogueQuery(
			new URLSearchParams("page=0&format=bad&season=AUTUMN&year=abc&sort=NOPE"),
		);
		expect(query).toEqual({ page: 1, sort: "POPULARITY_DESC" });
	});

	it("serialises filters and encodes values", () => {
		const query = parseCatalogueQuery(
			new URLSearchParams("genre=Slice+of+Life&format=TV&year=2024&sort=SCORE_DESC"),
		);
		expect(catalogueHref(query, { page: 2 })).toBe(
			"/browse?page=2&genre=Slice+of+Life&format=TV&year=2024&sort=SCORE_DESC",
		);
	});

	it("preserves all state while changing page", () => {
		const query = parseCatalogueQuery(
			new URLSearchParams("genre=Action&status=RELEASING&season=SPRING&year=2025"),
		);
		expect(catalogueHref(query, { page: 3 })).toContain("genre=Action");
		expect(catalogueHref(query, { page: 3 })).toContain("status=RELEASING");
		expect(catalogueHref(query, { page: 3 })).toContain("season=SPRING");
	});

	it("validates rankings and omits defaults", () => {
		const query = parseRankingsQuery(new URLSearchParams("page=2&type=SCORE_DESC"));
		expect(rankingsHref(query)).toBe("/rankings?page=2&type=SCORE_DESC");
		expect(parseRankingsQuery(new URLSearchParams("type=invalid")).type).toBe("POPULARITY_DESC");
	});
});
