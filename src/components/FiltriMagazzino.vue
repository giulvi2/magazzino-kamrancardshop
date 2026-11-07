<script setup>
// Pannello dei filtri del Magazzino: disponibilità, prezzo, anno, note e ordinamento.
import { filtri, ORDINI, azzeraFiltri, qualcheFiltro } from '../filtriMagazzino'
import { pulisciAnno } from '../store'

const DISPONIBILITA = [
  { valore: '', nome: 'Tutti' },
  { valore: 'disponibili', nome: 'Disponibili' },
  { valore: 'esauriti', nome: 'Esauriti' },
]
// Nei campi del prezzo restano solo cifre e una virgola (o punto)
const soloPrezzo = (v) => String(v || '').replace(/[^0-9.,]/g, '')
</script>

<template>
  <div class="filtri-mag">
    <div class="gruppo">
      <span class="etichetta">Disponibilità</span>
      <div class="chips a-capo">
        <button v-for="d in DISPONIBILITA" :key="d.valore" :class="{ on: filtri.disponibilita === d.valore }"
                @click="filtri.disponibilita = d.valore">{{ d.nome }}</button>
      </div>
    </div>

    <div class="gruppo">
      <span class="etichetta">Prezzo (€)</span>
      <div class="intervallo">
        <input :value="filtri.prezzoDa" inputmode="decimal" placeholder="da"
               @input="filtri.prezzoDa = soloPrezzo($event.target.value); $event.target.value = filtri.prezzoDa" />
        <span>–</span>
        <input :value="filtri.prezzoA" inputmode="decimal" placeholder="a"
               @input="filtri.prezzoA = soloPrezzo($event.target.value); $event.target.value = filtri.prezzoA" />
      </div>
    </div>

    <div class="gruppo">
      <span class="etichetta">Anno</span>
      <div class="intervallo">
        <input :value="filtri.annoDa" inputmode="numeric" maxlength="4" placeholder="dal"
               @input="filtri.annoDa = pulisciAnno($event.target.value); $event.target.value = filtri.annoDa" />
        <span>–</span>
        <input :value="filtri.annoA" inputmode="numeric" maxlength="4" placeholder="al"
               @input="filtri.annoA = pulisciAnno($event.target.value); $event.target.value = filtri.annoA" />
      </div>
    </div>

    <div class="gruppo">
      <span class="etichetta">Ordina per</span>
      <select v-model="filtri.ordine">
        <option v-for="o in ORDINI" :key="o.valore" :value="o.valore">{{ o.nome }}</option>
      </select>
    </div>

    <div class="gruppo fondo">
      <div class="chips a-capo">
        <button :class="{ on: filtri.conNote }" @click="filtri.conNote = !filtri.conNote">
          {{ filtri.conNote ? '✓ ' : '' }}Solo con note (stato, firma…)</button>
      </div>
      <button class="btn grigio" :disabled="!qualcheFiltro" @click="azzeraFiltri">✕ Azzera filtri</button>
    </div>
  </div>
</template>

<style scoped>
.filtri-mag {
  display: grid; grid-template-columns: 1fr; gap: 12px;
  background: var(--superficie); border: 1.5px solid var(--bordo); border-radius: 14px;
  padding: 12px; margin: 4px 0 10px;
}
.gruppo { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.etichetta { font-size: 13px; color: var(--testo-tenue); font-weight: 600; }
.intervallo { display: flex; align-items: center; gap: 8px; }
.intervallo input { flex: 1; min-width: 0; }
.fondo { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.btn:disabled { opacity: .5; }
/* Su iPad e schermi larghi: due colonne */
@media (min-width: 700px) {
  .filtri-mag { grid-template-columns: 1fr 1fr; }
  .fondo { grid-column: 1 / -1; }
}
</style>
