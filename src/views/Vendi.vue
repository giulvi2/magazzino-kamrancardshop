<script setup>
import { ref, computed } from 'vue'
import CampoCodice from '../components/CampoCodice.vue'
import SchedaArticolo from '../components/SchedaArticolo.vue'
import logoBurst from '../assets/logo-burst.jpg'
import QrPagamento from '../components/QrPagamento.vue'
import { stato, euro, trovaPerCodice, pulisciCodice, registraVendita, annullaVendita, aCentesimi, daCentesimi, bip, cercaArticoli, nomeSocio,
  esportaBackup } from '../store'

const carrello = ref([]) // [{ articoloId, titolo, codice, prezzo, qta, disponibili }]
const risultati = ref([]) // suggerimenti / risultati della ricerca per titolo
const cercato = ref('') // testo scritto a mano nel campo, per i suggerimenti
const campo = ref(null) // il campo di ricerca, per svuotarlo quando si sceglie un suggerimento
const qr = ref('') // pagamento con QR in corso: 'satispay' | 'paypal' | ''
const sconosciuto = ref('') // codice letto ma non presente in magazzino
const nuovo = ref(null) // articolo da creare
const ricevuti = ref('') // contanti ricevuti dal cliente, per il resto
const messaggio = ref('')

// Sconto: si scrive il totale trattato per tutto il carrello ('' = nessuno sconto)
const scontoAperto = ref(false)
const trattato = ref('')
const somma = computed(() => carrello.value.reduce((s, r) => s + r.prezzo * r.qta, 0)) // a prezzo pieno
const trattatoTroppoAlto = computed(() => trattato.value.trim() !== '' && aCentesimi(trattato.value) > somma.value)
const sconto = computed(() =>
  trattato.value.trim() === '' || trattatoTroppoAlto.value ? 0 : somma.value - aCentesimi(trattato.value))
const totale = computed(() => somma.value - sconto.value)
function scontoPercento(p) {
  trattato.value = daCentesimi(Math.round((somma.value * (100 - p)) / 100))
}
function togliSconto() {
  trattato.value = ''
  scontoAperto.value = false
}

// Ultima vendita fatta da questa pagina, per poterla annullare subito
const ultimaId = ref('')
const esauriti = ref([]) // articoli finiti con l'ultima vendita
const ultima = computed(() => stato.vendite.find((v) => v.id === ultimaId.value) || null)

// Promemoria backup: compare ogni N vendite (N in ⚙️ Impostazioni); "Più tardi" lo rimanda
const rimandaFino = ref(0)
const serveBackup = computed(() => {
  const { ogni, daUltimo } = stato.backup
  return ogni > 0 && daUltimo >= ogni && daUltimo >= rimandaFino.value
})
function rimandaBackup() {
  rimandaFino.value = stato.backup.daUltimo + Math.max(1, Math.ceil(stato.backup.ogni / 2))
}
function faiBackup() {
  esportaBackup()
  rimandaFino.value = 0
  avvisa('Backup salvato: controlla che il file sia nei Download / File')
}

const resto = computed(() => aCentesimi(ricevuti.value) - totale.value)

function avvisa(testo) {
  messaggio.value = testo
  setTimeout(() => (messaggio.value = ''), 2500)
}

// Prima di mettere nel carrello più pezzi di quelli in magazzino si chiede conferma
// (es. pezzo già venduto da un altro telefono, o quantità sbagliata in magazzino)
function puoAggiungere(a, nelCarrello) {
  const art = stato.articoli.find((x) => x.id === a.id)
  const disp = art ? art.quantita : 0
  if (nelCarrello < disp) return true
  bip(false)
  const testo = disp <= 0
    ? `"${a.titolo}" risulta ESAURITO (0 in magazzino).`
    : `In magazzino ci sono solo ${disp} pezzi di "${a.titolo}" e sono già nel carrello.`
  return confirm(`${testo}\nVenderlo lo stesso?`)
}

