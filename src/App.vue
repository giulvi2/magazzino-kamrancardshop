<script setup>
import { ref } from 'vue'
import Vendi from './views/Vendi.vue'
import Magazzino from './views/Magazzino.vue'
import Riepilogo from './views/Riepilogo.vue'

const schede = { vendi: Vendi, magazzino: Magazzino, riepilogo: Riepilogo }
const attiva = ref('vendi')
</script>

<template>
  <header>
    <h1>Magazzino Collezionismo</h1>
  </header>
  <main>
    <KeepAlive><component :is="schede[attiva]" /></KeepAlive>
  </main>
  <nav>
    <button :class="{ on: attiva === 'vendi' }" @click="attiva = 'vendi'">🛒<span>Vendi</span></button>
    <button :class="{ on: attiva === 'magazzino' }" @click="attiva = 'magazzino'">📦<span>Magazzino</span></button>
    <button :class="{ on: attiva === 'riepilogo' }" @click="attiva = 'riepilogo'">📊<span>Riepilogo</span></button>
  </nav>
</template>
