// Stato dell'app salvato nel localStorage del telefono.
// Niente server: funziona anche senza connessione al mercatino.
import { reactive, watch, computed, ref } from 'vue'

const CHIAVE = 'magazzino-fumetti-v1'

// Soci che mettono i soldi iniziali nella cassa comune (nomi modificabili dall'app)
const SOCI_BASE = ['Giulia', 'Soheil', 'Davide', 'Kamran']
const sociIniziali = () => SOCI_BASE.map((nome, i) => ({ id: 'socio' + i, nome, quota: 0 }))

// Completa i dati salvati con una versione precedente dell'app (senza soci e spese)
function completa(dati) {
  if (!Array.isArray(dati.vendite)) dati.vendite = []
  if (!Array.isArray(dati.soci)) dati.soci = sociIniziali()
  if (!Array.isArray(dati.spese)) dati.spese = []
  // QR dei pagamenti: Satispay è in ogni socio (socio.satispayQr), PayPal è uno per il banco
  if (!dati.pagamenti || typeof dati.pagamenti !== 'object') dati.pagamenti = { paypalQr: '' }
  dati.categorie = categorieValide(dati.categorie)
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
// Se il telefono non ha più spazio (es. immagini QR troppo grandi) si avvisa una volta sola
let avvisatoSpazio = false
watch(stato, () => {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(stato))
    avvisatoSpazio = false
  } catch (e) {
    if (!avvisatoSpazio) alert('Attenzione: spazio esaurito, le ultime modifiche NON sono salvate. Togli qualche immagine QR e fai un backup.')
    avvisatoSpazio = true
  }
}, { deep: true })

// Categorie proposte nel form; si possono scrivere anche categorie nuove
export const CATEGORIE_BASE = ['Fumetti', 'Manga', 'Carte', 'Action figure', 'Gadget', 'Libri', 'Vinili']
// Categorie effettivamente usate negli articoli
export const categorie = computed(() =>
  [...new Set(stato.articoli.map((a) => a.categoria).filter(Boolean))].sort())

// ---- Gestione categorie (pagina Impostazioni) ----
// stato.categorie = { aggiunte: [...], nascoste: [...] }
// - aggiunte: categorie create dalle Impostazioni, anche se nessun articolo le usa ancora
// - nascoste: categorie base eliminate, che non vanno più proposte (in minuscolo)
// I dati salvati prima di questa versione non hanno il campo: si parte con liste vuote.
function categorieValide(c) {
  const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : [])
  return { aggiunte: lista(c?.aggiunte), nascoste: lista(c?.nascoste) }
}
const chiave = (c) => String(c || '').trim().toLowerCase()
// Toglie i doppioni anche se scritti con maiuscole diverse (tiene il primo)
export function senzaDoppioni(lista) {
  const viste = new Set()
  return lista.filter((c) => {
    const k = chiave(c)
    if (!k || viste.has(k)) return false
    viste.add(k)
    return true
  })
}
// Tutte le categorie da proporre: base (tranne le eliminate), aggiunte e quelle usate
export const tutteCategorie = computed(() => {
  const nascoste = new Set(stato.categorie.nascoste.map(chiave))
  return senzaDoppioni([
    ...CATEGORIE_BASE.filter((c) => !nascoste.has(chiave(c))),
    ...stato.categorie.aggiunte,
    ...categorie.value,
  ])
})
// Quanti articoli usano una categoria
export const articoliInCategoria = (c) => stato.articoli.filter((a) => chiave(a.categoria) === chiave(c)).length

export function aggiungiCategoria(nome) {
  const c = String(nome || '').trim()
  if (!c) return
  // una categoria base eliminata torna visibile
  stato.categorie.nascoste = stato.categorie.nascoste.filter((x) => chiave(x) !== chiave(c))
  if (!tutteCategorie.value.some((x) => chiave(x) === chiave(c))) stato.categorie.aggiunte.push(c)
}

// Elimina una categoria. Gli articoli che la usano passano a "destinazione"
// ('' = senza categoria); se la nuova categoria non ha l'anno, l'anno si toglie.
// Restituisce quanti articoli sono stati spostati.
export function eliminaCategoria(nome, destinazione = '') {
  const k = chiave(nome)
  const dest = chiave(destinazione) === k ? '' : String(destinazione || '').trim()
  let spostati = 0
  for (const a of stato.articoli) {
    if (chiave(a.categoria) !== k) continue
    a.categoria = dest
    if (!conAnno(dest)) a.anno = ''
    spostati++
  }
  stato.categorie.aggiunte = stato.categorie.aggiunte.filter((x) => chiave(x) !== k)
  if (CATEGORIE_BASE.some((x) => chiave(x) === k) && !stato.categorie.nascoste.some((x) => chiave(x) === k))
    stato.categorie.nascoste.push(nome)
  return spostati
}

