<script setup>
// Soci, quote messe nella cassa comune e QR per i pagamenti (dentro ⚙️ Impostazioni).
// Le spese della cassa comune stanno nel Riepilogo (SpeseCassa.vue).
import { computed } from 'vue'
import {
  stato, euro, metodoAttivo, aCentesimi, daCentesimi, totaleQuote, aggiungiSocio, eliminaSocio,
} from '../store'
import { leggiImmagine } from '../immagini'

// La quota vuota (0) si mostra come campo vuoto, così si scrive subito l'importo
const mostraQuota = (s) => (s.quota ? daCentesimi(s.quota) : '')
function cambiaQuota(s, testo) { s.quota = Math.max(0, aCentesimi(testo)) }

function togliSocio(s) {
  if (confirm(`Togliere ${s.nome} dai soci?`)) eliminaSocio(s.id)
}

// ---- QR per i pagamenti: Satispay di ogni socio, PayPal del banco e (facoltativo) di ogni socio ----
async function caricaQr(evento, salva) {
  const file = evento.target.files[0]
  evento.target.value = ''
  if (!file) return
  try { salva(await leggiImmagine(file)) } catch (e) { alert(e.message) }
}
// Soci nella sezione QR: chi non avrà mai un QR (es. Kamran) si toglie e non sporca l'elenco.
// Resta tra i soci; socio.senzaQr = true lo nasconde qui e nelle finestre QR di Vendi.
const sociQr = computed(() => stato.soci.filter((s) => !s.senzaQr))
function cambiaSocioQr(s) {
  if (s.senzaQr) delete s.senzaQr
  else s.senzaQr = true
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
    <p class="aiuto">Carica una foto o uno screenshot del QR (meglio ritagliato sul solo QR): <b>Cambia</b> lo sostituisce,
      <b>✕</b> lo toglie. Se un metodo non lo usate, spegnetelo: il bottone sparisce da Vendi e i QR restano salvati
      per quando lo riaccendete. I QR finiscono anche nel backup, così arrivano sugli altri telefoni.</p>

    <p class="aiuto"><b>Chi usa i QR</b>: tocca un nome per toglierlo o rimetterlo. Chi è tolto non compare
      qui sotto né in Vendi, ma resta tra i soci (e i suoi QR, se ne aveva, restano salvati).</p>
    <div class="chips a-capo soci-qr">
      <button v-for="s in stato.soci" :key="'chi' + s.id" :class="{ on: !s.senzaQr }" @click="cambiaSocioQr(s)">
        {{ s.senzaQr ? '+' : '✓' }} {{ s.nome }}
      </button>
    </div>

    <div class="metodo">
      <h3>📱 Satispay</h3>
      <label class="interruttore"><input type="checkbox" :checked="metodoAttivo('satispay')"
        @change="stato.pagamenti.satispay = $event.target.checked" /> Usa in Vendi</label>
    </div>
    <template v-if="metodoAttivo('satispay')">
      <p class="aiuto">In Vendi si sceglie il socio e compare il suo QR. Se qualcuno ha caricato il QR, compaiono solo i soci con il QR.</p>
      <ul class="lista qr-lista">
        <li v-for="s in sociQr" :key="'qr' + s.id">
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
      </ul>
    </template>
    <p v-else class="aiuto metodo-spento">Spento: in Vendi non compare.</p>

    <div class="metodo">
      <h3>🅿️ PayPal</h3>
      <label class="interruttore"><input type="checkbox" :checked="metodoAttivo('paypal')"
        @change="stato.pagamenti.paypal = $event.target.checked" /> Usa in Vendi</label>
    </div>
    <template v-if="metodoAttivo('paypal')">
      <p class="aiuto">In Vendi compare il QR del banco; se un socio carica il suo QR PayPal, si sceglie tra banco e socio.</p>
      <ul class="lista qr-lista">
        <li>
          <img v-if="stato.pagamenti.paypalQr" :src="stato.pagamenti.paypalQr" alt="" class="qr-mini" />
          <span v-else class="qr-mini vuoto-qr">—</span>
          <span class="titolo">PayPal<br /><small>del banco</small></span>
          <span class="riga stretta">
            <label class="btn grigio">{{ stato.pagamenti.paypalQr ? 'Cambia' : 'Carica' }}
              <input type="file" accept="image/*" hidden @change="caricaQr($event, (d) => (stato.pagamenti.paypalQr = d))" /></label>
            <button v-if="stato.pagamenti.paypalQr" class="mini" title="Togli QR"
                    @click="togliQr('il QR PayPal del banco', () => (stato.pagamenti.paypalQr = ''))">✕</button>
          </span>
        </li>
        <li v-for="s in sociQr" :key="'pp' + s.id">
          <img v-if="s.paypalQr" :src="s.paypalQr" alt="" class="qr-mini" />
          <span v-else class="qr-mini vuoto-qr">—</span>
          <span class="titolo">PayPal<br /><small>{{ s.nome }}</small></span>
          <span class="riga stretta">
            <label class="btn grigio">{{ s.paypalQr ? 'Cambia' : 'Carica' }}
              <input type="file" accept="image/*" hidden @change="caricaQr($event, (d) => (s.paypalQr = d))" /></label>
            <button v-if="s.paypalQr" class="mini" title="Togli QR"
                    @click="togliQr(`il QR PayPal di ${s.nome}`, () => delete s.paypalQr)">✕</button>
          </span>
        </li>
      </ul>
    </template>
    <p v-else class="aiuto metodo-spento">Spento: in Vendi non compare.</p>

  </div>
</template>
