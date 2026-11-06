<script setup>
// Campo per inserire un codice: si può scrivere a mano, usare una pistola
// scanner USB/Bluetooth (scrive il codice e preme Invio) o la fotocamera.
import { ref } from 'vue'
import Scanner from './Scanner.vue'

const props = defineProps({ placeholder: { type: String, default: 'Codice a barre o titolo' }, pausa: Boolean })
const emit = defineEmits(['codice'])
const testo = ref('')
const camera = ref(false)

function invia(valore) {
  const v = String(valore || '').trim()
  if (!v) return
  emit('codice', v)
  testo.value = ''
}
</script>

<template>
  <div>
    <Scanner v-if="camera" :pausa="props.pausa" @letto="invia" @chiudi="camera = false" />
    <form class="riga" @submit.prevent="invia(testo)">
      <input v-model="testo" :placeholder="props.placeholder" inputmode="search" autocomplete="off" />
      <button type="submit" class="btn">OK</button>
      <button type="button" class="btn rosso" @click="camera = !camera" title="Fotocamera">📷</button>
    </form>
  </div>
</template>
