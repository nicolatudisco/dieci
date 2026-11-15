# Dieci — un viaggio in potenze di 10

Regalo per il 10° compleanno di una bambina che vive a **Rifredi, Firenze**. È un sito web interattivo: si parte da lei, sdraiata su un prato a guardare le stelle, e moltiplicando la scala per 10 a ogni passo si arriva fino al bordo dell'universo osservabile. Poi oltre, dove restano solo i numeri, e infine a un messaggio personale scritto da Nicola.

Obiettivi, in ordine: **stupirla** (impatto visivo altissimo), **ispirarla** (accendere la curiosità per spazio, robotica e scienza), **farla sentire parte della storia** (si parte dal suo quartiere, la "bolla" ha la sua età). Non è una lezione: è meraviglia, ma tutto quello che dice è vero.

## Cosa c'è già nel repo

- **Starter** Vite + TypeScript + three.js con una pagina segnaposto (`src/main.ts`): va sostituita a partire da M1.
- **Contenuti definitivi e verificati** in `src/content/`:
  - `levels.ts`: le 25 tappe, in ordine, con testi, approfondimenti, «Come lo sappiamo?», brief visivo (`visual`) e fonti.
  - `ui.ts`: tutti i testi dell'interfaccia, l'apertura, i testi dei contatori speciali.
  - `golden-record.ts`: il mini-laboratorio «Crea il tuo Disco d'oro».
  - `finale.ts`: il finale. **Lo scrive Nicola**, non tu.
  - `data.ts`: costanti numeriche (Voyager, stelle vicine con coordinate, velocità della luce) con fonti.
  - `types.ts`: i tipi.
- **Deploy** su GitHub Pages: `.github/workflows/deploy.yml` (a ogni push su `main`).
- **Screenshot automatici**: `npm run shots` (`scripts/screenshot.mjs`), vedi «Verifica».
- **Skill di progetto** in `.claude/skills/`: `/tappa`, `/verifica-visiva`, `/fact-check`.
- **Fonti di immagini e dati** con licenze: `docs/ASSETS.md`.

## Pubblico, lingua e tono

- Lei ha 10 anni. Tutti i testi visibili sono **in italiano**. Codice, nomi di file e commenti in inglese.
- I testi in `src/content/` sono **definitivi**: non riscriverli senza chiedere a Nicola. Le correzioni di refusi vanno bene. Se un fatto ti sembra sbagliato, segnalalo e proponi la correzione.
- Se devi scrivere testo nuovo (etichette, microcopy): stesso tono. Frasi brevi, dai del «tu», meraviglia concreta, mai condiscendente, nessun termine non spiegato. Numeri in formato italiano (1.000; 8,6).

## L'esperienza

### Struttura

