export const seasons = ["WINTER", "SPRING", "SUMMER", "FALL"] as const;
export type Season = (typeof seasons)[number];

export function currentSeason(date = new Date()): { season: Season; year: number } {
	const month = date.getUTCMonth() + 1;
	if (month <= 3) return { season: "WINTER", year: date.getUTCFullYear() };
	if (month <= 6) return { season: "SPRING", year: date.getUTCFullYear() };
	if (month <= 9) return { season: "SUMMER", year: date.getUTCFullYear() };
	return { season: "FALL", year: date.getUTCFullYear() };
}

export const humanSeason = (season: string) => season.charAt(0) + season.slice(1).toLowerCase();
