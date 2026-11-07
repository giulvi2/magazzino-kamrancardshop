<script setup>
// Chiusura della giornata (da 📊 Riepilogo): i conti di un giorno da mandare agli altri soci
// come messaggio (menu Condividi di iOS, oppure copiato) o da stampare / salvare in PDF.
import { ref, computed, onBeforeUnmount } from 'vue'
import ChiusuraFoglio from './ChiusuraFoglio.vue'
import { giorniConVendite, oggiLocale, nomeGiorno, datiChiusura, testoChiusura } from '../chiusura'

const emit = defineEmits(['chiudi'])

const giorni = computed(() => giorniConVendite())
// Si parte da oggi se ci sono vendite, altrimenti dall'ultimo giorno con vendite
const giorno = ref(giorni.value.includes(oggiLocale()) ? oggiLocale() : (giorni.value[0] || 'tutte'))
const nomeOpzione = (g) => (g === oggiLocale() ? 'Oggi, ' : '') + nomeGiorno(g)

const dati = computed(() => datiChiusura(giorno.value))
const testo = computed(() => testoChiusura(dati.value))

const avviso = ref('')
function mostra(msg) {
  avviso.value = msg
  setTimeout(() => (avviso.value = ''), 2500)
}

const puoCondividere = typeof navigator !== 'undefined' && !!navigator.share

// Menu Condividi del telefono (WhatsApp, Messaggi, Mail…)
async function condividi() {
  try {
    await navigator.share({ title: 'Chiusura Kamran CardShop', text: testo.value })
  } catch (e) {
    if (e?.name !== 'AbortError') copia() // se la condivisione non va, almeno lo copia
  }
}

// Copia negli appunti; se il browser non lo permette si usa il vecchio metodo con un campo nascosto
async function copia() {
  try {
    await navigator.clipboard.writeText(testo.value)
    return mostra('Testo copiato: incollalo nel messaggio ai soci')
  } catch (e) { /* si prova sotto */ }
  const campo = document.createElement('textarea')
  campo.value = testo.value
  campo.setAttribute('readonly', '')
  campo.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'
  document.body.appendChild(campo)
  campo.select()
  campo.setSelectionRange(0, campo.value.length) // necessario su iPhone e iPad
  const ok = document.execCommand('copy')
  campo.remove()
  mostra(ok ? 'Testo copiato: incollalo nel messaggio ai soci' : 'Non riesco a copiare: usa Condividi o Stampa')
}

// Stampa su A4; dalla finestra di stampa di iPad/iPhone si può anche salvare in PDF o condividere
let stilePagina = null
function stampa() {
  stilePagina = stilePagina || document.head.appendChild(document.createElement('style'))
  stilePagina.textContent = '@page { size: A4; margin: 15mm; }'
  setTimeout(() => window.print(), 50)
}
onBeforeUnmount(() => stilePagina?.remove())
</script>

<template>
  <div class="sfondo" @click.self="emit('chiudi')">
    <div class="scheda chiusura">
      <h2>🧾 Chiusura della giornata</h2>
      <label>Giorno
        <select v-model="giorno" class="selezione">
          <option v-for="g in giorni" :key="g" :value="g">{{ nomeOpzione(g) }}</option>
          <option value="tutte">Tutte le vendite salvate</option>
        </select>
      </label>
      <p class="box giallo">Avete venduto con più telefoni? Prima unisci qui le loro vendite
        (<i>Unisci vendite da altro telefono</i>), poi fai la chiusura su questo.</p>

      <div class="anteprima-chiusura"><ChiusuraFoglio :d="dati" /></div>

      <p v-if="avviso" class="box verde-chiaro" role="status">{{ avviso }}</p>
      <div class="pulsanti-chiusura">
        <button v-if="puoCondividere" type="button" class="btn verde" @click="condividi">📤 Condividi</button>
        <button type="button" class="btn grigio" @click="copia">📋 Copia testo</button>
        <button type="button" class="btn grigio" @click="stampa">🖨️ Stampa / PDF</button>
        <button type="button" class="btn grigio" @click="emit('chiudi')">Chiudi</button>
      </div>
    </div>
  </div>

  <!-- Quello che va sulla carta: il resto dell'app in stampa è nascosto (vedi style.css) -->
  <Teleport to="body">
    <div class="area-stampa"><ChiusuraFoglio :d="dati" /></div>
  </Teleport>
</template>

<style scoped>
.scheda.chiusura { min-width: 0; } /* su telefono la tabella non deve allargare la finestra */
.scheda > * { flex: none; min-width: 0; } /* nella finestra che scorre, gli elementi non si devono schiacciare */
.selezione {
  font-size: 16px; padding: 12px 14px; min-height: var(--tocco); border: 1.5px solid var(--bordo);
  border-radius: 12px; background: var(--superficie); color: var(--testo); width: 100%;
}
.anteprima-chiusura { border: 1.5px solid var(--bordo); border-radius: 14px; padding: 14px; background: #fffdf9; }
.pulsanti-chiusura { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.box.verde-chiaro { background: #e3f6ea; color: var(--verde-scuro); }
@media (min-width: 768px) {
  .scheda.chiusura { max-width: 680px; }
}
</style>
