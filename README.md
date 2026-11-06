# Magazzino Collezionismo

App Vue 3 per gestire magazzino e vendite ai mercatini del collezionismo (fumetti, manga, carte, action figure…), con scanner di codici a barre
(fotocamera del telefono oppure pistola scanner USB/Bluetooth).

## Schede
- **Vendi**: scansiona (o cerca per titolo) → carrello → prezzo modificabile (per gli sconti) →
  calcolo del resto → *Contanti* o *Carta*. Le quantità in magazzino scendono da sole.
- **Magazzino**: scansiona per caricare. Codice già presente = +1 pezzo; codice nuovo = si apre
  la scheda (se c'è internet e il codice è un ISBN prova a trovare il titolo da solo).
  Ogni articolo ha una categoria (il magazzino si filtra per categoria). Gli articoli senza codice si aggiungono con *+ Nuovo* e si vendono cercandoli per titolo.
- **Riepilogo**: incasso totale/contanti/carta, storico vendite (con ↩ per annullare),
  backup JSON, esportazione CSV (si apre con Excel), importazione magazzino da CSV
  (`Codice;Titolo;Prezzo;Quantità;Categoria`).

## Dati
Tutto è salvato nel `localStorage` del browser del telefono: niente server, funziona offline.
I dati restano su quel telefono e in quel browser: **fai un backup a fine giornata**.

## Sviluppo
```bash
npm install
npm run dev      # http://localhost:5173 (la fotocamera funziona su localhost)
npm run build    # crea dist/index.html + dist/sw.js
```

## Pubblicazione
La fotocamera funziona solo su **https://**. Basta pubblicare la cartella `dist/` su un hosting
statico (GitHub Pages, Netlify Drop, ecc.). Al primo caricamento il service worker salva l'app,
così si riapre anche senza rete.

Ogni push su `main` ripubblica l'app su GitHub Pages tramite `.github/workflows/deploy.yml`
(Settings → Pages → Source: **GitHub Actions**).
