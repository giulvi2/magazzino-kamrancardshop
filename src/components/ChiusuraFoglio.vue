<script setup>
// Il foglio della chiusura: lo stesso si vede nella finestra e finisce sulla carta (o nel PDF)
import { euro } from '../store'
defineProps({ d: { type: Object, required: true } })
</script>

<template>
  <div class="foglio-chiusura">
    <header>
      <b>Kamran CardShop · Chiusura</b>
      <span class="giorno">{{ d.titolo }}</span>
      <small v-if="d.dalle">Vendite dalle {{ d.dalle }} alle {{ d.alle }} · {{ d.vendite }} vendite · {{ d.pezzi }} pezzi</small>
    </header>

    <section>
      <h3>Incasso <b>{{ euro(d.incasso) }}</b></h3>
      <dl>
        <dt>Contanti</dt><dd>{{ euro(d.contanti) }}</dd>
        <dt>Carta</dt><dd>{{ euro(d.carta) }}</dd>
        <dt>Satispay</dt><dd>{{ euro(d.satispay) }}</dd>
        <template v-for="s in d.satispayPerSocio" :key="s.id">
          <dt class="rientro">sul conto di {{ s.nome }}</dt><dd>{{ euro(s.totale) }}</dd>
        </template>
        <dt>PayPal</dt><dd>{{ euro(d.paypal) }}</dd>
      </dl>
    </section>

    <section>
      <h3>Quanto spetta a ognuno</h3>
      <p class="nota">Incasso delle cose di ogni socio. Guadagno = incasso meno prezzo di acquisto
        (se manca il prezzo di acquisto, l'incasso conta tutto come guadagno).</p>
      <p v-if="!d.soci.length" class="nota">Nessuna vendita.</p>
      <div v-else class="scorri"><table>
        <thead><tr><th>Socio</th><th>Pezzi</th><th>Spetta</th><th>Acquisto</th><th>Guadagno</th><th>Già su Satispay</th></tr></thead>
        <tbody>
          <tr v-for="c in d.soci" :key="c.id">
            <td>{{ c.nome }}</td><td>{{ c.pezziVenduti }}</td><td><b>{{ euro(c.incasso) }}</b></td>
            <td>{{ c.costo ? '− ' + euro(c.costo) : '—' }}</td>
            <td :class="{ negativo: c.guadagno < 0 }">{{ euro(c.guadagno) }}</td>
            <td>{{ c.satispay ? euro(c.satispay) : '—' }}</td>
          </tr>
        </tbody>
      </table></div>
      <p v-if="d.senzaVendite.length" class="nota">Niente venduto: {{ d.senzaVendite.join(', ') }}.</p>
      <p v-if="d.differenza" class="nota">Sconti o differenze sul totale: {{ euro(d.differenza) }} (non divisi tra i soci).</p>
    </section>

    <section>
      <h3>Cassa comune</h3>
      <dl>
        <dt>Quote dei soci</dt><dd>{{ euro(d.quote) }}</dd>
        <dt>Spese</dt><dd>− {{ euro(d.spese) }}</dd>
        <template v-for="(sp, i) in d.elencoSpese" :key="i">
          <dt class="rientro">{{ sp.descrizione }}</dt><dd>{{ euro(sp.importo) }}</dd>
        </template>
        <dt><b>Rimasto in cassa comune</b></dt><dd><b>{{ euro(d.rimasto) }}</b></dd>
        <dt>Incasso meno spese</dt><dd>{{ euro(d.incassoMenoSpese) }}</dd>
      </dl>
    </section>
  </div>
</template>

<style>
/* Non "scoped": serve anche all'area di stampa, che sta fuori dall'app */
.foglio-chiusura { display: flex; flex-direction: column; gap: 14px; font-size: 14px; color: var(--testo, #000); }
.foglio-chiusura header { display: flex; flex-direction: column; gap: 2px; }
.foglio-chiusura header b { font-size: 17px; font-weight: 850; }
.foglio-chiusura .giorno { font-weight: 650; }
.foglio-chiusura .giorno::first-letter { text-transform: uppercase; }
.foglio-chiusura header small, .foglio-chiusura .nota { color: var(--testo-tenue, #555); font-size: 12.5px; margin: 0; }
.foglio-chiusura section { border-top: 1.5px solid var(--bordo, #ccc); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.foglio-chiusura h3 { margin: 0; font-size: 15px; display: flex; justify-content: space-between; align-items: baseline; }
.foglio-chiusura h3 b { font-size: 22px; font-weight: 850; font-variant-numeric: tabular-nums; }
.foglio-chiusura dl { margin: 0; display: grid; grid-template-columns: 1fr auto; gap: 3px 12px; }
.foglio-chiusura dt { color: var(--testo-tenue, #555); }
.foglio-chiusura dt.rientro { padding-left: 14px; font-size: 13px; }
.foglio-chiusura dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 650; }
/* tabella dei soci: su telefono scorre di lato se non ci sta */
.foglio-chiusura table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.foglio-chiusura .scorri { min-width: 0; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.foglio-chiusura th, .foglio-chiusura td { padding: 5px 6px; text-align: right; white-space: nowrap; border-bottom: 1px solid var(--bordo, #ddd); }
.foglio-chiusura th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--testo-tenue, #555); }
.foglio-chiusura th:first-child, .foglio-chiusura td:first-child { text-align: left; width: 100%; }
.foglio-chiusura .negativo { color: var(--rosso, #c00); }
@media print {
  .area-stampa .foglio-chiusura { font-size: 11pt; color: #000; padding: 0; }
  .area-stampa .foglio-chiusura .scorri { overflow: visible; }
}
</style>
