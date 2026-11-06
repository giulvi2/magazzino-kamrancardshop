import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

// Registra il service worker (solo nella versione pubblicata, non in sviluppo)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // updateViaCache 'none': il browser non usa la sua cache per controllare se sw.js è cambiato
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    // ogni volta che si torna sull'app controlla se c'è una versione nuova
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {})
    })
  }).catch(() => {})

  // quando un service worker nuovo prende il controllo, ricarica una volta la pagina
  // così si vede subito la versione aggiornata (i dati nel localStorage restano)
  const cera = !!navigator.serviceWorker.controller
  let ricaricato = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!cera || ricaricato) return
    ricaricato = true
    location.reload()
  })
}