// ---- Anno ----
// Fumetti, carte, manga e libri possono avere l'anno (di uscita o di stampa). Gli articoli
// salvati prima di questa versione non hanno il campo: vale come "non indicato" ('').
// Vale anche per "Fumetto", "Carta", "Libro", "Carte Pokémon"… (conta l'inizio del nome).
export const conAnno = (categoria) => /^(fumett|cart|manga|libr)/i.test(String(categoria || '').trim())
// Solo cifre, al massimo 4 (es. "1998"); '' se vuoto
export const pulisciAnno = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 4)
// Testo da mostrare in elenco: "Fumetti · 1998"
export const categoriaConAnno = (a) => [a.categoria, conAnno(a.categoria) && a.anno].filter(Boolean).join(' · ')

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

// ---- Proprietario e prezzo di acquisto ----
// Ogni articolo può avere un proprietario (l'id di un socio, '' = nessuno) e un prezzo
// di acquisto iniziale in centesimi (null = non indicato). Gli articoli salvati con le
// versioni precedenti non hanno questi campi: valgono come "nessuno" e "non indicato".
// Ultimo proprietario scelto nella scheda articolo (solo finché l'app resta aperta)
export const ultimoProprietario = ref('')
export const nomeSocio = (id) => stato.soci.find((s) => s.id === id)?.nome || ''
const haAcquisto = (v) => typeof v === 'number' && v >= 0
// Testo del campo "prezzo di acquisto" → centesimi, oppure null se il campo è vuoto
export const aAcquisto = (testo) => (String(testo ?? '').trim() === '' ? null : Math.max(0, aCentesimi(testo)))

// ---- Ricerca mentre si scrive (Vendi) ----
// Toglie accenti e maiuscole: "perché" = "PERCHE"
const normalizza = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Articoli che contengono tutte le parole scritte (nel titolo, codice, categoria o note).
// Prima quelli il cui titolo comincia con il testo, poi quelli ancora disponibili.
export function cercaArticoli(testo, quanti = 12) {
  const parole = normalizza(testo).split(/\s+/).filter(Boolean)
  if (!parole.length) return []
  const inizio = normalizza(testo).trim()
  return stato.articoli
    .map((a) => {
      const titolo = normalizza(a.titolo)
      const tutto = [titolo, normalizza(a.codice), normalizza(a.categoria), normalizza(a.note)].join(' ')
      if (!parole.every((p) => tutto.includes(p))) return null
      const punti = (titolo.startsWith(inizio) ? 2 : 0) + (a.quantita > 0 ? 1 : 0)
      return { a, punti }
    })
    .filter(Boolean)
    .sort((x, y) => y.punti - x.punti || x.a.titolo.localeCompare(y.a.titolo, 'it'))
    .slice(0, quanti)
    .map((x) => x.a)
}

