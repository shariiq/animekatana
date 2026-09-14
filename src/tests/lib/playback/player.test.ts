import { describe, expect, it } from "vitest";
import {
	isHlsStream,
	type PlaybackStream,
	selectBrowserStream,
} from "../../../lib/playback/player";

describe("playback player utilities", () => {
	describe("isHlsStream", () => {
		it("returns true when is_hls is true", () => {
			const stream: PlaybackStream = {
				url: "https://anisource-api.onrender.com/api/v1/proxy/hls/token",
				quality: "1080p",
				is_hls: true,
				headers: {},
				subtitles: [],
			};

			expect(isHlsStream(stream)).toBe(true);
		});

		it("returns true when URL contains .m3u8 even if is_hls is false", () => {
			const stream: PlaybackStream = {
				url: "https://example.test/stream.m3u8",
				quality: "720p",
				is_hls: false,
				headers: {},
				subtitles: [],
			};

			expect(isHlsStream(stream)).toBe(true);
		});

		it("returns true when URL contains .m3u8 and is_hls is missing", () => {
			const stream: PlaybackStream = {
				url: "https://example.test/playlist.m3u8",
				quality: "720p",
				headers: {},
				subtitles: [],
			};

			expect(isHlsStream(stream)).toBe(true);
		});

		it("returns false when is_hls is false and URL has no .m3u8", () => {
			const stream: PlaybackStream = {
				url: "https://example.test/video.mp4",
				quality: "720p",
				is_hls: false,
				headers: {},
				subtitles: [],
			};

			expect(isHlsStream(stream)).toBe(false);
		});
	});

	describe("selectBrowserStream", () => {
		it("prefers HLS streams with AniSource proxy URLs", () => {
			const streams: PlaybackStream[] = [
				{
					url: "https://cdn.example.test/direct.m3u8",
					quality: "1080p",
					is_hls: true,
					headers: { Referer: "https://upstream.test" },
					subtitles: [],
				},
				{
					url: "https://anisource-api.onrender.com/api/v1/proxy/hls/token123",
					quality: "720p",
					is_hls: true,
					headers: { "X-Custom": "value" },
					subtitles: [],
				},
				{
					url: "https://example.test/headerless.mp4",
					quality: "480p",
					is_hls: false,
					headers: {},
					subtitles: [],
				},
			];

			const selected = selectBrowserStream(streams);
			expect(selected?.url).toBe("https://anisource-api.onrender.com/api/v1/proxy/hls/token123");
		});

		it("falls back to headerless streams when no proxy is available", () => {
			const streams: PlaybackStream[] = [
				{
					url: "https://cdn.example.test/protected.m3u8",
					quality: "1080p",
					is_hls: true,
					headers: { Referer: "https://upstream.test" },
					subtitles: [],
				},
				{
					url: "https://example.test/open.mp4",
					quality: "720p",
					is_hls: false,
					headers: {},
					subtitles: [],
				},
			];

			const selected = selectBrowserStream(streams);
			expect(selected?.url).toBe("https://example.test/open.mp4");
		});

		it("returns undefined when all streams require protected headers", () => {
			const streams: PlaybackStream[] = [
				{
					url: "https://cdn.example.test/protected1.m3u8",
					quality: "1080p",
					is_hls: true,
					headers: { Referer: "https://upstream.test" },
					subtitles: [],
				},
				{
					url: "https://cdn.example.test/protected2.m3u8",
					quality: "720p",
					is_hls: true,
					headers: { "X-Custom": "value" },
					subtitles: [],
				},
			];

			const selected = selectBrowserStream(streams);
			expect(selected).toBeUndefined();
		});

		it("detects HLS by URL extension when is_hls is missing", () => {
			const streams: PlaybackStream[] = [
				{
					url: "https://anisource-api.onrender.com/api/v1/proxy/hls/abc123",
					quality: "1080p",
					headers: {},
					subtitles: [],
				},
			];

			const selected = selectBrowserStream(streams);
			expect(selected?.url).toBe("https://anisource-api.onrender.com/api/v1/proxy/hls/abc123");
		});
	});
});
