// Stato dell'app salvato nel localStorage del telefono.
// Niente server: funziona anche senza connessione al mercatino.
import { reactive, watch, computed } from 'vue'

const CHIAVE = 'magazzino-fumetti-v1'

// Soci che mettono i soldi iniziali nella cassa comune (nomi modificabili dall'app)
const SOCI_BASE = ['Giulia', 'Soheil', 'Davide', 'Kamran']
const sociIniziali = () => SOCI_BASE.map((nome, i) => ({ id: 'socio' + i, nome, quota: 0 }))

// Completa i dati salvati con una versione precedente dell'app (senza soci e spese)
function completa(dati) {
  if (!Array.isArray(dati.vendite)) dati.vendite = []
  if (!Array.isArray(dati.soci)) dati.soci = sociIniziali()
  if (!Array.isArray(dati.spese)) dati.spese = []
  return dati
}

function carica() {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE))
    if (dati && Array.isArray(dati.articoli)) return completa(dati)
  } catch (e) { /* dati rovinati: si riparte vuoti */ }
  return completa({ articoli: [] })
}

export const stato = reactive(carica())

// Ogni modifica viene salvata subito
watch(stato, () => localStorage.setItem(CHIAVE, JSON.stringify(stato)), { deep: true })

// Categorie proposte nel form; si possono scrivere anche categorie nuove
export const CATEGORIE_BASE = ['Fumetti', 'Manga', 'Carte', 'Action figure', 'Gadget', 'Libri', 'Vinili']
// Categorie effettivamente usate negli articoli
export const categorie = computed(() =>
  [...new Set(stato.articoli.map((a) => a.categoria).filter(Boolean))].sort())

const nuovoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)

// I prezzi sono salvati in centesimi (interi) per evitare errori di arrotondamento
export const euro = (cent) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format((cent || 0) / 100)
export const aCentesimi = (testo) => Math.round(parseFloat(String(testo).replace(',', '.')) * 100) || 0
export const daCentesimi = (cent) => ((cent || 0) / 100).toFixed(2).replace('.', ',')

export const pulisciCodice = (c) => String(c || '').trim().replace(/[^0-9A-Za-z]/g, '')

// Maiuscole e minuscole non contano: alcune pistole scanner cambiano le lettere
// (es. con il Bloc Maiusc attivo), e i codici delle etichette QR hanno lettere.
export function trovaPerCodice(codice) {
  const c = pulisciCodice(codice).toUpperCase()
  if (!c) return null
  return stato.articoli.find((a) => a.codice && a.codice.toUpperCase() === c) || null
}

// ---- Etichette QR ----
// Gli articoli senza codice a barre (carte, action figure, gadget…) ricevono un codice
// interno "KC" + il loro id. È unico, resta uguale su tutti i telefoni che hanno lo
// stesso backup, e lo legge sia la fotocamera sia una pistola scanner 2D.
export const codiceInterno = (a) => 'KC' + String(a.id).toUpperCase().replace(/[^0-9A-Z]/g, '')
export const codiceEtichetta = (a) => a.codice || codiceInterno(a)

// Salva il codice interno negli articoli che non hanno ancora un codice.
// Restituisce quanti codici sono stati assegnati.
export function assegnaCodici(articoli) {
  let assegnati = 0
  for (const a of articoli) {
    const vero = stato.articoli.find((x) => x.id === a.id)
    if (vero && !vero.codice) { vero.codice = codiceInterno(vero); assegnati++ }
  }
  return assegnati
}

export function salvaArticolo(dati) {
  const art = {
    titolo: (dati.titolo || '').trim() || 'Senza titolo',
    codice: pulisciCodice(dati.codice),
    prezzo: dati.prezzo || 0,
    quantita: Math.max(0, parseInt(dati.quantita) || 0),
    categoria: (dati.categoria || '').trim(),
    note: (dati.note || '').trim(),
  }
  if (dati.id) {
    Object.assign(stato.articoli.find((a) => a.id === dati.id), art)
    return dati.id
  }
  const id = nuovoId()
  stato.articoli.push({ id, ...art })
  return id
}

