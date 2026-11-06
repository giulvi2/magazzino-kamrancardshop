<script setup>
// Finestra per stampare etichette con QR code (una o tante insieme).
// Il QR contiene solo il codice dell'articolo: lo legge lo scanner dell'app
// (fotocamera 📷) o una pistola scanner 2D, esattamente come un codice a barre.
import { ref, computed, onBeforeUnmount } from 'vue'
import QrCodice from './QrCodice.vue'
import { euro, codiceEtichetta, assegnaCodici } from '../store'

const props = defineProps({ articoli: { type: Array, required: true } })
const emit = defineEmits(['chiudi'])

// Misure in millimetri. I fogli A4 sono quelli adesivi più comuni nelle cartolerie.
const FORMATI = [
  { id: 'a4-24', nome: 'Foglio A4 · 24 etichette 70×37 mm', pagina: 'A4', larg: 210, alt: 297,
    colonne: 3, righe: 8, w: 70, h: 37, top: 0.5, left: 0, gapX: 0, gapY: 0 },
  { id: 'a4-65', nome: 'Foglio A4 · 65 etichette 38×21 mm', pagina: 'A4', larg: 210, alt: 297,
    colonne: 5, righe: 13, w: 38.1, h: 21.2, top: 10.7, left: 4.65, gapX: 2.5, gapY: 0 },
  { id: 'rotolo', nome: 'Stampante etichette · 50×30 mm', pagina: '50mm 30mm', larg: 50, alt: 30,
    colonne: 1, righe: 1, w: 50, h: 30, top: 0, left: 0, gapX: 0, gapY: 0 },
]
const idFormato = ref(localStorage.getItem('etichette-formato') || 'a4-24')
const formato = computed(() => FORMATI.find((f) => f.id === idFormato.value) || FORMATI[0])
const copie = ref('una') // 'una' = una per articolo, 'pezzi' = una per ogni pezzo in magazzino
const conPrezzo = ref(true)
const salta = ref(0) // etichette già usate all'inizio del foglio
const bordi = ref(false) // per la prova su carta normale

const perPagina = computed(() => formato.value.colonne * formato.value.righe)
const etichette = computed(() => {
  const lista = []
  for (const a of props.articoli) {
    const n = copie.value === 'pezzi' ? Math.max(1, a.quantita || 0) : 1
    for (let i = 0; i < n; i++) lista.push(a)
  }
  return lista
})
const pagine = computed(() => {
  const vuote = perPagina.value > 1 ? Math.min(Math.max(0, parseInt(salta.value) || 0), perPagina.value - 1) : 0
  const celle = [...Array(vuote).fill(null), ...etichette.value]
  const risultato = []
  for (let i = 0; i < celle.length; i += perPagina.value) risultato.push(celle.slice(i, i + perPagina.value))
  return risultato
})
const senzaCodice = computed(() => props.articoli.filter((a) => !a.codice).length)

// Variabili CSS con le misure del formato scelto
const misure = computed(() => {
  const f = formato.value
  return {
    '--larg': f.larg + 'mm', '--alt': f.alt + 'mm', '--w': f.w + 'mm', '--h': f.h + 'mm',
    '--top': f.top + 'mm', '--left': f.left + 'mm', '--gapx': f.gapX + 'mm', '--gapy': f.gapY + 'mm',
    '--colonne': f.colonne,
  }
})

// Anteprima: la prima pagina rimpicciolita per stare nella finestra
const MM = 96 / 25.4 // pixel per millimetro
const scala = computed(() => {
  const spazio = Math.min(window.innerWidth, 560) - 64
  return Math.min(2, spazio / (formato.value.larg * MM))
})

// Nell'anteprima si vede solo la parte del foglio con le etichette (non tutto l'A4 vuoto)
const altezzaAnteprima = computed(() => {
  const f = formato.value
  const righeUsate = Math.ceil((pagine.value[0]?.length || 1) / f.colonne)
  return Math.min(f.alt, f.top + righeUsate * (f.h + f.gapY) + 6)
})

// La dimensione della pagina va dichiarata con @page, che non si può mettere in uno stile "scoped"
let stilePagina = null
function stampa() {
  localStorage.setItem('etichette-formato', idFormato.value)
  assegnaCodici(props.articoli) // da ora gli articoli senza codice hanno il loro codice KC…
  stilePagina = stilePagina || document.head.appendChild(document.createElement('style'))
  stilePagina.textContent = `@page { size: ${formato.value.pagina}; margin: 0; }`
  // un attimo di respiro perché Vue aggiorni la pagina prima di aprire la stampa
  setTimeout(() => window.print(), 50)
}
onBeforeUnmount(() => stilePagina?.remove())
</script>

