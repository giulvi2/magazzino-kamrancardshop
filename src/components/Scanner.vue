<script setup>
// Scanner di codici a barre con la fotocamera del telefono (libreria ZXing).
// Emette 'letto' con il codice. Funziona solo su https:// o localhost.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const props = defineProps({ pausa: Boolean })
const emit = defineEmits(['letto', 'chiudi'])
const video = ref(null)
const errore = ref('')
let controlli = null
let ultimo = { codice: '', visto: 0 }

onMounted(async () => {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE,
  ])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const lettore = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
  try {
    controlli = await lettore.decodeFromConstraints(
      { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
      video.value,
      (risultato) => {
        if (!risultato || props.pausa) return
        const codice = risultato.getText()
        const ora = Date.now()
        // Lo stesso codice viene letto una volta sola finché resta inquadrato:
        // per leggerlo di nuovo bisogna toglierlo dalla fotocamera per 1,5 secondi.
        const ripetuto = codice === ultimo.codice && ora - ultimo.visto < 1500
        ultimo = { codice, visto: ora }
        if (!ripetuto) emit('letto', codice)
      },
    )
  } catch (e) {
    errore.value = location.protocol === 'https:' || location.hostname === 'localhost'
      ? 'Non riesco ad aprire la fotocamera. Controlla di aver dato il permesso al browser.'
      : 'La fotocamera funziona solo se l\'app è aperta da un indirizzo https://.'
  }
})

onBeforeUnmount(() => controlli?.stop())
</script>

<template>
  <div class="scanner">
    <video ref="video" muted playsinline></video>
    <div class="mirino"></div>
    <p v-if="errore" class="errore">{{ errore }}</p>
    <button class="chiudi" @click="emit('chiudi')">✕ Chiudi fotocamera</button>
  </div>
</template>

<style scoped>
.scanner { position: relative; background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
video { width: 100%; max-height: 40vh; object-fit: cover; display: block; }
.mirino { position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; background: #ff3b30; box-shadow: 0 0 8px #ff3b30; }
.errore { color: #fff; background: #b00020; padding: 10px; margin: 0; }
.chiudi { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,.6); color: #fff; border: 0; padding: 8px 12px; border-radius: 8px; }
</style>
