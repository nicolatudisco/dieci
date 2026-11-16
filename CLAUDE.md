# Dieci — un viaggio in potenze di 10

Regalo per il 10° compleanno di una bambina che vive a **Rifredi, Firenze**. È un sito web interattivo: si parte da lei, seduta sulla soglia di un grande portone in una strada di Rifredi, col naso all'insù a guardare le stelle, e moltiplicando la scala per 10 a ogni passo si arriva fino al bordo dell'universo osservabile. Poi oltre, dove restano solo i numeri, e infine a un messaggio personale scritto da Nicola.

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

1. **Apertura** (`UI.intro`): schermo nero, una sola stella. Le righe compaiono una alla volta, poi il pulsante «Inizia il viaggio». Se il link contiene `#nome=`, prima compare il saluto. La prima riga dipende dalla data (vedi «Personalizzazione via link»).
2. **Atto I, il viaggio** (`kind: 'space'`): da 10⁰ m (una strada di Rifredi) a 10^26,94 m (l'universo osservabile).
3. **Atto II, oltre** (`kind: 'number'`): il contatore smette di misurare metri e conta numeri: 10³⁰, 10⁸⁰, googol, googolplex.
4. **Finale** (`finale.ts`): le frasi-ponte una alla volta, poi il messaggio di Nicola. È **la scena più bella del sito**.
5. **Epilogo**: «Rifai il viaggio», «Crea il tuo Disco d'oro», «È tutto vero? Guarda le fonti» (pagina generata da tutti i campi `sources` più `CREDITS.md`).

### Navigazione

- Lo zoom è **continuo**: tra una tappa e l'altra la scena scorre senza stacchi. Arrivati a una tappa il movimento si posa con un aggancio morbido e compare il pannello della didascalia.
- Comandi: pulsanti **◀ ▶ sempre visibili**, grandi, raggiungibili col pollice (▶ = tappa successiva con zoom animato di 1,5–3 s); rotella e trackpad; pinch; swipe verticale; frecce e spazio da tastiera. Inerzia morbida. Il viaggio deve funzionare anche solo premendo ▶.
- ▶ porta sempre alla tappa successiva, anche quando dista più di una potenza di 10: durante lo zoom il contatore **scatta in modo visibile a ogni potenza di 10 attraversata**, così «×10 a ogni passo» resta vero.
- Si può tornare indietro in qualsiasi momento.

### Il contatore (elemento protagonista)

- Sempre visibile. Etichetta `UI.counter.spaceLabel`, poi **10ⁿ** con n = esponente arrotondato all'intero più vicino, in apice (l'universo osservabile mostra 10²⁷), poi la larghezza precisa in unità amichevoli con 2 cifre significative: m, km, milioni di km, miliardi di km, anni-luce, milioni e miliardi di anni-luce (es. «1.600 km», «9,5 miliardi di km»). Sotto, la `counterLine` della tappa più vicina.
- Nell'Atto II l'etichetta diventa `UI.counter.numberLabel` e mostra 10ⁿ; per il googolplex usa `exponentLabel`.
- I numeri sono belli e grandi: il contatore è un elemento di design, non una nota a piè di pagina.

### Il pannello della didascalia

- Titolo e `text` sempre visibili alla tappa. Sotto, due pulsanti che espandono: «Tocca per saperne di più» (`more`) e «Come lo sappiamo?» (`howWeKnow`), solo se il campo esiste.
- Telefono: pannello in basso, richiudibile. Tablet e desktop: scheda laterale. Non copre mai il punto «Tu sei qui».

### «Tu sei qui»

Un piccolo punto caldo (oro/ambra) che segna dove si trova lei a ogni scala: sulla soglia, nella strada, nel quartiere, sulla Terra, poi il Sole, poi la posizione del Sole nella galassia, e così via. È il filo che tiene insieme tutto il viaggio. Quando la scena non rende ovvio dov'è, il punto ha l'etichetta «Tu sei qui».

### Inquadrature

- **«Largo»** = il lato corto dell'area libera dal pannello della didascalia. La scena si inquadra dentro quell'area, in ogni viewport.
- La camera ha, oltre allo zoom, una **traccia del centro** che dipende dalla posizione nel viaggio: il centro non è sempre su «Tu sei qui» (alla Via Lattea è il nucleo galattico).
- Il soggetto di ogni tappa deve stare **intero** nell'inquadratura. `partenza`: lei tutta dentro il metro. `voyager` e `nebulose`: inquadratura decentrata, perché con il Sole al centro Voyager (25,9 miliardi di km) e la Nebulosa di Orione (circa 1.344 anni-luce) cadrebbero sul bordo; gli esponenti restano quelli di `levels.ts`.
- **La lente**: una sola convenzione per tutto ciò che in scala sarebbe invisibile (Luna, Giove e le sue lune, Saturno, le sonde). Un cerchio dal bordo sottile, collegato da un filo alla posizione vera dell'oggetto, che lo mostra ingrandito con la scritta «ingrandito, non in scala». È un componente condiviso: mai oggetti ingranditi direttamente nella scena.

