---
name: fact-check
description: Verifica tutti i fatti e i numeri dei testi del sito "Dieci" (src/content/*.ts ed etichette nelle scene) su fonti affidabili, completa le fonti mancanti e produce un rapporto in docs/fact-check.md. Usala in M8, prima di pubblicare, o quando chiedono "è tutto giusto?", "controlla i fatti", "/fact-check".
---

# Fact-check

Obiettivo: che una bambina possa chiedere «ma è vero?» e la risposta sia sempre sì.

1. **Elenca** ogni affermazione verificabile in `src/content/levels.ts`, `ui.ts`, `golden-record.ts`, `data.ts` e nelle etichette scritte nel codice delle scene (cerca stringhe in italiano in `src/`). Includi tutti i `TODO fact-check` e i valori marcati `verify`.
2. **Cerca una fonte autorevole** per ognuna: NASA, ESA, JPL, INAF, INFN, ASI, Museo Galileo, enti ufficiali, articoli scientifici, enciclopedie affidabili. Apri la pagina: lo snippet di una ricerca non basta.
3. **Rifai i calcoli** (tempi di viaggio, conversioni, anni-luce) con un piccolo script, non a mente.
4. **Scrivi `docs/fact-check.md`**: una tabella con affermazione, esito (✅ corretto, ⚠️ impreciso, ❌ sbagliato), fonte (link) e nota.
5. **Per ⚠️ e ❌ proponi la correzione più piccola possibile**, mantenendo tono e lunghezza del testo. Non modificare i testi senza l'ok di Nicola, tranne i refusi evidenti.
6. **Completa le fonti**: riempi i campi `sources` vuoti e sostituisci i `TODO fact-check` con le fonti trovate (questo puoi farlo senza chiedere).
7. Se puoi, **affida la ricerca a un subagente**, così il contesto principale resta pulito; tu tieni il rapporto.
8. **Riferisci a Nicola**: quanti fatti hai verificato, cosa va corretto, cosa resta incerto.
