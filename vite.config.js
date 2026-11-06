import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'

// viteSingleFile mette tutto (JS + CSS) dentro un unico index.html:
// così l'app funziona anche senza internet una volta aperta.
// Data e ora della build, mostrata nell'app per capire quale versione si sta usando
const versione = new Date().toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  define: { __VERSIONE__: JSON.stringify(versione) },
  base: './',
})
