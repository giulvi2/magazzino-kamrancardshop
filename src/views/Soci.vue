<script setup>
import { ref, computed } from 'vue'
import {
  stato, euro, aCentesimi, daCentesimi, totaleQuote, totaleSpese,
  aggiungiSocio, eliminaSocio, aggiungiSpesa, eliminaSpesa,
} from '../store'
import { leggiImmagine } from '../immagini'

const rimasto = computed(() => totaleQuote.value - totaleSpese.value)
const giorno = (iso) => new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// La quota vuota (0) si mostra come campo vuoto, così si scrive subito l'importo
const mostraQuota = (s) => (s.quota ? daCentesimi(s.quota) : '')
function cambiaQuota(s, testo) { s.quota = Math.max(0, aCentesimi(testo)) }

function togliSocio(s) {
  if (confirm(`Togliere ${s.nome} dai soci?`)) eliminaSocio(s.id)
}

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

// ---- QR per i pagamenti: Satispay di ogni socio, PayPal del banco ----
async function caricaQr(evento, salva) {
  const file = evento.target.files[0]
  evento.target.value = ''
  if (!file) return
  try { salva(await leggiImmagine(file)) } catch (e) { alert(e.message) }
}
function togliQr(testo, togli) {
  if (confirm(`Togliere ${testo}?`)) togli()
}
</script>

<template>
  <section>
    <p class="aiuto">I soldi che ognuno mette all'inizio nella cassa comune, e le spese pagate con quei soldi (per esempio il suolo).</p>

    <div class="cards">
      <div class="card"><small>Messi dai soci</small><b>{{ euro(totaleQuote) }}</b></div>
      <div class="card"><small>Spese</small><b>{{ euro(totaleSpese) }}</b></div>
      <div class="card evidenza"><small>Rimasto in cassa comune</small>
        <b :class="{ 'rosso-testo': rimasto < 0 }">{{ euro(rimasto) }}</b></div>
      <div class="card"><small>Soci</small><b>{{ stato.soci.length }}</b></div>
    </div>
    <p v-if="rimasto < 0" class="box giallo">Le spese superano le quote di {{ euro(-rimasto) }}: qualcuno ha anticipato di tasca sua?</p>

    <h2>Quote dei soci</h2>
    <ul class="lista soci">
      <li v-for="s in stato.soci" :key="s.id">
        <input v-model="s.nome" class="nome-socio" aria-label="Nome del socio" />
        <span class="riga stretta">
          <input class="prezzo" :value="mostraQuota(s)" inputmode="decimal" placeholder="0,00"
            aria-label="Quota in euro" @change="cambiaQuota(s, $event.target.value)" /> €
          <button class="mini" title="Togli socio" @click="togliSocio(s)">✕</button>
        </span>
      </li>
    </ul>
    <div class="riga">
      <button class="btn grigio" @click="aggiungiSocio()">+ Aggiungi socio</button>
      <span class="totale-quote">Totale <b>{{ euro(totaleQuote) }}</b></span>
    </div>

    <h2>QR per i pagamenti</h2>
    <p class="aiuto">Carica una foto o uno screenshot del QR (meglio ritagliato sul solo QR).
      In Vendi, con <b>Satispay</b> si sceglie il socio e compare il suo QR; con <b>PayPal</b> compare quello del banco.
      I QR finiscono anche nel backup, così arrivano sugli altri telefoni.</p>
    <ul class="lista qr-lista">
      <li v-for="s in stato.soci" :key="'qr' + s.id">
        <img v-if="s.satispayQr" :src="s.satispayQr" alt="" class="qr-mini" />
        <span v-else class="qr-mini vuoto-qr">—</span>
        <span class="titolo">Satispay<br /><small>{{ s.nome }}</small></span>
        <span class="riga stretta">
          <label class="btn grigio">{{ s.satispayQr ? 'Cambia' : 'Carica' }}
            <input type="file" accept="image/*" hidden @change="caricaQr($event, (d) => (s.satispayQr = d))" /></label>
          <button v-if="s.satispayQr" class="mini" title="Togli QR"
                  @click="togliQr(`il QR Satispay di ${s.nome}`, () => delete s.satispayQr)">✕</button>
        </span>
      </li>
      <li>
        <img v-if="stato.pagamenti.paypalQr" :src="stato.pagamenti.paypalQr" alt="" class="qr-mini" />
        <span v-else class="qr-mini vuoto-qr">—</span>
        <span class="titolo">PayPal<br /><small>del banco</small></span>
        <span class="riga stretta">
          <label class="btn grigio">{{ stato.pagamenti.paypalQr ? 'Cambia' : 'Carica' }}
            <input type="file" accept="image/*" hidden @change="caricaQr($event, (d) => (stato.pagamenti.paypalQr = d))" /></label>
          <button v-if="stato.pagamenti.paypalQr" class="mini" title="Togli QR"
                  @click="togliQr('il QR PayPal', () => (stato.pagamenti.paypalQr = ''))">✕</button>
        </span>
      </li>
    </ul>

    <h2>Spese pagate con la cassa comune</h2>
    <form class="riga spesa-nuova" @submit.prevent="segnaSpesa">
      <input v-model="descrizione" placeholder="Cosa? (es. suolo pubblico)" />
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
  </section>
</template>
