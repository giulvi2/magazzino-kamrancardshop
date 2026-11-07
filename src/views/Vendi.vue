<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import logoBurst from '../assets/logo-burst.jpg'
import QrPagamento from '../components/QrPagamento.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, registraVendita, aCentesimi, daCentesimi, bip, cercaArticoli, nomeSocio } from '../store'

const carrello = ref([]) // [{ articoloId, titolo, codice, prezzo, qta, disponibili }]
const risultati = ref([]) // suggerimenti / risultati della ricerca per titolo
const cercato = ref('') // testo scritto a mano nel campo, per i suggerimenti
const campo = ref(null) // il campo di ricerca, per svuotarlo quando si sceglie un suggerimento
const qr = ref('') // pagamento con QR in corso: 'satispay' | 'paypal' | ''
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
  cercato.value = ''
  campo.value?.svuota()
  sconosciuto.value = ''
}

// Mentre si scrive a mano, si propongono subito gli articoli del magazzino
function suScrivi(testo) {
  cercato.value = testo.trim()
  sconosciuto.value = ''
  risultati.value = cercato.value.length >= 2 ? cercaArticoli(cercato.value) : []
}

function suCodice(valore) {
  const a = trovaPerCodice(valore)
  if (a) { bip(true); aggiungi(a); return }
  // non è un codice conosciuto: se contiene lettere cerchiamo per titolo
  cercato.value = ''
  risultati.value = cercaArticoli(valore, 20)
  if (risultati.value.length === 1) { aggiungi(risultati.value[0]); return } // uno solo: va dritto nel carrello
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

const NOMI_PAGAMENTO = { contanti: 'contanti', carta: 'carta', satispay: 'Satispay', paypal: 'PayPal' }

function incassa(pagamento, incassatoDa = '') {
  if (!carrello.value.length) return
  registraVendita(carrello.value.map((r) => ({ ...r })), pagamento, incassatoDa)
  const chi = incassatoDa ? ` a ${nomeSocio(incassatoDa)}` : ''
  avvisa(`Venduto! ${euro(totale.value)} (${NOMI_PAGAMENTO[pagamento] || pagamento}${chi})`)
  qr.value = ''
  carrello.value = []
  ricevuti.value = ''
}
</script>

<template>
  <section class="due-colonne">
   <div class="colonna-cerca">
    <CampoCodice ref="campo" placeholder="Scansiona o scrivi un titolo" :pausa="!!nuovo || !!qr"
                 @codice="suCodice" @scrivi="suScrivi" />

    <div v-if="messaggio" class="avviso">{{ messaggio }}</div>

    <div v-if="sconosciuto" class="box giallo">
      Il codice <b>{{ sconosciuto }}</b> non è in magazzino.
      <div class="riga">
        <button class="btn" @click="nuovo = { codice: sconosciuto, quantita: 1 }">Aggiungilo</button>
        <button class="btn grigio" @click="sconosciuto = ''">Ignora</button>
      </div>
    </div>

    <ul v-if="risultati.length" class="lista suggerimenti">
      <li v-for="a in risultati" :key="a.id" :class="{ esaurito: a.quantita <= 0 }" @click="aggiungi(a)">
        <span class="titolo">{{ a.titolo }}
          <small v-if="a.categoria || a.codice"><br />{{ [a.categoria, a.codice].filter(Boolean).join(' · ') }}</small></span>
        <span class="pz"><b>{{ euro(a.prezzo) }}</b><br /><small>disp. {{ a.quantita }}</small></span>
      </li>
    </ul>
    <p v-else-if="cercato.length >= 2" class="aiuto">Nessun articolo con «{{ cercato }}» in magazzino.</p>
    <p v-else-if="!sconosciuto" class="aiuto">Scansiona il codice a barre con la pistola o la fotocamera 📷, oppure scrivi parte del titolo: i suggerimenti compaiono mentre scrivi.</p>
   </div>

   <div class="colonna-cassa">
    <h2>Carrello <span v-if="carrello.length" class="pastiglia">{{ carrello.reduce((s, r) => s + r.qta, 0) }} pz</span></h2>
    <div v-if="!carrello.length" class="carrello-vuoto">
      <img :src="logoBurst" alt="" />
      <p class="vuoto">Scansiona un articolo per iniziare una vendita.</p>
    </div>
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
      <div class="pagamenti">
        <button class="btn verde grande" @click="incassa('contanti')">💶 Contanti</button>
        <button class="btn verde grande" @click="incassa('carta')">💳 Carta</button>
        <button class="btn grande satispay" @click="qr = 'satispay'">📱 Satispay</button>
        <button class="btn grande paypal" @click="qr = 'paypal'">🅿️ PayPal</button>
      </div>
      <button class="btn grigio svuota" @click="carrello = []">Svuota carrello</button>
    </div>
   </div>

    <SchedaArticolo v-if="nuovo" :articolo="nuovo" @chiudi="chiudiNuovo" />
    <QrPagamento v-if="qr" :tipo="qr" :totale="totale" @pagato="(socio) => incassa(qr, socio)" @chiudi="qr = ''" />
  </section>
</template>
