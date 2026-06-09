import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
})