### Tappe speciali

- **Voyager** (`special: 'voyager'`): pannello «vivo» con la distanza stimata in tempo reale (`VOYAGER_1` in `data.ts`, testi in `UI.voyager`) e quanti km ha percorso da quando la pagina è aperta. Mostra `milestoneBefore` o `milestoneAfter` in base alla data attuale rispetto a `VOYAGER_1.lightDayDateUTC`. Pulsante che apre il Disco d'oro. La distanza dalla Terra si legge da una **tabella precalcolata con JPL Horizons**, salvata in `data.ts` e interpolata: la stima lineare a 17 km/s ignora l'orbita della Terra (la distanza oscilla durante l'anno e per alcuni mesi diminuisce) e vale solo come ripiego finché la tabella non c'è.
- **La bolla dei 10 anni** (`special: 'bubble'`): è il momento emotivo, va curato più di tutto il resto. Sfera di luce calda attorno al Sole; le stelle di `NEARBY_STARS` sono posizionate in 3D da RA, Dec e distanza e si accendono quando la sfera le raggiunge. Con `#nata=AAAA-MM-GG` nel link il raggio è calcolato esattamente e compare `UI.bubble.exactRadius`; senza, il raggio è 10 anni-luce. La bolla è **viva**: raggio, stelle accese e testi derivano dalla stessa data, quindi testo e scena non si contraddicono mai (quando la luce raggiunge Epsilon Eridani, anche il testo lo dice). Le varianti dei testi di `bolla` si propongono a Nicola in M4.
- **Oltre** (Atto II): l'universo si rimpicciolisce a un punto, la parola «metri» scivola via dal contatore con un glitch giocoso, restano solo le cifre.
- **Finale**: se `FINALE_IS_PLACEHOLDER` è vero, mostra in modo evidente «TODO: messaggio di Nicola» e stampa un avviso in console. **Non inventare il messaggio.**

### Disco d'oro (`golden-record.ts`)

Si apre dalla tappa Voyager e dall'epilogo; chiudendolo si torna esattamente al punto del viaggio. Ha due parti: il **racconto** (`GOLDEN_RECORD.intro`, da fare con la tappa Voyager) e il **laboratorio** (tutto il resto, saltabile). Nel laboratorio lei sceglie un'immagine (disegnata da noi in SVG o canvas, mai foto), un suono (sintetizzato con Web Audio: battito, pioggia, mare, uccelli, la melodia di «Tanti auguri», «CIAO» in Morse) e scrive un messaggio di massimo 140 caratteri. Il sito genera un disco dorato animato (solchi, incisione `engraving`, l'immagine al centro) che può salvare come PNG. Tutto resta nel browser.

### Personalizzazione via link

Solo nel frammento dopo `#`, che non viene inviato al server e non finisce nel repo: `#nome=Nome` e `#nata=AAAA-MM-GG` (combinabili con `&`). Si leggono a runtime e non si salvano da nessuna parte. Senza parametri tutto funziona: il saluto viene saltato e `{nome}` sparisce dai testi.

**Testi legati alla data**: ogni testo che dipende dall'età o dal giorno si calcola dalla stessa data che muove la scena, e non deve mai risultare falso. La prima riga dell'apertura usa `UI.intro.firstLine`: `birthday` solo nel giorno del 10° compleanno, `before` o `after` negli altri giorni, `unknown` senza `#nata=`.

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

- Lo stato è la **posizione nel viaggio** (dall'apertura all'epilogo, passando per tutte le tappe); l'esponente `e` è derivato da quella. Nell'Atto I `e` va da 0 a 26,94 in modo continuo. Nell'Atto II gli esponenti (30, 80, 100, googolplex) non si interpolano: si anima la posizione, non `e`.
- **Mai un'unica scena in metri**: su più di 30 ordini di grandezza la precisione dei float non regge. Ogni livello ha unità proprie e un intervallo di visibilità `[eMin, eMax]`; la camera è derivata da `e`; i livelli adiacenti si sovrappongono e sfumano, con dimensioni e posizioni allineate nel passaggio. Origine flottante; depth buffer logaritmico se serve.
- I livelli si inizializzano e si liberano in modo pigro, così la memoria resta limitata. Qualità adattiva (pixel ratio, numero di particelle) in base agli fps misurati.
- L'input viene normalizzato (rotella e trackpad, pinch, swipe, tasti, pulsanti) in variazioni della posizione nel viaggio, con inerzia e aggancio alle tappe.
- **Proponi l'architettura prima di implementarla**, con almeno un'alternativa e i pro e contro. Struttura suggerita: `src/engine/` (stato della scala, input, camera, gestore dei livelli), `src/levels/` (un modulo per scena o per gruppo), `src/ui/` (contatore, pannello, comandi, apertura, finale, pagina fonti), `src/audio/`, `src/golden-record/`.

### Contratto URL (serve per test e screenshot, va rispettato sempre)

| Parametro | Effetto |
|---|---|
| `?s=<e>` | parte da quell'esponente, solo nell'Atto I, da 0 a 26,94 (es. `?s=13.7`) |
| `?stop=<id>` | parte da quella tappa (es. `?stop=bolla`) oppure da una vista che non è una tappa: `apertura`, `finale`, `epilogo`, `fonti`, `disco` |
| `?u=<pos>` | parte da quella posizione del viaggio (vedi «Decisioni»): serve per le transizioni dell'Atto II, che `?s=` non raggiunge (es. `?u=28`) |
| `?static=1` | congela animazioni ed effetti legati al tempo e salta l'apertura (tranne con `?stop=apertura`); le viste a comparsa progressiva (apertura, finale) si mostrano nello stato finale, con tutte le righe visibili; il contatore di Voyager usa la data fissa `VOYAGER_1.lightDayDateUTC` |
| `?debug=1` | sovrimpressione con fps, `e`, livelli attivi, draw call |

Precedenza: `stop`, poi `u`, poi `s`. Quando il primo fotogramma allo stato richiesto è stato disegnato, imposta `document.documentElement.dataset.ready = '1'`. Lo script degli screenshot aspetta questo segnale. Oggi `--stops` accetta solo gli id di `levels.ts`: in M1 va esteso alle cinque viste che non sono tappe.

### Dati geografici (M2)

- Script da eseguire una volta in locale, in `scripts/geodata/`: scaricano da OpenStreetMap (Overpass API) strade, ferrovie, fiumi, edifici, aree verdi e l'impronta del Duomo per Rifredi e Firenze; per Toscana e Italia usano Natural Earth (pubblico dominio) o i confini ISTAT (CC BY). Semplificano, quantizzano e scrivono JSON compatti in `public/data/`, che si committano.
- Mai scaricare dati a runtime. Attribuzione «© OpenStreetMap contributors» in `CREDITS.md` e nella pagina fonti.
- **Mai segnare luoghi privati** (case, scuole, indirizzi). Solo i luoghi pubblici citati in `levels.ts`.
- **Punto di partenza**: un punto sul bordo di una strada pubblica di Rifredi, scelto da Nicola (chiedigli le coordinate all'inizio di M2). Nel repo compaiono solo le coordinate, nella configurazione degli script: mai il nome della via, mai un edificio evidenziato o un numero civico. `partenza` e `strada` sono scene generiche disegnate da noi, orientate come la strada reale così l'aggancio con `rifredi` non ha salti.
- **Luci notturne**: Black Marble (circa 500 m per pixel) basta per `italia` e `terra`. Dove non basta, a partire da `toscana`, le luci sono stilizzate a partire da dati vettoriali (strade e centri abitati).

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

1. `npm run typecheck`, `npm run build` e `npm test` senza errori (i test sono in `tests/`, girano con `node --test` senza dipendenze).
2. `npm run shots -- --from 0 --to 27 --step 1` (o `--stops id1,id2`): screenshot su desktop, tablet e telefono in `screenshots/`, con un foglio riassuntivo per viewport e `report.json` con gli errori di console. **Guarda davvero le immagini** (leggi i PNG) prima di dichiarare una scena pronta. La skill `/verifica-visiva` descrive la procedura.
3. Nessun errore in console.
4. A fine milestone, chiedi a Nicola di provare su un dispositivo vero e digli cosa guardare. Lei lo aprirà su tablet e PC; Nicola prova sul tablet con `npm run dev -- --host` in rete locale.

Se la grafica 3D negli screenshot è nera, prova `--gpu` (usa la GPU invece di SwiftShader) o controlla gli errori in `report.json`.

## Privacy (il repo è pubblico)

- Rifredi e Firenze vanno bene come luoghi. Mai: cognome, foto, data di nascita, indirizzo o via, scuola, né altro che identifichi la bambina o Nicola. Nome e data di nascita solo nel link, dopo il `#`.
- Mai nemmeno il giorno del compleanno (insieme a «10 anni» dà la data di nascita) né il nome della via del punto di partenza: né nei file né nei messaggi di commit.
- `finale.ts` è pubblico: Nicola lo sa.
- Nessun tracciamento, nessuna analytics.

## Accuratezza scientifica

- Testi e dati sono verificati; i segni `TODO fact-check` si risolvono con `/fact-check` in una sessione a parte subito dopo M1, con un ripasso finale in M8.
- Ogni fatto nuovo che aggiungi (etichette, numeri nelle scene) deve essere corretto. Nel dubbio arrotonda e scrivi «circa», oppure chiedi.
- Le semplificazioni per una bambina vanno bene, gli errori no.

## Come lavorare

- Una milestone alla volta. Comincia in modalità piano, proponi, aspetta l'approvazione.
- Ogni milestone si divide in passi, elencati nello stato qui sotto. Alla fine di **ogni passo**: typecheck, build e test puliti, **un commit**, e l'elenco dei passi aggiornato in questo file (✅ fatto, ⬜ da fare, più quello che serve sapere per ripartire). Se la sessione si interrompe, la successiva riparte dal primo passo senza ✅.
- Alla fine di ogni milestone: typecheck, build, screenshot guardati, **commit** con un messaggio chiaro (in inglese, all'imperativo). Poi di' a Nicola cosa provare. I push su `main` sono permessi: pubblicano il sito, ma la pagina ha `noindex` e il link non lo ha nessuno finché non lo manda Nicola.
- Chiedi prima di aggiungere dipendenze oltre a three.js e piccole librerie mirate (es. `@fontsource/*`, una libreria di semplificazione per i dati geografici). Mai framework pesanti.
- Se una scelta di design è incerta, proponi 2 opzioni con screenshot.
- Se una decisione di architettura cambia questo file, aggiorna la sezione «Decisioni» in fondo.

## Milestone

Il sito va fatto tutto: tutte le milestone. Si lavora però **fuori ordine e in sessioni diverse, anche con modelli diversi**: prima M1, M4 e M6; poi M2, M3, M5, M7 e M8. Per questo ogni milestone deve essere autosufficiente:

- Si parte da questo file, da `src/content/` e dalle skill, senza contare sulla memoria di sessioni precedenti. Quello che la milestone successiva deve sapere va scritto qui, in «Decisioni».
- M1 lascia per ogni tappa un **segnaposto già bello** (il sito è regalabile in ogni momento) e scrive in «Decisioni» il **contratto dei livelli**: interfaccia, unità, `[eMin, eMax]`, dimensioni e posizioni di aggancio con i vicini.
- Una milestone successiva sostituisce solo le scene delle sue tappe, senza toccare il motore. Ogni scena si allinea ai vicini tramite il contratto, non tramite la loro implementazione: il vicino può essere ancora un segnaposto.
- I componenti condivisi (contatore, pannello, «Tu sei qui», lente, etichette) nascono in M1 e si riusano.
- Ogni milestone finisce con il sito intero e funzionante su tutta la scala: verifica completa, commit, stato aggiornato qui sotto.

Stato:

- **M0, fatto**: starter, contenuti, deploy, script degli screenshot, skill.
- **M1, motore di zoom end-to-end**: segnaposto già belli per ogni tappa (forma, etichetta, esponente), input completo, contatore con gli scatti a ogni potenza di 10, pannello con «saperne di più» e «Come lo sappiamo?», «Tu sei qui», lente, contratto URL esteso, overlay di debug, apertura essenziale con la prima riga legata alla data. Si considera fatta quando si va fluidamente da 10⁰ fino al finale segnaposto, con screenshot su tutta la scala nei 3 viewport.
  - **In corso.** Si lavora in 8 passi. Alla fine di ogni passo: typecheck, build e test puliti, un commit, e questo elenco aggiornato. Se la sessione si interrompe si riparte dal primo passo senza ✅, leggendo «Decisioni → Motore di zoom». Push solo alla fine, dopo la conferma di Nicola.
    1. ✅ Nucleo puro con test: `src/engine/journey.ts` (asse `u`), `src/ui/format.ts`, `src/personalization.ts`, `src/route.ts`, `src/engine/clock.ts`.
    2. ✅ Motore (`src/engine/`: `stage`, `framing`, `level`, `level-manager`, `motion`, `input`, `renderer`, `engine`), registro dei livelli (`src/levels/registry.ts`), segnaposto generico su tutte le 21 tappe dell'Atto I, segnaposto curato di `partenza` con la sagoma, cornici della scala, punto caldo, etichette, overlay di debug, `data-ready`. Provato da Nicola su iPad (Safari): 60 fps, ▶ ◀, swipe e rotazione a posto, la sagoma va bene così. Unico appunto, un fotogramma lungo (35 ms) nei passaggi tra livelli: da ricontrollare sull'iPad dopo il precaricamento (vedi «Decisioni → Motore di zoom → Precaricamento»; `?debug=1` ora conta i fotogrammi lenti).
    3. ✅ Interfaccia (`src/ui/`: `interface`, `counter`, `counter-model`, `panel`, `layout`, `dom`, `rich-text`; `src/styles/`: `tokens`, `fonts`, `base`, `ui`): contatore con gli scatti e il righello delle potenze, pagina con didascalia ed espansioni, pulsanti «Più vicino» e «Più lontano», area libera misurata dalla griglia. Vedi «Decisioni → Interfaccia». L'apertura parte ancora da sola (`src/main.ts`): la sostituisce il passo 6.
    4. ✅ Input e movimento definitivi: viaggio animato, rotella, swipe con inerzia, pinch, tasti e aggancio verificati dal vivo con tocchi simulati; con `prefers-reduced-motion` ▶ ◀ passano dal velo (`src/ui/veil.ts`). Il pinch resta in scala vera (guadagno 1 in `src/engine/input.ts`, `PINCH_GAIN`): Nicola non ha ancora detto se gli sembra lento.
    5. ✅ Punto caldo con le parole «Tu sei qui» dalla Luna in poi (`src/ui/marker.ts`); lente condivisa (`src/engine/lens.ts`, `src/ui/lens.ts`, `LensSpec` nel contratto); sfondo di stelle (`src/levels/backdrop.ts`); segnaposto curati in scala vera da `terra` a `universo` (`src/levels/placeholder/`: `solar.ts`, `far.ts`, `cosmos.ts`, con `sketch.ts`, `bodies.ts`, `clouds.ts`); tabella dei pianeti e coordinate del cielo condivise (`src/levels/solar-system.ts`, `src/levels/sky.ts`); etichette nuove in `src/content/labels.ts`. Le tappe terrestri restano col segnaposto generico. Vedi «Decisioni → Contratto dei livelli».
    6. ✅ Apertura (`src/ui/intro.ts`: la sola stella è il punto caldo, righe una alla volta, saluto con `#nome=`, prima riga dalla data), Atto II (`src/levels/placeholder/numbers.ts`: livelli tipografici in DOM), finale segnaposto con «TODO: messaggio di Nicola» (`src/ui/finale.ts`), epilogo (`src/ui/epilogue.ts`), pagine sovrapposte `fonti` e `disco` (`src/ui/overlay.ts`, `sources.ts`, `golden-record.ts`). Vedi «Decisioni → Viste». Lo script degli screenshot accetta già le cinque viste e `--u`.
    7. ⬜ Qualità adattiva, accessibilità, `scripts/smoke.mjs` (`scripts/screenshot.mjs` è già esteso).
    8. ⬜ Verifica completa nei 3 viewport, contratto dei livelli completo in «Decisioni», stato «fatto», conferma di Nicola e push.
- **M2, le tappe terrestri**: `partenza`, `strada`, `rifredi`, `quartiere`, `firenze`, `toscana`, `italia`, più gli script dei dati geografici.
- **M3, Terra e Sistema Solare**: `terra`, `luna`, `sole`, `giove`, `pianeti-lontani`.
- **M4, i momenti speciali**: `voyager` (con il pannello vivo, la tabella JPL Horizons e il racconto del Disco d'oro), `oort`, `bolla` (viva, con le varianti dei testi approvate da Nicola).
- **M5, galassie e universo**: `nebulose`, `via-lattea`, `andromeda`, `laniakea`, `rete-cosmica`, `universo`.
- **M6, oltre e finale**: `oltre`, `atomi`, `googol`, `googolplex`, il finale (col segnaposto), l'epilogo, la pagina delle fonti.
- **M7, Disco d'oro, il laboratorio**: da saltare se il tempo non basta (il racconto è in M4).
- **M8, rifinitura**: apertura, audio, telefono, prestazioni, accessibilità, `/fact-check`, `CREDITS.md`, `README.md`, screenshot finali completi.

## «Finito» significa

Una bambina di 10 anni apre il link su un tablet, capisce da sola cosa fare, arriva fino in fondo senza intoppi, e alla fine vuole rifarlo o chiede «ma è vero?». E la risposta è sì.

## Decisioni

_(Annota qui le decisioni di architettura man mano che le prendi. Il dettaglio sta nelle sezioni indicate.)_

Prese con Nicola prima di M1:

- Lo stato del motore è la posizione nel viaggio, `e` è derivato («Motore di zoom»).
- ▶ va alla tappa successiva; il contatore mostra l'esponente arrotondato e scatta a ogni potenza di 10 («Navigazione», «Il contatore»).
- «Largo» è il lato corto dell'area libera dal pannello; la camera ha una traccia del centro; `voyager` e `nebulose` sono decentrate («Inquadrature»).
- Una sola lente per gli oggetti invisibili in scala («Inquadrature»).
- Voyager: distanza da tabella JPL Horizons interpolata («Tappe speciali»).
- Testi e scene legati alla stessa data, mai in contraddizione («Personalizzazione via link», «Tappe speciali»).
- Il viaggio parte da una strada reale di Rifredi; le prime due tappe sono `partenza` e `strada` («Dati geografici»).
- Milestone fuori ordine e autosufficienti («Milestone»).

### Motore di zoom (M1, architettura approvata da Nicola)

**La posizione `u`** (`src/engine/journey.ts`). Lo stato del motore è un solo numero. `apertura` è a `u = −1`; nell'Atto I `u = e` (da 0 a 26,94); le tappe dell'Atto II sono a passi fissi (`oltre` 29, `atomi` 31, `googol` 33, `googolplex` 35), poi `finale` 37 ed `epilogo` 38,5. `fonti` e `disco` sono viste sovrapposte, fuori dall'asse: chiudendole si torna allo stesso `u`. La camera usa `cameraExponent(u)`: parte da −0,35 all'apertura e continua a crescere oltre 26,94, così l'universo si rimpicciolisce a un punto. Il contatore mostra 10ⁿ con n = `round(e)` e scatta quando n cambia.

**Precisione.** Mai una scena in metri. (1) Lo stato è un logaritmo. (2) Ogni livello ha la sua unità, scelta perché il contenuto stia tra circa 10⁻³ e 10⁴ unità. (3) Un «palcoscenico» in metri, in float64 e solo su CPU, ha l'origine nel punto «Tu sei qui» e una tabella di ancore a distanze vere; ogni livello ha per origine un'ancora e la sua camera si calcola per sottrazione in float64. Ogni livello si disegna in un passaggio suo, con `near`, `far` e depth propri: niente depth logaritmico.

**Camera.** Prospettica, 30° sul «largo»: la distanza è sempre 1,87 × 10^e. L'area libera è il viewport meno pannello agganciato, fascia del contatore, safe area e un margine del 4%; il punto principale della proiezione è il suo centro.

**Livelli.** Un passaggio per livello, dal più grande al più piccolo (quello interno sta davanti). Interfaccia, punto caldo, cornici della scala ed etichette sono in DOM, sopra il canvas. Carico pigro con import dinamico, dissolvenze per materiale oppure fuori schermo (`fadeMode: 'offscreen'`). Alternativa scartata: scena unica con gruppi riscalati e depth logaritmico (isola peggio le milestone, pesa di più su tablet).

**Input.** Tutto diventa variazione di `u` o «vai al nodo»: ▶ ◀ e tasti fanno un viaggio animato di 1,5–3 s (`travelDuration`); la rotella insegue un bersaglio con smorzamento; lo swipe ha inerzia; il pinch vale Δu = −log₁₀(rapporto). A ingresso fermo, aggancio morbido solo dentro la zona di cattura di una tappa (`snapTarget`: ±0,25, meno tra tappe vicine). Premere ▶ a metà corsa porta al massimo una tappa oltre la prossima, e un tasto tenuto premuto non si ripete: il viaggio non si può saltare per sbaglio. Un tocco senza trascinamento non interrompe un viaggio animato. Con `prefers-reduced-motion` ▶ ◀ non fanno lo zoom: un velo color notte copre la scena, la posizione salta alla tappa (`Engine.jumpTo`) e il velo si riapre; lo zoom guidato dal dito resta.

**Tempo e data.** `src/engine/clock.ts` è l'unica fonte: con `?static=1` il tempo resta a zero e «adesso» è `VOYAGER_1.lightDayDateUTC`. Ogni testo o scena che dipende dalla data legge da lì.

**Precaricamento.** Un livello non deve mai costare un fotogramma lungo quando entra in scena. Appena caricato, il gestore ne compila gli shader (`renderer.compileAsync`) e il motore lo disegna una volta dentro un solo pixel nascosto (`Engine.prime`), così buffer e pipeline della GPU sono pronti prima che serva. Il carico parte in anticipo: lungo tutto il tratto di un viaggio animato appena si preme ▶ e, da fermi su una tappa, verso la tappa successiva. Per questo un livello crea materiali e texture in `init()`, mai in `update()`.

### Interfaccia (M1)

**«Tavola e pagina».** Una sola griglia CSS (`src/styles/ui.css`) dispone contatore, scena e pagina. In verticale: contatore in alto, scena, pagina come foglio in basso (al massimo il 46% dell'altezza, richiudibile sul titolo; il testo più lungo scorre). In orizzontale: scena a sinistra e, a destra, una colonna con contatore, didascalia e pulsanti, larga `--page-width` (cresce finché la scena resta almeno quadrata).

**L'area libera si misura, non si calcola.** La cella vuota della griglia (`.ui__scene`) *è* l'area libera: `src/ui/layout.ts` (`FreeArea`) ne misura il riquadro e lo passa al motore. Chi possiede lo schermo dice quale elemento seguire con `follow(elemento)` (l'interfaccia la sua cella; apertura e finale la loro). Con un'espansione aperta («saperne di più», «Come lo sappiamo?») l'area resta congelata: è modalità lettura, la scena non si muove. Safe area e breakpoint stanno solo nel CSS.

**Contatore.** `src/ui/counter-model.ts` (puro, con test) decide cosa mostrare a ogni `u`; `src/ui/counter.ts` lo disegna: etichetta, «10ⁿ metri» con l'esponente che scatta rotolando, larghezza precisa, `counterLine`, e un righello con una tacca per ogni potenza di 10. Oltre il punto di mezzo tra `universo` e `oltre` passa ai numeri: «metri» scivola via e resta 10ⁿ con l'esponente della tappa più vicina.

**Pagina.** `src/ui/panel.ts`. Durante un viaggio contiene già il testo della tappa di arrivo, invisibile: così prende la nuova misura durante lo zoom e non dopo. Fermi tra due tappe non c'è didascalia. Le tappe speciali aggiungono contenuto sotto il testo con `extras` (`PanelExtras`, una funzione per valore di `special`): è il punto di innesto per il pannello vivo di Voyager (M4). I pulsanti ◀ ▶ portano le etichette `UI.controls.back` e `forward`; «Più lontano» è l'unico elemento pieno e chiaro dell'interfaccia.

**Caratteri.** Fraunces (titoli e contatore) e **Andika** (testi), dichiarati in `src/styles/fonts.css` con i soli sottoinsiemi latini. Andika ha sostituito Atkinson Hyperlegible Next, proposto all'inizio, perché Atkinson ha lo zero barrato e questi testi sono pieni di zeri da contare. In attesa della conferma di Nicola (confronto in `docs/confronti.local/caratteri.png`, non committato).

**Testi a schermo.** `typeset()` in `src/ui/rich-text.ts` trasforma gli apici Unicode dei testi (10⁸⁰) in veri `<sup>` e gli apostrofi dritti in tipografici; ▶ e ◀ diventano icone disegnate. I testi in `src/content/` non cambiano.

### Viste (M1)

**Chi è in scena lo decide solo `u`** (`src/ui/view-model.ts`, puro e con test): apertura prima della partenza, interfaccia lungo le tappe, poi finale ed epilogo. Ogni vista ha un'opacità funzione di `u`, quindi sfuma col movimento, e ha una cella vuota che fa da area libera (`FreeArea.follow`). Una vista invisibile è `inert` ma conserva il layout (mai `hidden`): la sua cella si misura.

**Apertura** (`src/ui/intro.ts`). Schermo nero e una sola stella, che è il punto caldo: quando parte il primo zoom (più lento degli altri) la strada le compare attorno. Le righe compaiono una alla volta (`src/ui/reveal.ts`); un tocco le fa arrivare tutte. Nome e data si leggono dal frammento in `src/main.ts` e passano al motore (`LevelContext.birth`, `name`, `now()`): un livello che dipende dall'età li prende da lì.

**Atto II** (`src/levels/placeholder/numbers.ts`, da sostituire in M6). I livelli possono essere solo DOM (`Level.dom`): il motore li monta sopra il canvas, li sfuma e li toglie. `atomi` e `googol` scrivono gli zeri in righe da dieci, così si possono contare; `googolplex` finisce in una cascata di luce che porta al finale. Due numeri non sono mai in scena insieme (c'è un test).

**Finale ed epilogo** (`src/ui/finale.ts`, `src/ui/epilogue.ts`). Segnaposto: frasi-ponte una alla volta, poi il messaggio; finché `FINALE_IS_PLACEHOLDER` è vero c'è il riquadro «TODO: messaggio di Nicola» e un avviso in console. Qui i due pulsanti del viaggio non ci sono: si va avanti con «Continua» e indietro con una freccia (`LABELS.continue`, `LABELS.back`), oltre che con tasti e gesti. «Rifai il viaggio» torna all'apertura dietro un sipario. Nell'epilogo «Crea il tuo Disco d'oro» compare solo quando il laboratorio esiste: `GOLDEN_RECORD_LAB_READY` in `src/ui/golden-record.ts` (lo accende M7).

**Pagine sovrapposte** (`src/ui/overlay.ts`). `fonti` (generata da tutti i `sources` e da `CREDITS.md`, senza `innerHTML`) e `disco` (per ora solo il racconto). Prendono il fuoco, rendono inerte tutto il resto, si chiudono col pulsante o con Esc e restituiscono il viaggio allo stesso `u`. Dalla tappa Voyager il Disco si apre col pulsante `UI.voyager.openGoldenRecord`.

### Contratto dei livelli (M1)

Il contratto è nel codice, commentato: `src/engine/level.ts` (interfacce `LevelDef`, `Level`, `LevelFrame`, `LabelSpec` e regole per chi scrive un livello), `src/engine/stage.ts` (ancore e traccia del centro), `src/levels/registry.ts` (una riga per tappa). In breve:

- **Sostituire un segnaposto**: nella riga della propria tappa in `registry.ts` si cambia `load` (import dinamico del nuovo modulo, che esporta di default una `LevelFactory`) e, se serve, `unit`, `origin`, `range`, `fadeIn`, `fadeOut`, `fadeMode`. Non si tocca altro.
- **Unità e origine**: `unit` è quanti metri vale un'unità locale; `origin` è l'ancora del palcoscenico che sta in (0, 0, 0). Il livello costruisce la geometria in unità locali attorno all'origine e non crea né muove camere: legge `frame.camera`.
- **Assi**: +x a destra, +y in alto sullo schermo (a terra: nord), +z verso la camera, che guarda sempre lungo −z. Il suolo è il piano z = 0; tutto ciò che sta oltre la Terra è nel piano z = −raggio terrestre.
- **Ancore** (`ANCHORS`, distanze vere, direzioni sullo schermo scelte per la composizione): `you`, `earth`, `moon`, `sun`, `voyager1`, `orionNebula`, `galacticCentre`, `andromeda`, `localGroup`, `laniakea`. Convenzione galattica: il centro galattico è dritto sopra il Sole e la longitudine galattica cresce in senso antiorario. I pianeti diversi dalla Terra li posiziona il livello che li disegna.
- **Traccia del centro** (`TRACK` in `stage.ts`): fotogrammi chiave «a questo esponente la vista è centrata su questo punto». Tra due fotogrammi il peso segue la larghezza della vista, non l'esponente: lo spostamento avviene mentre la destinazione entra in campo, e due fotogrammi consecutivi sullo stesso punto lo tengono esattamente al centro (il Sole da `sole` a `pianeti-lontani`). Una milestone può ritoccare i fotogrammi delle proprie tappe; `tests/stage.test.ts` verifica che «Tu sei qui» non esca mai dal quadro.
- **Intervalli predefiniti** per la tappa k con esponente E(k): entra tra `E(k−1) − 0,3` e `E(k−1) + 0,1`, esce tra `E(k) + 0,9` e `E(k) + 1,6`. Ordine di disegno: `order = −E`, cioè la tappa più larga sta dietro.
- **Aggancio tra vicini**: posizioni e dimensioni coincidono per costruzione, perché tutti i livelli usano la stessa camera e le stesse ancore. Chi disegna un oggetto condiviso (la Terra tra `terra` e `luna`, il Sole da `sole` in poi) lo mette sull'ancora con la dimensione vera. Un livello a tutto schermo copre almeno 3 × 10^E.
- **Dissolvenza**: `frame.fade` va applicato ai propri materiali (convenzione `uFade` in `src/levels/placeholder/primitives.ts`), oppure `fadeMode: 'offscreen'` e ci pensa il motore. Con `frame.isStatic` niente dipende dal tempo.
- **Etichette**: il livello le dichiara in `labels(frame)` in coordinate locali; il testo accetta `^{…}` per gli apici (`10^{7} m`). Le proietta e le dissolve il motore.
- **Prova rapida**: `?offscreen=1` forza tutti i livelli nel percorso fuori schermo; `?debug=1` mostra livelli attivi, opacità, draw call e il riquadro del «largo».
- **La lente** (`LensSpec` in `level.ts`): il livello la dichiara in `lenses(frame)` con la posizione vera dell'oggetto, una piccola scena a parte (in unità qualsiasi, guardata lungo −z), la larghezza del campo e il nome. Il motore la disegna su un render target e la compone come disco; l'interfaccia disegna bordo, filo, nome e «ingrandito, non in scala». La posizione la sceglie `placeLens` (`framing.ts`): accanto all'oggetto nella direzione chiesta, sempre dentro l'area libera, mai sopra il punto caldo. Le scene delle lenti vanno elencate in `targetScenes`, così gli shader si compilano in anticipo.
- **Lo sfondo** (`Backdrop` in `level.ts`, `src/levels/backdrop.ts`): stelle tenui dietro ogni livello, dalla Terra in poi; non sono in scala, sono la notte, e ruotano di pochi gradi a ogni potenza di 10. A terra e nell'Atto II non ci sono. Un livello non deve disegnare stelle di contorno proprie.
- **Entrate e uscite** (`enter`, `leave` in `registry.ts`): un livello entra più tardi del predefinito quando il suo contenuto attraverserebbe la scena della tappa prima (l'orbita della Terra nella scena della Luna, la bolla sopra la nube di Oort), ed esce prima quando, rimpicciolendo, diventerebbe una macchia troppo luminosa (le nuvole di punti). Anche etichette e lenti hanno una finestra di visibilità attorno alla propria tappa.
- **Dati condivisi tra livelli**: `src/levels/solar-system.ts` (pianeti: semiasse vero, angolo sullo schermo scelto per la composizione; la Terra è dove la mettono le ancore) e `src/levels/sky.ts` (da ascensione retta, declinazione e distanza agli assi del palcoscenico, in 3D; lo usa `bolla` per `NEARBY_STARS`). Chi disegna un pianeta o una stella vicina parte da qui, così i vicini coincidono.
- **Segnaposto curati** (`src/levels/placeholder/`): `solar.ts` è di M3, `far.ts` di M4, `cosmos.ts` di M5. Ogni milestone cancella il suo file quando le sue tappe hanno le scene vere. `sketch.ts` (forme, anelli, linee, punti, etichette, lenti con pochi verbi) si può riusare o ignorare.
- **Etichette e microtesti nuovi** stanno in `src/content/labels.ts` («Tu sei qui», «ingrandito, non in scala», i nomi dei luoghi): Nicola li può correggere lì.
- **Il punto caldo** (`markerLook` in `src/ui/marker.ts`): sempre presente nell'Atto I (all'apertura è la «sola stella»); le parole «Tu sei qui» compaiono da 10⁸ m in poi e si fanno da parte se una lente ci passa sopra; tra i numeri dell'Atto II il punto si spegne e torna per il finale. M6 può cambiare queste soglie.

La tabella completa per tappa (unità, origine, intervalli, oggetti di consegna) si scrive al passo 8.

**Altre scelte approvate.** `?u=` nel contratto URL; cornice della scala (un quadrato sottile a ogni potenza di 10) nei segnaposto; nessun pulsante del suono finché l'audio non esiste (M8); caratteri via `@fontsource` (vedi «Interfaccia»); nei segnaposto delle tappe terrestri nessuna geografia inventata, ma `partenza` ha già la sagoma di lei seduta sulla soglia.
