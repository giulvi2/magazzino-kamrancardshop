import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// viteSingleFile mette tutto (JS + CSS) dentro un unico index.html:
// così l'app funziona anche senza internet una volta aperta.
export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  base: './',
})