function aggiungi(a) {
  const riga = carrello.value.find((r) => r.articoloId === a.id)
  if (puoAggiungere(a, riga ? riga.qta : 0)) {
    if (riga) riga.qta++
    else carrello.value.push({ articoloId: a.id, titolo: a.titolo, codice: a.codice, categoria: a.categoria, prezzo: a.prezzo, qta: 1 })
  }
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
function piu(r) { if (puoAggiungere({ id: r.articoloId, titolo: r.titolo }, r.qta)) r.qta++ }
function cambiaPrezzo(riga, testo) { riga.prezzo = aCentesimi(testo) }

const NOMI_PAGAMENTO = { contanti: 'contanti', carta: 'carta', satispay: 'Satispay', paypal: 'PayPal' }

function incassa(pagamento, incassatoDa = '') {
  if (!carrello.value.length) return
  const esito = registraVendita(carrello.value.map((r) => ({ ...r })), pagamento, incassatoDa, sconto.value)
  const chi = incassatoDa ? ` a ${nomeSocio(incassatoDa)}` : ''
  avvisa(`Venduto! ${euro(totale.value)} (${NOMI_PAGAMENTO[pagamento] || pagamento}${chi})`)
  ultimaId.value = esito.vendita.id
  esauriti.value = esito.esauriti
  qr.value = ''
  carrello.value = []
  ricevuti.value = ''
  togliSconto()
}

// Annulla l'ultima vendita: i pezzi tornano in magazzino e di nuovo nel carrello,
// così si può rifare la vendita giusta (altro pagamento, altro prezzo…)
function annullaUltima() {
  const v = ultima.value
  if (!v) return
  let domanda = `Annullare la vendita da ${euro(v.totale)} (${NOMI_PAGAMENTO[v.pagamento] || v.pagamento})?\n`
    + 'I pezzi tornano in magazzino e nel carrello.'
  if (carrello.value.length) domanda += '\nIl carrello attuale verrà sostituito.'
  if (!confirm(domanda)) return
  annullaVendita(v.id)
  carrello.value = v.righe.map((r) => ({
    articoloId: r.articoloId, titolo: r.titolo, codice: r.codice, categoria: r.categoria, prezzo: r.prezzo, qta: r.qta,
  }))
  const scontoVendita = v.righe.reduce((s, r) => s + (r.sconto || 0), 0)
  trattato.value = scontoVendita ? daCentesimi(v.totale) : ''
  scontoAperto.value = !!scontoVendita
  ultimaId.value = ''
  esauriti.value = []
  avvisa('Vendita annullata: i pezzi sono tornati in magazzino')
}
const oraVendita = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
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
        <span class="pz"><b>{{ euro(a.prezzo) }}</b><br /><small v-if="a.quantita > 0">disp. {{ a.quantita }}</small><small v-else class="rosso-testo">ESAURITO</small></span>
      </li>
    </ul>
    <p v-else-if="cercato.length >= 2" class="aiuto">Nessun articolo con «{{ cercato }}» in magazzino.</p>
    <p v-else-if="!sconosciuto" class="aiuto">Scansiona il codice a barre con la pistola o la fotocamera 📷, oppure scrivi parte del titolo: i suggerimenti compaiono mentre scrivi.</p>
   </div>

   <div class="colonna-cassa">
    <h2>Carrello <span v-if="carrello.length" class="pastiglia">{{ carrello.reduce((s, r) => s + r.qta, 0) }} pz</span></h2>
    <div v-if="serveBackup" class="box giallo promemoria-backup">
      💾 <b>{{ stato.backup.daUltimo }} vendite</b> dall'ultimo backup. Salva il backup JSON, così non le perdi se il telefono si scarica o si rompe.
      <div class="riga">
        <button class="btn" @click="faiBackup">💾 Fai backup ora</button>
        <button class="btn grigio" @click="rimandaBackup">Più tardi</button>
      </div>
    </div>

    <div v-if="ultima" class="box ultima-vendita">
      <span>Ultima vendita {{ oraVendita(ultima.data) }} ·
        <b>{{ euro(ultima.totale) }}</b> {{ NOMI_PAGAMENTO[ultima.pagamento] || ultima.pagamento }}</span>
      <button class="btn grigio" @click="annullaUltima">↩ Annulla</button>
      <p v-if="esauriti.length" class="esauriti-avviso">⚠️ Esaurito: {{ esauriti.join(', ') }}</p>
    </div>

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
          <button class="mini" @click="piu(r)">+</button>
          ×
          <input class="prezzo" :value="daCentesimi(r.prezzo)" inputmode="decimal"
                 @change="cambiaPrezzo(r, $event.target.value)" />
          €
        </span>
      </li>
    </ul>

    <div v-if="carrello.length" class="cassa">
      <div v-if="sconto" class="riga stretta sconto-riepilogo">
        <span>Prezzo pieno <s>{{ euro(somma) }}</s></span>
        <span class="rosso-testo">Sconto − {{ euro(sconto) }}</span>
      </div>
      <div class="totale">Totale <b>{{ euro(totale) }}</b></div>
      <button v-if="!scontoAperto" class="btn grigio apri-sconto" @click="scontoAperto = true">🏷️ Sconto / prezzo trattato</button>
      <div v-else class="box-sconto">
        <label class="riga stretta">Totale trattato €
          <input v-model="trattato" class="prezzo" inputmode="decimal" :placeholder="daCentesimi(somma)" />
        </label>
        <div class="chips a-capo">
          <button @click="scontoPercento(10)">−10%</button>
          <button @click="scontoPercento(20)">−20%</button>
          <button @click="scontoPercento(50)">−50%</button>
          <button @click="togliSconto">✕ Togli</button>
        </div>
        <p v-if="trattatoTroppoAlto" class="rosso-testo">Il prezzo trattato è più alto del totale: nessuno sconto.</p>
      </div>
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
