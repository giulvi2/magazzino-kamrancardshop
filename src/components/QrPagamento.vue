<script setup>
// Finestra per farsi pagare con Satispay o PayPal: mostra il QR da far inquadrare
// al cliente e, quando il pagamento è arrivato, si tocca "Pagato".
// Satispay: ogni socio ha il suo QR (si sceglie a chi arrivano i soldi).
// PayPal: un QR solo per il banco. I QR si caricano qui o nella scheda Soci.
import { ref, computed } from 'vue'
import { stato, euro } from '../store'
import { leggiImmagine } from '../immagini'

const props = defineProps({ tipo: { type: String, required: true }, totale: { type: Number, default: 0 } })
const emit = defineEmits(['pagato', 'chiudi'])

const satispay = computed(() => props.tipo === 'satispay')
const nome = computed(() => (satispay.value ? 'Satispay' : 'PayPal'))

// Socio scelto: l'ultimo usato, altrimenti il primo che ha il QR, altrimenti il primo
const conQr = computed(() => stato.soci.filter((s) => s.satispayQr))
const scelto = ref(
  stato.soci.some((s) => s.id === ultimoSocio) ? ultimoSocio : (conQr.value[0] || stato.soci[0])?.id || '',
)
const socio = computed(() => stato.soci.find((s) => s.id === scelto.value))
const immagine = computed(() => (satispay.value ? socio.value?.satispayQr : stato.pagamenti.paypalQr) || '')

async function carica(evento) {
  const file = evento.target.files[0]
  evento.target.value = ''
  if (!file) return
  try {
    const dati = await leggiImmagine(file)
    if (satispay.value) { if (socio.value) socio.value.satispayQr = dati }
    else stato.pagamenti.paypalQr = dati
  } catch (e) {
    alert(e.message)
  }
}

function pagato() {
  if (satispay.value) ultimoSocio = scelto.value
  emit('pagato', satispay.value ? scelto.value : '')
}
</script>

<script>
// Fuori da <script setup>: resta uguale tra un'apertura e l'altra della finestra
let ultimoSocio = ''
</script>

<template>
  <div class="sfondo" @click.self="emit('chiudi')">
    <div class="scheda qr-pagamento" :class="tipo">
      <h2>{{ nome }} · {{ euro(totale) }}</h2>

      <div v-if="satispay" class="chips">
        <button v-for="s in stato.soci" :key="s.id" :class="{ on: s.id === scelto }" @click="scelto = s.id">
          {{ s.nome }}<span v-if="!s.satispayQr"> (senza QR)</span>
        </button>
      </div>

      <div class="qr-immagine">
        <img v-if="immagine" :src="immagine" :alt="`QR ${nome}`" />
        <p v-else class="aiuto">
          Nessun QR {{ nome }}<span v-if="satispay && socio"> di {{ socio.nome }}</span>.
          Caricalo qui sotto (foto o screenshot dall'app {{ nome }}) oppure dalla scheda Soci.
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
