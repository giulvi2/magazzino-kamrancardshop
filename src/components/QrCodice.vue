<script setup>
// Disegna un QR code in SVG, tutto nel browser (funziona anche offline).
// L'SVG resta nitido a qualsiasi dimensione, anche in stampa.
import { computed } from 'vue'
import qrcode from 'qrcode-generator'

const props = defineProps({ testo: { type: String, required: true } })
const MARGINE = 2 // moduli bianchi attorno al QR, servono allo scanner per trovarlo

const qr = computed(() => {
  const q = qrcode(0, 'M') // 0 = dimensione automatica, M = correzione errori media (~15%)
  q.addData(props.testo)
  q.make()
  const n = q.getModuleCount()
  let d = ''
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      if (q.isDark(y, x)) d += `M${x + MARGINE} ${y + MARGINE}h1v1h-1z`
  return { lato: n + MARGINE * 2, d }
})
</script>

<template>
  <svg class="qr" :viewBox="`0 0 ${qr.lato} ${qr.lato}`" shape-rendering="crispEdges" role="img" :aria-label="`QR ${testo}`">
    <rect :width="qr.lato" :height="qr.lato" fill="#fff" />
    <path :d="qr.d" fill="#000" />
  </svg>
</template>
