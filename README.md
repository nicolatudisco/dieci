# Dieci

Un viaggio in potenze di 10: da una strada di Rifredi, a Firenze, fino al bordo dell'universo osservabile. E poi oltre, dove restano solo i numeri, fino a un messaggio finale.

È un regalo per un decimo compleanno. Ogni passo moltiplica per 10 quello che si vede: una strada, un quartiere, la città, la Toscana, l'Italia, la Terra, la Luna, il Sole, Voyager 1, la bolla della luce partita il giorno in cui è nata, le galassie, la rete cosmica. Ogni numero è vero ed è stato controllato. Le fonti sono nel sito stesso, nella pagina «È tutto vero».

## Il link personale

Il sito si personalizza con il frammento dopo `#`, che il browser non manda al server:

```
https://…/#nome=Nome&nata=AAAA-MM-GG
```

- `nome` aggiunge il saluto nell'apertura ed entra nell'incisione del Disco d'oro.
- `nata` fa crescere la bolla della sua luce fino all'età esatta, e tiene veri i testi che dipendono dalla data.

Senza parametri tutto funziona lo stesso. Nome e data restano in memoria finché la pagina è aperta e non si salvano da nessuna parte.

## Provarlo in locale

Serve Node.js (versione LTS).

```bash
npm install
npm run dev              # sul computer
npm run dev -- --host    # anche dal tablet, nella stessa rete
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | controllo dei tipi e sito pronto in `dist/` |
| `npm run typecheck` | solo il controllo dei tipi (TypeScript in modalità `strict`) |
| `npm test` | i test, con `node --test`, senza dipendenze |
| `npm run shots` | screenshot di tutto il viaggio su desktop, tablet e telefono, in `screenshots/` (`-- --stops luna,bolla`, `-- --from 0 --to 27 --step 1`, `-- --viewports phone`) |
| `npm run smoke` | tutto il viaggio in un browser vero premendo solo ▶, poi le pagine sopra, la tastiera, la rotella, il laboratorio del Disco d'oro e il suono (`-- --reduced-motion` per farlo col movimento ridotto) |
| `npm run perf` | quanto è fluido, su un telefono e un tablet simulati con il processore rallentato |
| `npm run a11y` | controllo di accessibilità di ogni vista |

## Il contratto URL

Per i test e gli screenshot (sempre rispettato):

| Parametro | Effetto |
|---|---|
| `?stop=<id>` | parte da una tappa (`?stop=bolla`) o da una vista: `apertura`, `finale`, `epilogo`, `fonti`, `disco` |
| `?u=<pos>` | parte da una posizione del viaggio, anche nell'Atto II (`?u=28`) |
| `?s=<e>` | parte da un esponente dell'Atto I, da 0 a 26,94 (`?s=13.7`) |
| `?static=1` | ferma il tempo e mostra tutto nello stato finale |
| `?finale=<secondi>` | con `?static=1`, ferma il finale a quel secondo |
| `?disco=laboratorio` · `?disco=fatto` | con `?stop=disco`, apre il laboratorio del Disco d'oro, vuoto o con un disco già fatto |
| `?debug=1` | fps, posizione, livelli attivi, chiamate di disegno |

## Com'è fatto

Vite, TypeScript e three.js. È un sito statico: nessun dato raccolto, nessun cookie, nessuna chiamata di rete mentre si usa. Font, immagini e dati sono tutti nel sito.

- `src/content/`: tutti i testi (le tappe, l'interfaccia, il Disco d'oro, il finale) e i dati con le loro fonti.
- `src/engine/`: il motore di zoom. Lo stato è un solo numero, la posizione nel viaggio. Ogni scena ha le sue unità e la sua camera, perché più di trenta ordini di grandezza non stanno in una scena sola.
- `src/levels/`: le scene, una o più per tappa.
- `src/ui/`: contatore, didascalie, lenti, apertura, finale, epilogo, pagine sopra.
- `src/golden-record/`: il Disco d'oro (disegni, suoni sintetizzati, il disco e il PNG).
- `src/audio/`: il suono del viaggio, sintetizzato nel browser, spento all'inizio.
- `scripts/`: preparazione dei dati (eseguita una volta), screenshot e controlli.
- `public/data/`, `public/textures/`, `public/images/`: dati geografici, texture e l'unica foto, con le licenze in `CREDITS.md`.
- `tests/`: i test.

I dati geografici sono in metri, relativi a un punto di partenza che non è nel repository.

## Pubblicazione

GitHub Pages, a ogni push su `main` (`.github/workflows/deploy.yml`). La pagina ha `noindex`.

## Crediti

Immagini, dati, font e software, con le licenze: [CREDITS.md](CREDITS.md). Le fonti di ogni fatto sono nella pagina «È tutto vero» del sito.

Costruito con [Claude Code](https://claude.com/claude-code).
