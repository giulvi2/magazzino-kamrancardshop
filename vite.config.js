import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

// viteSingleFile mette tutto (JS + CSS) dentro un unico index.html:
// così l'app funziona anche senza internet una volta aperta.
// Versione mostrata nell'app: numero da package.json (cambia con ogni release)
// più data e ora della build, per capire se il telefono ha scaricato quella nuova
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const dataBuild = new Date().toLocaleString('it-IT', {
  timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
}).replace(',', '')
const versione = `v${version} · ${dataBuild}`

export default defineConfig({
  plugins: [vue(), viteSingleFile()],
  define: { __VERSIONE__: JSON.stringify(versione) },
  base: './',
})
