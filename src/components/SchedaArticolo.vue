<script setup>
// Form per creare o modificare un articolo
import { reactive, ref, onMounted } from 'vue'
import { salvaArticolo, eliminaArticolo, aCentesimi, daCentesimi, cercaTitoloOnline, categorie, CATEGORIE_BASE } from '../store'

const props = defineProps({ articolo: Object })
const emit = defineEmits(['chiudi'])

const form = reactive({
  id: props.articolo?.id,
  codice: props.articolo?.codice || '',
  titolo: props.articolo?.titolo || '',
  prezzo: props.articolo?.id ? daCentesimi(props.articolo.prezzo) : '',
  quantita: props.articolo?.quantita ?? 1,
  categoria: props.articolo?.categoria || '',
  note: props.articolo?.note || '',
})
const cerco = ref(false)

onMounted(async () => {
  // nuovo articolo con ISBN: proviamo a compilare il titolo da soli
  if (!form.id && form.codice && !form.titolo) {
    cerco.value = true
    const t = await cercaTitoloOnline(form.codice)
    if (t && !form.titolo) form.titolo = t
    cerco.value = false
  }
})

function salva() {
  salvaArticolo({ ...form, prezzo: aCentesimi(form.prezzo) })
  emit('chiudi')
}
function elimina() {
  if (confirm(`Eliminare "${form.titolo}" dal magazzino?`)) {
    eliminaArticolo(form.id)
    emit('chiudi')
  }
}
</script>

<template>
  <div class="sfondo" @click.self="emit('chiudi')">
    <form class="scheda" @submit.prevent="salva">
      <h2>{{ form.id ? 'Modifica articolo' : 'Nuovo articolo' }}</h2>
      <label>Codice a barre
        <input v-model="form.codice" placeholder="(facoltativo)" />
      </label>
      <label>Titolo <small v-if="cerco">cerco online…</small>
        <input v-model="form.titolo" placeholder="Es. Tex n. 123, Charizard holo…" required autofocus />
      </label>
      <label>Categoria
        <input v-model="form.categoria" list="elenco-categorie" placeholder="Es. Fumetti, Carte, Manga…" />
        <datalist id="elenco-categorie">
          <option v-for="c in [...new Set([...categorie, ...CATEGORIE_BASE])]" :key="c" :value="c" />
        </datalist>
      </label>
      <div class="riga">
        <label>Prezzo €
          <input v-model="form.prezzo" inputmode="decimal" placeholder="0,00" required />
        </label>
        <label>Quantità
          <input v-model.number="form.quantita" type="number" min="0" inputmode="numeric" />
        </label>
      </div>
      <label>Note
        <input v-model="form.note" placeholder="Es. condizioni, scatola 3…" />
      </label>
      <div class="riga azioni">
        <button v-if="form.id" type="button" class="btn grigio elimina" @click="elimina">Elimina</button>
        <button type="button" class="btn grigio" @click="emit('chiudi')">Annulla</button>
        <button type="submit" class="btn verde">Salva</button>
      </div>
    </form>
  </div>
</template>
