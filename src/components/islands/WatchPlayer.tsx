import { $, component$, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';

interface Episode { id: string; number: number; title: string; }
interface Server { id: string; name: string; type: string; }
interface Subtitle { url: string; label: string; language: string; }
interface Stream { url: string; quality: string; is_hls: boolean; headers: Record<string, string>; subtitles: Subtitle[]; }

type Resolution =
  | { state: 'matched'; sourceId: string; animeId: string; title: string; confidence: number }
  | { state: 'ambiguous'; candidates: Array<{ sourceId: string; animeId: string; title: string; confidence: number }> }
  | { state: 'unavailable'; reason: string };

interface WatchPlayerProps { animeId: string; episodeNumber: number; }

async function api<T>(path: string): Promise<T> {
  const response = await fetch(path, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Playback is unavailable.' }));
    throw new Error(body.error ?? 'Playback is unavailable.');
  }
  return response.json() as Promise<T>;
}

export const WatchPlayer = component$<WatchPlayerProps>(({ animeId, episodeNumber }) => {
  const video = useSignal<HTMLVideoElement>();
  const state = useStore({
    resolution: null as Resolution | null,
    episodes: [] as Episode[],
    servers: [] as Server[],
    streams: [] as Stream[],
    currentEpisode: episodeNumber,
    selectedServerId: '',
    selectedQuality: '',
    started: false,
    loading: false,
    error: '',
  });

  const loadStreams = $(async (serverId: string) => {
    const resolution = state.resolution;
    const episode = state.episodes.find((item) => item.number === state.currentEpisode);
    if (!episode || !resolution || resolution.state !== 'matched') return;
    state.loading = true;
    state.error = '';
    try {
      state.selectedServerId = serverId;
      state.streams = await api<Stream[]>(`/api/playback/streams?${new URLSearchParams({ source: resolution.sourceId, episode: episode.id, server: serverId })}`);
      state.selectedQuality = state.streams[0]?.quality ?? '';
      try { localStorage.setItem(`animekatana:playback:${animeId}`, JSON.stringify({ episode: state.currentEpisode, serverId })); } catch { /* Storage is optional. */ }
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Playback is unavailable.';
    } finally {
      state.loading = false;
    }
  });

  const loadServers = $(async (number: number) => {
    const resolution = state.resolution;
    const episode = state.episodes.find((item) => item.number === number);
    if (!episode || !resolution || resolution.state !== 'matched') return;
    state.loading = true;
    state.error = '';
    state.currentEpisode = number;
    state.streams = [];
    state.selectedQuality = '';
    try {
      state.servers = await api<Server[]>(`/api/playback/servers?${new URLSearchParams({ source: resolution.sourceId, episode: episode.id })}`);
      const saved = (() => { try { return JSON.parse(localStorage.getItem(`animekatana:playback:${animeId}`) ?? '{}') as { serverId?: string }; } catch { return {}; } })();
      const server = state.servers.find((item) => item.id === saved.serverId) ?? state.servers[0];
      if (server) await loadStreams(server.id);
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Playback is unavailable.';
    } finally {
      state.loading = false;
    }
  });

  const selectMatch = $(async (match: Extract<Resolution, { state: 'matched' }>) => {
    state.resolution = match;
    state.loading = true;
    state.error = '';
    try {
      state.episodes = await api<Episode[]>(`/api/playback/episodes?${new URLSearchParams({ source: match.sourceId, anime: match.animeId })}`);
      const savedEpisode = (() => { try { return Number(JSON.parse(localStorage.getItem(`animekatana:playback:${animeId}`) ?? '{}').episode); } catch { return NaN; } })();
      const initial = state.episodes.find((item) => item.number === savedEpisode) ?? state.episodes.find((item) => item.number === episodeNumber) ?? state.episodes[0];
      if (initial) await loadServers(initial.number);
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Playback is unavailable.';
    } finally {
      state.loading = false;
    }
  });

  const start = $(async () => {
    state.started = true;
    state.loading = true;
    state.error = '';
    try {
      const resolution = await api<Resolution>(`/api/playback/resolve?animeId=${encodeURIComponent(animeId)}`);
      if (resolution.state === 'matched') await selectMatch(resolution);
      else state.resolution = resolution;
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Playback is unavailable.';
    } finally {
      state.loading = false;
    }
  });

  useVisibleTask$(({ track, cleanup }) => {
    track(() => state.selectedQuality);
    const stream = state.streams.find((item) => item.quality === state.selectedQuality);
    const element = video.value;
    if (!stream || !element) return;

    let destroyHls: (() => void) | undefined;
    element.replaceChildren();
    element.removeAttribute('src');
    for (const subtitle of stream.subtitles) {
      const trackElement = document.createElement('track');
      trackElement.kind = 'subtitles';
      trackElement.src = subtitle.url;
      trackElement.label = subtitle.label;
      trackElement.srclang = subtitle.language;
      element.appendChild(trackElement);
    }

    const positionKey = `animekatana:position:${animeId}:${state.currentEpisode}`;
    const restorePosition = () => { try { const value = Number(localStorage.getItem(positionKey)); if (value > 0) element.currentTime = value; } catch { /* Storage is optional. */ } };
    const savePosition = () => { try { localStorage.setItem(positionKey, String(element.currentTime)); } catch { /* Storage is optional. */ } };
    element.addEventListener('loadedmetadata', restorePosition, { once: true });
    element.addEventListener('timeupdate', savePosition);

    if (!stream.is_hls || element.canPlayType('application/vnd.apple.mpegurl')) {
      // AniSource returns its protected HLS streams through /proxy/hls/{token};
      // native HLS can consume that URL directly. Direct streams may only work
      // without restricted headers because browsers cannot attach arbitrary
      // request headers to a <video> resource.
      element.src = stream.url;
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (!Hls.isSupported()) { state.error = 'This browser cannot play the selected HLS stream.'; return; }
        const hls = new Hls({
          // hls.js can attach the source-provided headers to manifest, key,
          // and segment requests. This is required by hosts with referer/origin
          // protection and does not expose a general-purpose server proxy.
          xhrSetup: (xhr) => {
            for (const [name, value] of Object.entries(stream.headers ?? {})) {
              xhr.setRequestHeader(name, value);
            }
          },
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            state.error = data.type === Hls.ErrorTypes.NETWORK_ERROR
              ? 'The selected server could not be reached. Try another server.'
              : 'The selected stream could not be played. Try another server.';
          }
        });
        hls.loadSource(stream.url);
        hls.attachMedia(element);
        destroyHls = () => hls.destroy();
      }).catch(() => { state.error = 'The HLS playback engine could not be loaded.'; });
    }

    cleanup(() => { element.removeEventListener('timeupdate', savePosition); destroyHls?.(); });
  });

  const activeStream = state.streams.find((stream) => stream.quality === state.selectedQuality);
  const firstEpisode = state.episodes[0]?.number ?? 1;
  const lastEpisode = state.episodes[state.episodes.length - 1]?.number ?? 1;

  return <section class="space-y-6" aria-label="Video player">
    {!state.started && <div class="rounded-xl border border-parchment-200 bg-white p-8 text-center shadow-sm"><h2 class="font-serif text-2xl font-bold text-evergreen-950">Ready when you are</h2><p class="mx-auto mt-3 max-w-xl text-gray-600">Playback sources are contacted only after you choose to start watching.</p><button onClick$={start} class="mt-6 rounded-md bg-evergreen-800 px-6 py-3 font-semibold text-white hover:bg-evergreen-700 focus:outline-none focus:ring-2 focus:ring-evergreen-500 focus:ring-offset-2">Find playback options</button></div>}
    {state.loading && <p class="rounded-lg bg-parchment-100 p-4 text-sm text-gray-700" role="status">Loading playback options…</p>}
    {state.error && <div class="rounded-lg border border-terracotta-200 bg-terracotta-50 p-5 text-terracotta-900" role="alert">{state.error}</div>}
    {state.resolution?.state === 'unavailable' && <div class="rounded-lg border border-terracotta-200 bg-terracotta-50 p-5 text-terracotta-900" role="alert">{state.resolution.reason}</div>}
    {state.resolution?.state === 'ambiguous' && <div class="rounded-xl border border-parchment-200 bg-white p-6 shadow-sm"><h2 class="font-serif text-xl font-bold text-evergreen-950">Choose the correct title</h2><p class="mt-2 text-sm text-gray-600">We could not safely select a playback match automatically.</p><div class="mt-5 grid gap-3 sm:grid-cols-2">{state.resolution.candidates.map((candidate) => <button onClick$={() => selectMatch({ state: 'matched', ...candidate })} class="rounded-md border border-parchment-300 p-4 text-left hover:border-evergreen-500 hover:bg-evergreen-50 focus:outline-none focus:ring-2 focus:ring-evergreen-500"><span class="block font-semibold">{candidate.title}</span><span class="mt-1 block text-xs text-gray-500">{Math.round(candidate.confidence * 100)}% confidence</span></button>)}</div></div>}
    {state.resolution?.state === 'matched' && <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]"><div class="space-y-4"><div class="aspect-video overflow-hidden rounded-xl bg-black shadow-xl">{activeStream ? <video ref={video} class="h-full w-full" controls playsInline /> : <div class="flex h-full items-center justify-center p-6 text-center text-white">{state.servers.length ? 'Choose a server to begin.' : 'No playback servers are available for this episode.'}</div>}</div><div class="flex items-center justify-between rounded-lg border border-parchment-200 bg-white p-4"><span class="font-serif text-lg font-bold">Episode {state.currentEpisode}</span><div class="flex gap-2"><button disabled={state.currentEpisode <= firstEpisode} onClick$={() => loadServers(state.currentEpisode - 1)} class="rounded px-3 py-2 text-sm font-semibold hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40">Previous</button><button disabled={state.currentEpisode >= lastEpisode} onClick$={() => loadServers(state.currentEpisode + 1)} class="rounded px-3 py-2 text-sm font-semibold hover:bg-parchment-100 disabled:cursor-not-allowed disabled:opacity-40">Next</button></div></div></div><aside class="space-y-5"><div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm"><h2 class="font-serif text-lg font-bold text-evergreen-950">Episodes</h2><div class="mt-3 grid max-h-48 grid-cols-5 gap-2 overflow-y-auto">{state.episodes.map((episode) => <button onClick$={() => loadServers(episode.number)} aria-current={episode.number === state.currentEpisode ? 'true' : undefined} class={`rounded p-2 text-sm ${episode.number === state.currentEpisode ? 'bg-evergreen-800 font-bold text-white' : 'bg-parchment-100 hover:bg-parchment-200'}`}>{episode.number}</button>)}</div></div><div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm"><h2 class="font-serif text-lg font-bold text-evergreen-950">Servers</h2><div class="mt-3 space-y-2">{state.servers.map((server) => <button onClick$={() => loadStreams(server.id)} aria-pressed={server.id === state.selectedServerId} class={`w-full rounded border px-3 py-2 text-left text-sm ${server.id === state.selectedServerId ? 'border-evergreen-600 bg-evergreen-50 font-semibold' : 'border-parchment-300 hover:bg-parchment-100'}`}>{server.name}</button>)}</div></div>{state.streams.length > 1 && <div class="rounded-xl border border-parchment-200 bg-white p-5 shadow-sm"><h2 class="font-serif text-lg font-bold text-evergreen-950">Quality</h2><div class="mt-3 flex flex-wrap gap-2">{state.streams.map((stream) => <button onClick$={() => { state.selectedQuality = stream.quality; }} aria-pressed={stream.quality === state.selectedQuality} class={`rounded px-3 py-2 text-sm ${stream.quality === state.selectedQuality ? 'bg-evergreen-800 text-white' : 'bg-parchment-100 hover:bg-parchment-200'}`}>{stream.quality}</button>)}</div></div>}</aside></div>}
  </section>;
});

export default WatchPlayer;
