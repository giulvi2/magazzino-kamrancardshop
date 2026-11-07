<script setup>
// Campo per inserire un codice: si può scrivere a mano, usare una pistola
// scanner USB/Bluetooth (scrive il codice e preme Invio) o la fotocamera.
import { ref } from 'vue'
import Scanner from './Scanner.vue'

const props = defineProps({ placeholder: { type: String, default: 'Codice a barre o titolo' }, pausa: Boolean })
// 'scrivi' arriva a ogni tasto premuto a mano (serve per i suggerimenti mentre si scrive)
const emit = defineEmits(['codice', 'scrivi'])
const testo = ref('')
const camera = ref(false)

function invia(valore) {
  const v = String(valore || '').trim()
  if (!v) return
  emit('codice', v)
  testo.value = ''
}

// Svuota il campo (es. quando si sceglie un suggerimento)
function svuota() { testo.value = '' }
defineExpose({ svuota })
</script>

<template>
  <div>
    <Scanner v-if="camera" :pausa="props.pausa" @letto="invia" @chiudi="camera = false" />
    <form class="riga" @submit.prevent="invia(testo)">
      <input v-model="testo" :placeholder="props.placeholder" inputmode="search" autocomplete="off"
             autocorrect="off" autocapitalize="off" spellcheck="false" @input="emit('scrivi', testo)" />
      <button type="submit" class="btn">OK</button>
      <button type="button" class="btn rosso" @click="camera = !camera" title="Fotocamera">📷</button>
    </form>
  </div>
</template>