export function eliminaArticolo(id) {
  stato.articoli = stato.articoli.filter((a) => a.id !== id)
}

// righe: [{ articoloId, titolo, codice, prezzo, qta }]
export function registraVendita(righe, pagamento) {
  for (const r of righe) {
    const a = stato.articoli.find((x) => x.id === r.articoloId)
    if (a) a.quantita = Math.max(0, a.quantita - r.qta)
  }
  const totale = righe.reduce((s, r) => s + r.prezzo * r.qta, 0)
  stato.vendite.unshift({ id: nuovoId(), data: new Date().toISOString(), righe, totale, pagamento })
}

// Annulla una vendita e rimette i pezzi in magazzino
export function annullaVendita(id) {
  const v = stato.vendite.find((x) => x.id === id)
  if (!v) return
  for (const r of v.righe) {
    const a = stato.articoli.find((x) => x.id === r.articoloId)
    if (a) a.quantita += r.qta
  }
  stato.vendite = stato.vendite.filter((x) => x.id !== id)
}

// ---- Cassa comune: quote iniziali dei soci e spese pagate con quei soldi ----
export const totaleQuote = computed(() => stato.soci.reduce((s, x) => s + (x.quota || 0), 0))
export const totaleSpese = computed(() => stato.spese.reduce((s, x) => s + (x.importo || 0), 0))

export function aggiungiSocio(nome) {
  stato.soci.push({ id: nuovoId(), nome: (nome || '').trim() || 'Nuovo socio', quota: 0 })
}

export function eliminaSocio(id) {
  stato.soci = stato.soci.filter((x) => x.id !== id)
}

export function aggiungiSpesa(descrizione, importo) {
  stato.spese.unshift({
    id: nuovoId(), data: new Date().toISOString(),
    descrizione: (descrizione || '').trim() || 'Spesa', importo,
  })
}

export function eliminaSpesa(id) {
  stato.spese = stato.spese.filter((x) => x.id !== id)
}

// Prova a recuperare il titolo da internet (solo se c'è connessione e il codice è un ISBN)
export async function cercaTitoloOnline(codice) {
  if (!navigator.onLine || !/^97[89]\d{10}$/.test(codice)) return ''
  try {
    const r = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${codice}`)
    const j = await r.json()
    const info = j.items?.[0]?.volumeInfo
    if (info) return [info.title, info.subtitle].filter(Boolean).join(' - ')
  } catch (e) { /* offline o errore: pazienza */ }
  try {
    const r = await fetch(`https://openlibrary.org/isbn/${codice}.json`)
    if (r.ok) return (await r.json()).title || ''
  } catch (e) { /* idem */ }
  return ''
}