<template>
  <div class="sfondo" @click.self="emit('chiudi')">
    <div class="scheda">
      <h2>🏷️ Etichette QR</h2>
      <p class="aiuto">
        {{ etichette.length }} etichett{{ etichette.length === 1 ? 'a' : 'e' }} per
        {{ articoli.length }} articol{{ articoli.length === 1 ? 'o' : 'i' }}
        <template v-if="perPagina > 1"> · {{ pagine.length }} fogli{{ pagine.length === 1 ? 'o' : '' }}</template>.
        Il QR si legge con 📷 come un codice a barre.
      </p>
      <p v-if="senzaCodice" class="box giallo">
        {{ senzaCodice }} articol{{ senzaCodice === 1 ? 'o non ha' : 'i non hanno' }} un codice a barre:
        quando stampi ricev{{ senzaCodice === 1 ? 'e' : 'ono' }} un codice interno che inizia con <b>KC</b>.
        Ricordati poi di fare il backup e di passarlo agli altri telefoni.
      </p>

      <label>Formato
        <select v-model="idFormato" class="selezione">
          <option v-for="f in FORMATI" :key="f.id" :value="f.id">{{ f.nome }}</option>
        </select>
      </label>
      <div class="chips">
        <button :class="{ on: copie === 'una' }" @click="copie = 'una'">Una per articolo</button>
        <button :class="{ on: copie === 'pezzi' }" @click="copie = 'pezzi'">Una per ogni pezzo</button>
      </div>
      <div class="riga">
        <label v-if="perPagina > 1">Salta le prime (già usate)
          <input v-model="salta" type="number" min="0" :max="perPagina - 1" inputmode="numeric" />
        </label>
        <label class="spunta"><input v-model="conPrezzo" type="checkbox" /> Prezzo</label>
        <label class="spunta"><input v-model="bordi" type="checkbox" /> Bordi di prova</label>
      </div>

      <div class="anteprima" :style="{ height: altezzaAnteprima * MM * scala + 'px' }">
        <div class="foglio" :class="{ bordi, piccola: formato.h < 25 }"
             :style="{ ...misure, transform: `scale(${scala})` }">
          <div v-for="(a, i) in pagine[0] || []" :key="i" class="etichetta">
            <template v-if="a">
              <QrCodice :testo="codiceEtichetta(a)" />
              <div class="testi">
                <b class="nome">{{ a.titolo }}</b>
                <span v-if="conPrezzo" class="costo">{{ euro(a.prezzo) }}</span>
                <small>{{ codiceEtichetta(a) }}</small>
              </div>
            </template>
          </div>
        </div>
      </div>

      <p class="aiuto">
        Consiglio: la prima volta stampa su carta normale con <b>Bordi di prova</b> e appoggia il foglio
        su quello adesivo controluce. Nella finestra di stampa scegli scala 100% (niente "adatta alla pagina").
      </p>
      <div class="riga azioni">
        <button type="button" class="btn grigio" @click="emit('chiudi')">Chiudi</button>
        <button type="button" class="btn verde" :disabled="!etichette.length" @click="stampa">🖨️ Stampa</button>
      </div>
    </div>
  </div>

  <!-- Quello che va davvero sulla carta: il resto dell'app in stampa è nascosto (vedi style.css) -->
  <Teleport to="body">
    <div class="area-stampa">
      <div v-for="(pagina, p) in pagine" :key="p" class="foglio" :class="{ bordi, piccola: formato.h < 25 }" :style="misure">
        <div v-for="(a, i) in pagina" :key="i" class="etichetta">
          <template v-if="a">
            <QrCodice :testo="codiceEtichetta(a)" />
            <div class="testi">
              <b class="nome">{{ a.titolo }}</b>
              <span v-if="conPrezzo" class="costo">{{ euro(a.prezzo) }}</span>
              <small>{{ codiceEtichetta(a) }}</small>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Non "scoped": serve anche all'area di stampa, che sta fuori dall'app */
.foglio {
  width: var(--larg); height: var(--alt); padding: var(--top) 0 0 var(--left); overflow: hidden;
  display: grid; grid-template-columns: repeat(var(--colonne), var(--w)); grid-auto-rows: var(--h);
  column-gap: var(--gapx); row-gap: var(--gapy); align-content: start;
  background: #fff; color: #000; box-sizing: border-box;
  font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.etichetta {
  display: flex; align-items: center; gap: 2mm; padding: 2mm 2.5mm; overflow: hidden; box-sizing: border-box;
}
.foglio.bordi .etichetta { outline: 0.2mm dashed #999; outline-offset: -0.1mm; }
.etichetta .qr { flex: none; height: 100%; width: auto; aspect-ratio: 1; }
.etichetta .testi { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.8mm; line-height: 1.15; }
.etichetta .nome {
  font-size: 9pt; font-weight: 700; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
}
.etichetta .costo { font-size: 13pt; font-weight: 800; }
.etichetta small { font-size: 6.5pt; color: #333; word-break: break-all; }
/* Etichette piccole (38×21): testo ridotto */
.foglio.piccola .etichetta { padding: 1.2mm 1.5mm; gap: 1.2mm; }
.foglio.piccola .nome { font-size: 6.5pt; -webkit-line-clamp: 2; }
.foglio.piccola .costo { font-size: 9pt; }
.foglio.piccola small { font-size: 4.5pt; }
</style>

<style scoped>
.scheda > * { flex: none; } /* nella finestra che scorre, gli elementi non si devono schiacciare */
.anteprima { overflow: hidden; border-radius: 10px; background: #e9e4da; display: flex; justify-content: center; flex: none; }
.anteprima .foglio { transform-origin: top center; flex: none; box-shadow: 0 2px 10px rgba(0, 0, 0, .2); }
.selezione {
  font-size: 16px; padding: 12px 14px; min-height: var(--tocco); border: 1.5px solid var(--bordo);
  border-radius: 12px; background: var(--superficie); color: var(--testo); width: 100%;
}
.spunta { flex: 0 0 auto !important; flex-direction: row !important; align-items: center; gap: 6px !important; white-space: nowrap; }
.spunta input { width: 22px; height: 22px; min-height: 0; padding: 0; -webkit-appearance: checkbox; appearance: auto; }
.btn:disabled { opacity: .5; }
</style>
