import { defineConfig } from 'astro/config';
import qwikdev from '@qwikdev/astro';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  integrations: [tailwind(), qwikdev()],
});