1. **Apertura** (`UI.intro`): schermo nero, una sola stella. Le righe compaiono una alla volta, poi il pulsante «Inizia il viaggio». Se il link contiene `#nome=`, prima compare il saluto.
2. **Atto I, il viaggio** (`kind: 'space'`): da 10⁰ m (il prato a Rifredi) a 10^26,94 m (l'universo osservabile).
3. **Atto II, oltre** (`kind: 'number'`): il contatore smette di misurare metri e conta numeri: 10³⁰, 10⁸⁰, googol, googolplex.
4. **Finale** (`finale.ts`): le frasi-ponte una alla volta, poi il messaggio di Nicola. È **la scena più bella del sito**.
5. **Epilogo**: «Rifai il viaggio», «Crea il tuo Disco d'oro», «È tutto vero? Guarda le fonti» (pagina generata da tutti i campi `sources` più `CREDITS.md`).

### Navigazione

- Lo zoom è **continuo**: tra una tappa e l'altra la scena scorre senza stacchi. Arrivati a una tappa il movimento si posa con un aggancio morbido e compare il pannello della didascalia.
- Comandi: pulsanti **◀ ▶ sempre visibili**, grandi, raggiungibili col pollice (▶ = tappa successiva con zoom animato di 1,5–3 s); rotella e trackpad; pinch; swipe verticale; frecce e spazio da tastiera. Inerzia morbida. Il viaggio deve funzionare anche solo premendo ▶.
- Si può tornare indietro in qualsiasi momento.

### Il contatore (elemento protagonista)

- Sempre visibile. Etichetta `UI.counter.spaceLabel`, poi **10ⁿ** con n intero ed esponente in apice, poi la larghezza in unità amichevoli con 2 cifre significative: m, km, milioni di km, miliardi di km, anni-luce, milioni e miliardi di anni-luce (es. «1.600 km», «9,5 miliardi di km»). Sotto, la `counterLine` della tappa più vicina.
- Nell'Atto II l'etichetta diventa `UI.counter.numberLabel` e mostra 10ⁿ; per il googolplex usa `exponentLabel`.
- I numeri sono belli e grandi: il contatore è un elemento di design, non una nota a piè di pagina.

### Il pannello della didascalia

- Titolo e `text` sempre visibili alla tappa. Sotto, due pulsanti che espandono: «Tocca per saperne di più» (`more`) e «Come lo sappiamo?» (`howWeKnow`), solo se il campo esiste.
- Telefono: pannello in basso, richiudibile. Tablet e desktop: scheda laterale. Non copre mai il punto «Tu sei qui».

### «Tu sei qui»

Un piccolo punto caldo (oro/ambra) che segna dove si trova lei a ogni scala: sul prato, nel quartiere, sulla Terra, poi il Sole, poi la posizione del Sole nella galassia, e così via. È il filo che tiene insieme tutto il viaggio. Quando la scena non rende ovvio dov'è, il punto ha l'etichetta «Tu sei qui».

### Tappe speciali

- **Voyager** (`special: 'voyager'`): pannello «vivo» con la distanza stimata in tempo reale (`VOYAGER_1` in `data.ts`, testi in `UI.voyager`) e quanti km ha percorso da quando la pagina è aperta. Mostra `milestoneBefore` o `milestoneAfter` in base alla data attuale rispetto a `VOYAGER_1.lightDayDateUTC`. Pulsante che apre il Disco d'oro.
- **La bolla dei 10 anni** (`special: 'bubble'`): è il momento emotivo, va curato più di tutto il resto. Sfera di luce calda attorno al Sole; le stelle di `NEARBY_STARS` sono posizionate in 3D da RA, Dec e distanza e si accendono quando la sfera le raggiunge. Con `#nata=AAAA-MM-GG` nel link il raggio è calcolato esattamente e compare `UI.bubble.exactRadius`; senza, il raggio è 10 anni-luce.
- **Oltre** (Atto II): l'universo si rimpicciolisce a un punto, la parola «metri» scivola via dal contatore con un glitch giocoso, restano solo le cifre.
- **Finale**: se `FINALE_IS_PLACEHOLDER` è vero, mostra in modo evidente «TODO: messaggio di Nicola» e stampa un avviso in console. **Non inventare il messaggio.**

### Disco d'oro (`golden-record.ts`)

Si apre dalla tappa Voyager e dall'epilogo; chiudendolo si torna esattamente al punto del viaggio. Lei sceglie un'immagine (disegnata da noi in SVG o canvas, mai foto), un suono (sintetizzato con Web Audio: battito, pioggia, mare, uccelli, la melodia di «Tanti auguri», «CIAO» in Morse) e scrive un messaggio di massimo 140 caratteri. Il sito genera un disco dorato animato (solchi, incisione `engraving`, l'immagine al centro) che può salvare come PNG. Tutto resta nel browser.

### Personalizzazione via link

Solo nel frammento dopo `#`, che non viene inviato al server e non finisce nel repo: `#nome=Nome` e `#nata=AAAA-MM-GG` (combinabili con `&`). Si leggono a runtime e non si salvano da nessuna parte. Senza parametri tutto funziona: il saluto viene saltato e `{nome}` sparisce dai testi.

## Direzione visiva

- **Atmosfera**: notte profonda, calma, meraviglia. Un planetario incrociato con un libro illustrato. Niente stile da cartone animato, niente infografica.
- **Colore**: neri e blu profondissimi; l'accento caldo (oro/ambra) solo per «Tu sei qui», la bolla e il finale; accenti freddi e discreti per l'interfaccia. Ogni scala ha la sua identità, ma le transizioni portano continuità di luce e colore.
- **Tipografia**: un carattere molto leggibile per i testi (almeno 18 px su telefono) e uno da titoli con personalità per titoli e contatore. Font self-hosted con `@fontsource`, mai da CDN.
- **Movimento**: tutto con easing morbido, nessun taglio brusco. Con `prefers-reduced-motion` usa dissolvenze al posto degli zoom veloci e niente lampeggi.
- **Onestà della scala**: quando qualcosa non è in scala (pianeti ingranditi per vederli), dillo con discrezione («dimensioni non in scala»).
- Se è installato il plugin `frontend-design`, seguine le indicazioni per tipografia e interfaccia.

## Tecnica

- **Stack**: Vite + TypeScript (`strict`) + three.js. Sito statico, nessun backend.
- **Nessuna chiamata di rete a runtime**: niente analytics, cookie, CDN, font esterni. Tutti gli asset nel bundle o in `public/`. `localStorage` solo per piccole preferenze (audio acceso/spento).

### Motore di zoom (M1, la parte difficile)

- Lo stato è un esponente `e` in virgola mobile. Atto I: `e` da 0 a 26,94. L'Atto II si aggancia dopo, sulle tappe `number`.
- **Mai un'unica scena in metri**: su più di 30 ordini di grandezza la precisione dei float non regge. Ogni livello ha unità proprie e un intervallo di visibilità `[eMin, eMax]`; la camera è derivata da `e`; i livelli adiacenti si sovrappongono e sfumano, con dimensioni e posizioni allineate nel passaggio. Origine flottante; depth buffer logaritmico se serve.
- I livelli si inizializzano e si liberano in modo pigro, così la memoria resta limitata. Qualità adattiva (pixel ratio, numero di particelle) in base agli fps misurati.
- L'input viene normalizzato (rotella e trackpad, pinch, swipe, tasti, pulsanti) in variazioni di `e`, con inerzia e aggancio alle tappe.
- **Proponi l'architettura prima di implementarla**, con almeno un'alternativa e i pro e contro. Struttura suggerita: `src/engine/` (stato della scala, input, camera, gestore dei livelli), `src/levels/` (un modulo per scena o per gruppo), `src/ui/` (contatore, pannello, comandi, apertura, finale, pagina fonti), `src/audio/`, `src/golden-record/`.

### Contratto URL (serve per test e screenshot, va rispettato sempre)

| Parametro | Effetto |
|---|---|
| `?s=<e>` | parte da quell'esponente (es. `?s=13.7`) |
| `?stop=<id>` | parte da quella tappa (es. `?stop=bolla`) |
| `?static=1` | congela animazioni ed effetti legati al tempo, salta l'apertura; il contatore di Voyager usa la data fissa `VOYAGER_1.lightDayDateUTC` |
| `?debug=1` | sovrimpressione con fps, `e`, livelli attivi, draw call |

Quando il primo fotogramma allo stato richiesto è stato disegnato, imposta `document.documentElement.dataset.ready = '1'`. Lo script degli screenshot aspetta questo segnale.

### Dati geografici (M2)

- Script da eseguire una volta in locale, in `scripts/geodata/`: scaricano da OpenStreetMap (Overpass API) strade, ferrovie, fiumi e l'impronta del Duomo per Rifredi e Firenze; per Toscana e Italia usano Natural Earth (pubblico dominio) o i confini ISTAT (CC BY). Semplificano, quantizzano e scrivono JSON compatti in `public/data/`, che si committano.
- Mai scaricare dati a runtime. Attribuzione «© OpenStreetMap contributors» in `CREDITS.md` e nella pagina fonti.
- **Mai segnare luoghi privati** (case, scuole, indirizzi). Solo i luoghi pubblici citati in `levels.ts`.

### Immagini, modelli, audio

- Texture e modelli solo dalle fonti di `docs/ASSETS.md`, con licenza verificata e riportata in `CREDITS.md`. Comprimi (webp, o ktx2 se serve) e carica per livello: obiettivo meno di 25 MB in tutto, scaricati gradualmente.
- Audio: sottofondo sintetizzato con Web Audio, spento all'inizio, con interruttore. Mai autoplay.

### Responsive e accessibilità

- Telefono in verticale, tablet in entrambi gli orientamenti, desktop. Touch prima di tutto. Rispetta le safe area.
- Pulsanti di almeno 48 px, `aria-label` da `UI`, navigazione completa da tastiera, contrasto adeguato.
- Prestazioni: 60 fps su portatile o tablet di fascia media, almeno 30 fps su un telefono di fascia media.

### Deploy

GitHub Pages tramite `.github/workflows/deploy.yml` a ogni push su `main`. `base: './'` in `vite.config.ts`, così funziona con qualunque nome di repo.

## Verifica

Prima di dire che qualcosa è finito:

1. `npm run typecheck` e `npm run build` senza errori.
2. `npm run shots -- --from 0 --to 27 --step 1` (o `--stops id1,id2`): screenshot su desktop, tablet e telefono in `screenshots/`, con un foglio riassuntivo per viewport e `report.json` con gli errori di console. **Guarda davvero le immagini** (leggi i PNG) prima di dichiarare una scena pronta. La skill `/verifica-visiva` descrive la procedura.
3. Nessun errore in console.
4. A fine milestone, chiedi a Nicola di provare su un dispositivo vero e digli cosa guardare.

Se la grafica 3D negli screenshot è nera, prova `--gpu` (usa la GPU invece di SwiftShader) o controlla gli errori in `report.json`.

## Privacy (il repo è pubblico)

- Rifredi e Firenze vanno bene come luoghi. Mai: cognome, foto, data di nascita, indirizzo o via, scuola, né altro che identifichi la bambina o Nicola. Nome e data di nascita solo nel link, dopo il `#`.
- `finale.ts` è pubblico: Nicola lo sa.
- Nessun tracciamento, nessuna analytics.

## Accuratezza scientifica

- Testi e dati sono verificati; i segni `TODO fact-check` vanno risolti in M8 con `/fact-check`.
- Ogni fatto nuovo che aggiungi (etichette, numeri nelle scene) deve essere corretto. Nel dubbio arrotonda e scrivi «circa», oppure chiedi.
- Le semplificazioni per una bambina vanno bene, gli errori no.

## Come lavorare

- Una milestone alla volta. Comincia in modalità piano, proponi, aspetta l'approvazione.
- Alla fine di ogni milestone: typecheck, build, screenshot guardati, **commit** con un messaggio chiaro (in inglese, all'imperativo). Poi di' a Nicola cosa provare. **Non fare push senza chiedere**: il push pubblica il sito.
- Chiedi prima di aggiungere dipendenze oltre a three.js e piccole librerie mirate (es. `@fontsource/*`, una libreria di semplificazione per i dati geografici). Mai framework pesanti.
- Se una scelta di design è incerta, proponi 2 opzioni con screenshot.
- Se una decisione di architettura cambia questo file, aggiorna la sezione «Decisioni» in fondo.

## Milestone

- **M0, fatto**: starter, contenuti, deploy, script degli screenshot, skill.
- **M1, motore di zoom end-to-end**: segnaposto per ogni tappa (forma, etichetta, esponente), input completo, contatore, pannello con «saperne di più» e «Come lo sappiamo?», contratto URL, overlay di debug, apertura essenziale. Si considera fatta quando si va fluidamente da 10⁰ fino al finale segnaposto, con screenshot su tutta la scala nei 3 viewport.
- **M2, le tappe terrestri**: `prato`, `giardino`, `rifredi`, `quartiere`, `firenze`, `toscana`, `italia`, più gli script dei dati geografici.
- **M3, Terra e Sistema Solare**: `terra`, `luna`, `sole`, `giove`, `pianeti-lontani`.
- **M4, i momenti speciali**: `voyager` (con il pannello vivo), `oort`, `bolla`.
- **M5, galassie e universo**: `nebulose`, `via-lattea`, `andromeda`, `laniakea`, `rete-cosmica`, `universo`.
- **M6, oltre e finale**: `oltre`, `atomi`, `googol`, `googolplex`, il finale (col segnaposto), l'epilogo, la pagina delle fonti.
- **M7, Disco d'oro**: da saltare se il tempo non basta.
- **M8, rifinitura**: apertura, audio, telefono, prestazioni, accessibilità, `/fact-check`, `CREDITS.md`, `README.md`, screenshot finali completi.

## «Finito» significa

Una bambina di 10 anni apre il link su un tablet, capisce da sola cosa fare, arriva fino in fondo senza intoppi, e alla fine vuole rifarlo o chiede «ma è vero?». E la risposta è sì.

## Decisioni

_(Annota qui le decisioni di architettura man mano che le prendi.)_
