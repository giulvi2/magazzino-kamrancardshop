# Magazzino Collezionismo

App Vue 3 per gestire magazzino e vendite ai mercatini del collezionismo (fumetti, manga, carte, action figure…), con scanner di codici a barre
(fotocamera del telefono oppure pistola scanner USB/Bluetooth).

## Schede
- **Vendi**: scansiona (o cerca per titolo) → carrello → prezzo modificabile (per gli sconti) →
  calcolo del resto → *Contanti* o *Carta*. Le quantità in magazzino scendono da sole.
- **Magazzino**: scansiona per caricare. Codice già presente = +1 pezzo; codice nuovo = si apre
  la scheda (se c'è internet e il codice è un ISBN prova a trovare il titolo da solo).
  Ogni articolo ha una categoria (il magazzino si filtra per categoria). Gli articoli senza codice si aggiungono con *+ Nuovo* e si vendono cercandoli per titolo.
  Ogni articolo può avere un proprietario (di quale socio è) e un prezzo di acquisto iniziale facoltativo;
  il magazzino si filtra anche per socio.
- **Riepilogo**: incasso totale/contanti/carta, storico vendite (con ↩ per annullare),
  backup JSON, esportazione CSV (si apre con Excel), importazione magazzino da CSV
  (`Codice;Titolo;Prezzo;Quantità;Categoria`), *Unisci vendite da altro telefono*.
  Mostra anche quote dei soci, spese e *incasso meno spese*.
  *Per socio*: incasso e guadagno di ognuno (vendita meno prezzo di acquisto) e il totale del banco.
  Se un articolo non ha il prezzo di acquisto il suo incasso conta tutto come guadagno, ed è mostrato
  a parte come *senza prezzo di acquisto*.
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
   Ogni vendita si porta dietro proprietario e prezzo di acquisto degli articoli, quindi i conti
   *Per socio* tornano anche sulla cassa principale. Conviene comunque scegliere i proprietari
   **prima** del backup della mattina, così tutti i telefoni li hanno uguali.

## Dati
Tutto è salvato nel `localStorage` del browser del telefono: niente server, funziona offline.
I dati restano su quel telefono e in quel browser: **fai un backup a fine giornata**.

## Sviluppo
```bash
npm install
npm run dev      # http://localhost:5173 (la fotocamera funziona su localhost)
npm run build    # crea dist/index.html + dist/sw.js
```

## Come contribuire
Le regole complete sono in [`CLAUDE.md`](CLAUDE.md), che Claude Code legge da solo quando apre il progetto.
In breve:
1. **Mai push su `main` o `develop`**: crea un branch da `develop`, fai le modifiche e apri una pull
   request verso `develop`. Il merge lo fa chi mantiene il repository, dopo averla rivista.
   Il lavoro è diviso in user story e task su GitHub Issues (dettagli nel *Git flow* di
   [`CLAUDE.md`](CLAUDE.md#git-flow)):
   - `userstory/<n>-descrizione` per una user story, `task/<n>-descrizione` per un task;
   - `release/x.y.z` da `develop` per pubblicare: PR verso `main`, tag `vx.y.z`, poi back merge in `develop`;
   - `hotfix/x.y.z` da `main` solo per errori urgenti sul sito, poi back merge in `develop`.
2. **iPad con Safari è il dispositivo principale**: ogni modifica deve funzionare su iPad e su telefono.
3. **Niente segreti nel codice** (password, chiavi, token): il repository è pubblico.
   Prima di usare un servizio esterno, parlane nella PR o con chi mantiene il progetto.
4. **L'app deve restare offline**: niente librerie o font caricati da internet, e i dati e backup
   esistenti devono continuare a funzionare.
5. **Prima di aprire la PR** esegui `npm run build` senza errori e prova l'app nel browser.
   Nella descrizione scrivi come l'hai provata e cosa resta da provare su un dispositivo vero.
6. Testi dell'app, commenti e commit in italiano.

## Pubblicazione
La fotocamera funziona solo su **https://**. Basta pubblicare la cartella `dist/` su un hosting
statico (GitHub Pages, Netlify Drop, ecc.). Al primo caricamento il service worker salva l'app,
così si riapre anche senza rete.

Ogni push su `main` (cioè ogni release o hotfix) ripubblica l'app su GitHub Pages tramite `.github/workflows/deploy.yml`
(Settings → Pages → Source: **GitHub Actions**).
