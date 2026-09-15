import { $, component$, useSignal, useStore, useVisibleTask$ } from "@qwik.dev/core";
import { isHlsStream, type PlaybackStream, selectBrowserStream } from "../../lib/playback/player";

interface Episode {
	id: string;
	number: number;
	title: string;
}
interface Server {
	id: string;
	name: string;
	type: string;
}
type Resolution =
	| {
			state: "matched";
			sourceId: string;
			animeId: string;
			title: string;
			confidence: number;
	  }
	| {
			state: "ambiguous";
			candidates: Array<{
				sourceId: string;
				animeId: string;
				title: string;
				confidence: number;
			}>;
	  }
	| { state: "unavailable"; reason: string };

interface WatchPlayerProps {
	animeId: string;
	episodeNumber: number;
}

async function api<T>(path: string): Promise<T> {
	const response = await fetch(path, {
		headers: { accept: "application/json" },
	});
	if (!response.ok) {
		const body = await response.json().catch(() => ({ error: "Playback is unavailable." }));
		throw new Error(body.error ?? "Playback is unavailable.");
	}
	return response.json() as Promise<T>;
}

export const WatchPlayer = component$<WatchPlayerProps>(({ animeId, episodeNumber }) => {
	const video = useSignal<HTMLVideoElement>();
	const state = useStore({
		resolution: null as Resolution | null,
		episodes: [] as Episode[],
		servers: [] as Server[],
		streams: [] as PlaybackStream[],
		currentEpisode: episodeNumber,
		selectedServerId: "",
		selectedStreamUrl: "",
		started: false,
		loading: false,
		playerState: "idle" as "idle" | "loading" | "ready" | "error",
		error: "",
	});

	const loadStreams = $(async (serverId: string) => {
		const resolution = state.resolution;
		const episode = state.episodes.find((item) => item.number === state.currentEpisode);
		if (!episode || !resolution || resolution.state !== "matched") return;
		state.loading = true;
		state.error = "";
		try {
			state.selectedServerId = serverId;
			state.streams = await api<PlaybackStream[]>(
				`/api/playback/streams?${new URLSearchParams({ source: resolution.sourceId, episode: episode.id, server: serverId })}`,
			);
			const browserReady = selectBrowserStream(state.streams);
			state.selectedStreamUrl = browserReady?.url ?? "";
			if (!browserReady && state.streams.length > 0) {
				state.error =
					"This server requires protected request headers that browsers cannot send. Try another server.";
			}
			try {
				localStorage.setItem(
					`animekatana:playback:${animeId}`,
					JSON.stringify({ episode: state.currentEpisode, serverId }),
				);
			} catch {
				/* Storage is optional. */
			}
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Playback is unavailable.";
		} finally {
			state.loading = false;
		}
	});

	const loadServers = $(async (number: number) => {
		const resolution = state.resolution;
		const episode = state.episodes.find((item) => item.number === number);
		if (!episode || !resolution || resolution.state !== "matched") return;
		state.loading = true;
		state.error = "";
		state.currentEpisode = number;
		state.streams = [];
		state.selectedStreamUrl = "";
		state.playerState = "idle";
		try {
			state.servers = await api<Server[]>(
				`/api/playback/servers?${new URLSearchParams({ source: resolution.sourceId, episode: episode.id })}`,
			);
			const saved = (() => {
				try {
					return JSON.parse(localStorage.getItem(`animekatana:playback:${animeId}`) ?? "{}") as {
						serverId?: string;
					};
				} catch {
					return {};
				}
			})();
			const savedServer = state.servers.find((item) => item.id === saved.serverId);
			const server =
				savedServer ?? state.servers.find((item) => item.name !== "DatSaV") ?? state.servers[0];
			if (server) await loadStreams(server.id);
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Playback is unavailable.";
		} finally {
			state.loading = false;
		}
	});

	const selectMatch = $(async (match: Extract<Resolution, { state: "matched" }>) => {
		state.resolution = match;
		state.loading = true;
		state.error = "";
		try {
			state.episodes = (
				await api<Episode[]>(
					`/api/playback/episodes?${new URLSearchParams({ source: match.sourceId, anime: match.animeId })}`,
				)
			).sort((left, right) => left.number - right.number);
			const savedEpisode = (() => {
				try {
					return Number(
						JSON.parse(localStorage.getItem(`animekatana:playback:${animeId}`) ?? "{}").episode,
					);
				} catch {
					return NaN;
				}
			})();
			const initial =
				state.episodes.find((item) => item.number === savedEpisode) ??
				state.episodes.find((item) => item.number === episodeNumber) ??
				state.episodes[0];
			if (initial) await loadServers(initial.number);
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Playback is unavailable.";
		} finally {
			state.loading = false;
		}
	});

	const start = $(async () => {
		state.started = true;
		state.loading = true;
		state.error = "";
		try {
			const resolution = await api<Resolution>(
				`/api/playback/resolve?animeId=${encodeURIComponent(animeId)}`,
			);
			if (resolution.state === "matched") await selectMatch(resolution);
			else state.resolution = resolution;
		} catch (error) {
			state.error = error instanceof Error ? error.message : "Playback is unavailable.";
		} finally {
			state.loading = false;
		}
	});

	// biome-ignore lint/correctness/noQwikUseVisibleTask: media attachment requires the browser video element after explicit playback intent.
	useVisibleTask$(({ track, cleanup }) => {
		const selectedStreamUrl = track(() => state.selectedStreamUrl);
		const currentEpisode = track(() => state.currentEpisode);
		track(() => video.value);
		const stream = state.streams.find((item) => item.url === selectedStreamUrl);
		const element = video.value;
		if (!stream || !element) return;

		let destroyHls: (() => void) | undefined;
		let disposed = false;
		state.playerState = "loading";
		element.pause();
		element.replaceChildren();
		element.removeAttribute("src");
		element.load();
		for (const subtitle of stream.subtitles ?? []) {
			const trackElement = document.createElement("track");
			trackElement.kind = "subtitles";
			trackElement.src = subtitle.url;
			trackElement.label = subtitle.label;
			trackElement.srclang = subtitle.language;
			element.appendChild(trackElement);
		}

		const positionKey = `animekatana:position:${animeId}:${currentEpisode}`;
		const restorePosition = $(() => {
			try {
				const value = Number(localStorage.getItem(positionKey));
				if (value > 0) element.currentTime = value;
			} catch {
				/* Storage is optional. */
			}
		});
		const savePosition = $(() => {
			try {
				localStorage.setItem(positionKey, String(element.currentTime));
			} catch {
				/* Storage is optional. */
			}
		});
		const markReady = $(() => {
			state.playerState = "ready";
			state.error = "";
		});
		const markFailed = $(() => {
			state.playerState = "error";
			state.error = "The selected stream could not be played. Try another server.";
		});
		element.addEventListener("loadedmetadata", restorePosition, {
			once: true,
		});
		element.addEventListener("canplay", markReady);
		element.addEventListener("error", markFailed);
		element.addEventListener("timeupdate", savePosition);

		const isHls = isHlsStream(stream);
		if (!isHls || element.canPlayType("application/vnd.apple.mpegurl")) {
			element.src = stream.url;
			element.load();
		} else {
			import("hls.js")
				.then(({ default: Hls }) => {
					if (disposed) return;
					if (!Hls.isSupported()) {
						markFailed();
						return;
					}
					const hls = new Hls();
					hls.on(Hls.Events.ERROR, (_event, data) => {
						if (data.fatal) markFailed();
					});
					hls.on(Hls.Events.MANIFEST_PARSED, () => {
						if (!disposed)
							element.play().catch(() => {
								/* Playback remains user-controlled. */
							});
					});
					hls.loadSource(stream.url);
					hls.attachMedia(element);
					destroyHls = () => hls.destroy();
				})
				.catch(markFailed);
		}

		cleanup(() => {
			disposed = true;
			element.removeEventListener("timeupdate", savePosition);
			element.removeEventListener("loadedmetadata", restorePosition);
			element.removeEventListener("canplay", markReady);
			element.removeEventListener("error", markFailed);
			destroyHls?.();
		});
	});

	const activeStream = state.streams.find((stream) => stream.url === state.selectedStreamUrl);
	const firstEpisode = state.episodes[0]?.number ?? 1;
	const lastEpisode = state.episodes[state.episodes.length - 1]?.number ?? 1;

	return (
		<section class="space-y-6" aria-label="Video player">
			{!state.started && (
				<div class="rounded-xl border border-parchment-200 bg-white p-8 text-center shadow-sm">
					<h2 class="font-serif text-2xl font-bold text-evergreen-950">Ready when you are</h2>
					<p class="mx-auto mt-3 max-w-xl text-gray-600">
						Playback sources are contacted only after you choose to start watching.
					</p>
					<button
						type="button"
						onClick$={start}
						class="mt-6 rounded-md bg-evergreen-800 px-6 py-3 font-semibold text-white hover:bg-evergreen-700 focus:outline-none focus:ring-2 focus:ring-evergreen-500 focus:ring-offset-2"
					>
						Find playback options
					</button>
				</div>
			)}
			{state.loading && (
				<p class="rounded-lg bg-parchment-100 p-4 text-sm text-gray-700" role="status">
					Loading playback options…
				</p>
			)}
			{state.error && (
				<div
					class="rounded-lg border border-terracotta-200 bg-terracotta-50 p-5 text-terracotta-900"
					role="alert"
				>
					{state.error}
				</div>
			)}
			{state.resolution?.state === "unavailable" && (
				<div
					class="rounded-lg border border-terracotta-200 bg-terracotta-50 p-5 text-terracotta-900"
					role="alert"
				>
					{state.resolution.reason}
				</div>
			)}
			{state.resolution?.state === "ambiguous" && (
				<div class="rounded-xl border border-parchment-200 bg-white p-6 shadow-sm">
					<h2 class="font-serif text-xl font-bold text-evergreen-950">Choose the correct title</h2>
					<p class="mt-2 text-sm text-gray-600">
						We could not safely select a playback match automatically.
					</p>
					<div class="mt-5 grid gap-3 sm:grid-cols-2">
						{state.resolution.candidates.map((candidate) => (
							<button
								key={`${candidate.sourceId}:${candidate.animeId}`}
								type="button"
								onClick$={() => selectMatch({ state: "matched", ...candidate })}
								class="rounded-md border border-parchment-300 p-4 text-left hover:border-evergreen-500 hover:bg-evergreen-50 focus:outline-none focus:ring-2 focus:ring-evergreen-500"
							>
								<span class="block font-semibold">{candidate.title}</span>
								<span class="mt-1 block text-xs text-gray-500">
									{Math.round(candidate.confidence * 100)}% confidence
								</span>
							</button>
						))}
					</div>
				</div>
			)}
			{state.resolution?.state === "matched" && (
				<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
					<div class="space-y-4">
						<div class="aspect-video overflow-hidden rounded-xl bg-black shadow-xl">
							{activeStream ? (
								// biome-ignore lint/a11y/useMediaCaption: AniSource subtitle tracks are attached when supplied; fabricating a caption resource would be misleading.
								<video ref={video} class="h-full w-full" controls playsInline></video>
							) : (
								<div class="flex h-full items-center justify-center p-6 text-center text-white">
									{state.servers.length
										? "Choose a server to begin."
										: "No playback servers are available for this episode."}
								</div>
							)}
						</div>
						{state.playerState === "loading" && (
							<p class="text-sm text-gray-600" role="status">
								Preparing the selected stream…
							</p>
						)}
						<div class="flex items-center justify-between rounded-lg border border-parchment-200 bg-white p-4">
							<span class="font-serif text-lg font-bold">Episode {state.currentEpisode}</span>
							<div class="flex gap-2">
								<button
									type="button"
									disabled={state.currentEpisode <= firstEpisode}
									onClick$={() => loadServers(state.currentEpisode - 1)}
									class="rounded px-3 py-2 text-sm font-semibold hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Previous
								</button>
								<button
									type="button"
									disabled={state.currentEpisode >= lastEpisode}
									onClick$={() => loadServers(state.currentEpisode + 1)}
									class="rounded px-3 py-2 text-sm font-semibold hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40"
								>
									Next
								</button>
							</div>
						</div>
					</div>
					<aside class="space-y-5">
						<div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm">
							<h2 class="font-serif text-lg font-bold text-evergreen-950">Episodes</h2>
							<div class="mt-3 grid max-h-48 grid-cols-5 gap-2 overflow-y-auto">
								{state.episodes.map((episode) => (
									<button
										key={episode.id}
										type="button"
										onClick$={() => loadServers(episode.number)}
										aria-current={episode.number === state.currentEpisode ? "true" : undefined}
										class={`rounded p-2 text-sm ${episode.number === state.currentEpisode ? "bg-evergreen-800 font-bold text-white" : "bg-parchment-100 hover:bg-parchment-200"}`}
									>
										{episode.number}
									</button>
								))}
							</div>
						</div>
						<div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm">
							<h2 class="font-serif text-lg font-bold text-evergreen-950">Servers</h2>
							<div class="mt-3 space-y-2">
								{state.servers.map((server) => (
									<button
										key={server.id}
										type="button"
										onClick$={() => loadStreams(server.id)}
										aria-pressed={server.id === state.selectedServerId}
										class={`w-full rounded border px-3 py-2 text-left text-sm ${server.id === state.selectedServerId ? "border-evergreen-600 bg-evergreen-50 font-semibold" : "border-parchment-300 hover:bg-parchment-100"}`}
									>
										{server.name}
									</button>
								))}
							</div>
						</div>
						{state.streams.length > 1 && (
							<div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm">
								<h2 class="font-serif text-lg font-bold text-evergreen-950">Quality</h2>
								<div class="mt-3 flex flex-wrap gap-2">
									{state.streams.map((stream) => (
										<button
											key={stream.url}
											type="button"
											onClick$={() => {
												state.selectedStreamUrl = stream.url;
											}}
											aria-pressed={stream.url === state.selectedStreamUrl}
											class={`rounded px-3 py-2 text-sm ${stream.url === state.selectedStreamUrl ? "bg-evergreen-800 text-white" : "bg-parchment-100 hover:bg-parchment-200"}`}
										>
											{stream.quality}
										</button>
									))}
								</div>
							</div>
						)}
					</aside>
				</div>
			)}
		</section>
	);
});

export default WatchPlayer;
