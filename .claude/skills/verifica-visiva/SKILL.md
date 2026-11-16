---
name: verifica-visiva
description: Controlla come appare il sito "Dieci" a una o più scale facendo screenshot automatici su desktop, tablet e telefono e guardandoli. Usala dopo ogni modifica visiva, prima del commit di una scena, o quando chiedono "come viene?", "controlla le transizioni", "/verifica-visiva".
---

# Verifica visiva

1. **Scegli cosa fotografare** (lo script avvia da solo un server Vite; se il dev server è già acceso puoi aggiungere `--url http://localhost:5173`):
   - una o più tappe: `npm run shots -- --stops <id1>,<id2>`
   - una transizione: `npm run shots -- --from <e1> --to <e2> --step 0.25`
   - tutto il viaggio: `npm run shots` (tutte le tappe) oppure `npm run shots -- --from 0 --to 27 --step 1`
   - solo alcuni viewport: aggiungi `--viewports phone,desktop` (oppure `tablet`)
   - quanti farne lo dice «Verifica» in `CLAUDE.md`: durante un passo solo le tappe toccate, su telefono e desktop; il giro completo nei tre viewport a fine milestone
2. **Leggi `screenshots/report.json`**: errori in console e `TIMEOUT` (il flag `data-ready` non è mai stato impostato) si risolvono per primi.
3. **Guarda le immagini**: prima i fogli riassuntivi `screenshots/contact-<viewport>.png`, poi i singoli PNG dove serve più dettaglio.
4. **Controlla, per ogni immagine**:
   - scena vuota, nera o con artefatti (z-fighting, sfarfallio, oggetti tagliati dai piani di clipping)?
   - nelle transizioni: salti di luminosità, oggetti che spariscono o compaiono di colpo?
   - testo leggibile su telefono (dimensione, contrasto)? Pannello, contatore e pulsanti si sovrappongono?
   - il punto «Tu sei qui» si vede?
   - il contatore mostra la scala e l'unità giuste?
   - le safe area del telefono sono rispettate?
5. **Scrivi un rapporto breve**: cosa va, cosa no, con il nome del file per ogni problema. Se ti hanno chiesto solo di verificare, non correggere senza chiedere.
6. **Se WebGL è nero ovunque**: riprova con `--gpu`. Se è ancora nero, cerca gli errori WebGL in `report.json`.

Nota: di default lo script usa SwiftShader (rendering software): è lento ma dà lo stesso risultato su ogni computer. `--gpu` è più veloce. `--headed` mostra la finestra del browser.
