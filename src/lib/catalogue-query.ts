import { type Season, seasons } from "./season";

export const catalogueFormats = ["TV", "MOVIE", "OVA", "ONA", "SPECIAL"] as const;
export const catalogueStatuses = ["FINISHED", "RELEASING", "NOT_YET_RELEASED"] as const;
export const catalogueSorts = [
	"POPULARITY_DESC",
	"SCORE_DESC",
	"FAVOURITES_DESC",
	"TRENDING_DESC",
	"START_DATE_DESC",
	"TITLE_ROMAJI_ASC",
] as const;
export const rankingSorts = ["POPULARITY_DESC", "SCORE_DESC", "FAVOURITES_DESC"] as const;
export const catalogueGenres = [
	"Action",
	"Adventure",
	"Comedy",
	"Drama",
	"Ecchi",
	"Fantasy",
	"Horror",
	"Mahou Shoujo",
	"Mecha",
	"Music",
	"Mystery",
	"Psychological",
	"Romance",
	"Sci-Fi",
	"Slice of Life",
	"Sports",
	"Supernatural",
	"Thriller",
] as const;

type CatalogueFormat = (typeof catalogueFormats)[number];
type CatalogueStatus = (typeof catalogueStatuses)[number];
export type CatalogueSort = (typeof catalogueSorts)[number];
type CatalogueGenre = (typeof catalogueGenres)[number];

export interface CatalogueQuery {
	page: number;
	genre?: CatalogueGenre;
	format?: CatalogueFormat;
	status?: CatalogueStatus;
	season?: Season;
	year?: number;
	sort: CatalogueSort;
}

export interface RankingsQuery {
	page: number;
	type: (typeof rankingSorts)[number];
}

type QueryValue = string | number | undefined;
type QueryChanges<T> = Partial<T> & { page?: number };

function includes<T extends readonly string[]>(
	values: T,
	value: string | null,
): value is T[number] {
	return value !== null && values.includes(value);
}

function positivePage(value: string | null): number {
	if (!value || !/^\d+$/.test(value)) return 1;
	const page = Number(value);
	return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function validYear(value: string | null): number | undefined {
	if (!value || !/^\d{4}$/.test(value)) return undefined;
	const year = Number(value);
	return year >= 1900 && year <= 2100 ? year : undefined;
}

function setIfDefined(params: URLSearchParams, key: string, value: QueryValue) {
	if (value !== undefined) params.set(key, String(value));
}

export function parseCatalogueQuery(params: URLSearchParams): CatalogueQuery {
	const genre = params.get("genre");
	const format = params.get("format");
	const status = params.get("status");
	const season = params.get("season");
	const sort = params.get("sort");

	return {
		page: positivePage(params.get("page")),
		...(includes(catalogueGenres, genre) ? { genre } : {}),
		...(includes(catalogueFormats, format) ? { format } : {}),
		...(includes(catalogueStatuses, status) ? { status } : {}),
		...(includes(seasons, season) ? { season } : {}),
		...(validYear(params.get("year")) !== undefined ? { year: validYear(params.get("year")) } : {}),
		sort: includes(catalogueSorts, sort) ? sort : "POPULARITY_DESC",
	};
}

export function parseRankingsQuery(params: URLSearchParams): RankingsQuery {
	const type = params.get("type");
	return {
		page: positivePage(params.get("page")),
		type: includes(rankingSorts, type) ? type : "POPULARITY_DESC",
	};
}

function serialise(params: Record<string, QueryValue>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) setIfDefined(search, key, value);
	const encoded = search.toString();
	return encoded ? `?${encoded}` : "";
}

export function catalogueHref(
	query: CatalogueQuery,
	changes: QueryChanges<CatalogueQuery> = {},
): string {
	const next = { ...query, ...changes };
	return `/browse${serialise({
		...(next.page > 1 ? { page: next.page } : {}),
		genre: next.genre,
		format: next.format,
		status: next.status,
		season: next.season,
		year: next.year,
		...(next.sort !== "POPULARITY_DESC" ? { sort: next.sort } : {}),
	})}`;
}

export function rankingsHref(
	query: RankingsQuery,
	changes: QueryChanges<RankingsQuery> = {},
): string {
	const next = { ...query, ...changes };
	return `/rankings${serialise({
		...(next.page > 1 ? { page: next.page } : {}),
		...(next.type !== "POPULARITY_DESC" ? { type: next.type } : {}),
	})}`;
}