export function salvaArticolo(dati) {
  const art = {
    titolo: (dati.titolo || '').trim() || 'Senza titolo',
    codice: pulisciCodice(dati.codice),
    prezzo: dati.prezzo || 0,
    quantita: Math.max(0, parseInt(dati.quantita) || 0),
    categoria: (dati.categoria || '').trim(),
    // l'anno si tiene solo per fumetti, carte, manga e libri
    anno: conAnno(dati.categoria) ? pulisciAnno(dati.anno) : '',
    note: (dati.note || '').trim(),
    proprietario: dati.proprietario || '',
    acquisto: haAcquisto(dati.acquisto) ? dati.acquisto : null,
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
// pagamento: 'contanti' | 'carta' | 'satispay' | 'paypal'
// incassatoDa: per Satispay, l'id del socio sul cui conto sono arrivati i soldi ('' = non indicato)
// In ogni riga si salvano anche proprietario e prezzo di acquisto dell'articolo in quel
// momento: così i conti restano giusti anche se poi l'articolo cambia o viene eliminato,
// e arrivano uguali sugli altri telefoni con "Unisci vendite".
export function registraVendita(righe, pagamento, incassatoDa = '') {
  for (const r of righe) {
    const a = stato.articoli.find((x) => x.id === r.articoloId)
    if (a) {
      a.quantita = Math.max(0, a.quantita - r.qta)
      r.proprietario = a.proprietario || ''
      r.acquisto = haAcquisto(a.acquisto) ? a.acquisto : null
    }
  }
  const totale = righe.reduce((s, r) => s + r.prezzo * r.qta, 0)
  const vendita = { id: nuovoId(), data: new Date().toISOString(), righe, totale, pagamento }
  if (incassatoDa) vendita.incassatoDa = incassatoDa
  stato.vendite.unshift(vendita)
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

// Proprietario e prezzo di acquisto di una riga venduta. Se la riga non li ha
// (vendite fatte prima di questa versione, o articolo senza proprietario in quel momento)
// si usano quelli attuali dell'articolo, se esiste ancora.
export function infoRiga(r) {
  const a = stato.articoli.find((x) => x.id === r.articoloId)
  return {
    proprietario: r.proprietario || a?.proprietario || '',
    acquisto: haAcquisto(r.acquisto) ? r.acquisto : (haAcquisto(a?.acquisto) ? a.acquisto : null),
  }
}

// Conti per socio (più "senza proprietario") e totale del banco.
// - incasso: quanto si è incassato con le sue cose
// - costo: prezzo di acquisto dei pezzi venduti (solo per quelli che lo hanno)
// - guadagno: incasso meno costo; i pezzi senza prezzo di acquisto contano per intero
// - nonCalcolabile: la parte di incasso fatta con pezzi senza prezzo di acquisto
//   (il loro vero guadagno non si conosce)
// - magazzino: pezzi ancora da vendere, il loro valore a prezzo di vendita e quanto sono costati
export const contiPerSocio = computed(() => {
  const vuoto = (id, nome) => ({
    id, nome, incasso: 0, costo: 0, guadagno: 0, nonCalcolabile: 0, pezziVenduti: 0,
    pezzi: 0, valore: 0, costoMagazzino: 0,
  })
  const conti = new Map(stato.soci.map((s) => [s.id, vuoto(s.id, s.nome)]))
  const nessuno = vuoto('', 'Senza proprietario')
  const di = (id) => conti.get(id) || nessuno // socio tolto = senza proprietario
  for (const v of stato.vendite) {
    for (const r of v.righe || []) {
      const { proprietario, acquisto } = infoRiga(r)
      const c = di(proprietario)
      const incasso = (r.prezzo || 0) * (r.qta || 0)
      c.incasso += incasso
      c.pezziVenduti += r.qta || 0
      if (acquisto === null) c.nonCalcolabile += incasso
      else c.costo += acquisto * (r.qta || 0)
    }
  }
  for (const a of stato.articoli) {
    const c = di(a.proprietario)
    c.pezzi += a.quantita
    c.valore += a.quantita * (a.prezzo || 0)
    if (haAcquisto(a.acquisto)) c.costoMagazzino += a.quantita * a.acquisto
  }
  const righe = [...conti.values()]
  if (nessuno.incasso || nessuno.pezzi || nessuno.pezziVenduti) righe.push(nessuno)
  const totale = vuoto('totale', 'Totale banco')
  for (const c of righe) {
    c.guadagno = c.incasso - c.costo
    for (const k of Object.keys(c)) if (typeof c[k] === 'number') totale[k] += c[k]
  }
  return { righe, totale }
})

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
  if (dati.pagamenti && typeof dati.pagamenti === 'object') stato.pagamenti = { paypalQr: '', ...dati.pagamenti }
  // un backup fatto prima delle Impostazioni non ha le categorie: si tengono quelle attuali
  if (dati.categorie && typeof dati.categorie === 'object') stato.categorie = categorieValide(dati.categorie)
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
  const righe = [['Codice', 'Titolo', 'Prezzo', 'Quantità', 'Categoria', 'Note', 'Proprietario', 'Prezzo acquisto', 'Anno']]
  for (const a of stato.articoli)
    righe.push([a.codice, a.titolo, daCentesimi(a.prezzo), a.quantita, a.categoria, a.note,
      nomeSocio(a.proprietario), haAcquisto(a.acquisto) ? daCentesimi(a.acquisto) : '', a.anno || ''])
  scarica(`magazzino-${oggi()}.csv`, csv(righe), 'text/csv')
}

export function esportaVenditeCsv() {
  const righe = [['Data', 'Ora', 'Codice', 'Titolo', 'Categoria', 'Quantità', 'Prezzo', 'Pagamento', 'Incassato da', 'Proprietario', 'Prezzo acquisto']]
  for (const v of [...stato.vendite].reverse()) {
    const d = new Date(v.data)
    for (const r of v.righe) {
      const { proprietario, acquisto } = infoRiga(r)
      righe.push([d.toLocaleDateString('it-IT'), d.toLocaleTimeString('it-IT'), r.codice, r.titolo, r.categoria, r.qta,
        daCentesimi(r.prezzo), v.pagamento, nomeSocio(v.incassatoDa), nomeSocio(proprietario), acquisto === null ? '' : daCentesimi(acquisto)])
    }
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
