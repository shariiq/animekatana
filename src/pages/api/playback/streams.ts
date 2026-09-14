import type { APIRoute } from 'astro';
import { anisource } from '../../../lib/anisource/client';

export const GET: APIRoute = async ({ url }) => {
  const source = url.searchParams.get('source');
  const episode = url.searchParams.get('episode');
  const server = url.searchParams.get('server');

  if (!source || !episode || !server) {
    return Response.json({ error: 'source, episode, and server are required.' }, { status: 400 });
  }

  try {
    const streams = await anisource.streams(source, episode, server);

    // Return streams as-is - the player will handle proxying for streams with headers
    return Response.json(streams);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Streams are unavailable.' }, { status: 502 });
  }
};