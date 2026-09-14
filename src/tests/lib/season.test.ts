import { describe, expect, it } from "vitest";
import { currentSeason, humanSeason } from "../../lib/season";

describe("season utilities", () => {
	describe("currentSeason", () => {
		it.each([
			["2026-01-01T00:00:00.000Z", "WINTER"],
			["2026-03-31T23:59:59.999Z", "WINTER"],
			["2026-04-01T00:00:00.000Z", "SPRING"],
			["2026-06-30T23:59:59.999Z", "SPRING"],
			["2026-07-01T00:00:00.000Z", "SUMMER"],
			["2026-09-30T23:59:59.999Z", "SUMMER"],
			["2026-10-01T00:00:00.000Z", "FALL"],
			["2026-12-31T23:59:59.999Z", "FALL"],
		] as const)("maps %s to %s", (timestamp, expected) => {
			expect(currentSeason(new Date(timestamp))).toEqual({
				season: expected,
				year: 2026,
			});
		});

		it("uses UTC rather than the machine timezone", () => {
			const date = new Date("2026-04-01T00:30:00.000+14:00");
			expect(currentSeason(date)).toEqual({ season: "WINTER", year: 2026 });
		});

		it("preserves the UTC year at a year boundary", () => {
			expect(currentSeason(new Date("2027-01-01T00:00:00.000Z"))).toEqual({
				season: "WINTER",
				year: 2027,
			});
		});
	});

	describe("humanSeason", () => {
		it.each([
			["WINTER", "Winter"],
			["SPRING", "Spring"],
			["SUMMER", "Summer"],
			["FALL", "Fall"],
		])("formats %s as %s", (season, expected) => {
			expect(humanSeason(season)).toBe(expected);
		});

		it("handles an empty label without throwing", () => {
			expect(humanSeason("")).toBe("");
		});
	});
});
