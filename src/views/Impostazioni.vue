<script setup>
// Impostazioni generali dell'app. Per ora: gestione delle categorie.
import { ref, computed } from 'vue'
import { tutteCategorie, articoliInCategoria, aggiungiCategoria, eliminaCategoria } from '../store'

const nuova = ref('')
function aggiungi() {
  aggiungiCategoria(nuova.value)
  nuova.value = ''
}

// Categoria che si sta eliminando: se ha articoli si sceglie dove spostarli
const daEliminare = ref('')
const destinazione = ref('')
const altre = computed(() => tutteCategorie.value.filter((c) => c !== daEliminare.value))
const conta = (n) => (n === 1 ? '1 articolo' : `${n} articoli`)

function chiediElimina(c) {
  if (!articoliInCategoria(c)) {
    if (confirm(`Eliminare la categoria "${c}"?`)) eliminaCategoria(c)
    return
  }
  daEliminare.value = c
  destinazione.value = ''
}
function confermaElimina() {
  eliminaCategoria(daEliminare.value, destinazione.value)
  daEliminare.value = ''
}
</script>

<template>
  <section>
    <h2>Categorie</h2>
    <p class="aiuto">Le categorie che compaiono nella scheda articolo. Se elimini una categoria usata,
      scegli dove spostare i suoi articoli. Le modifiche finiscono anche nel backup.</p>

    <form class="riga" @submit.prevent="aggiungi">
      <input v-model="nuova" placeholder="Nuova categoria (es. Carte Pokémon)" aria-label="Nuova categoria" enterkeyhint="done" />
      <button class="btn rosso" type="submit" :disabled="!nuova.trim()">Aggiungi</button>
    </form>

    <p v-if="!tutteCategorie.length" class="vuoto">Nessuna categoria.</p>
    <ul class="lista categorie-lista">
      <template v-for="c in tutteCategorie" :key="c">
        <li :class="{ aperta: daEliminare === c }">
          <span class="titolo">{{ c }}<br /><small>{{ articoliInCategoria(c) ? conta(articoliInCategoria(c)) : 'nessun articolo' }}</small></span>
          <button class="btn grigio" type="button" @click="chiediElimina(c)">🗑️ Elimina</button>
        </li>
        <li v-if="daEliminare === c" class="sposta">
          <p><b>{{ conta(articoliInCategoria(c)) }}</b> in “{{ c }}”: in quale categoria vanno?</p>
          <select v-model="destinazione" aria-label="Sposta gli articoli in">
            <option value="">— Senza categoria —</option>
            <option v-for="a in altre" :key="a" :value="a">{{ a }}</option>
          </select>
          <div class="riga azioni">
            <button class="btn grigio" type="button" @click="daEliminare = ''">Annulla</button>
            <button class="btn rosso" type="button" @click="confermaElimina">Elimina e sposta</button>
          </div>
        </li>
      </template>
    </ul>
  </section>
</template>
