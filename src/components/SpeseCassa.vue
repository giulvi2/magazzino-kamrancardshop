<script setup>
// Spese pagate con la cassa comune (dentro 📊 Riepilogo). Le quote dei soci si scrivono in ⚙️ Impostazioni.
import { ref, computed } from 'vue'
import { stato, euro, aCentesimi, totaleQuote, totaleSpese, aggiungiSpesa, eliminaSpesa } from '../store'

const rimasto = computed(() => totaleQuote.value - totaleSpese.value)
const giorno = (iso) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

const descrizione = ref('')
const importo = ref('')
function segnaSpesa() {
  const cent = aCentesimi(importo.value)
  if (cent <= 0) return alert('Scrivi quanto è costata la spesa')
  aggiungiSpesa(descrizione.value, cent)
  descrizione.value = ''
  importo.value = ''
}
function togliSpesa(sp) {
  if (confirm(`Cancellare la spesa "${sp.descrizione}" da ${euro(sp.importo)}?`)) eliminaSpesa(sp.id)
}
</script>

<template>
  <div>
    <h2>Spese pagate con la cassa comune</h2>
    <p class="aiuto">Per esempio il suolo pubblico. Rimasto in cassa comune (quote meno spese):
      <b :class="{ 'rosso-testo': rimasto < 0 }">{{ euro(rimasto) }}</b>.
      Le quote dei soci si scrivono in <b>⚙️ Impostazioni</b>.</p>
    <p v-if="rimasto < 0" class="box giallo">Le spese superano le quote di {{ euro(-rimasto) }}: qualcuno ha anticipato di tasca sua?</p>
    <form class="riga spesa-nuova" @submit.prevent="segnaSpesa">
      <input v-model="descrizione" placeholder="Cosa? (es. suolo pubblico)" aria-label="Descrizione della spesa" />
      <input v-model="importo" class="prezzo" inputmode="decimal" placeholder="0,00" aria-label="Importo in euro" />
      <button class="btn rosso" type="submit">Segna</button>
    </form>
    <p v-if="!stato.spese.length" class="vuoto">Nessuna spesa ancora.</p>
    <ul class="lista">
      <li v-for="sp in stato.spese" :key="sp.id">
        <span class="titolo">{{ sp.descrizione }}<br /><small>{{ giorno(sp.data) }}</small></span>
        <span class="riga stretta"><b>{{ euro(sp.importo) }}</b>
          <button class="mini" title="Cancella spesa" @click="togliSpesa(sp)">✕</button></span>
      </li>
    </ul>
  </div>
</template>
