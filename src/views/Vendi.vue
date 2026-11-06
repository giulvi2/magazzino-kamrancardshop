<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, registraVendita, aCentesimi, daCentesimi, bip } from '../store'

const carrello = ref([]) // [{ articoloId, titolo, codice, prezzo, qta, disponibili }]
const risultati = ref([]) // risultati della ricerca per titolo
const sconosciuto = ref('') // codice letto ma non presente in magazzino
const nuovo = ref(null) // articolo da creare
const ricevuti = ref('') // contanti ricevuti dal cliente, per il resto
const messaggio = ref('')

const totale = computed(() => carrello.value.reduce((s, r) => s + r.prezzo * r.qta, 0))
const resto = computed(() => aCentesimi(ricevuti.value) - totale.value)

function avvisa(testo) {
  messaggio.value = testo
  setTimeout(() => (messaggio.value = ''), 2500)
}

function aggiungi(a) {
  const riga = carrello.value.find((r) => r.articoloId === a.id)
  if (riga) riga.qta++
  else carrello.value.push({ articoloId: a.id, titolo: a.titolo, codice: a.codice, categoria: a.categoria, prezzo: a.prezzo, qta: 1 })
  const nelCarrello = carrello.value.find((r) => r.articoloId === a.id).qta
  if (nelCarrello > a.quantita) avvisa(`Attenzione: in magazzino ne risultano ${a.quantita}`)
  risultati.value = []
  sconosciuto.value = ''
}

function suCodice(valore) {
  const a = trovaPerCodice(valore)
  if (a) { bip(true); aggiungi(a); return }
  // non è un codice conosciuto: se contiene lettere cerchiamo per titolo
  const q = valore.toLowerCase()
  risultati.value = stato.articoli.filter((x) => x.titolo.toLowerCase().includes(q)).slice(0, 20)
  if (risultati.value.length) return
  bip(false)
  sconosciuto.value = /^\d+$/.test(pulisciCodice(valore)) ? pulisciCodice(valore) : ''
  if (!sconosciuto.value) avvisa('Nessun articolo trovato')
}

function chiudiNuovo() {
  const codice = nuovo.value?.codice
  nuovo.value = null
  const a = codice && trovaPerCodice(codice)
  if (a) aggiungi(a)
}

function togli(i) { carrello.value.splice(i, 1) }
function cambiaPrezzo(riga, testo) { riga.prezzo = aCentesimi(testo) }

function incassa(pagamento) {
  if (!carrello.value.length) return
  registraVendita(carrello.value.map((r) => ({ ...r })), pagamento)
  avvisa(`Venduto! ${euro(totale.value)} (${pagamento})`)
  carrello.value = []
  ricevuti.value = ''
}
</script>

<template>
  <section class="due-colonne">
   <div class="colonna-cerca">
    <CampoCodice placeholder="Scansiona o cerca un titolo" :pausa="!!nuovo" @codice="suCodice" />

    <div v-if="messaggio" class="avviso">{{ messaggio }}</div>

    <div v-if="sconosciuto" class="box giallo">
      Il codice <b>{{ sconosciuto }}</b> non è in magazzino.
      <div class="riga">
        <button class="btn" @click="nuovo = { codice: sconosciuto, quantita: 1 }">Aggiungilo</button>
        <button class="btn grigio" @click="sconosciuto = ''">Ignora</button>
      </div>
    </div>

    <ul v-if="risultati.length" class="lista">
      <li v-for="a in risultati" :key="a.id" @click="aggiungi(a)">
        <span class="titolo">{{ a.titolo }}</span>
        <span class="pz">{{ euro(a.prezzo) }}<br /><small>disp. {{ a.quantita }}</small></span>
      </li>
    </ul>
    <p v-else-if="!sconosciuto" class="aiuto">Scansiona il codice a barre con la pistola o la fotocamera 📷, oppure scrivi parte del titolo e premi OK.</p>
   </div>

   <div class="colonna-cassa">
    <h2>Carrello <span v-if="carrello.length" class="pastiglia">{{ carrello.reduce((s, r) => s + r.qta, 0) }} pz</span></h2>
    <p v-if="!carrello.length" class="vuoto">Scansiona un articolo per iniziare una vendita.</p>
    <ul class="lista carrello">
      <li v-for="(r, i) in carrello" :key="r.articoloId">
        <span class="titolo">{{ r.titolo }}</span>
        <span class="riga stretta">
          <button class="mini" @click="r.qta > 1 ? r.qta-- : togli(i)">−</button>
          <b>{{ r.qta }}</b>
          <button class="mini" @click="r.qta++">+</button>
          ×
          <input class="prezzo" :value="daCentesimi(r.prezzo)" inputmode="decimal"
                 @change="cambiaPrezzo(r, $event.target.value)" />
          €
        </span>
      </li>
    </ul>

    <div v-if="carrello.length" class="cassa">
      <div class="totale">Totale <b>{{ euro(totale) }}</b></div>
      <label class="riga stretta">Ricevuti €
        <input v-model="ricevuti" class="prezzo" inputmode="decimal" placeholder="0,00" />
        <span v-if="ricevuti && resto >= 0">Resto <b>{{ euro(resto) }}</b></span>
        <span v-else-if="ricevuti" class="rosso-testo">Mancano {{ euro(-resto) }}</span>
      </label>
      <div class="riga">
        <button class="btn grigio" @click="carrello = []">Svuota</button>
        <button class="btn verde grande" @click="incassa('contanti')">💶 Contanti</button>
        <button class="btn verde grande" @click="incassa('carta')">💳 Carta</button>
      </div>
    </div>
   </div>

    <SchedaArticolo v-if="nuovo" :articolo="nuovo" @chiudi="chiudiNuovo" />
  </section>
</template>
