// Ricerca dei dati di un libro/fumetto dal suo ISBN su internet.
// Servizi pubblici e gratuiti:
//   - Google Books  (https://www.googleapis.com/books/v1/volumes?q=isbn:…)
//   - Open Library  (https://openlibrary.org/api/books?bibkeys=ISBN:…) e la sua
//     ricerca estesa (https://openlibrary.org/search.json?isbn=…), che a volte trova
//     edizioni che l'altra non ha
// Si chiedono tutti insieme e si uniscono i risultati.
//
// Google Books senza chiave ormai risponde quasi sempre "quota esaurita" (429): le
// chiamate senza chiave di tutto il mondo finiscono nella stessa quota. Per questo si
// può incollare nell'app una chiave gratuita (Riepilogo › Ricerca ISBN). La chiave resta
// solo nel localStorage del telefono: NON va scritta nel codice (il repository è pubblico).
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

const CHIAVE_GOOGLE = 'magazzino-chiave-google-books'
export const leggiChiaveGoogle = () => localStorage.getItem(CHIAVE_GOOGLE) || ''
export function salvaChiaveGoogle(chiave) {
  const c = String(chiave || '').trim()
  if (c) localStorage.setItem(CHIAVE_GOOGLE, c)
  else localStorage.removeItem(CHIAVE_GOOGLE)
}

// fetch con tempo massimo: Safari non ha AbortSignal.timeout sulle versioni vecchie
async function scaricaJson(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ATTESA_MAX)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.stato = r.status; throw e }
    return await r.json()
  } finally {
    clearTimeout(timer)
  }
}

// le copertine di Google arrivano in http: su https Safari le bloccherebbe
const https = (url) => (url ? url.replace(/^http:/, 'https:') : '')

async function daGoogle(isbn) {
  const chiave = leggiChiaveGoogle()
  const j = await scaricaJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
    + (chiave ? `&key=${encodeURIComponent(chiave)}` : ''))
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

async function daRicercaOpenLibrary(isbn) {
  const campi = 'title,subtitle,author_name,publisher,first_publish_year,cover_i,subject'
  const j = await scaricaJson(`https://openlibrary.org/search.json?isbn=${isbn}&fields=${campi}&limit=1`)
  const v = j.docs?.[0]
  if (!v) return null
  return {
    titolo: [v.title, v.subtitle].filter(Boolean).join(' - '),
    autori: (v.author_name || []).join(', '),
    editore: (v.publisher || [])[0] || '',
    anno: v.first_publish_year ? String(v.first_publish_year) : '',
    copertina: v.cover_i ? `https://covers.openlibrary.org/b/id/${v.cover_i}-M.jpg` : '',
    generi: (v.subject || []).join(' '),
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
// oppure null se non trovato. Lancia un errore se non c'è internet ('offline', 'rete')
// o se Google Books ha rifiutato la richiesta per la quota/chiave ('google').
export async function cercaIsbn(isbn) {
  if (!isIsbn(isbn)) return null
  if (!navigator.onLine) throw new Error('offline')
  const risposte = await Promise.allSettled([daGoogle(isbn), daOpenLibrary(isbn), daRicercaOpenLibrary(isbn)])
  const trovati = risposte.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value)
  if (!trovati.length) {
    // Google ha detto di no per la quota o per una chiave sbagliata: va detto, perché
    // senza Google i fumetti italiani non si trovano quasi mai
    if ([400, 403, 429].includes(risposte[0].reason?.stato)) throw new Error('google')
    // tutti in errore (rete assente o servizi giù): lo si dice a chi usa l'app
    if (risposte.every((r) => r.status === 'rejected')) throw new Error('rete')
    return null
  }
  // Google per primo; i campi che mancano si prendono da Open Library
  const dati = {}
  for (const campo of ['titolo', 'autori', 'editore', 'anno', 'copertina', 'generi'])
    dati[campo] = trovati.map((t) => t[campo]).find(Boolean) || ''
  dati.categoria = categoriaDa(trovati.map((t) => t.generi).join(' '))
  dati.fonte = [...new Set(trovati.map((t) => t.fonte))].join(' + ')
  delete dati.generi
  return dati
}

// Testo breve per il campo Note: "Autore · Editore · Anno"
export const descrizioneIsbn = (d) => [d.autori, d.editore, d.anno].filter(Boolean).join(' · ')
