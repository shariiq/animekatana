import type { APIRoute } from 'astro';
import { anisource } from '../../../lib/anisource/client';

export const GET: APIRoute = async ({ url }) => {
  const source = url.searchParams.get('source');
  const episode = url.searchParams.get('episode');
  if (!source || !episode) return Response.json({ error: 'source and episode are required.' }, { status: 400 });

  try {
    return Response.json(await anisource.servers(source, episode));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Servers are unavailable.' }, { status: 502 });
  }
};
