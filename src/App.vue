<script setup>
import { ref } from 'vue'
import logoKamran from './assets/logo-kamran.png'
import Vendi from './views/Vendi.vue'
import Magazzino from './views/Magazzino.vue'
import Riepilogo from './views/Riepilogo.vue'
import Soci from './views/Soci.vue'

const schede = { vendi: Vendi, magazzino: Magazzino, riepilogo: Riepilogo, soci: Soci }
const voci = [
  { id: 'vendi', icona: '🛒', nome: 'Vendi' },
  { id: 'magazzino', icona: '📦', nome: 'Magazzino' },
  { id: 'riepilogo', icona: '📊', nome: 'Riepilogo' },
  { id: 'soci', icona: '🤝', nome: 'Soci' },
]
const attiva = ref('vendi')
// eslint-disable-next-line no-undef
const versione = __VERSIONE__ // impostata da vite.config.js al momento della build
</script>

<template>
  <header class="testata">
    <div class="marchio">
      <img class="logo" :src="logoKamran" alt="Kamran" />
      <div>
        <h1>CardShop</h1>
        <small>Magazzino &amp; cassa · versione {{ versione }}</small>
      </div>
    </div>
    <!-- Su telefono il menu va in basso, su iPad/tablet resta qui in alto -->
    <nav class="menu">
      <button v-for="v in voci" :key="v.id" :class="{ on: attiva === v.id }" @click="attiva = v.id">
        <i>{{ v.icona }}</i><span>{{ v.nome }}</span>
      </button>
    </nav>
  </header>
  <main>
    <KeepAlive><component :is="schede[attiva]" /></KeepAlive>
  </main>
</template>
