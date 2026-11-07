<script setup>
// Scanner di codici a barre con la fotocamera del telefono.
// Emette 'letto' con il codice. Funziona solo su https:// o localhost.
//
// Come legge (per essere affidabile anche su iPad/iPhone con Safari):
// - chiede alla fotocamera una risoluzione alta (Full HD) e la messa a fuoco continua;
// - a ogni giro ritaglia la zona della linea rossa (dove si punta il codice) e prova
//   a leggerla; un giro sì e uno no prova anche l'immagine intera;
// - il ritaglio si adatta alle dimensioni del video a ogni giro, così funziona anche
//   se si ruota l'iPad mentre la fotocamera è aperta;
// - se il browser ha un lettore di codici integrato (Chrome su Android) usa quello,
//   altrimenti la libreria ZXing (Safari);
// - se la fotocamera lo permette mostra i pulsanti per la torcia e lo zoom.
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const props = defineProps({ pausa: Boolean })
const emit = defineEmits(['letto', 'chiudi'])
const video = ref(null)
const errore = ref('')
const letto = ref(false) // per far lampeggiare di verde la linea quando legge
const torciaDisponibile = ref(false)
const torciaAccesa = ref(false)
const zoomLivelli = ref([]) // es. [1, 2] se la fotocamera permette lo zoom
const zoomAttuale = ref(1)

let flusso = null
let traccia = null
let timer = null
let fermo = false
let giro = 0
let ultimo = { codice: '', visto: 0 }
const tela = document.createElement('canvas')
const ctx = tela.getContext('2d', { willReadFrequently: true })

// Lettore ZXing (usato sempre su Safari, che non ha un lettore integrato).
const hints = new Map()
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE,
])
hints.set(DecodeHintType.TRY_HARDER, true)
const zxing = new BrowserMultiFormatReader(hints)

// Lettore integrato del browser, se c'è (Chrome su Android). Safari non lo ha.
let nativo = null
async function preparaNativo() {
  if (!('BarcodeDetector' in window)) return
  try {
    const voluti = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']
    const supportati = await window.BarcodeDetector.getSupportedFormats()
    const formati = voluti.filter((f) => supportati.includes(f))
    if (formati.length) nativo = new window.BarcodeDetector({ formats: formati })
  } catch { nativo = null }
}

// Disegna sulla tela la parte del video da leggere. Il lato più lungo viene
// limitato a 1280 pixel: abbastanza per leggere bene, senza rallentare il telefono.
function disegna(sx, sy, sw, sh) {
  const scala = Math.min(1, 1280 / Math.max(sw, sh))
  const w = Math.round(sw * scala)
  const h = Math.round(sh * scala)
  if (tela.width !== w) tela.width = w
  if (tela.height !== h) tela.height = h
  ctx.drawImage(video.value, sx, sy, sw, sh, 0, 0, w, h)
}

async function leggiTela() {
  if (nativo) {
    try {
      const trovati = await nativo.detect(tela)
      if (trovati.length) return trovati[0].rawValue
      return ''
    } catch { nativo = null } // se il lettore integrato dà problemi si passa a ZXing
  }
  try { return zxing.decodeFromCanvas(tela).getText() } catch { return '' }
}

async function giroDiLettura() {
  timer = null
  if (fermo) return
  const v = video.value
  try {
    if (v && !props.pausa && v.readyState >= 2 && v.videoWidth > 0) {
      // Su iPhone/iPad il video può fermarsi (es. dopo un blocco schermo): lo riavvio.
      if (v.paused) v.play().catch(() => {})
      const vw = v.videoWidth
      const vh = v.videoHeight
      giro++
      if (giro % 2) {
        // Zona della linea rossa: fascia centrale, larga il 90% e alta metà immagine.
        const sw = vw * 0.9
        const sh = Math.min(vh * 0.5, sw * 0.6)
        disegna((vw - sw) / 2, (vh - sh) / 2, sw, sh)
      } else {
        disegna(0, 0, vw, vh)
      }
      const codice = await leggiTela()
      if (codice) trovato(codice)
    }
  } catch { /* un giro andato male: si riprova al prossimo */ }
  if (!fermo) timer = setTimeout(giroDiLettura, 100)
}

function trovato(codice) {
  const ora = Date.now()
  // Lo stesso codice viene letto una volta sola finché resta inquadrato:
  // per leggerlo di nuovo bisogna toglierlo dalla fotocamera per 1,5 secondi.
  const ripetuto = codice === ultimo.codice && ora - ultimo.visto < 1500
  ultimo = { codice, visto: ora }
  if (ripetuto) return
  letto.value = true
  setTimeout(() => { letto.value = false }, 400)
  emit('letto', codice)
}

