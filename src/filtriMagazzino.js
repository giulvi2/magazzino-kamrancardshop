// ---- Ricerca e filtri del Magazzino ----
// I filtri vivono qui (fuori dalla pagina) così restano uguali passando da Vendi o
// Riepilogo e tornando al Magazzino. Non vengono salvati: ricaricando l'app si azzerano.
import { reactive, computed } from 'vue'
import { stato, aCentesimi } from './store'

// Toglie accenti e maiuscole: "perché" = "PERCHE" (come la ricerca in Vendi)
export const normalizza = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const VUOTI = {
  testo: '',
  categoria: '', // '' = tutte
  socio: null, // null = tutti, '' = senza proprietario
  disponibilita: '', // '' = tutti, 'disponibili', 'esauriti'
  prezzoDa: '', // testo in euro, '' = nessun limite
  prezzoA: '',
  annoDa: '',
  annoA: '',
  conNote: false,
  ordine: 'titolo',
}

export const filtri = reactive({ ...VUOTI })

export const ORDINI = [
  { valore: 'titolo', nome: 'Titolo A→Z' },
  { valore: 'prezzo-su', nome: 'Prezzo: dal più basso' },
  { valore: 'prezzo-giu', nome: 'Prezzo: dal più alto' },
  { valore: 'quantita-giu', nome: 'Più pezzi' },
  { valore: 'quantita-su', nome: 'Meno pezzi' },
  { valore: 'anno-giu', nome: 'Anno: più recenti' },
  { valore: 'anno-su', nome: 'Anno: più vecchi' },
  { valore: 'nuovi', nome: 'Ultimi aggiunti' },
]

// Chi ha un socio che non c'è più tra i soci (⚙️ Impostazioni) conta come "senza proprietario"
export const proprietarioDi = (a) => (stato.soci.some((s) => s.id === a.proprietario) ? a.proprietario : '')

// Filtri del pannello "Filtri" attivi (ricerca, categoria e socio si vedono già sullo schermo)
export const filtriAttivi = computed(() =>
  [filtri.disponibilita, filtri.prezzoDa.trim() || filtri.prezzoA.trim(),
    filtri.annoDa || filtri.annoA, filtri.conNote].filter(Boolean).length)

export const qualcheFiltro = computed(() =>
  filtriAttivi.value > 0 || !!filtri.testo.trim() || !!filtri.categoria || filtri.socio !== null)

export function azzeraFiltri() {
  Object.assign(filtri, VUOTI)
}

const numeroAnno = (a) => (a.anno ? Number(a.anno) : null)

// Elenco degli articoli che passano tutti i filtri, già ordinato
export const articoliFiltrati = computed(() => {
  const parole = normalizza(filtri.testo).split(/\s+/).filter(Boolean)
  const da = filtri.prezzoDa.trim() ? aCentesimi(filtri.prezzoDa) : null
  const a_ = filtri.prezzoA.trim() ? aCentesimi(filtri.prezzoA) : null
  const annoDa = filtri.annoDa ? Number(filtri.annoDa) : null
  const annoA = filtri.annoA ? Number(filtri.annoA) : null
  const posizione = new Map(stato.articoli.map((a, i) => [a, i]))

  const elenco = stato.articoli.filter((a) => {
    if (filtri.categoria && a.categoria !== filtri.categoria) return false
    if (filtri.socio !== null && proprietarioDi(a) !== filtri.socio) return false
    if (filtri.disponibilita === 'disponibili' && !(a.quantita > 0)) return false
    if (filtri.disponibilita === 'esauriti' && a.quantita > 0) return false
    if (da !== null && (a.prezzo || 0) < da) return false
    if (a_ !== null && (a.prezzo || 0) > a_) return false
    if (annoDa !== null || annoA !== null) {
      const anno = numeroAnno(a)
      if (anno === null) return false // senza anno: escluso quando si filtra per anno
      if (annoDa !== null && anno < annoDa) return false
      if (annoA !== null && anno > annoA) return false
    }
    if (filtri.conNote && !String(a.note || '').trim()) return false
    if (parole.length) {
      const tutto = [a.titolo, a.codice, a.categoria, a.anno, a.note].map(normalizza).join(' ')
      if (!parole.every((p) => tutto.includes(p))) return false
    }
    return true
  })

  const perTitolo = (x, y) => String(x.titolo || '').localeCompare(String(y.titolo || ''), 'it')
  // Gli articoli senza anno vanno in fondo, in entrambi gli ordini per anno
  const perAnno = (verso) => (x, y) => {
    const ax = numeroAnno(x), ay = numeroAnno(y)
    if (ax === ay) return perTitolo(x, y)
    if (ax === null) return 1
    if (ay === null) return -1
    return (ax - ay) * verso
  }
  const confronti = {
    titolo: perTitolo,
    'prezzo-su': (x, y) => (x.prezzo || 0) - (y.prezzo || 0) || perTitolo(x, y),
    'prezzo-giu': (x, y) => (y.prezzo || 0) - (x.prezzo || 0) || perTitolo(x, y),
    'quantita-giu': (x, y) => (y.quantita || 0) - (x.quantita || 0) || perTitolo(x, y),
    'quantita-su': (x, y) => (x.quantita || 0) - (y.quantita || 0) || perTitolo(x, y),
    'anno-giu': perAnno(-1),
    'anno-su': perAnno(1),
    nuovi: (x, y) => posizione.get(y) - posizione.get(x),
  }
  return elenco.sort(confronti[filtri.ordine] || perTitolo)
})
