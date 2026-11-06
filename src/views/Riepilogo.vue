<script setup>
import { computed } from 'vue'
import {
  stato, euro, annullaVendita, esportaBackup, importaBackup,
  esportaMagazzinoCsv, esportaVenditeCsv, importaMagazzinoCsv,
} from '../store'

const incasso = computed(() => stato.vendite.reduce((s, v) => s + v.totale, 0))
const perTipo = (t) => stato.vendite.filter((v) => v.pagamento === t).reduce((s, v) => s + v.totale, 0)
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
    } else {
      alert(`Importate ${importaMagazzinoCsv(testo)} righe`)
    }
  } catch (e) {
    alert('File non valido: ' + e.message)
  }
  evento.target.value = ''
}

function azzeraVendite() {
  if (confirm('Cancellare lo storico vendite? (il magazzino resta com\'è). Fai prima un backup!')) stato.vendite = []
}
</script>

<template>
  <section>
    <div class="cards">
      <div class="card"><small>Incasso</small><b>{{ euro(incasso) }}</b></div>
      <div class="card"><small>Contanti</small><b>{{ euro(perTipo('contanti')) }}</b></div>
      <div class="card"><small>Carta</small><b>{{ euro(perTipo('carta')) }}</b></div>
      <div class="card"><small>Pezzi venduti</small><b>{{ pezzi }}</b></div>
    </div>

    <h2>Vendite</h2>
    <p v-if="!stato.vendite.length" class="vuoto">Nessuna vendita ancora.</p>
    <ul class="lista">
      <li v-for="v in stato.vendite" :key="v.id">
        <span class="titolo">
          {{ ora(v.data) }} · {{ v.pagamento }}<br />
          <small v-for="r in v.righe" :key="r.articoloId">{{ r.qta }}× {{ r.titolo }}<br /></small>
        </span>
        <span class="riga stretta"><b>{{ euro(v.totale) }}</b>
          <button class="mini" title="Annulla vendita" @click="annulla(v)">↩</button></span>
      </li>
    </ul>

    <h2>Dati</h2>
    <div class="griglia">
      <button class="btn" @click="esportaBackup">💾 Backup (JSON)</button>
      <label class="btn grigio">📂 Ripristina backup<input type="file" accept=".json" hidden @change="leggiFile($event, 'json')" /></label>
      <button class="btn" @click="esportaVenditeCsv">📊 Vendite (CSV)</button>
      <button class="btn" @click="esportaMagazzinoCsv">📦 Magazzino (CSV)</button>
      <label class="btn grigio">📥 Importa CSV magazzino<input type="file" accept=".csv,.txt" hidden @change="leggiFile($event, 'csv')" /></label>
      <button class="btn grigio" @click="azzeraVendite">🗑 Azzera vendite</button>
    </div>
    <p class="aiuto">CSV da importare: colonne <code>Codice;Titolo;Prezzo;Quantità;Categoria</code> (Categoria facoltativa) (va bene un foglio Excel salvato come CSV).
      I dati restano solo su questo telefono: fai un backup a fine giornata.</p>
  </section>
</template>
