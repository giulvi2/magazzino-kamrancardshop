<script setup>
// Finestra per farsi pagare con Satispay o PayPal: mostra il QR da far inquadrare
// al cliente e, quando il pagamento è arrivato, si tocca "Pagato".
// Satispay: ogni socio ha il suo QR (si sceglie a chi arrivano i soldi).
// PayPal: c'è il QR del banco e, se serve, anche un QR PayPal per socio
// (socio.paypalQr): si sceglie "Banco" o il socio. I QR si caricano qui o in ⚙️ Impostazioni.
import { ref, computed } from 'vue'
import { stato, euro } from '../store'
import { leggiImmagine } from '../immagini'

const props = defineProps({ tipo: { type: String, required: true }, totale: { type: Number, default: 0 } })
const emit = defineEmits(['pagato', 'chiudi'])

const satispay = computed(() => props.tipo === 'satispay')
const nome = computed(() => (satispay.value ? 'Satispay' : 'PayPal'))
const campoQr = satispay.value ? 'satispayQr' : 'paypalQr' // dove sta il QR nel socio
const BANCO = '' // con PayPal, "nessun socio" vuol dire il QR del banco

// Scelte possibili. Satispay: tutti i soci. PayPal: il banco e solo i soci che hanno
// caricato il loro QR PayPal (se nessuno l'ha caricato, resta come prima: solo il banco).
const scelte = computed(() => {
  const soci = stato.soci.map((s) => ({ id: s.id, nome: s.nome, qr: s[campoQr] || '' }))
  if (satispay.value) return soci
  return [{ id: BANCO, nome: 'Banco', qr: stato.pagamenti.paypalQr || '' }, ...soci.filter((s) => s.qr)]
})

// Scelta iniziale: l'ultima usata, altrimenti la prima che ha il QR, altrimenti la prima
const ultima = ultimaScelta[props.tipo]
const scelto = ref(
  ultima !== undefined && scelte.value.some((x) => x.id === ultima)
    ? ultima
    : (scelte.value.find((x) => x.qr) || scelte.value[0])?.id ?? '',
)
const corrente = computed(() => scelte.value.find((x) => x.id === scelto.value))
const immagine = computed(() => corrente.value?.qr || '')
// Il QR del banco non ha un nome da mostrare, quello di un socio sì
const diChi = computed(() => (corrente.value && (satispay.value || scelto.value !== BANCO) ? corrente.value.nome : ''))

async function carica(evento) {
  const file = evento.target.files[0]
  evento.target.value = ''
  if (!file) return
  try {
    const dati = await leggiImmagine(file)
    if (!satispay.value && scelto.value === BANCO) stato.pagamenti.paypalQr = dati
    else {
      const s = stato.soci.find((x) => x.id === scelto.value)
      if (s) s[campoQr] = dati
    }
  } catch (e) {
    alert(e.message)
  }
}

function pagato() {
  ultimaScelta[props.tipo] = scelto.value
  emit('pagato', scelto.value)
}
</script>

<script>
// Fuori da <script setup>: resta uguale tra un'apertura e l'altra della finestra
const ultimaScelta = {}
</script>

<template>
  <div class="sfondo" @click.self="emit('chiudi')">
    <div class="scheda qr-pagamento" :class="tipo">
      <h2>{{ nome }} · {{ euro(totale) }}</h2>

      <div v-if="scelte.length > 1" class="chips">
        <button v-for="x in scelte" :key="x.id || 'banco'" :class="{ on: x.id === scelto }" @click="scelto = x.id">
          {{ x.nome }}<span v-if="!x.qr"> (senza QR)</span>
        </button>
      </div>

      <div class="qr-immagine">
        <img v-if="immagine" :src="immagine" :alt="`QR ${nome}`" />
        <p v-else class="aiuto">
          Nessun QR {{ nome }}<span v-if="diChi"> di {{ diChi }}</span><span v-else-if="!satispay"> del banco</span>.
          Caricalo qui sotto (foto o screenshot dall'app {{ nome }}) oppure da ⚙️ Impostazioni.
        </p>
      </div>
      <p class="aiuto">Fai inquadrare il QR al cliente. Tocca <b>Pagato</b> solo quando vedi arrivare il pagamento.</p>

      <div class="riga azioni">
        <label class="btn grigio">{{ immagine ? 'Cambia QR' : '📷 Carica QR' }}
          <input type="file" accept="image/*" hidden @change="carica" /></label>
        <button class="btn grigio" @click="emit('chiudi')">Annulla</button>
        <button class="btn verde" :disabled="satispay && !scelto" @click="pagato">✓ Pagato</button>
      </div>
    </div>
  </div>
</template>
