---
name: tappa
description: Costruisce o rifinisce la scena di una o più tappe del viaggio "Dieci" (definite in src/content/levels.ts), con verifica visiva e commit. Usala quando si lavora a una scena, per esempio "fai la tappa firenze", "sistema la bolla" o "/tappa terra,luna".
---

# Costruire una tappa

Argomenti: uno o più id di tappa, separati da virgola (es. `firenze` oppure `terra,luna`). Se mancano, chiedi quali.

1. **Leggi** l'entrata della tappa in `src/content/levels.ts` (testi, `exponent`, `visual`, `special`) e quelle subito prima e subito dopo: la scena deve fondersi con loro nelle transizioni. Rileggi in `CLAUDE.md` le sezioni «Direzione visiva», «Tu sei qui», «Contratto URL» e «Decisioni».
2. **Pianifica in breve** (3-6 punti): cosa si vede, di cosa è fatta (procedurale, texture da `docs/ASSETS.md`, dati geografici in `public/data/`), come entra e come esce, quanto pesa sulle prestazioni. Se manca un dato o un asset, dillo prima di inventarlo.
3. **Implementa** rispettando l'architettura del motore. I testi stanno in `src/content/` e non si riscrivono. Etichette nuove nella scena solo se corrette e brevi.
4. **Asset**: solo con licenza verificata; aggiungi la riga in `CREDITS.md` nello stesso commit.
5. **Verifica** con la skill `/verifica-visiva`. Pochi screenshot, come dice «Verifica» in `CLAUDE.md`: solo le tappe toccate, su telefono e desktop. Il giro completo nei tre viewport si fa a fine milestone.
   - la tappa: `npm run shots -- --stops <id> --viewports phone,desktop`
   - le transizioni con le vicine, se è cambiato il modo in cui la scena entra o esce: `npm run shots -- --from <e-1> --to <e+1> --step 0.5 --viewports phone,desktop`
   - Guarda davvero le immagini.
   - gli fps nel dev server con `?stop=<id>&debug=1`.
6. **Correggi finché**: niente buchi, lampi o salti nelle transizioni; testo leggibile anche su telefono; punto «Tu sei qui» visibile; nessun errore in console; `npm run typecheck` e `npm run build` puliti.
7. **Commit** dei soli file toccati, con un messaggio chiaro in inglese (es. `Add Florence scene with Arno and Duomo`). Non fare push.
8. **Riferisci a Nicola** in 3-5 righe: cosa hai fatto, cosa guardare (con l'URL `?stop=<id>`), dubbi aperti. Mostragli 1 o 2 screenshot.
