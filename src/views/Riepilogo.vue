<script setup>
import { computed, ref } from 'vue'
import { leggiChiaveGoogle, salvaChiaveGoogle } from '../isbn'
import {
  stato, euro, annullaVendita, esportaBackup, importaBackup,
  esportaMagazzinoCsv, esportaVenditeCsv, importaMagazzinoCsv, unisciVendite,
  totaleQuote, totaleSpese, contiPerSocio, nomeSocio,
} from '../store'

// Chiave Google Books per la ricerca ISBN: resta solo su questo telefono
const chiaveGoogle = ref(leggiChiaveGoogle())
const chiaveSalvata = ref(false)
function salvaChiave() {
  salvaChiaveGoogle(chiaveGoogle.value)
  chiaveGoogle.value = leggiChiaveGoogle()
  chiaveSalvata.value = true
  setTimeout(() => (chiaveSalvata.value = false), 2000)
}

const incasso = computed(() => stato.vendite.reduce((s, v) => s + v.totale, 0))
const perTipo = (t) => stato.vendite.filter((v) => v.pagamento === t).reduce((s, v) => s + v.totale, 0)
// Satispay diviso per socio: i soldi arrivano sul conto di ognuno
const satispayPerSocio = computed(() => {
  const m = new Map()
  for (const v of stato.vendite)
    if (v.pagamento === 'satispay') m.set(v.incassatoDa || '', (m.get(v.incassatoDa || '') || 0) + v.totale)
  return [...m].map(([id, totale]) => ({ id, nome: nomeSocio(id) || 'socio non indicato', totale }))
})
const pezzi = computed(() => stato.vendite.reduce((s, v) => s + v.righe.reduce((x, r) => x + r.qta, 0), 0))
const ora = (iso) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

function annulla(v) {
  if (confirm(`Annullare la vendita da ${euro(v.totale)}? Gli articoli tornano in magazzino.`)) annullaVendita(v.id)
}

async function leggiFile(evento, tipo) {
  const file = evento.target.files[0]
  if (!file) return
  const testo = await file.text()
  try {
    if (tipo === 'json') {
      if (!confirm('Il backup SOSTITUISCE tutti i dati attuali. Continuare?')) return
      importaBackup(testo)
      alert('Backup ripristinato')
    } else if (tipo === 'unisci') {
      const { aggiunte, doppie, nonTrovati, speseAggiunte } = unisciVendite(testo)
      let msg = `Unite ${aggiunte} vendite nuove.`
      if (speseAggiunte) msg += `\nUnite anche ${speseAggiunte} spese della cassa comune.`
      if (doppie) msg += `\n${doppie} erano già presenti e non sono state contate di nuovo.`
      if (nonTrovati.length) msg += `\nArticoli non trovati in questo magazzino (giacenza non scalata): ${nonTrovati.join(', ')}`
      alert(msg)
    } else {
      const esito = importaMagazzinoCsv(testo, (n) => confirm(
        `${n} articoli del file ci sono già in magazzino: verranno AGGIORNATI con i dati del file `
        + '(quantità, prezzo, proprietario…), non aggiunti di nuovo. Continuare?'))
      if (!esito) return
      let msg = `Articoli nuovi: ${esito.aggiunti}\nArticoli aggiornati: ${esito.aggiornati}`
      if (esito.sociSconosciuti.length) msg += `\nProprietari non trovati tra i soci (lasciati vuoti): ${esito.sociSconosciuti.join(', ')}`
      alert(msg)
    }
  } catch (e) {
    alert('File non valido: ' + e.message)
  } finally {
    evento.target.value = '' // così si può scegliere di nuovo lo stesso file
  }
}

function azzeraVendite() {
  if (confirm('Cancellare lo storico vendite? (il magazzino resta com\'è). Fai prima un backup!')) stato.vendite = []
}
</script>

