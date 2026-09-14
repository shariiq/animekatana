export const MEDIA_CARD = `
  id
  title { romaji english native }
  synonyms
  coverImage { large extraLarge color }
  bannerImage
  description(asHtml: false)
  genres
  tags { name rank isMediaSpoiler }
  status
  format
  season
  seasonYear
  episodes
  duration
  averageScore
  meanScore
  popularity
  favourites
  rankings { rank type context allTime }
  studios(isMain: true) { nodes { name } }
  startDate { year month day }
  endDate { year month day }
  trailer { id site thumbnail }
  externalLinks { site url }
`;

const PAGE_INFO = `pageInfo { currentPage hasNextPage total perPage }`;

export const HOME_QUERY = `query Home($season: MediaSeason, $year: Int) {
  trending: Page(page: 1, perPage: 10) { ${PAGE_INFO} media(type: ANIME, sort: TRENDING_DESC) { ${MEDIA_CARD} } }
  popular: Page(page: 1, perPage: 10) { ${PAGE_INFO} media(type: ANIME, sort: POPULARITY_DESC) { ${MEDIA_CARD} } }
  seasonal: Page(page: 1, perPage: 10) { ${PAGE_INFO} media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) { ${MEDIA_CARD} } }
  upcoming: Page(page: 1, perPage: 10) { ${PAGE_INFO} media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { ${MEDIA_CARD} } }
}`;

export const CATALOGUE_QUERY = `query Catalogue(
  $page: Int!, $perPage: Int!, $search: String, $season: MediaSeason, $seasonYear: Int,
  $format: MediaFormat, $status: MediaStatus, $genre: String, $tag: String, $sort: [MediaSort]
) {
  Page(page: $page, perPage: $perPage) {
    ${PAGE_INFO}
    media(type: ANIME, search: $search, season: $season, seasonYear: $seasonYear, format: $format, status: $status, genre: $genre, tag: $tag, sort: $sort) { ${MEDIA_CARD} }
  }
}`;

export const DETAIL_QUERY = `query Detail($id: Int!) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_CARD}
    source
    hashtag
    countryOfOrigin
    isAdult
    isLicensed
    nextAiringEpisode { airingAt episode timeUntilAiring }
    relations { edges { relationType node { ${MEDIA_CARD} } } }
    recommendations(page: 1, perPage: 12) { nodes { mediaRecommendation { ${MEDIA_CARD} } } }
    characters(page: 1, perPage: 24, sort: ROLE) { edges { role node { id name { full native } image { large } } voiceActors(language: JAPANESE) { id name { full native } image { large } } } }
    staff(page: 1, perPage: 24, sort: RELEVANCE) { edges { role node { id name { full native } image { large } } } }
    stats { scoreDistribution { score amount } statusDistribution { status amount } }
  }
}`;

export const SCHEDULE_QUERY = `query Schedule($from: Int!, $to: Int!, $page: Int!) {
  Page(page: $page, perPage: 50) { ${PAGE_INFO} airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) { id airingAt episode media { ${MEDIA_CARD} } } }
}`;
