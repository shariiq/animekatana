export interface PlaybackSubtitle {
	url: string;
	label: string;
	language: string;
}

export interface PlaybackStream {
	url: string;
	quality: string;
	is_hls?: boolean;
	headers?: Record<string, string>;
	subtitles?: PlaybackSubtitle[];
}

export function isHlsStream(stream: PlaybackStream): boolean {
	return stream.is_hls === true || stream.url.includes(".m3u8");
}

export function selectBrowserStream(streams: PlaybackStream[]): PlaybackStream | undefined {
	return (
		streams.find((stream) => isHlsStream(stream) && stream.url.includes("/api/v1/proxy/hls/")) ??
		streams.find((stream) => Object.keys(stream.headers ?? {}).length === 0)
	);
}
