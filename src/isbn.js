// Ricerca dei dati di un libro/fumetto dal suo ISBN su internet.
// Servizi pubblici e gratuiti, senza account né chiavi:
//   - Google Books  (https://www.googleapis.com/books/v1/volumes?q=isbn:…)
//   - Open Library  (https://openlibrary.org/api/books?bibkeys=ISBN:…)
// Si chiedono a tutti e due insieme e si uniscono i risultati.
// Senza internet, o se il libro non c'è, si compila la scheda a mano come sempre.

const ATTESA_MAX = 7000 // ms: al mercatino la rete può essere lenta, ma non si aspetta all'infinito

// Un ISBN-13 inizia con 978 o 979 e ha la cifra di controllo giusta
// (così non si cercano online i codici a barre che non sono libri).
export function isIsbn(codice) {
  const c = String(codice || '').trim()
  if (!/^97[89]\d{10}$/.test(c)) return false
  const somma = [...c.slice(0, 12)].reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0)
  return (10 - (somma % 10)) % 10 === Number(c[12])
}

// fetch con tempo massimo: Safari non ha AbortSignal.timeout sulle versioni vecchie
async function scaricaJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ATTESA_MAX)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

// le copertine di Google arrivano in http: su https Safari le bloccherebbe
const https = (url) => (url ? url.replace(/^http:/, 'https:') : '')

async function daGoogle(isbn) {
  const j = await scaricaJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`)
  const v = j.items?.[0]?.volumeInfo
  if (!v) return null
  return {
    titolo: [v.title, v.subtitle].filter(Boolean).join(' - '),
    autori: (v.authors || []).join(', '),
    editore: v.publisher || '',
    anno: (v.publishedDate || '').slice(0, 4),
    copertina: https(v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail),
    generi: (v.categories || []).join(' '),
    fonte: 'Google Books',
  }
}

async function daOpenLibrary(isbn) {
  const j = await scaricaJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`)
  const v = j[`ISBN:${isbn}`]
  if (!v) return null
  return {
    titolo: [v.title, v.subtitle].filter(Boolean).join(' - '),
    autori: (v.authors || []).map((a) => a.name).filter(Boolean).join(', '),
    editore: (v.publishers || []).map((p) => p.name).filter(Boolean).join(', '),
    anno: (String(v.publish_date || '').match(/\d{4}/) || [''])[0],
    copertina: https(v.cover?.medium || v.cover?.small),
    generi: (v.subjects || []).map((s) => s.name).join(' '),
    fonte: 'Open Library',
  }
}

// Fumetti e manga si riconoscono dai generi indicati dal servizio
function categoriaDa(generi) {
  if (/manga/i.test(generi)) return 'Manga'
  if (/comic|graphic novel|fumett/i.test(generi)) return 'Fumetti'
  return ''
}

// Restituisce { titolo, autori, editore, anno, copertina, categoria, fonte },
// oppure null se non trovato. Lancia un errore se non c'è internet.
export async function cercaIsbn(isbn) {
  if (!isIsbn(isbn)) return null
  if (!navigator.onLine) throw new Error('offline')
  const risposte = await Promise.allSettled([daGoogle(isbn), daOpenLibrary(isbn)])
  const trovati = risposte.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
  if (!trovati.length) {
    // tutti e due in errore (rete assente o servizi giù): lo si dice a chi usa l'app
    if (risposte.every((r) => r.status === 'rejected')) throw new Error('rete')
    return null
  }
  // Google per primo; i campi che mancano si prendono da Open Library
  const dati = {}
  for (const campo of ['titolo', 'autori', 'editore', 'anno', 'copertina', 'generi'])
    dati[campo] = trovati.map((t) => t[campo]).find(Boolean) || ''
  dati.categoria = categoriaDa(trovati.map((t) => t.generi).join(' '))
  dati.fonte = trovati.map((t) => t.fonte).join(' + ')
  delete dati.generi
  return dati
}

// Testo breve per il campo Note: "Autore · Editore · Anno"
export const descrizioneIsbn = (d) => [d.autori, d.editore, d.anno].filter(Boolean).join(' · ')
