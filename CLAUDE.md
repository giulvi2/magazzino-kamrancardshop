# Istruzioni per Claude

Questo file viene letto in automatico da Claude Code quando apre il repository.
Contiene le regole di lavoro del progetto: valgono per Claude e per chiunque contribuisca
(vedi anche la sezione *Come contribuire* del [README](README.md)).

## Il progetto
- **Magazzino Collezionismo**: app Vue 3 (Vite) per magazzino e cassa di un banco ai mercatini
  del collezionismo (fumetti, manga, carte, action figure…), con scanner di codici a barre e QR.
- Niente server: i dati stanno nel `localStorage` del browser. Funziona offline grazie al service
  worker (`public/sw.js`) e alla build in un unico file (`vite-plugin-singlefile`).
- Più telefoni allo stesso banco si allineano con backup JSON e *Unisci vendite da altro telefono*.
- Ogni push su `main` pubblica l'app su GitHub Pages (`.github/workflows/deploy.yml`): per questo
  su `main` si arriva solo con una release o un hotfix.

## Regole di lavoro
- **Lingua**: rispondi, scrivi commenti nel codice, testi dell'app e messaggi di commit in italiano.
- **Branch e PR**: ogni modifica va su un branch con una pull request da rivedere, seguendo il
  [git flow](#git-flow) qui sotto. Mai push diretti su `main` o `develop`: il merge lo fa chi
  mantiene il repository.
- **Niente lavori di propria iniziativa**: prima di iniziare qualcosa di nuovo, descrivi cosa vuoi
  fare e aspetta l'ok.
- **Niente segreti nel codice**: non inserire password, chiavi API o token nei file del repository
  (il repository è pubblico). Non creare account e chiedi prima di usare qualsiasi servizio esterno.
- **Dispositivo principale: iPad con Safari.** Ogni modifica deve funzionare su iPad (verticale e
  orizzontale) e su telefono. Attenzione alle particolarità di Safari iOS (fotocamera solo su https,
  `localStorage`, stampa, aggiunta alla schermata Home).
- **Offline prima di tutto**: non aggiungere dipendenze che richiedono internet per funzionare
  (CDN, font o librerie caricate da remoto). Le librerie vanno installate con npm e finiscono nella build.
- **Dati degli utenti**: i dati salvati vivono nel `localStorage` dei telefoni. Se cambi la struttura
  dei dati in `src/store.js`, mantieni compatibili i dati e i backup JSON già esistenti.
- **Service worker**: se modifichi `public/sw.js`, cambia il nome della cache (`CACHE`) così i
  telefoni scaricano la versione nuova.
- **Mantieni semplice**: estendi l'app esistente invece di riscriverla; preferisci poche dipendenze.

## Git flow
- **`main`** è la versione pubblicata: ogni merge su `main` ripubblica il sito. Ci si arriva solo
  da un branch `release/…` o `hotfix/…`.
- **`develop`** è il branch di integrazione: tutto il lavoro nuovo parte da qui e torna qui.
- **User story e task** stanno su GitHub Issues, con le etichette `user story`, `task` e `bug`.
  Ogni task è una sotto-issue della sua user story. Ogni release ha una milestone (es. `v1.1.0`).

| Branch | Parte da | PR verso | Quando |
|---|---|---|---|
| `feature/US-<n>-descrizione` | `develop` | `develop` | una user story (issue n. `<n>`) |
| `task/<n>-descrizione` | `develop` | `develop` | un task piccolo o un bug non urgente |
| `release/x.y.z` | `develop` | `main`, poi back merge in `develop` | per pubblicare una versione |
| `hotfix/x.y.z` | `main` | `main`, poi back merge in `develop` | errore urgente sul sito pubblicato |

- I branch di Claude Code si chiamano `claude/…`: in quel caso il titolo della PR inizia con il
  numero della user story (es. `US-12: …`) e la descrizione contiene `Closes #12`.
- **Release**: crea `release/x.y.z` da `develop`, aggiorna `version` in `package.json` e fai solo
  prove e correzioni. Poi PR verso `main`; dopo il merge metti il tag `vx.y.z` con una GitHub
  Release e apri la PR di back merge `release/x.y.z` → `develop`.
- **Versioni** (semver `MAGGIORE.MINORE.CORREZIONE`): MAGGIORE se i dati o i backup salvati non
  restano compatibili, MINORE per funzioni nuove, CORREZIONE per correzioni.
- Non pubblicare release a ridosso di un mercatino: il giorno prima solo hotfix indispensabili.

## Come provare le modifiche
```bash
npm install
npm run dev      # http://localhost:5173, anche dagli altri dispositivi della stessa rete
npm run build    # deve terminare senza errori: crea dist/index.html + dist/sw.js
```
- Prova nel browser con le dimensioni di iPad (es. 1024×768 e 768×1024) e di un telefono.
- Prima di dire che qualcosa funziona, spiega **come è stato provato** (build, browser, emulazione…)
  e **cosa resta da provare su un dispositivo vero** (iPad o telefono: fotocamera, scanner, stampa).
- Dopo il merge su `main`, la testata dell'app mostra la versione (data e ora della build): serve per
  controllare che il dispositivo stia usando quella nuova.

## Pull request
- Titolo e descrizione in italiano: cosa cambia, come è stato provato, cosa resta da provare.
- Una PR per argomento, piccola e facile da rivedere.
