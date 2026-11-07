<script setup>
// Soci, quote messe nella cassa comune e QR per i pagamenti (dentro ⚙️ Impostazioni).
// Le spese della cassa comune stanno nel Riepilogo (SpeseCassa.vue).
import {
  stato, euro, aCentesimi, daCentesimi, totaleQuote, aggiungiSocio, eliminaSocio,
} from '../store'
import { leggiImmagine } from '../immagini'

// La quota vuota (0) si mostra come campo vuoto, così si scrive subito l'importo
const mostraQuota = (s) => (s.quota ? daCentesimi(s.quota) : '')
function cambiaQuota(s, testo) { s.quota = Math.max(0, aCentesimi(testo)) }

function togliSocio(s) {
  if (confirm(`Togliere ${s.nome} dai soci?`)) eliminaSocio(s.id)
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
  <div>
    <h2>Soci e quote</h2>
    <p class="aiuto">Chi c'è nel banco e quanto ha messo all'inizio nella cassa comune.
      Le spese pagate con quei soldi si segnano nel <b>📊 Riepilogo</b>.</p>
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

  </div>
</template>