async function avvia() {
  errore.value = ''
  try {
    flusso = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    })
  } catch (e) {
    errore.value = location.protocol === 'https:' || location.hostname === 'localhost'
      ? 'Non riesco ad aprire la fotocamera. Controlla di aver dato il permesso al browser.'
      : 'La fotocamera funziona solo se l\'app è aperta da un indirizzo https://.'
    return
  }
  if (fermo) { spegni(); return }
  traccia = flusso.getVideoTracks()[0]
  traccia.addEventListener('ended', () => {
    if (!fermo) errore.value = 'La fotocamera si è chiusa. Tocca "Riapri".'
  })
  const v = video.value
  v.srcObject = flusso
  try { await v.play() } catch { /* su iOS parte comunque appena è visibile */ }
  await impostaFotocamera()
  giroDiLettura()
}

// Messa a fuoco continua, torcia e zoom: solo se la fotocamera li supporta.
async function impostaFotocamera() {
  const cap = traccia?.getCapabilities ? traccia.getCapabilities() : {}
  if (cap.focusMode?.includes('continuous')) {
    try { await traccia.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }) } catch { /* pazienza */ }
  }
  torciaDisponibile.value = !!cap.torch
  if (cap.zoom && cap.zoom.max > cap.zoom.min) {
    const livelli = [cap.zoom.min, 2, 3].filter((z) => z >= cap.zoom.min && z <= cap.zoom.max)
    zoomLivelli.value = [...new Set(livelli)]
    zoomAttuale.value = traccia.getSettings?.().zoom || cap.zoom.min
  }
}

async function cambiaTorcia() {
  try {
    await traccia.applyConstraints({ advanced: [{ torch: !torciaAccesa.value }] })
    torciaAccesa.value = !torciaAccesa.value
  } catch { torciaDisponibile.value = false }
}

async function cambiaZoom(z) {
  try {
    await traccia.applyConstraints({ advanced: [{ zoom: z }] })
    zoomAttuale.value = z
  } catch { /* zoom non applicato */ }
}

function spegni() {
  clearTimeout(timer)
  timer = null
  flusso?.getTracks().forEach((t) => t.stop())
  flusso = null
  traccia = null
  torciaAccesa.value = false
}

function riapri() {
  spegni()
  avvia()
}

onMounted(async () => {
  await preparaNativo()
  avvia()
})

onBeforeUnmount(() => {
  fermo = true
  spegni()
})
</script>

<template>
  <div class="scanner">
    <div class="vista">
      <video ref="video" muted playsinline autoplay></video>
      <div class="mirino" :class="{ letto }"></div>
      <div class="comandi">
        <button v-if="torciaDisponibile" :class="{ attivo: torciaAccesa }" @click="cambiaTorcia">🔦 Torcia</button>
        <button v-for="z in zoomLivelli" :key="z" :class="{ attivo: zoomAttuale === z }" @click="cambiaZoom(z)">{{ z }}×</button>
      </div>
    </div>
    <p v-if="errore" class="errore">{{ errore }} <button class="btn" @click="riapri">Riapri</button></p>
    <p v-else class="aiuto">Metti il codice sulla linea rossa, a circa 15–20 cm. Se è sfocato allontanalo un po'.</p>
    <button class="chiudi" @click="emit('chiudi')">✕ Chiudi fotocamera</button>
  </div>
</template>

<style scoped>
.vista { position: relative; }
.scanner { position: relative; background: #000; border-radius: 12px; overflow: hidden; margin-bottom: 12px; }
video { width: 100%; max-height: 40vh; object-fit: cover; display: block; }
.mirino { position: absolute; left: 10%; right: 10%; top: 50%; height: 2px; background: #ff3b30; box-shadow: 0 0 8px #ff3b30; transition: background .1s; }
.mirino.letto { background: #34c759; box-shadow: 0 0 12px #34c759; height: 4px; }
.errore { color: #fff; background: #b00020; padding: 10px; margin: 0; }
.aiuto { color: #ddd; background: #111; font-size: .85em; padding: 6px 10px; margin: 0; }
.chiudi { position: absolute; top: 8px; right: 8px; background: rgba(0,0,0,.6); color: #fff; border: 0; padding: 8px 12px; border-radius: 8px; }
.comandi { position: absolute; bottom: 8px; left: 8px; display: flex; gap: 6px; }
.comandi button { background: rgba(0,0,0,.6); color: #fff; border: 0; padding: 8px 10px; border-radius: 8px; }
.comandi button.attivo { background: #ffcc00; color: #000; }
</style>
