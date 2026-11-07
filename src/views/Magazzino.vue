<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import StampaEtichette from '../components/StampaEtichette.vue'
import FiltriMagazzino from '../components/FiltriMagazzino.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, bip, categorie, nomeSocio, categoriaConAnno } from '../store'
import { filtri, articoliFiltrati, proprietarioDi as di, filtriAttivi, qualcheFiltro, azzeraFiltri } from '../filtriMagazzino'

// Ricerca, categoria, socio e gli altri filtri stanno in filtriMagazzino.js:
// così restano impostati anche cambiando scheda.
const ciSonoSenza = computed(() => stato.articoli.some((a) => !di(a)))
const pannello = ref(false) // pannello "Filtri" aperto
const aperto = ref(null) // articolo in modifica (o nuovo)
const messaggio = ref('')
const etichette = ref(false) // finestra di stampa delle etichette QR

const elenco = articoliFiltrati
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
    filtri.testo = valore
  }
}
</script>

<template>
  <section>
    <p class="aiuto">Scansiona per caricare: se l'articolo c'è già aggiunge un pezzo, altrimenti lo crei.
      Con 🏷️ Etichette stampi i QR degli articoli in elenco (usa ricerca e filtri per sceglierli).</p>
    <CampoCodice placeholder="Scansiona per caricare" :pausa="!!aperto || etichette" @codice="suCodice" />
    <div v-if="messaggio" class="avviso">{{ messaggio }}</div>

    <div class="riga ricerca">
      <input v-model="filtri.testo" type="search" placeholder="🔎 Cerca titolo, codice, note…" autocomplete="off" />
      <button class="btn grigio" :class="{ attivi: filtriAttivi }" :aria-expanded="pannello" @click="pannello = !pannello"
              title="Disponibilità, prezzo, anno, note e ordinamento">⚙︎ Filtri<b v-if="filtriAttivi" class="conta">{{ filtriAttivi }}</b></button>
      <button class="btn grigio" :disabled="!elenco.length" @click="etichette = true"
              title="Stampa le etichette QR degli articoli in elenco">🏷️ Etichette</button>
      <button class="btn" @click="aperto = {}">+ Nuovo</button>
    </div>
    <FiltriMagazzino v-if="pannello" />
    <div v-if="categorie.length" class="chips">
      <button :class="{ on: !filtri.categoria }" @click="filtri.categoria = ''">Tutte</button>
      <button v-for="c in categorie" :key="c" :class="{ on: filtri.categoria === c }" @click="filtri.categoria = c">{{ c }}</button>
    </div>
    <div v-if="stato.articoli.length" class="chips soci-filtro">
      <button :class="{ on: filtri.socio === null }" @click="filtri.socio = null">Tutti i soci</button>
      <button v-for="s in stato.soci" :key="s.id" :class="{ on: filtri.socio === s.id }" @click="filtri.socio = s.id">{{ s.nome }}</button>
      <button v-if="ciSonoSenza || filtri.socio === ''" :class="{ on: filtri.socio === '' }" @click="filtri.socio = ''">Senza proprietario</button>
    </div>
    <p class="vuoto">{{ elenco.length }} titoli · {{ totPezzi }} pezzi · valore {{ euro(totValore) }}
      <template v-if="qualcheFiltro"> · su {{ stato.articoli.length }} titoli
        <button class="link" @click="azzeraFiltri">azzera filtri</button></template></p>
    <p v-if="!elenco.length && stato.articoli.length" class="vuoto">Nessun articolo con questi filtri.</p>

    <ul class="lista a-griglia">
      <li v-for="a in elenco" :key="a.id" :class="{ esaurito: a.quantita === 0 }" @click="aperto = a">
        <span class="titolo">{{ a.titolo }}<br />
          <small><span v-if="di(a)" class="pastiglia socio">{{ nomeSocio(a.proprietario) }}</span><span v-if="a.categoria" class="pastiglia">{{ categoriaConAnno(a) }}</span>{{ a.codice }}</small>
          <small v-if="a.note" class="nota">📝 {{ a.note }}</small></span>
        <span class="pz">{{ euro(a.prezzo) }}<br /><b>{{ a.quantita }}</b> <small>pz</small></span>
      </li>
    </ul>

    <SchedaArticolo v-if="aperto" :articolo="aperto" @chiudi="aperto = null" />
    <!-- Stampa gli articoli visibili adesso: usa ricerca e filtri per sceglierli -->
    <StampaEtichette v-if="etichette" :articoli="elenco" @chiudi="etichette = false" />
  </section>
</template>

<style scoped>
.conta {
  display: inline-block; margin-left: 6px; min-width: 20px; padding: 0 6px; border-radius: 999px;
  background: var(--rosso); color: #fff; font-size: 12px; line-height: 20px; text-align: center;
}
.btn.attivi { box-shadow: inset 0 0 0 2px var(--rosso); }
.link {
  border: 0; background: none; padding: 4px 2px; color: var(--rosso); font-weight: 700;
  text-decoration: underline; cursor: pointer; font-size: inherit;
}
.nota {
  display: block; margin-top: 2px; color: var(--testo-tenue);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
/* Sul telefono la ricerca prende tutta la riga e i tre tasti vanno sotto */
@media (max-width: 599px) {
  .ricerca { flex-wrap: wrap; }
  .ricerca input { flex: 1 1 100%; }
  .ricerca .btn { flex: 1 1 0; padding-left: 8px; padding-right: 8px; }
}
/* Il tasto della ricerca nativa di Safari non serve: il campo si svuota col tasto ✕ della tastiera */
input[type="search"]::-webkit-search-decoration { -webkit-appearance: none; }
</style>
