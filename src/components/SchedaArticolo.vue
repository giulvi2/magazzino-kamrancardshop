<script setup>
// Form per creare o modificare un articolo
import { reactive, ref, computed, onMounted, nextTick } from 'vue'
import StampaEtichette from './StampaEtichette.vue'
import {
  stato, salvaArticolo, eliminaArticolo, aCentesimi, daCentesimi, aAcquisto,
  categorie, CATEGORIE_BASE, ultimoProprietario, conAnno, pulisciAnno,
} from '../store'
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
  anno: props.articolo?.anno || '',
  note: props.articolo?.note || '',
  // nuovo articolo: si propone l'ultimo proprietario scelto, comodo quando si caricano
  // in fila tutte le cose della stessa persona
  proprietario: props.articolo?.id ? (props.articolo.proprietario || '') : ultimoProprietario.value,
  acquisto: typeof props.articolo?.acquisto === 'number' ? daCentesimi(props.articolo.acquisto) : '',
})

// Dati del form pronti per lo store (prezzi in centesimi)
function dati() {
  ultimoProprietario.value = form.proprietario
  return { ...form, prezzo: aCentesimi(form.prezzo), acquisto: aAcquisto(form.acquisto) }
}
const cerco = ref(false)
const trovato = ref(null) // dati arrivati da internet per l'ISBN
const avviso = ref('') // esito della ricerca quando non ha trovato niente
const codiceIsbn = computed(() => isIsbn(form.codice.trim()))
const etichetta = ref(null) // articolo di cui stampare l'etichetta QR

// ---- Categoria ----
// Al posto della tendina (che su Safari mostra solo le voci che iniziano come il testo
// già scritto, quindi non si riusciva a cambiare categoria) ci sono dei bottoni:
// un tocco sceglie la categoria, un altro tocco sulla stessa la toglie.
// "+ Nuova" apre un campo per scriverne una che non c'è ancora.
const scrivoCategoria = ref(false) // si sta scrivendo una categoria nuova
const campoCategoria = ref(null)
const elencoCategorie = computed(() => {
  const tutte = [...CATEGORIE_BASE, ...categorie.value]
  const attuale = form.categoria.trim()
  if (attuale && !scrivoCategoria.value) tutte.push(attuale)
  // niente doppioni, anche se scritti con maiuscole diverse
  const viste = new Set()
  return tutte.filter((c) => {
    const k = c.toLowerCase()
    if (viste.has(k)) return false
    viste.add(k)
    return true
  })
})
const uguali = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()
function scegliCategoria(c) {
  scrivoCategoria.value = false
  form.categoria = uguali(form.categoria, c) ? '' : c
}
async function nuovaCategoria() {
  scrivoCategoria.value = true
  form.categoria = ''
  await nextTick()
  campoCategoria.value?.focus()
}
// Campo anno solo per fumetti e carte
const mostraAnno = computed(() => conAnno(form.categoria))

// Salva le modifiche e apre la stampa dell'etichetta di questo articolo
function stampaEtichetta() {
  const id = salvaArticolo(dati())
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
    if (!form.anno && d.anno) form.anno = pulisciAnno(String(d.anno).slice(0, 4))
  } catch (e) {
    avviso.value = e.message === 'google'
      ? 'Google Books non risponde senza chiave (o la chiave non va): aggiungila in Riepilogo › Ricerca ISBN. Intanto compila a mano.'
      : 'Senza internet non posso cercare: compila la scheda a mano.'
  } finally {
    cerco.value = false
  }
}

onMounted(() => {
  // nuovo articolo con ISBN: proviamo a compilare la scheda da soli
  if (!form.id && codiceIsbn.value && !form.titolo) cercaOnline()
})

function salva() {
  salvaArticolo(dati())
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
      <div class="categoria-anno">
        <div class="campo-categoria">
          <span class="etichetta-campo">Categoria</span>
          <div class="chips a-capo" role="group" aria-label="Categoria">
            <button v-for="c in elencoCategorie" :key="c" type="button"
              :class="{ on: !scrivoCategoria && uguali(form.categoria, c) }" :aria-pressed="!scrivoCategoria && uguali(form.categoria, c)"
              @click="scegliCategoria(c)">{{ c }}</button>
            <button type="button" :class="{ on: scrivoCategoria }" @click="nuovaCategoria">＋ Nuova</button>
          </div>
          <input v-if="scrivoCategoria" ref="campoCategoria" v-model="form.categoria" placeholder="Scrivi la nuova categoria" enterkeyhint="done" />
        </div>
        <label v-if="mostraAnno" class="campo-anno">Anno
          <input v-model="form.anno" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="Es. 1998" @input="form.anno = pulisciAnno(form.anno)" />
        </label>
      </div>
      <div class="riga">
        <label>Di chi è
          <select v-model="form.proprietario">
            <option value="">— Nessuno —</option>
            <option v-for="s in stato.soci" :key="s.id" :value="s.id">{{ s.nome }}</option>
          </select>
        </label>
        <label>Quantità
          <input v-model.number="form.quantita" type="number" min="0" inputmode="numeric" />
        </label>
      </div>
      <div class="riga">
        <label>Prezzo di vendita €
          <input v-model="form.prezzo" inputmode="decimal" placeholder="0,00" required />
        </label>
        <label>Prezzo di acquisto €
          <input v-model="form.acquisto" inputmode="decimal" placeholder="facoltativo" />
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