// ---- Backup ed esportazione ----
function scarica(nome, contenuto, tipo) {
  const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const oggi = () => new Date().toISOString().slice(0, 10)

export function esportaBackup() {
  scarica(`backup-magazzino-${oggi()}.json`, JSON.stringify(stato, null, 2), 'application/json')
}

export function importaBackup(testo) {
  const dati = JSON.parse(testo)
  if (!Array.isArray(dati.articoli)) throw new Error('File non valido')
  stato.articoli = dati.articoli
  stato.vendite = dati.vendite || []
  // un backup fatto prima della cassa comune non ha soci e spese: si tengono quelli attuali
  if (Array.isArray(dati.soci)) stato.soci = dati.soci
  if (Array.isArray(dati.spese)) stato.spese = dati.spese
}

// Unisce le vendite di un altro telefono (dal suo file di backup JSON).
// Aggiunge solo le vendite che qui non ci sono ancora (stesso id = già unita),
// quindi si può importare lo stesso file più volte senza contare doppio.
// Per ogni vendita nuova scala le giacenze di questo telefono.
export function unisciVendite(testo) {
  const dati = JSON.parse(testo)
  if (!Array.isArray(dati.vendite) && !Array.isArray(dati.spese)) throw new Error('Il file non contiene vendite')
  if (!Array.isArray(dati.vendite)) dati.vendite = []
  const giaPresenti = new Set(stato.vendite.map((v) => v.id))
  let aggiunte = 0, doppie = 0
  const nonTrovati = new Set()
  for (const v of dati.vendite) {
    if (!v || !v.id || !Array.isArray(v.righe)) continue
    if (giaPresenti.has(v.id)) { doppie++; continue }
    for (const r of v.righe) {
      // stesso articolo se ha lo stesso id, altrimenti si cerca per codice a barre
      const a = stato.articoli.find((x) => x.id === r.articoloId) || trovaPerCodice(r.codice)
      if (a) {
        a.quantita = Math.max(0, a.quantita - r.qta)
        r.articoloId = a.id // così "annulla vendita" rimette il pezzo nell'articolo giusto
      } else nonTrovati.add(r.titolo || r.codice || '?')
    }
    stato.vendite.push(v)
    giaPresenti.add(v.id)
    aggiunte++
  }
  stato.vendite.sort((x, y) => (y.data || '').localeCompare(x.data || ''))

  // Anche le spese della cassa comune segnate sull'altro telefono (stesso id = già unita).
  // Le quote dei soci invece non si uniscono: si segnano su un telefono solo.
  let speseAggiunte = 0
  const speseQui = new Set(stato.spese.map((x) => x.id))
  for (const sp of Array.isArray(dati.spese) ? dati.spese : []) {
    if (!sp || !sp.id || speseQui.has(sp.id)) continue
    stato.spese.push(sp)
    speseQui.add(sp.id)
    speseAggiunte++
  }
  stato.spese.sort((x, y) => (y.data || '').localeCompare(x.data || ''))
  return { aggiunte, doppie, nonTrovati: [...nonTrovati], speseAggiunte }
}

const csvCella = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
const csv = (righe) => '﻿' + righe.map((r) => r.map(csvCella).join(';')).join('\n')

export function esportaMagazzinoCsv() {
  const righe = [['Codice', 'Titolo', 'Prezzo', 'Quantità', 'Categoria', 'Note']]
  for (const a of stato.articoli) righe.push([a.codice, a.titolo, daCentesimi(a.prezzo), a.quantita, a.categoria, a.note])
  scarica(`magazzino-${oggi()}.csv`, csv(righe), 'text/csv')
}

export function esportaVenditeCsv() {
  const righe = [['Data', 'Ora', 'Codice', 'Titolo', 'Categoria', 'Quantità', 'Prezzo', 'Pagamento']]
  for (const v of [...stato.vendite].reverse()) {
    const d = new Date(v.data)
    for (const r of v.righe)
      righe.push([d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT'), r.codice, r.titolo, r.categoria, r.qta, daCentesimi(r.prezzo), v.pagamento])
  }
  scarica(`vendite-${oggi()}.csv`, csv(righe), 'text/csv')
}

// Importa un CSV (es. da Excel) con colonne: Codice;Titolo;Prezzo;Quantità;Categoria
export function importaMagazzinoCsv(testo) {
  const linee = testo.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  const sep = (linee[0].match(/;/g) || []).length >= (linee[0].match(/,/g) || []).length ? ';' : ','
  let aggiunti = 0
  for (const [i, linea] of linee.entries()) {
    const c = linea.split(sep).map((x) => x.trim().replace(/^"|"$/g, ''))
    if (i === 0 && /codice|titolo/i.test(linea)) continue // intestazione
    const [codice, titolo, prezzo, quantita, categoria] = c
    const esistente = trovaPerCodice(codice)
    if (esistente) esistente.quantita += parseInt(quantita) || 0
    else salvaArticolo({ codice, titolo, prezzo: aCentesimi(prezzo), quantita: quantita || 1, categoria })
    aggiunti++
  }
  return aggiunti
}

// Suono + vibrazione quando lo scanner legge un codice
let audioCtx
export function bip(ok = true) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    o.frequency.value = ok ? 1200 : 300
    g.gain.value = 0.15
    o.connect(g).connect(audioCtx.destination)
    o.start()
    o.stop(audioCtx.currentTime + (ok ? 0.12 : 0.35))
  } catch (e) { /* niente audio */ }
  navigator.vibrate?.(ok ? 80 : [100, 60, 100])
}
