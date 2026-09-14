import { defineConfig } from 'astro/config';
import qwikdev from '@qwikdev/astro';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind(), qwikdev()],
});
