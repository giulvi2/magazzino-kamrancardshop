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
  (`Codice;Titolo;Prezzo;Quantità;Categoria`), *Unisci vendite da altro telefono*.
  Mostra anche quote dei soci, spese e *incasso meno spese*.
- **Soci**: cassa comune. Quanto mette ogni socio all'inizio (Giulia, Soheil, Davide, Kamran;
  nomi e numero di soci modificabili), le spese pagate con quei soldi (es. il suolo) e quanto resta.

## Etichette QR
Per gli articoli senza codice a barre (carte, action figure, gadget…) l'app stampa etichette adesive con un QR.
- **Magazzino → 🏷️ Etichette** stampa le etichette degli articoli in elenco (si scelgono con filtro e categoria);
  **🏷️ Etichetta** nella scheda di un articolo ne stampa una sola. Una per articolo oppure una per ogni pezzo.
- Formati: foglio A4 da 24 (70×37 mm), foglio A4 da 65 (38×21 mm), stampante per etichette 50×30 mm.
  *Salta le prime* serve per riusare un foglio già cominciato.
- Il QR contiene solo il codice dell'articolo. Chi non ha un codice ne riceve uno interno `KC…` (dall'id
  dell'articolo) al momento della stampa: **dopo, fai il backup e passalo agli altri telefoni**.
- Si legge con la fotocamera 📷 dell'app o con una pistola scanner **2D** (quelle solo laser 1D non leggono i QR),
  esattamente come un codice a barre: in Vendi va nel carrello, in Magazzino aggiunge un pezzo.
- I QR si generano nel browser (libreria `qrcode-generator`, MIT): funziona anche offline.

## Più telefoni allo stesso banco
1. La mattina un telefono fa *Backup (JSON)* e tutti gli altri lo ripristinano: partono dallo stesso magazzino.
2. Durante la giornata ognuno vende dal proprio telefono (le giacenze degli altri non si aggiornano).
3. A fine giornata ogni telefono fa *Backup (JSON)* e lo manda alla cassa principale, che usa
   *Unisci vendite da altro telefono*: le vendite si aggiungono e le giacenze scendono.
   Unire lo stesso file due volte non conta doppio (le vendite hanno un id univoco).
   Si uniscono anche le spese della cassa comune; le quote dei soci vanno segnate su un telefono solo.

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
