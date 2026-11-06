<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import StampaEtichette from '../components/StampaEtichette.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, bip, categorie, nomeSocio } from '../store'

const filtro = ref('')
const categoria = ref('') // filtro per categoria ('' = tutte)
const socio = ref(null) // filtro per proprietario (null = tutti, '' = senza proprietario)
// Chi ha un socio che non c'è più nella scheda Soci conta come "senza proprietario"
const di = (a) => (stato.soci.some((s) => s.id === a.proprietario) ? a.proprietario : '')
const ciSonoSenza = computed(() => stato.articoli.some((a) => !di(a)))
const aperto = ref(null) // articolo in modifica (o nuovo)
const messaggio = ref('')
const etichette = ref(false) // finestra di stampa delle etichette QR

const elenco = computed(() => {
  const q = filtro.value.toLowerCase()
  return stato.articoli
    .filter((a) => !categoria.value || a.categoria === categoria.value)
    .filter((a) => socio.value === null || di(a) === socio.value)
    .filter((a) => !q || a.titolo.toLowerCase().includes(q) || a.codice.includes(q))
    .sort((a, b) => a.titolo.localeCompare(b.titolo))
})
// I totali seguono i filtri: scegliendo un socio si vede quanto ha in magazzino
const totPezzi = computed(() => elenco.value.reduce((s, a) => s + a.quantita, 0))
const totValore = computed(() => elenco.value.reduce((s, a) => s + a.quantita * a.prezzo, 0))

// Carico: se l'articolo esiste aggiunge 1 pezzo, altrimenti apre la scheda
function suCodice(valore) {
  const a = trovaPerCodice(valore)
  if (a) {
    a.quantita++
    bip(true)
    messaggio.value = `+1 "${a.titolo}" (ora ${a.quantita})`
    setTimeout(() => (messaggio.value = ''), 2500)
  } else if (/^\d+$/.test(pulisciCodice(valore))) {
    bip(true)
    aperto.value = { codice: pulisciCodice(valore), quantita: 1 }
  } else {
    filtro.value = valore
  }
}
</script>

<template>
  <section>
    <p class="aiuto">Scansiona per caricare: se l'articolo c'è già aggiunge un pezzo, altrimenti lo crei.
      Con 🏷️ Etichette stampi i QR degli articoli in elenco (usa filtro, categoria e socio per sceglierli).</p>
    <CampoCodice placeholder="Scansiona per caricare" :pausa="!!aperto || etichette" @codice="suCodice" />
    <div v-if="messaggio" class="avviso">{{ messaggio }}</div>

    <div class="riga">
      <input v-model="filtro" placeholder="🔎 Filtra per titolo o codice" />
      <button class="btn grigio" :disabled="!elenco.length" @click="etichette = true"
              title="Stampa le etichette QR degli articoli in elenco">🏷️ Etichette</button>
      <button class="btn" @click="aperto = {}">+ Nuovo</button>
    </div>
    <div v-if="categorie.length" class="chips">
      <button :class="{ on: !categoria }" @click="categoria = ''">Tutte</button>
      <button v-for="c in categorie" :key="c" :class="{ on: categoria === c }" @click="categoria = c">{{ c }}</button>
    </div>
    <div v-if="stato.articoli.length" class="chips soci-filtro">
      <button :class="{ on: socio === null }" @click="socio = null">Tutti i soci</button>
      <button v-for="s in stato.soci" :key="s.id" :class="{ on: socio === s.id }" @click="socio = s.id">{{ s.nome }}</button>
      <button v-if="ciSonoSenza || socio === ''" :class="{ on: socio === '' }" @click="socio = ''">Senza proprietario</button>
    </div>
    <p class="vuoto">{{ elenco.length }} titoli · {{ totPezzi }} pezzi · valore {{ euro(totValore) }}</p>

    <ul class="lista a-griglia">
      <li v-for="a in elenco" :key="a.id" :class="{ esaurito: a.quantita === 0 }" @click="aperto = a">
        <span class="titolo">{{ a.titolo }}<br />
          <small><span v-if="di(a)" class="pastiglia socio">{{ nomeSocio(a.proprietario) }}</span><span v-if="a.categoria" class="pastiglia">{{ a.categoria }}</span>{{ a.codice }}</small></span>
        <span class="pz">{{ euro(a.prezzo) }}<br /><b>{{ a.quantita }}</b> <small>pz</small></span>
      </li>
    </ul>

    <SchedaArticolo v-if="aperto" :articolo="aperto" @chiudi="aperto = null" />
    <!-- Stampa gli articoli visibili adesso: usa filtro e categoria per sceglierli -->
    <StampaEtichette v-if="etichette" :articoli="elenco" @chiudi="etichette = false" />
  </section>
</template>
