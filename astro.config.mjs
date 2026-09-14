import { defineConfig } from 'astro/config';
import qwikdev from '@qwikdev/astro';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';

const vercelAdapter = vercel();

export default defineConfig({
  output: 'server',
  // @qwikdev/astro 0.8.3 incorrectly converts Vercel's client output URL
  // into a Windows pathname (C:\\C:\\...). Keep the adapter behavior while
  // avoiding that integration-specific path rewrite.
  adapter: { ...vercelAdapter, name: '@astrojs/serverless' },
  integrations: [tailwind(), qwikdev()],
});
