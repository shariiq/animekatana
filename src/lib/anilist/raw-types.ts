/**
 * Raw AniList GraphQL response shapes.
 * These types model the external API's structure, not our domain.
 */

export interface RawTitle {
	romaji: string;
	english: string | null;
	native: string;
}

export interface RawCoverImage {
	large: string;
	extraLarge?: string;
	color?: string | null;
}

export interface RawTag {
	name: string;
	rank: number;
	isMediaSpoiler: boolean;
}

export interface RawRanking {
	rank: number;
	type: string;
	context?: string;
	allTime: boolean;
}

export interface RawStudio {
	name: string;
}

export interface RawDateParts {
	year: number | null;
	month: number | null;
	day: number | null;
}

export interface RawTrailer {
	id: string;
	site: string;
	thumbnail?: string | null;
}

export interface RawExternalLink {
	site: string;
	url: string;
}

export interface RawPersonName {
	full: string;
	native: string | null;
}

export interface RawPersonImage {
	large: string;
}

export interface RawPerson {
	id: number;
	name: RawPersonName;
	image: RawPersonImage;
}

export interface RawCharacterEdge {
	role: string;
	node: RawPerson;
	voiceActors: RawPerson[];
}

export interface RawStaffEdge {
	role: string;
	node: RawPerson;
}

export interface RawRelationEdge {
	relationType: string;
	node: RawMedia;
}

export interface RawRecommendationNode {
	mediaRecommendation: RawMedia | null;
}

export interface RawStats {
	scoreDistribution: { score: number; amount: number }[];
	statusDistribution: { status: string; amount: number }[];
}

export interface RawMedia {
	id: number;
	title: RawTitle;
	synonyms?: string[];
	coverImage: RawCoverImage;
	bannerImage: string | null;
	description: string | null;
	genres: string[];
	tags?: RawTag[];
	status: string;
	format: string;
	season: "WINTER" | "SPRING" | "SUMMER" | "FALL" | null;
	seasonYear: number | null;
	episodes: number | null;
	duration: number | null;
	averageScore: number | null;
	meanScore?: number | null;
	popularity: number | null;
	favourites?: number;
	rankings?: RawRanking[];
	studios?: { nodes?: RawStudio[] };
	startDate: RawDateParts | null;
	endDate: RawDateParts | null;
	trailer?: RawTrailer | null;
	externalLinks?: RawExternalLink[];
	source?: string;
	hashtag?: string | null;
	countryOfOrigin?: string;
	isAdult?: boolean;
	isLicensed?: boolean;
	nextAiringEpisode?: {
		airingAt: number;
		episode: number;
		timeUntilAiring: number;
	} | null;
	relations?: { edges: RawRelationEdge[] };
	recommendations?: { nodes: RawRecommendationNode[] };
	characters?: { edges: RawCharacterEdge[] };
	staff?: { edges: RawStaffEdge[] };
	stats?: RawStats;
}

export interface RawPageInfo {
	currentPage: number;
	hasNextPage: boolean;
	total: number;
	perPage: number;
}

export interface RawPage {
	pageInfo: RawPageInfo;
	media: RawMedia[];
}

export interface RawAiringScheduleItem {
	id: number;
	airingAt: number;
	episode: number;
	media: RawMedia;
}

export interface RawSchedulePage {
	pageInfo: RawPageInfo;
	airingSchedules: RawAiringScheduleItem[];
}

export interface RawHomeData {
	trending: RawPage;
	popular: RawPage;
	seasonal: RawPage;
	upcoming: RawPage;
}

export interface RawCatalogueData {
	Page: RawPage;
}

export interface RawDetailData {
	Media: RawMedia | null;
}

export interface RawScheduleData {
	Page: RawSchedulePage;
}
