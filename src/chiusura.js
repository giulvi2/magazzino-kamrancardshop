// Chiusura della giornata: i conti di un giorno di mercatino da condividere con i soci.
// Legge solo i dati già salvati (vendite, soci, spese): non cambia nulla nel localStorage.
import { stato, euro, nomeSocio, contiSoci, totaleQuote, totaleSpese } from './store'

// Giorno della vendita nell'ora del telefono, es. "2026-11-08"
// (toISOString darebbe il giorno in ora UTC: dopo mezzanotte sbaglierebbe)
export function giornoDi(iso) {
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const due = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`
}
export const oggiLocale = () => giornoDi(new Date().toISOString())

// "domenica 8 novembre 2026"
export function nomeGiorno(giorno) {
  const [a, m, g] = giorno.split('-').map(Number)
  return new Date(a, m - 1, g).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Giorni in cui ci sono vendite, dal più recente
export function giorniConVendite() {
  return [...new Set(stato.vendite.map((v) => giornoDi(v.data)).filter(Boolean))].sort().reverse()
}

const ora = (iso) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })

// Tutti i numeri della chiusura. giorno = "2026-11-08", oppure 'tutte' per tutte le vendite salvate.
export function datiChiusura(giorno) {
  const vendite = stato.vendite.filter((v) => giorno === 'tutte' || giornoDi(v.data) === giorno)
  const incasso = vendite.reduce((s, v) => s + (v.totale || 0), 0)
  const perTipo = (t) => vendite.filter((v) => v.pagamento === t).reduce((s, v) => s + (v.totale || 0), 0)

  // Satispay: i soldi arrivano sul conto del socio indicato alla vendita
  const satispay = new Map()
  for (const v of vendite)
    if (v.pagamento === 'satispay') satispay.set(v.incassatoDa || '', (satispay.get(v.incassatoDa || '') || 0) + (v.totale || 0))
  const satispayPerSocio = [...satispay].map(([id, totale]) => ({ id, nome: nomeSocio(id) || 'socio non indicato', totale }))

  // Conti per socio delle sole vendite scelte; si mostrano i soci che hanno venduto qualcosa
  // o ricevuto soldi su Satispay (gli altri sono elencati a parte come "niente venduto")
  const conti = contiSoci(vendite)
  const soci = conti.righe.map((c) => ({ ...c, satispay: c.id ? (satispay.get(c.id) || 0) : 0 }))
  const conVendite = soci.filter((c) => c.pezziVenduti || c.satispay)
  const senzaVendite = soci.filter((c) => c.id && !c.pezziVenduti && !c.satispay).map((c) => c.nome)

  // Se il totale delle vendite non torna con la somma dei pezzi (sconti sul totale,
  // arrotondamenti) la differenza si mostra a parte, così i conti dei soci non sembrano sbagliati
  const differenza = incasso - conti.totale.incasso

  const orari = vendite.map((v) => v.data).filter(Boolean).sort()
  return {
    giorno,
    titolo: giorno === 'tutte' ? 'Tutte le vendite salvate' : nomeGiorno(giorno),
    vendite: vendite.length,
    pezzi: vendite.reduce((s, v) => s + (v.righe || []).reduce((x, r) => x + (r.qta || 0), 0), 0),
    dalle: orari.length ? ora(orari[0]) : '',
    alle: orari.length ? ora(orari[orari.length - 1]) : '',
    incasso,
    contanti: perTipo('contanti'),
    carta: perTipo('carta'),
    satispay: perTipo('satispay'),
    paypal: perTipo('paypal'),
    satispayPerSocio,
    soci: conVendite,
    senzaVendite,
    totale: conti.totale,
    differenza,
    // Cassa comune: quote e spese sono di tutto il mercatino, non del singolo giorno
    quote: totaleQuote.value,
    spese: totaleSpese.value,
    elencoSpese: stato.spese.map((sp) => ({ descrizione: sp.descrizione, importo: sp.importo })),
    rimasto: totaleQuote.value - totaleSpese.value,
    incassoMenoSpese: incasso - totaleSpese.value,
  }
}

// Testo da mandare su WhatsApp/Messaggi: *grassetto* funziona su WhatsApp, altrove resta leggibile
export function testoChiusura(d) {
  const r = []
  r.push(`*Kamran CardShop · Chiusura*`)
  r.push(d.titolo.charAt(0).toUpperCase() + d.titolo.slice(1))
  if (d.dalle) r.push(`Vendite dalle ${d.dalle} alle ${d.alle}`)
  r.push('')
  r.push(`*Incasso: ${euro(d.incasso)}*`)
  r.push(`${d.vendite} vendite · ${d.pezzi} pezzi`)
  r.push(`• Contanti: ${euro(d.contanti)}`)
  r.push(`• Carta: ${euro(d.carta)}`)
  r.push(`• Satispay: ${euro(d.satispay)}`)
  for (const s of d.satispayPerSocio) r.push(`   – sul conto di ${s.nome}: ${euro(s.totale)}`)
  r.push(`• PayPal: ${euro(d.paypal)}`)
  r.push('')
  r.push('*Quanto spetta a ognuno* (incasso delle sue cose)')
  if (!d.soci.length) r.push('Nessuna vendita.')
  for (const c of d.soci) {
    r.push(`*${c.nome}: ${euro(c.incasso)}* (${c.pezziVenduti} pz)`)
    if (c.costo) r.push(`   prezzo di acquisto ${euro(c.costo)} → guadagno ${euro(c.guadagno)}`)
    else if (c.pezziVenduti) r.push(`   guadagno ${euro(c.guadagno)} (senza prezzo di acquisto)`)
    if (c.nonCalcolabile && c.costo) r.push(`   di cui senza prezzo di acquisto ${euro(c.nonCalcolabile)}`)
    if (c.satispay) r.push(`   già ricevuto su Satispay: ${euro(c.satispay)}`)
  }
  if (d.senzaVendite.length) r.push(`Niente venduto: ${d.senzaVendite.join(', ')}`)
  if (d.differenza) r.push(`Sconti/differenze sul totale: ${euro(d.differenza)} (non divisi tra i soci)`)
  r.push('')
  r.push('*Cassa comune*')
  r.push(`Quote dei soci: ${euro(d.quote)}`)
  r.push(`Spese: ${euro(d.spese)}`)
  for (const sp of d.elencoSpese) r.push(`   – ${sp.descrizione}: ${euro(sp.importo)}`)
  r.push(`Rimasto in cassa comune: ${euro(d.rimasto)}`)
  r.push(`Incasso meno spese: ${euro(d.incassoMenoSpese)}`)
  return r.join('\n')
}