<template>
  <section>
    <div class="cards">
      <div class="card evidenza"><small>Incasso</small><b>{{ euro(incasso) }}</b></div>
      <div class="card"><small>Contanti</small><b>{{ euro(perTipo('contanti')) }}</b></div>
      <div class="card"><small>Carta</small><b>{{ euro(perTipo('carta')) }}</b></div>
      <div class="card"><small>Pezzi venduti</small><b>{{ pezzi }}</b></div>
      <div class="card"><small>Satispay</small><b>{{ euro(perTipo('satispay')) }}</b>
        <span v-for="x in satispayPerSocio" :key="x.id" class="dettaglio">{{ x.nome }}: {{ euro(x.totale) }}</span></div>
      <div class="card"><small>PayPal</small><b>{{ euro(perTipo('paypal')) }}</b></div>
    </div>

    <!-- Conti della cassa comune (scheda Soci) -->
    <div class="cards conti">
      <div class="card"><small>Messi dai soci</small><b>{{ euro(totaleQuote) }}</b></div>
      <div class="card"><small>Spese</small><b>{{ euro(totaleSpese) }}</b></div>
      <div class="card evidenza"><small>Incasso meno spese</small>
        <b :class="{ 'rosso-testo': incasso - totaleSpese < 0 }">{{ euro(incasso - totaleSpese) }}</b></div>
      <div class="card"><small>Quote rimaste + incasso</small><b>{{ euro(totaleQuote - totaleSpese + incasso) }}</b></div>
    </div>

    <!-- Conti di ognuno: cosa ha venduto delle sue cose e quanto ci ha guadagnato -->
    <h2>Per socio</h2>
    <p class="aiuto">Guadagno = incasso meno prezzo di acquisto. Se un articolo non ha il prezzo di acquisto,
      il suo incasso conta tutto come guadagno ed è segnato a parte in <i>senza prezzo di acquisto</i>.
      Il proprietario si sceglie nella scheda dell'articolo (Magazzino).</p>
    <div class="conti-soci">
      <div v-for="c in [...contiPerSocio.righe, contiPerSocio.totale]" :key="c.id"
           class="conto-socio" :class="{ 'totale-banco': c.id === 'totale' }">
        <h3>{{ c.nome }} <b :class="{ 'rosso-testo': c.guadagno < 0 }">{{ euro(c.guadagno) }}</b></h3>
        <dl>
          <dt>Incasso ({{ c.pezziVenduti }} pz venduti)</dt><dd>{{ euro(c.incasso) }}</dd>
          <dt>Prezzo di acquisto dei venduti</dt><dd>− {{ euro(c.costo) }}</dd>
          <dt>Guadagno</dt><dd>{{ euro(c.guadagno) }}</dd>
          <dt>di cui senza prezzo di acquisto</dt><dd>{{ euro(c.nonCalcolabile) }}</dd>
          <dt>In magazzino ({{ c.pezzi }} pz)</dt><dd>{{ euro(c.valore) }}</dd>
        </dl>
      </div>
    </div>

    <h2>Vendite</h2>
    <p v-if="!stato.vendite.length" class="vuoto">Nessuna vendita ancora.</p>
    <ul class="lista">
      <li v-for="v in stato.vendite" :key="v.id">
        <span class="titolo">
          {{ ora(v.data) }} · {{ v.pagamento }}<template v-if="v.incassatoDa"> ({{ nomeSocio(v.incassatoDa) }})</template><br />
          <small v-for="r in v.righe" :key="r.articoloId">{{ r.qta }}× {{ r.titolo }}<br /></small>
        </span>
        <span class="riga stretta"><b>{{ euro(v.totale) }}</b>
          <button class="mini" title="Annulla vendita" @click="annulla(v)">↩</button></span>
      </li>
    </ul>

    <h2>Dati</h2>
    <div class="griglia">
      <button class="btn" @click="esportaBackup">💾 Backup (JSON)</button>
      <label class="btn grigio">📂 Ripristina backup<input type="file" accept=".json,application/json,text/plain" hidden @change="leggiFile($event, 'json')" /></label>
      <button class="btn" @click="esportaVenditeCsv">📊 Vendite (CSV)</button>
      <button class="btn" @click="esportaMagazzinoCsv">📦 Magazzino (CSV)</button>
      <label class="btn grigio">🔗 Unisci vendite da altro telefono<input type="file" accept=".json,application/json,text/plain" hidden @change="leggiFile($event, 'unisci')" /></label>
      <label class="btn grigio">📥 Importa CSV magazzino<input type="file" accept=".csv,text/csv,.txt,text/plain" hidden @change="leggiFile($event, 'csv')" /></label>
      <button class="btn grigio" @click="azzeraVendite">🗑 Azzera vendite</button>
    </div>
    <p class="aiuto">CSV da importare: lo stesso file di <i>Magazzino (CSV)</i>, oppure un foglio Excel salvato come CSV con le colonne
      <code>Codice;Titolo;Prezzo;Quantità;Categoria;Note;Proprietario;Prezzo acquisto</code> (servono solo Titolo e Prezzo;
      il proprietario si scrive con il nome del socio). Gli articoli già presenti vengono aggiornati, non doppiati.
      I dati restano solo su questo telefono: fai un backup a fine giornata.</p>
    <p class="aiuto"><b>Più telefoni:</b> la mattina tutti ripristinano lo stesso backup. A fine giornata ogni telefono fa
      <i>Backup (JSON)</i> e lo manda alla cassa principale, che usa <i>Unisci vendite da altro telefono</i>:
      le vendite si sommano e le giacenze scendono. Unire due volte lo stesso file non conta doppio.</p>

    <h2>Ricerca ISBN</h2>
    <form class="riga" @submit.prevent="salvaChiave">
      <input v-model="chiaveGoogle" placeholder="Chiave Google Books (facoltativa)" autocomplete="off"
        autocapitalize="off" autocorrect="off" spellcheck="false" />
      <button type="submit" class="btn">{{ chiaveSalvata ? 'Salvata ✓' : 'Salva' }}</button>
    </form>
    <p class="aiuto">Quando scansioni un libro o un fumetto con ISBN, l'app cerca titolo e autore su Google Books e Open Library.
      Senza chiave Google Books spesso non risponde. La chiave è gratuita e resta solo su questo telefono
      (non finisce nel backup): va incollata su ogni telefono. Lasciando il campo vuoto la si toglie.</p>
  </section>
</template>
