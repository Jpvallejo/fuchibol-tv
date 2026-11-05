import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  server: {
    proxy: {
      // mi.tv has no CORS headers; in the browser during development the guide
      // goes through here (the Android app uses the native HTTP client instead).
      '/mitv': {
        target: 'https://mi.tv',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mitv/, ''),
      },
    },
  },
})
