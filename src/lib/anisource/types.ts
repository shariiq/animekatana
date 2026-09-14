export interface AniSourceAnime {
  id: string;
  title: string;
  alternativeTitles: string[];
  thumbnail: string | null;
  description: string | null;
}

export interface AniSourceEpisode {
  id: string;
  number: number;
  title: string;
  thumbnail: string | null;
}

export interface AniSourceServer {
  id: string;
  name: string;
  type: string;
}

export interface AniSourceStream {
  url: string;
  quality: string;
  headers: Record<string, string>;
  subtitles: { url: string; label: string; language: string }[];
  isHls: boolean;
}
