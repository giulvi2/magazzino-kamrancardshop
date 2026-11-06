<script setup>
// Form per creare o modificare un articolo
import { reactive, ref, computed, onMounted } from 'vue'
import StampaEtichette from './StampaEtichette.vue'
import { stato, salvaArticolo, eliminaArticolo, aCentesimi, daCentesimi, categorie, CATEGORIE_BASE } from '../store'
import { isIsbn, cercaIsbn, descrizioneIsbn } from '../isbn'

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
const trovato = ref(null) // dati arrivati da internet per l'ISBN
const avviso = ref('') // esito della ricerca quando non ha trovato niente
const codiceIsbn = computed(() => isIsbn(form.codice.trim()))
const etichetta = ref(null) // articolo di cui stampare l'etichetta QR

// Salva le modifiche e apre la stampa dell'etichetta di questo articolo
function stampaEtichetta() {
  const id = salvaArticolo({ ...form, prezzo: aCentesimi(form.prezzo) })
  etichetta.value = stato.articoli.find((a) => a.id === id)
}

// Cerca titolo, autore ed editore dell'ISBN e riempie solo i campi ancora vuoti:
// quello che è già scritto non viene toccato. Poi si controlla e si salva.
async function cercaOnline() {
  const isbn = form.codice.trim()
  if (!isIsbn(isbn) || cerco.value) return
  cerco.value = true
  avviso.value = ''
  trovato.value = null
  try {
    const d = await cercaIsbn(isbn)
    if (form.codice.trim() !== isbn) return // nel frattempo il codice è cambiato
    if (!d || !d.titolo) {
      avviso.value = 'Non trovato online: compila la scheda a mano.'
      return
    }
    trovato.value = d
    if (!form.titolo.trim() || form.titolo === 'Senza titolo') form.titolo = d.titolo
    if (!form.note.trim()) form.note = descrizioneIsbn(d)
    if (!form.categoria.trim() && d.categoria) form.categoria = d.categoria
  } catch (e) {
    avviso.value = 'Senza internet non posso cercare: compila la scheda a mano.'
  } finally {
    cerco.value = false
  }
}

onMounted(() => {
  // nuovo articolo con ISBN: proviamo a compilare la scheda da soli
  if (!form.id && codiceIsbn.value && !form.titolo) cercaOnline()
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
      <label>Codice a barre o QR
        <span class="campo-con-bottone">
          <input v-model="form.codice" placeholder="(facoltativo)" />
          <button v-if="codiceIsbn" type="button" class="btn grigio" :disabled="cerco" @click="cercaOnline">
            {{ cerco ? 'Cerco…' : '🔎 Cerca ISBN' }}
          </button>
        </span>
      </label>
      <div v-if="trovato" class="isbn-trovato">
        <img v-if="trovato.copertina" :src="trovato.copertina" alt="" referrerpolicy="no-referrer" @error="trovato.copertina = ''" />
        <div>
          <b>{{ trovato.titolo }}</b>
          <span v-if="descrizioneIsbn(trovato)">{{ descrizioneIsbn(trovato) }}</span>
          <small>Trovato su {{ trovato.fonte }}: controlla i dati e salva.</small>
        </div>
      </div>
      <p v-if="avviso" class="isbn-avviso">{{ avviso }}</p>
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
        <button v-if="form.id" type="button" class="btn grigio" :disabled="!form.prezzo" @click="stampaEtichetta">🏷️ Etichetta</button>
        <button type="button" class="btn grigio" @click="emit('chiudi')">Annulla</button>
        <button type="submit" class="btn verde">Salva</button>
      </div>
    </form>
    <StampaEtichette v-if="etichetta" :articoli="[etichetta]" @chiudi="etichetta = null; emit('chiudi')" />
  </div>
</template>
