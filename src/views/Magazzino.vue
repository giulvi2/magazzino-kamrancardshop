<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, bip, categorie } from '../store'

const filtro = ref('')
const categoria = ref('') // filtro per categoria ('' = tutte)
const aperto = ref(null) // articolo in modifica (o nuovo)
const messaggio = ref('')

const elenco = computed(() => {
  const q = filtro.value.toLowerCase()
  return stato.articoli
    .filter((a) => !categoria.value || a.categoria === categoria.value)
    .filter((a) => !q || a.titolo.toLowerCase().includes(q) || a.codice.includes(q))
    .sort((a, b) => a.titolo.localeCompare(b.titolo))
})
const totPezzi = computed(() => stato.articoli.reduce((s, a) => s + a.quantita, 0))
const totValore = computed(() => stato.articoli.reduce((s, a) => s + a.quantita * a.prezzo, 0))

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
    <p class="aiuto">Scansiona per caricare: se l'articolo c'è già aggiunge un pezzo, altrimenti lo crei.</p>
    <CampoCodice placeholder="Scansiona per caricare" :pausa="!!aperto" @codice="suCodice" />
    <div v-if="messaggio" class="avviso">{{ messaggio }}</div>

    <div class="riga">
      <input v-model="filtro" placeholder="🔎 Filtra per titolo o codice" />
      <button class="btn" @click="aperto = {}">+ Nuovo</button>
    </div>
    <div v-if="categorie.length" class="chips">
      <button :class="{ on: !categoria }" @click="categoria = ''">Tutte</button>
      <button v-for="c in categorie" :key="c" :class="{ on: categoria === c }" @click="categoria = c">{{ c }}</button>
    </div>
    <p class="vuoto">{{ stato.articoli.length }} titoli · {{ totPezzi }} pezzi · valore {{ euro(totValore) }}</p>

    <ul class="lista a-griglia">
      <li v-for="a in elenco" :key="a.id" :class="{ esaurito: a.quantita === 0 }" @click="aperto = a">
        <span class="titolo">{{ a.titolo }}<br />
          <small><span v-if="a.categoria" class="pastiglia">{{ a.categoria }}</span>{{ a.codice }}</small></span>
        <span class="pz">{{ euro(a.prezzo) }}<br /><b>{{ a.quantita }}</b> <small>pz</small></span>
      </li>
    </ul>

    <SchedaArticolo v-if="aperto" :articolo="aperto" @chiudi="aperto = null" />
  </section>
</template>
