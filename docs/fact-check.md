# Fact-check di «Dieci»

**Data:** 17 novembre 2026.

**Cosa:** tutti i fatti e i numeri di `src/content/` (`levels.ts`, `data.ts`, `ui.ts`, `golden-record.ts`, `labels.ts`; da `finale.ts` solo le frasi-ponte, non il messaggio di Nicola) e i numeri scritti nel codice delle scene (`src/levels/solar-system.ts`, `src/engine/stage.ts`).

**Come:** ogni affermazione è stata cercata su una fonte autorevole (NASA, JPL, ESA, ESO, ASI, INAF, Museo Galileo, Istat, articoli scientifici, enciclopedie) e la pagina è stata **aperta**: lo snippet di una ricerca non è bastato mai. Tempi di viaggio, conversioni, volumi e distanze sono stati ricalcolati con uno script (vedi «Calcoli»). Le pagine che non si sono aperte sono elencate in fondo.

## In breve

- **206 verifiche**: 167 affermazioni dei testi, 25 dati di `data.ts` (di cui 16 righe per le stelle della bolla), 14 numeri nel codice delle scene. In più, tutti i link delle fonti già presenti sono stati aperti.
- **Esito:** 196 ✅ corrette e 7 ⚠️ imprecise, tutte nei testi; le 7 sono state corrette dopo l'ok di Nicola. Due cose erano sbagliate, ed entrambe sono corrette: ❌ la distanza di Ross 128 in `data.ts` e ❌ un link ESA rotto tra le fonti di `giove`. In più alla tabella delle stelle della bolla mancavano 2 stelle, ora aggiunte.
- **Nessun errore grave**: niente di quello che il sito racconta è falso. Le imprecisioni sono sfumature: un nome che forse non era dei Romani, una memoria che è di sei computer e non di uno, «i primi antenati» che erano antichi ma non i primi.
- **Testi visibili:** le correzioni proposte sono raccolte qui sotto. Il 17 novembre 2026 Nicola ha approvato P1–P5 e D1–D3, che sono state applicate; D4–D6 restano come sono.
- **Corretti direttamente** (dati numerici e fonti): la distanza di Ross 128 in `data.ts`, il link ESA rotto, tutti i 13 `TODO fact-check`. Sono state aggiunte fonti a 24 tappe (7 non ne avevano nessuna) e al Disco d'oro. Resta senza fonti solo `oltre`, che non contiene fatti da verificare.

## Correzioni ai testi visibili

Proposte durante il controllo e decise da Nicola il 17 novembre 2026. «Testo attuale» è il testo com'era prima della correzione.

### Consigliate (tutte applicate)

| # | Dove | Testo attuale | Testo proposto | Motivo | Fonte |
|---|---|---|---|---|---|
| P1 | `partenza.counterLine` | un po' meno della tua altezza | circa tre quarti della tua altezza | A 10 anni una bambina è alta in media 138,6 cm: 1 metro è il 72%, cioè 40 cm in meno. «Tre quarti» resta vero da 126 a 151 cm. | [OMS, altezza per età delle bambine](https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/sft-hfa-girls-perc-5-19years.pdf?sfvrsn=59b013d8_4) |
| P2 | `rifredi.more` | I Romani lo chiamavano Rivus Frigidus, «ruscello freddo». | «Rio freddo» viene dal latino Rivus Frigidus, «ruscello freddo». | Nessuna fonte attesta il nome in epoca romana: lo dice solo, senza citare nulla, una nota della Città Metropolitana. La forma più antica nota è medievale («Riofreddo», 1201). Di romano c'è il nome *Terzolle* (dal terzo miglio della via Cassia). | [Città Metropolitana, Torrente Terzolle](https://www.cittametropolitana.fi.it/wp-content/uploads/Torrente_Terzolle.pdf); [Wikipedia, Rifredi](https://it.wikipedia.org/wiki/Rifredi) |
| P3 | `voyager.more` | e il suo computer ha circa 70 kilobyte di memoria | e i suoi computer, tutti insieme, hanno circa 70 kilobyte di memoria | Voyager ha sei computer (tre sistemi, ognuno doppio): circa 70 kB (69,63) è la memoria di tutti insieme. | [NASA, Voyager FAQ](https://science.nasa.gov/mission/voyager/frequently-asked-questions/) |
| P4 | `andromeda.more` | quando sulla Terra vivevano i primi antenati degli esseri umani | quando sulla Terra vivevano antichi antenati degli esseri umani | Gli antenati della nostra linea risalgono a 6–7 milioni di anni fa. Quelli di 2,5 milioni di anni fa (i primi *Homo*, *Australopithecus garhi*) erano antichi, ma non i primi. | [Smithsonian, Human Origins](https://humanorigins.si.edu/education/introduction-human-evolution); [Smithsonian, *Au. garhi*](https://humanorigins.si.edu/evidence/human-fossils/species/australopithecus-garhi) |
| P5 | `golden-record.ts`, `intro` | ci ha messo 115 immagini della Terra, suoni della natura, | ci ha messo 115 immagini, quasi tutte della Terra, suoni della natura, | Una decina delle 115 immagini mostra altro: il Sole, Mercurio, Marte, Giove, schemi del Sistema Solare, definizioni di matematica e di fisica. | [NASA, Golden Record Contents](https://science.nasa.gov/mission/voyager/golden-record-contents/) |

### Da decidere (D1–D3 applicate, D4–D6 lasciate come sono)

| # | Dove | Testo attuale | Proposta | Motivo | Fonte |
|---|---|---|---|---|---|
| D1 | `data.ts`, `NEARBY_STARS` | 14 stelle fino a 11,5 anni-luce | aggiungere `EZ Aquarii` (11,1 a.l., RA 22,643 h, Dec −15,30°) e `Struve 2398` (11,49 a.l., RA 18,713 h, Dec 59,63°) | La tabella dice di arrivare a 11,5 anni-luce ma ne mancavano due sistemi di nane rosse, presenti anche nelle sue stesse fonti. Non era un errore (nessuna stella accesa era sbagliata), ma dopo gli 11 anni la bolla sarebbe stata incompleta. Serviva l'ok di Nicola perché nella scena compaiono i nomi. **Applicata.** | [Wikipedia, List of nearest stars](https://en.wikipedia.org/wiki/List_of_nearest_stars); [EZ Aquarii](https://en.wikipedia.org/wiki/EZ_Aquarii); [Struve 2398](https://en.wikipedia.org/wiki/Struve_2398) |
| D2 | `strada.counterLine` | lungo come un autobus | quasi quanto un autobus | Un autobus urbano a Firenze è lungo 12 metri. Il testo della tappa («più o meno la lunghezza di un autobus») va bene così; la riga sotto il contatore è un po' generosa. **Applicata.** | [RATP Dev, autobus da 12 m a Firenze](https://www.ratpdev.com/en/italy-autolinee-toscane-continues-to-strengthen-its-electric-bus-fleet-for-more-sustainable-mobility-in-florence/) |
| D3 | `ui.ts`, `controls.forwardAria` e `backAria` (li sentono solo i lettori di schermo) | Allontanati: moltiplica la scala per 10 / Avvicinati: dividi la scala per 10 | Allontanati: vai alla tappa successiva / Avvicinati: torna alla tappa precedente | ▶ porta alla tappa dopo: da Voyager alla nube di Oort la scala si moltiplica per circa 500, e nell'Atto II non c'è più una scala. A schermo il contatore scatta a ogni potenza di 10, quindi i testi visibili restano veri. **Applicata.** | `src/engine/journey.ts`, esponenti di `levels.ts` |
| D4 | `oort.more` | più in là, la gravità delle altre stelle diventa più forte di quella del Sole | (lasciare così) oppure: più in là, la gravità della galassia, cioè di tutte le altre stelle, diventa più forte di quella del Sole | Il bordo è dove la gravità del Sole cede alla «marea» della galassia. «Le altre stelle» è una semplificazione accettabile. Consiglio di lasciarla. **Lasciata.** | [Wikipedia, Oort cloud](https://en.wikipedia.org/wiki/Oort_cloud) |
| D5 | `firenze.more` | È lo gnomone più alto del mondo. | (lasciare così) oppure: È lo gnomone più alto mai costruito in una chiesa. | L'astronomo C. Sigismondi e MeteoWeb scrivono «il più alto del mondo»; il Museo Galileo, più prudente, «il più alto mai realizzato in una chiesa». La pagina dell'Opera del Duomo non si è aperta. Consiglio di lasciarla. **Lasciata.** | [Sigismondi, Gerbertus 7](https://www.icra.it/gerbertus/2014/Gerbertus7B.pdf); [Museo Galileo](https://brunelleschi.imss.fi.it/itinerari/luogo/DuomoSantaMariaFiore.html) |
| D6 | `quartiere.more` | grandi telescopi per gli osservatori astronomici di Asiago e di Merate | (lasciare così) oppure: perfino il grande telescopio dell'osservatorio astronomico di Asiago | Il Museo Galileo nomina entrambi gli osservatori. Per Asiago c'è lo strumento preciso (il telescopio «Galileo», 122 cm, 1942); per Merate nessuna fonte nomina un telescopio delle Officine Galileo. Consiglio di lasciarla: la fonte è autorevole. **Lasciata.** |

Su richiesta di Nicola è cambiato anche `giove.more`: «tu avrai circa 15 anni» → «tu avrai quasi 15 anni». [Museo Galileo, Officine Galileo](https://brunelleschi.imss.fi.it/itineraries/place/OfficineGalileo.html); [Università di Padova](https://www.unipd.it/node/84256) |

## Modifiche già fatte

Testi visibili, dopo l'ok di Nicola:

- `levels.ts`: P1 (`partenza`), P2 (`rifredi`), P3 (`voyager`), P4 (`andromeda`), D2 (`strada`), e «quasi 15 anni» in `giove`.
- `golden-record.ts`: P5.
- `ui.ts`: D3 (`controls.forwardAria` e `backAria`).
- `data.ts`: D1, EZ Aquarii e Struve 2398 aggiunte a `NEARBY_STARS`. Sono nane rosse, quindi la scena le disegna come le altre nane rosse. Non sono tra le stelle con la nota (`FEATURED`), e nessun testo le nomina.

Già autorizzati dall'inizio: dati numerici di `data.ts` e fonti.

- **`data.ts`, Ross 128**: da `ly: 10.9` a `ly: 11.0` (Gaia DR3: 11,007 anni-luce, parallasse 296,31 mas). Cambia solo la scena: la stella si accende quando la bolla arriva a 11,0 anni-luce invece che a 10,9. Nessun testo la nomina. I test della bolla passano.
- **`data.ts`, commenti**: tolto il segno `verify`; il commento di `NEARBY_STARS` cita le fonti controllate.
- **`levels.ts`, fonti**: risolti tutti i 13 `TODO fact-check`; aggiunte fonti a `partenza`, `strada`, `rifredi`, `quartiere`, `firenze`, `toscana`, `italia`, `terra`, `luna`, `sole`, `giove`, `pianeti-lontani`, `voyager`, `oort`, `bolla`, `nebulose`, `via-lattea`, `andromeda`, `laniakea`, `rete-cosmica`, `universo`, `atomi`, `googol`, `googolplex`. Ogni fonte aggiunta è una pagina aperta che sostiene l'affermazione.
- **`giove`**: sostituito il link ESA «Juice's journey and Jupiter system tour», che ora rimanda alla home page dell'ESA, con la [scheda di Juice](https://www.esa.int/Science_Exploration/Space_Science/Juice/Juice_factsheet).
- **`quartiere`**: la pagina del Museo Galileo sul 1909 ora è nella versione italiana (stesso contenuto); aggiunta la fonte primaria per il 1980 (Museo Galileo).
- **`golden-record.ts`**: aggiunta la pagina NASA sul contenuto del Disco d'oro.
- **`levels.ts`, commento in cima**: rimanda a questo rapporto.
- **Non cambiato**: `solar-system.ts` mette Nettuno a 30,1 UA. La scheda NSSDC della NASA dà 30,18 UA, ma è un valore osculante; il semiasse medio del JPL è 30,07 UA, quindi 30,1 va bene.

## Verifica per tappa

Legenda: ✅ corretto, ⚠️ impreciso, ❌ sbagliato. «Calcolo» rimanda alla sezione «Calcoli».

### `partenza` (10⁰ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 1 | 10⁰ = 1, 10¹ = 10, 10² = 100, 10³ = 1.000; l'esponente dice quanti zeri | ✅ | matematica | |
| 2 | «un po' meno della tua altezza» (1 m) | ⚠️ → ✅ | [OMS](https://cdn.who.int/media/docs/default-source/child-growth/growth-reference-5-19-years/height-for-age-(5-19-years)/sft-hfa-girls-perc-5-19years.pdf?sfvrsn=59b013d8_4) | Mediana a 10 anni: 138,6 cm. Corretto: P1. |
| 3 | «A ogni passo … la scena diventerà 10 volte più grande» | ✅ | `CLAUDE.md`, «Navigazione» | ▶ a volte attraversa più potenze, ma il contatore scatta a ognuna: «×10 a ogni passo» resta vero. |

### `strada` (10¹ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 4 | 10 m «più o meno la lunghezza di un autobus» | ✅ | [RATP Dev](https://www.ratpdev.com/en/italy-autolinee-toscane-continues-to-strengthen-its-electric-bus-fleet-for-more-sustainable-mobility-in-florence/) | Autobus urbani da 10 a 12 m; a Firenze 12 m. |
| 5 | «lungo come un autobus» (contatore) | ⚠️ → ✅ | come sopra | Lieve. Corretto: D2. |
| 6 | dopo 2 passi 100 volte, dopo 3 passi 1.000, dopo 6 un milione | ✅ | matematica | |
| 7 | «per arrivare al bordo … bastano circa 27 passi» | ✅ | [NASA, How big is space?](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/) | 93 miliardi di anni-luce = 8,8 × 10²⁶ m, log₁₀ = 26,94 (calcolo). |

### `rifredi` (10² m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 8 | 100 m «più o meno un campo da calcio» | ✅ | [IFAB, regola 1](https://www.theifab.com/laws/latest/the-field-of-play/) | Da 90 a 120 m; nelle partite internazionali da 100 a 110. |
| 9 | il nome viene dal Terzolle, «rio freddo» per le acque gelide | ✅ | [Città Metropolitana](https://www.cittametropolitana.fi.it/wp-content/uploads/Torrente_Terzolle.pdf); [La Nazione](https://www.lanazione.it/firenze/cronaca/rifredi-un-rione-a-caccia-di-futuro-la-scommessa-delle-ex-fabbriche-1.8478526) | «era detto Rio freddo, per le gelide acque che scendono da Cercina». |
| 10 | nasce a Cercina, passa da Careggi e Rifredi, finisce nel Mugnone e poi nell'Arno | ✅ | Città Metropolitana | Confluisce nel Mugnone al Ponte di San Donato. |
| 11 | «I Romani lo chiamavano Rivus Frigidus» | ⚠️ → ✅ | Città Metropolitana; [Wikipedia, Rifredi](https://it.wikipedia.org/wiki/Rifredi) | Nessuna attestazione romana. Corretto: P2. |
| 12 | «da quel nome è nato Rifredi» | ✅ | Città Metropolitana; La Nazione | |

### `quartiere` (10³ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 13 | 1 km a piedi «circa un quarto d'ora» | ✅ | calcolo | 12–15 minuti a 4–5 km/h. |
| 14 | la stazione di Rifredi e i binari | ✅ | [RFI](https://iechub.rfi.it/arrivipartenze/arrivalsdepartures/Monitor?placeId=1315&arrivals=False) | |
| 15 | le Officine Galileo a Rifredi dal 1909 | ✅ | [Museo Galileo](https://mostre.museogalileo.it/officinegalileo/sezione/AltiBassi.html) | «Nel 1909 l'azienda si trasferisce in un nuovo stabilimento a Rifredi.» |
| 16 | «per circa 70 anni» | ✅ | Museo Galileo | Dal 1909 al 1980: 71 anni. |
| 17 | strumenti per i laboratori di fisica e strumenti ottici | ✅ | [Museo Galileo](https://brunelleschi.imss.fi.it/itineraries/place/OfficineGalileo.html) | |
| 18 | grandi telescopi per gli osservatori di Asiago e di Merate | ✅ | Museo Galileo; [Università di Padova](https://www.unipd.it/node/84256) | Asiago: il telescopio «Galileo», 122 cm, 1942. Merate: nessuno strumento preciso trovato. Vedi D6. |
| 19 | nel 1980 la sede si spostò a Campi Bisenzio | ✅ | [Museo Galileo](https://mostre.museogalileo.it/officinegalileo/sezione/SecondaMetaXXSecolo.html) | «Nel 1980 la sede è trasferita nel nuovo stabilimento di Campi Bisenzio.» È la fonte primaria che mancava. |
| 20 | esiste ancora, fa parte di Leonardo, costruisce strumenti per lo spazio | ✅ | [Museo Galileo](https://mostre.museogalileo.it/officinegalileo/sezione/StoriaContinua.html); [La Nazione](https://www.lanazione.it/cronaca/campi-bisenzio-leonardo-0354d158) | |
| 21 | «la ritroveremo vicino a Giove» | ✅ | [Leonardo](https://space.leonardo.com/en/juice) | La fotocamera JANUS di Juice. |

### `firenze` (10⁴ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 22 | 10 km, «tutta la città» | ✅ | [Istat](https://www.istat.it/wp-content/uploads/2024/06/Approfondimento_Firenze.pdf) | Il Comune ha una superficie di 102 km², circa 10 × 10 km. |
| 23 | da Rifredi al Duomo circa 3 km | ✅ | calcolo | Dalla stazione 3,4 km in linea d'aria; dal centro del rione circa 2,5. |
| 24 | nel 1475 l'astronomo fiorentino Paolo dal Pozzo Toscanelli | ✅ | [Museo Galileo](https://brunelleschi.imss.fi.it/itinerari/luogo/DuomoSantaMariaFiore.html); [Treccani](https://www.treccani.it/enciclopedia/paolo-dal-pozzo-toscanelli/) | |
| 25 | una piastra di bronzo col foro, a circa 90 m d'altezza | ✅ | Museo Galileo; [Sigismondi](https://www.icra.it/gerbertus/2014/Gerbertus7B.pdf) | La «bronzina» alla base della lanterna. |
| 26 | foro largo 4 cm | ✅ | [MeteoWeb](https://www.meteoweb.eu/2019/06/sole-intrappolato-duomo-firenze-torna-il-suggestivo-fenomeno-gnomone/1271415/) | «un'apertura centrale di 4 centimetri di diametro». La pagina dell'Opera non si è aperta. |
| 27 | vicino al 21 giugno, verso mezzogiorno, un disco di luce sul pavimento | ✅ | Museo Galileo; MeteoWeb | Il mezzogiorno solare a Firenze cade verso le 13:15 dell'ora legale. |
| 28 | dalla posizione del disco si misurava il cammino del Sole | ✅ | [Museo Galileo](https://brunelleschi.imss.fi.it/itineraries/itinerary/AstronomyTuscany.html) | Serviva a correggere le tavole del moto del Sole. |
| 29 | «È lo gnomone più alto del mondo» | ✅ | Sigismondi; MeteoWeb | Il Museo Galileo dice «il più alto mai realizzato in una chiesa». Vedi D5. |

### `toscana` (10⁵ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 30 | 100 km, da Firenze al mare lungo la valle dell'Arno | ✅ | calcolo | Dal Duomo alla foce dell'Arno: 80 km in linea d'aria. |
| 31 | Galileo nato a Pisa nel 1564 | ✅ | [Museo Galileo](https://catalogo.museogalileo.it/biografia/GalileoGalilei.html); [Treccani](https://www.treccani.it/enciclopedia/galileo-galilei/) | 15 febbraio 1564. |
| 32 | «tra i primi a puntare un cannocchiale verso il cielo» | ✅ | Treccani | Thomas Harriot disegnò la Luna al telescopio qualche mese prima (luglio 1609): «tra i primi» è esatto. |
| 33 | quello che vide cambiò l'idea dell'universo | ✅ | Museo Galileo | |
| 34 | Virgo a Cascina: due tunnel di 3 km a L, con raggi laser | ✅ | [Virgo](https://www.virgo-gw.eu/science/detector/); [Asimmetrie (INFN)](https://archivio.asimmetrie.it/images/15/pdf/asimmetrie-9-15.pdf) | |
| 35 | onde gravitazionali da buchi neri che si scontrano lontanissimo | ✅ | [INAF](https://www.media.inaf.it/2017/09/27/unonda-per-tre/) | GW170814, a circa 1,8 miliardi di anni-luce. |
| 36 | si accorge di allungamenti molto più piccoli di un atomo | ✅ | Asimmetrie; Virgo | Circa 10⁻¹⁸ m, un millesimo di protone; un atomo misura circa 10⁻¹⁰ m. |

### `italia` (10⁶·¹ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 37 | 10⁶·¹ m = 1.260 km, «più o meno la lunghezza dell'Italia» | ✅ | [Istat](https://www.istat.it/it/files//2014/10/01-territorio.pdf) | Estensione massima: 1.200 km. |
| 38 | la Stazione Spaziale gira a circa 400 km d'altezza | ✅ | [ASI](https://www.asi.it/vita-nello-spazio/litalia-in-microgravita/stazione-spaziale-internazionale/); [NASA](https://www.nasa.gov/reference/international-space-station/) | Tra 370 e 460 km. |
| 39 | 400 km, «più o meno la distanza tra Firenze e Napoli» | ✅ | calcolo | 409 km in linea d'aria. |
| 40 | un giro in un'ora e mezza; 16 albe e 16 tramonti al giorno | ✅ | ASI; [NASA](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/) | |
| 41 | Cristoforetti, la prima donna italiana nello spazio | ✅ | [INAF](https://www.media.inaf.it/2014/01/24/lo-spazio-rosa-da-vostok-6-a-futura/); [Geopop](https://www.geopop.it/samantha-cristoforetti-vita-e-missioni/) | Partita il 23 novembre 2014. |
| 42 | nel 2022, la prima donna europea a comandare la Stazione | ✅ | [ESA](https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Astronauts/Samantha_Cristoforetti); [INAF](https://www.media.inaf.it/2022/09/14/cristoforetti-comandante-della-stazione-spaziale/) | Comandante dal 28 settembre 2022. |
| 43 | nata nel 1977, lo stesso anno della partenza di Voyager | ✅ | ESA; [NASA](https://science.nasa.gov/mission/voyager/voyager-1/) | 26 aprile 1977; Voyager 1 il 5 settembre 1977. |

### `terra` (10⁷·² m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 44 | larga circa 12.700 km | ✅ | [NASA, scheda della Terra](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) | Diametro medio 12.742 km, equatoriale 12.756. |
| 45 | l'atmosfera spessa come la buccia di una mela | ✅ | [NOAA](https://gml.noaa.gov/education/info_activities/pdfs/TBI_earths_atmosphere.pdf); [Penn State](https://courses.ems.psu.edu/meteo3/node/1948) | NOAA usa proprio questo paragone. Nessuna pagina NASA lo usa. |
| 46 | Eratostene, più di 2.200 anni fa, con un bastone; Siene senza ombra, ombra corta ad Alessandria | ✅ | [American Physical Society](https://www.aps.org/publications/apsnews/200606/history.cfm) | Circa 240 a.C., cioè 2.265 anni fa. Ad Alessandria l'ombra faceva 7,2°. |
| 47 | arrivò «sorprendentemente vicino alla misura vera» | ✅ | come sopra | L'errore va dall'1% al 16%, a seconda di quanto era lungo lo stadio. |

### `luna` (10⁹ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 48 | la Luna a circa 384.000 km | ✅ | [NASA, scheda della Luna](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) | Distanza media 384.400 km. |
| 49 | a piedi, senza fermarsi, quasi 9 anni | ✅ | calcolo | 8,8 anni a 5 km/h. |
| 50 | la luce ci mette poco più di un secondo | ✅ | calcolo | 1,28 s. |
| 51 | dal 1969 al 1972 dodici astronauti sulla Luna | ✅ | [NASA, Apollo 17](https://www.nasa.gov/mission/apollo-17/) | Schmitt fu «la dodicesima persona» sulla Luna. |
| 52 | per più di 50 anni nessuno è tornato fin lassù | ✅ | calcolo | Da dicembre 1972 ad aprile 2026: 53 anni. |
| 53 | ad aprile 2026 i quattro di Artemis II le hanno girato intorno | ✅ | [NASA](https://www.nasa.gov/blogs/missions/2026/04/06/artemis-ii-flight-day-6-crew-wraps-historic-lunar-flyby/); [Boeing](https://www.boeing.com/features/2026/04/artemis-ii-crew-back-on-earth-after-historic-lunar-flyby) | Partenza 1 aprile, sorvolo 6 aprile, rientro 10 aprile. |
| 54 | più lontano dalla Terra di qualsiasi essere umano prima di loro | ✅ | [NASA](https://www.nasa.gov/news-release/nasas-artemis-ii-crew-eclipses-record-for-farthest-human-spaceflight/) | Circa 406.770 km, 6.600 km oltre il record di Apollo 13. |
| 55 | Christina Koch, la prima donna a viaggiare fino alla Luna | ✅ | [NASA, 2023](https://www.nasa.gov/news-release/nasa-names-astronauts-to-next-moon-mission-first-crew-under-artemis/) | «the first woman … on a lunar mission». |
| 56 | gli specchi lasciati dagli Apollo e il laser | ✅ | [NASA](https://www.nasa.gov/solar-system/laser-beams-reflected-between-earth-and-moon-boost-science/) | Apollo 11, 14 e 15. |
| 57 | distanza nota con un errore di pochi millimetri | ✅ | come sopra | «down to less than a few millimeters». |
| 58 | si allontana di circa 4 cm all'anno | ✅ | NASA, scheda della Luna | 3,8 cm all'anno. |

### `sole` (10¹¹·⁶ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 59 | il Sole è una stella, a circa 150 milioni di km | ✅ | [NASA, scheda del Sole](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html) | 149,6 milioni di km. |
| 60 | in aereo circa 19 anni | ✅ | calcolo | 19,0 anni a 900 km/h. |
| 61 | la luce è partita poco più di 8 minuti fa | ✅ | [NASA](https://science.nasa.gov/sun/facts/) | 8 minuti e 19 secondi. |
| 62 | più di un milione di Terre | ✅ | NASA | 1,3 milioni. |
| 63 | contiene quasi tutta la materia del Sistema Solare | ✅ | NASA | Il 99,8% della massa. |
| 64 | otto pianeti; Mercurio, Venere, Terra e Marte di roccia | ✅ | [NASA](https://science.nasa.gov/solar-system/solar-system-facts/) | |
| 65 | mai guardare il Sole direttamente | ✅ | NASA | |

### `giove` (10¹²·³ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 66 | il pianeta più grande; più di 1.000 Terre | ✅ | [NASA](https://science.nasa.gov/jupiter/facts/) | Volume: 1.321 Terre. |
| 67 | nel 1610 Galileo scoprì quattro lune, le «Stelle Medicee», per i Medici | ✅ | [Museo Galileo](https://catalogo.museogalileo.it/approfondimento/SatellitiGiove.html) | |
| 68 | Io, Europa, Ganimede, Callisto; oceani sotto il ghiaccio di alcune | ✅ | [ESA, scheda di Juice](https://www.esa.int/Science_Exploration/Space_Science/Juice/Juice_factsheet) | Ganimede, Europa e Callisto; Io no. |
| 69 | Juice arriverà nel 2031; «tu avrai quasi 15 anni» | ✅ | ESA | Luglio 2031. |
| 70 | JANUS costruita a Campi Bisenzio, nella fabbrica nata dalle Officine Galileo | ✅ | [Leonardo](https://space.leonardo.com/en/juice); Museo Galileo | Leonardo guida un consorzio (con DLR, IAA-CSIC e Open University) e costruisce le parti principali. Il testo usa le parole di Leonardo. |
| 71 | vede una pallina da tennis a 1 km | ✅ | Leonardo; [Palumbo e altri, 2025](https://elib.dlr.de/226174/1/s11214-025-01158-6.pdf) | Un pixel copre 15 µrad, cioè 1,5 cm a 1 km: la pallina è larga 4–5 pixel. |
| 72 | Galileo per molte notti: i puntini si spostavano, a volte sparivano | ✅ | [Rice, Galileo Project](https://galileo.library.rice.edu/sci/observations/jupiter_satellites.html) | Dal 7 al 15 gennaio 1610. |
| 73 | la prova che non tutto gira intorno alla Terra | ✅ | Museo Galileo | |

### `pianeti-lontani` (10¹³ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 74 | la luce del Sole ci mette circa 4 ore fino a Nettuno | ✅ | [NASA](https://science.nasa.gov/neptune/neptune-facts/) | 4,2 ore. |
| 75 | nel 1990 Voyager 1, a circa 6 miliardi di km, fotografò la Terra | ✅ | [NASA/JPL](https://science.nasa.gov/photojournal/solar-system-portrait-earth-as-pale-blue-dot) | 14 febbraio 1990. |
| 76 | la Terra più piccola di un pixel, in un raggio di luce del Sole | ✅ | come sopra | 0,12 pixel, dentro un raggio di luce diffusa. |
| 77 | il nome «Pallido puntino azzurro» | ✅ | [NASA](https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot) | Traduzione di «Pale Blue Dot». |

### `voyager` (10¹³·⁷ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 78 | partito dalla Terra nel 1977 | ✅ | [NASA](https://science.nasa.gov/mission/voyager/voyager-1/) | 5 settembre 1977. |
| 79 | viaggia da quasi 50 anni | ✅ | [NASA](https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/) | 49 anni e 2 mesi. |
| 80 | ci manda ancora messaggi | ✅ | [NASA, 29 ottobre 2026](https://science.nasa.gov/blogs/voyager/2026/10/29/nasas-voyager-1-conserves-power-resolves-brief-communications-pause/) | Silenzio dal 18 al 20 ottobre 2026, poi il contatto è ripreso. Restano accesi due strumenti. |
| 81 | la cosa costruita dall'uomo più lontana di sempre | ✅ | [NASA](https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/) | |
| 82 | a circa un giorno-luce da noi | ✅ | come sopra | Lo raggiunge il 18 novembre 2026 alle 10:16:07 UTC. |
| 83 | un giorno-luce è circa 26 miliardi di km | ✅ | come sopra; calcolo | 25.902.068.371 km. |
| 84 | un giorno per arrivare, un altro per la risposta | ✅ | NASA | |
| 85 | il trasmettitore è potente quanto la lampadina di un frigorifero | ✅ | [NASA/JPL](https://www.jpl.nasa.gov/news/two-voyagers-taught-us-how-to-listen-to-space/) | Proprio il paragone del JPL. |
| 86 | «il suo computer ha circa 70 kilobyte di memoria» | ⚠️ → ✅ | [NASA, FAQ](https://science.nasa.gov/mission/voyager/frequently-asked-questions/) | Sono sei computer; 69,63 kB in tutto. Corretto: P3. |
| 87 | meno di una sola foto fatta con un telefono | ✅ | | Una foto pesa qualche megabyte. |
| 88 | antenne larghe 70 m in California, Spagna e Australia | ✅ | NASA/JPL | Goldstone, Madrid, Canberra. |
| 89 | il segnale arriva miliardi di miliardi di volte più debole | ✅ | NASA/JPL; calcolo | Rapporto tra 10²⁰ e 10²³: il testo semmai è prudente. |

### `oort` (10¹⁶·⁴ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 90 | un guscio di miliardi di blocchi di ghiaccio | ✅ | [NASA](https://science.nasa.gov/solar-system/oort-cloud/facts) | «hundreds of billions, even trillions». |
| 91 | i suoi pezzi sono lontanissimi l'uno dall'altro | ✅ | calcolo | In media decine di UA tra un pezzo e l'altro. |
| 92 | da lì arrivano alcune comete | ✅ | NASA | Le comete di lungo periodo. |
| 93 | Voyager: circa 300 anni per l'inizio, forse 30.000 per attraversarla | ✅ | [NASA](https://www.nasa.gov/image-article/solar-system-perspective); NASA, FAQ | Parole della NASA. Nota: 300 anni portano a circa 1.000 UA, mentre la NASA altrove mette il bordo interno a 2.000–5.000 UA. |
| 94 | più in là la gravità delle altre stelle vince su quella del Sole | ✅ | [Wikipedia](https://en.wikipedia.org/wiki/Oort_cloud) | Semplificazione della «marea galattica». Vedi D4. |
| 95 | nessuno l'ha mai vista; Jan Oort, 1950 | ✅ | [NASA](https://science.nasa.gov/solar-system/oort-cloud/) | |
| 96 | aspettiamo ancora una prova diretta | ✅ | NASA | |

### `bolla` (10¹⁷·⁵ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 97 | la luce corre a quasi 300.000 km al secondo | ✅ | [NIST](https://physics.nist.gov/cgi-bin/cuu/Value?c) | 299.792,458 km/s, esatta per definizione. |
| 98 | in 10 anni la luce forma una bolla di 10 anni-luce | ✅ | definizione | |
| 99 | un anno-luce è circa 9.500 miliardi di km | ✅ | [NASA](https://science.nasa.gov/exoplanets/what-is-a-light-year/) | 9.461 miliardi. |
| 100 | Proxima Centauri, la più vicina al Sole, 4,2 anni-luce | ✅ | [NASA/Hubble](https://science.nasa.gov/asset/hubble/proper-motion-path-of-proxima-centauri/) | |
| 101 | dentro c'è la stella di Barnard | ✅ | [Wikipedia](https://en.wikipedia.org/wiki/List_of_nearest_stars) | 5,96 anni-luce. |
| 102 | Sirio, la più luminosa del cielo notturno, 8,6 anni-luce | ✅ | [NASA/Hubble](https://science.nasa.gov/asset/hubble/the-dog-star-sirius-and-its-tiny-companion/) | |
| 103 | a 10 anni e mezzo la luce raggiunge Epsilon Eridani | ✅ | [NASA/Hubble](https://science.nasa.gov/asset/hubble/artists-concept-of-nearest-exoplanet-to-our-solar-system-2) | 10,47 anni-luce. |
| 104 | Epsilon Eridani è più giovane del Sole | ✅ | come sopra | Tra 200 e 800 milioni di anni, contro 4,6 miliardi. |
| 105 | parallasse: il pollice, la Terra a gennaio e a luglio | ✅ | [INAF Brera](https://museoastronomico.brera.inaf.it/en/cosmic-distances) | Sei mesi: i due lati opposti dell'orbita. |
| 106 | nel 1838 Bessel misurò 61 Cygni, a circa 11 anni-luce | ✅ | INAF Brera | Oggi 11,4 anni-luce; Bessel trovò 10,3. Fu la prima distanza di una stella pubblicata. |

### `nebulose` (10¹⁹·⁴ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 107 | ora vediamo migliaia di anni-luce | ✅ | calcolo | La vista è larga 2.650 anni-luce. |
| 108 | le nebulose sono nubi di gas e polvere dove nascono stelle | ✅ | [NASA, M42](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/) | |
| 109 | la Nebulosa di Orione a circa 1.300 anni-luce | ✅ | [ESO](https://www.eso.org/public/images/eso1723a/) | ESO: circa 1.350; con Gaia da 1.270 a 1.350. |
| 110 | d'inverno, a occhio nudo, sotto le tre stelle della cintura | ✅ | NASA, M42 | |
| 111 | lì dentro si formano stelle e forse pianeti | ✅ | [NASA, Webb](https://science.nasa.gov/missions/webb/webb-makes-first-detection-of-crucial-carbon-molecule/) | |
| 112 | il Sole è nato in una nube così, 4,6 miliardi di anni fa | ✅ | [NASA](https://science.nasa.gov/sun/facts/) | |

### `via-lattea` (10²¹·² m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 113 | tra 100 e 400 miliardi di stelle, larga circa 100.000 anni-luce | ✅ | [NASA](https://science.nasa.gov/universe/stories/quick-reads/how-big-is-our-galaxy-the-milky-way/) | |
| 114 | il Sole sta in un braccio laterale, lontano dal centro | ✅ | NASA; [ESA, Gaia](https://www.cosmos.esa.int/web/gaia/dr3-where-are-the-stars) | Il Braccio di Orione. Secondo Gaia è più lungo del previsto. |
| 115 | il Sole gira a circa 800.000 km/h | ✅ | [NASA StarChild](https://starchild.gsfc.nasa.gov/docs/StarChild/questions/question18.html); calcolo | La NASA dà tra 720.000 e 828.000 km/h. |
| 116 | un giro in circa 230 milioni di anni | ✅ | NASA StarChild; [Live Science](https://www.livescience.com/how-long-galactic-year.html) | Le stime vanno da 210 a 250 milioni di anni. |
| 117 | l'ultima volta comparivano i primi dinosauri | ✅ | [Natural History Museum](https://www.nhm.ac.uk/discover/where-did-dinosaurs-come-from.html) | Tra 230 e 245 milioni di anni fa. |
| 118 | al centro un buco nero di 4 milioni di Soli | ✅ | [ESO](https://www.eso.org/public/news/eso2208-eht-mw/) | |
| 119 | la striscia chiara d'estate è il disco visto di taglio | ✅ | [NASA](https://science.nasa.gov/universe/galaxies/) | |
| 120 | nessuno l'ha fotografata da fuori: è una ricostruzione | ✅ | [ESA](https://www.esa.int/Science_Exploration/Space_Science/Gaia/Last_starlight_for_ground-breaking_Gaia) | |
| 121 | Gaia ha misurato quasi due miliardi di stelle | ✅ | ESA | Posizione per 1,81 miliardi, anche il moto per 1,47 miliardi. «Quasi due miliardi» sono parole dell'ESA. |

### `andromeda` (10²²·⁸ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 122 | Andromeda a 2,5 milioni di anni-luce | ✅ | [NASA, M31](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/) | |
| 123 | più grande della nostra galassia | ✅ | [NASA](https://science.nasa.gov/missions/hubble/nasas-hubble-traces-hidden-history-of-andromeda-galaxy/) | Disco largo più di 200.000 anni-luce, mille miliardi di stelle. La massa è simile, ma il testo parla di grandezza. |
| 124 | con decine di galassie più piccole forma il Gruppo Locale | ✅ | [NASA](https://science.nasa.gov/universe/galaxies/large-scale-structures/) | Più di 50. |
| 125 | «quando sulla Terra vivevano i primi antenati degli esseri umani» | ⚠️ → ✅ | [Smithsonian](https://humanorigins.si.edu/evidence/human-fossils/species/australopithecus-garhi) | Corretto: P4. |
| 126 | guardare lontano è guardare indietro nel tempo | ✅ | NASA | |
| 127 | da un posto molto buio si vede a occhio nudo | ✅ | NASA, M31 | |
| 128 | fino a circa 100 anni fa nessuno sapeva che esistessero altre galassie | ✅ | [NASA](https://science.nasa.gov/missions/hubble/nasa-celebrates-edwin-hubbles-discovery-of-a-new-universe/) | Qualcuno lo sospettava, ma nessuno lo sapeva. |
| 129 | nel 1912 Henrietta Leavitt trovò la regola delle stelle che pulsano | ✅ | [Physics Today](https://physicstoday.aip.org/news/henrietta-swan-leavitt) | |
| 130 | nel 1923 Hubble ne trovò una in Andromeda: fuori dalla Via Lattea | ✅ | NASA; [Astronomy](https://www.astronomy.com/today-in-the-history-of-astronomy/oct-5th-1923-hubble-discovers-galaxies-beyond-the-milky-way/) | La stella V1, periodo 31,4 giorni. |

### `laniakea` (10²⁴·⁸ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 131 | gruppi, ammassi e superammassi tenuti insieme dalla gravità | ✅ | [NASA](https://science.nasa.gov/universe/galaxies/large-scale-structures/) | |
| 132 | Laniakea è largo circa 520 milioni di anni-luce | ✅ | [Nature, Tully e altri 2014](https://www.nature.com/articles/nature13674) | 160 megaparsec = 522 milioni di anni-luce. |
| 133 | contiene circa 100.000 galassie | ✅ | [Università delle Hawaii](https://www.hawaii.edu/news/2014/09/03/uh-scientist-maps-supercluster-of-galaxies-names-it-laniakea/); [Keck](https://keckobservatory.org/?p=4435) | |
| 134 | in hawaiano «cielo immenso», per i navigatori polinesiani | ✅ | Università delle Hawaii; Keck | |
| 135 | confini tracciati nel 2014 misurando il moto di migliaia di galassie | ✅ | Keck | Più di 8.000 galassie. |
| 136 | le galassie scivolano tutte verso lo stesso punto | ✅ | Keck | Verso il Grande Attrattore, che è una regione: semplificazione accettabile. |

### `rete-cosmica` (10²⁵·⁶ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 137 | filamenti di galassie attorno a grandi spazi quasi vuoti | ✅ | NASA | |
| 138 | Webb: un granello di sabbia a braccio teso, migliaia di galassie | ✅ | [ESA](https://www.esa.int/Science_Exploration/Space_Science/Webb/Webb_delivers_deepest_image_of_Universe_yet); [NASA](https://science.nasa.gov/missions/webb/nasas-webb-delivers-deepest-infrared-image-of-universe-yet/) | |
| 139 | misurata la posizione di milioni di galassie | ✅ | [DESI](https://www.desi.lbl.gov/2026/04/15/desi-reaches-mapping-milestone-surpassing-expectations/) | DESI: più di 47 milioni di galassie e quasar. |
| 140 | più la luce è arrossata, più la galassia è lontana; l'espansione stira la luce | ✅ | [NASA](https://science.nasa.gov/mission/hubble/science/science-behind-the-discoveries/hubble-cosmological-redshift/) | |

### `universo` (10²⁶·⁹⁴ m)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 141 | una sfera con noi al centro, perché è l'universo visto da qui | ✅ | [NASA](https://www.nasa.gov/science-research/astrophysics/how-big-is-space-we-asked-a-nasa-expert-episode-61/) | |
| 142 | centinaia di miliardi di galassie | ✅ | NASA | «hundreds of billions, perhaps a trillion». |
| 143 | l'universo ha circa 13,8 miliardi di anni | ✅ | [ESA, Planck](https://www.esa.int/Science_Exploration/Space_Science/Planck/Celebrating_the_legacy_of_ESA_s_Planck_mission) | 13,787 ± 0,020 miliardi di anni. |
| 144 | come l'orizzonte in mare; oltre, quasi certamente continua | ✅ | NASA | |
| 145 | il bordo a circa 46 miliardi di anni-luce, per l'espansione | ✅ | NASA; [Wikipedia](https://en.wikipedia.org/wiki/Observable_universe) | 92 miliardi da un bordo all'altro. |

### Atto II: `oltre`, `atomi`, `googol`, `googolplex`

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 146 | per quanto grande sia un numero, si può sempre aggiungere 1 | ✅ | matematica | |
| 147 | circa 10⁸⁰ atomi nell'universo osservabile | ✅ | [Plus Magazine](https://plus.maths.org/content/too-big-write-not-too-big-graham); [Vopson 2021](https://arxiv.org/abs/2112.04473) | Le stime vanno da 10⁷⁸ a 10⁸². |
| 148 | carbonio, ossigeno e ferro del corpo sono nati nelle stelle | ✅ | [NASA Chandra](https://chandra.harvard.edu/chemistry/); [NASA](https://science.nasa.gov/astrobiology/learning-resources/alp/are-we-really-made-of-star-stuff/) | L'idrogeno viene dal Big Bang, ma «polvere di stelle» è il modo in cui lo dice la NASA. |
| 149 | un googol è un 1 seguito da 100 zeri | ✅ | [MathWorld](https://mathworld.wolfram.com/Googol.html) | |
| 150 | il nome lo inventò Milton Sirotta, 9 anni, nipote di un matematico americano | ✅ | MathWorld | Edward Kasner, 1938. |
| 151 | un googol è molto più grande del numero degli atomi | ✅ | calcolo | 10²⁰ volte. |
| 152 | Google ha preso il nome dal googol | ✅ | [Brin e Page 1998](https://snap.stanford.edu/class/cs224w-readings/Brin98Anatomy.pdf); [Google](https://about.google/our-story/) | «fits well with our goal of building very large-scale search engines». |
| 153 | un googolplex è un 1 seguito da un googol di zeri | ✅ | [MathWorld](https://mathworld.wolfram.com/Googolplex.html) | |
| 154 | non si può scrivere nemmeno con una cifra su ogni atomo | ✅ | Plus Magazine | 10¹⁰⁰ zeri contro 10⁸⁰ atomi. |
| 155 | esistono numeri ancora più grandi, e si studiano | ✅ | Plus Magazine | Per esempio il numero di Graham. |

### Disco d'oro (`golden-record.ts`)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 156 | nel 1977, un disco d'oro su tutte e due le Voyager | ✅ | [NASA](https://science.nasa.gov/mission/voyager/golden-record-contents/) | |
| 157 | un gruppo guidato da Carl Sagan | ✅ | NASA | «committee chaired by Carl Sagan». |
| 158 | «115 immagini della Terra» | ⚠️ → ✅ | NASA | Il numero è giusto; una decina non mostra la Terra. Corretto: P5. |
| 159 | suoni della natura, musiche di tutto il mondo, saluti in 55 lingue | ✅ | NASA | |
| 160 | la voce italiana dice «Tanti auguri e saluti» | ✅ | [Wikipedia](https://en.wikipedia.org/wiki/Contents_of_the_Voyager_Golden_Record); [NASA](https://science.nasa.gov/mission/voyager/golden-record-contents/greetings/) | La NASA dà solo la traduzione inglese, «Many greetings and wishes». |

### Interfaccia ed etichette (`ui.ts`, `labels.ts`, `finale.ts`)

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 161 | `voyager.sincePageOpenedCloser`: la Terra a circa 30 km/s contro i 17 di Voyager; da fine gennaio a fine aprile si avvicina | ✅ | [NASA](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html); JPL Horizons (M4) | 29,8 km/s. Ricalcolato: succede per circa 45° attorno all'inizio di marzo, cioè da circa il 20 gennaio a circa il 22 aprile. |
| 162 | `voyager.milestoneBefore` e `milestoneAfter`: un giorno-luce, «la prima volta nella storia» | ✅ | NASA | Dopo il 18 novembre la distanza non torna più sotto un giorno-luce (verificato in M4). |
| 163 | `bubble.variants`: Epsilon Eridani e 61 Cygni raggiunti | ✅ | come la tappa `bolla` | Dipendono dagli stessi dati della scena. |
| 164 | `controls.forwardAria` e `backAria`: «moltiplica / dividi la scala per 10» | ⚠️ → ✅ | esponenti di `levels.ts` | Solo per i lettori di schermo. Corretto: D3. |
| 165 | `hints.touch`: «Scorri verso l'alto … per allontanarti» | ✅ | `src/engine/input.ts` | Trascinare verso l'alto allontana. |
| 166 | `sourcesPage.intro`: «Ogni numero di questo viaggio è stato controllato» | ✅ | questo rapporto | |
| 167 | `LABELS.places`: Sole, Luna, Giove e le lune di Galileo, Saturno, Voyager 1, l'orbita di Nettuno, nube di Oort, «un blocco di ghiaccio», Nebulosa di Orione, Via Lattea, Andromeda, Galassia del Triangolo | ✅ | NASA (nube di Oort: «icy bodies») | |
| — | `finale.ts`, frasi-ponte | — | | Nessun fatto da verificare. Il messaggio di Nicola è escluso. |

## Dati (`data.ts`)

| Costante | Valore | Esito | Fonte | Nota |
|---|---|---|---|---|
| `LIGHT_SPEED_KM_S` | 299.792,458 | ✅ | [NIST](https://physics.nist.gov/cgi-bin/cuu/Value?c) | Esatta per definizione. |
| `LIGHT_DAY_KM` | 25.902.068.371 km | ✅ | calcolo | La NASA scrive 25.902.068.356: 15 km di arrotondamento suo; il nostro è il prodotto esatto. |
| `LIGHT_YEAR_KM` | 9,4607 × 10¹² km | ✅ | [NASA](https://science.nasa.gov/exoplanets/what-is-a-light-year/) | Anno giuliano, come vuole l'IAU. |
| `VOYAGER_1.launchDateUTC` | 1977-09-05 12:56:00 | ✅ | NASA | Wikipedia dà 12:56:01. |
| `VOYAGER_1.lightDayDateUTC` | 2026-11-18 10:16:07 UTC | ✅ | [NASA](https://science.nasa.gov/mission/voyager/voyager-1/voyager-1-what-is-a-light-day/) | «5:16:07 a.m. EST». |
| `VOYAGER_1.speedKmS` | 17 | ✅ | NASA | 61.000 km/h, cioè 16,9 km/s. |
| `UNIVERSE_AGE_GYR` | 13,8 | ✅ | [Planck 2018](https://arxiv.org/abs/1807.06209) | 13,787 ± 0,020. |
| `OBSERVABLE_UNIVERSE_RADIUS_LY` | 46,5 × 10⁹ | ✅ | NASA | |
| `VOYAGER_1_DISTANCE` | tabella di Horizons | ✅ | JPL Horizons (M4) | Verificata in M4 da `tests/voyager.test.ts`. |

### Le stelle della bolla (`NEARBY_STARS`)

Riferimento: [Wikipedia, List of nearest stars](https://en.wikipedia.org/wiki/List_of_nearest_stars) (parallassi Gaia DR3, coordinate J2000 da RECONS) e le pagine delle singole stelle. Tolleranza: 0,1 anni-luce, 0,02 h, 0,2°. Tutte le coordinate sono entro 0,01 h e 0,01°.

| Stella | `data.ts` (a.l.) | Fonte (a.l.) | Esito |
|---|---|---|---|
| Proxima Centauri | 4,24 | 4,2465 | ✅ |
| Alfa Centauri A e B | 4,37 | 4,344 (RECONS 4,365) | ✅ |
| Stella di Barnard | 5,96 | 5,963 | ✅ |
| Wolf 359 | 7,9 | 7,856 | ✅ |
| Lalande 21185 | 8,3 | 8,304 | ✅ |
| Sirio | 8,6 | 8,61 | ✅ |
| Luyten 726-8 | 8,7 | 8,770 | ✅ |
| Ross 154 | 9,7 | 9,706 | ✅ |
| Ross 248 | 10,3 | 10,306 | ✅ |
| Epsilon Eridani | 10,5 | 10,475 | ✅ |
| Lacaille 9352 | 10,7 | 10,724 | ✅ |
| Ross 128 | ~~10,9~~ **11,0** | 11,007 | ❌ → corretto |
| EZ Aquarii | **11,1** (aggiunta) | 11,11 | mancava → aggiunta (D1) |
| 61 Cygni | 11,4 | 11,404 | ✅ |
| Procione | 11,46 | 11,463 | ✅ |
| Struve 2398 | **11,49** (aggiunta) | 11,49 | mancava → aggiunta (D1) |

Ora la tabella è completa fino a 11,5 anni-luce. Restano fuori solo le nane brune (Luhman 16 a 6,5 anni-luce, WISE 0855−0714 a 7,4), e va bene così: non sono stelle. Le compagne (Sirio B, Procione B, 61 Cygni B) sono nei sistemi già elencati.

La nota di 61 Cygni («la prima stella di cui si è misurata la distanza (1838)») è giusta. Henderson aveva osservato Alfa Centauri nel 1832–33, ma pubblicò nel 1839. Il valore di Struve per Vega era provvisorio.

## Numeri nel codice delle scene

| Dove | Valore | Esito | Fonte | Nota |
|---|---|---|---|---|
| `solar-system.ts` | Mercurio 0,387 · Venere 0,723 · Terra 1 · Marte 1,524 · Giove 5,2 · Saturno 9,57 · Urano 19,2 UA | ✅ | [NASA, tabella dei pianeti](https://nssdc.gsfc.nasa.gov/planetary/factsheet/planet_table_ratio.html) | |
| `solar-system.ts` | Nettuno 30,1 UA | ✅ | JPL, elementi orbitali medi | 30,07 UA. La NSSDC dà 30,18 (valore osculante). |
| `solar-system.ts` | raggio del Sole 695.700 km | ✅ | NASA, scheda del Sole | |
| `stage.ts` | UA = 149.597.870.700 m | ✅ | IAU 2012 | Esatta per definizione. |
| `stage.ts` | raggio della Terra 6.371 km | ✅ | NASA, scheda della Terra | |
| `stage.ts` | distanza della Luna 384.400 km | ✅ | NASA, scheda della Luna | |
| `stage.ts` | centro galattico a 26.000 anni-luce | ✅ | [ESO](https://www.eso.org/public/news/eso2208-eht-mw/) | L'ESO dice circa 27.000. In scena la differenza non si vede e nessun testo dà la cifra. |
| `stage.ts` | Nebulosa di Orione a 1.344 anni-luce | ✅ | ESO | Circa 1.350. |
| `stage.ts` | Andromeda a 2,5 milioni di anni-luce dal centro galattico | ✅ | NASA, M31 | |
| `stage.ts` | Laniakea: centro a 230 milioni di anni-luce, raggio 260 milioni | ✅ | Nature 2014 | Noi in periferia, come nel testo. |
| `levels.ts` | esponente dell'universo 26,94 | ✅ | calcolo | 2 × 46,5 miliardi di anni-luce → 10²⁶·⁹⁴ m. |
| `levels.ts` | `italia` 10⁶·¹ m | ✅ | calcolo | 1.260 km. |
| `levels.ts` | `voyager` 10¹³·⁷ m | ✅ | calcolo | 335 UA: Voyager (172 UA) sta dentro con la vista decentrata. |
| `levels.ts` | `oort` 10¹⁶·⁴ m | ✅ | calcolo | 2,7 anni-luce, cioè 168.000 UA: c'è tutto il guscio fino a circa 100.000 UA. |

## Calcoli

Rifatti con uno script Node (anno giuliano; 1 UA = 149.597.870,7 km; luce 299.792,458 km/s).

| Conto | Risultato | Testo |
|---|---|---|
| Luna a piedi: 384.400 km a 5 km/h | 8,77 anni | «quasi 9 anni» ✅ |
| Luce fino alla Luna | 1,28 s | «poco più di un secondo» ✅ |
| Da Apollo 17 (dicembre 1972) ad Artemis II (aprile 2026) | 53,3 anni | «più di 50 anni» ✅ |
| Sole in aereo: 149,6 milioni di km a 900 km/h | 18,96 anni | «circa 19 anni» ✅ |
| Luce fino al Sole | 499 s = 8 min 19 s | «poco più di 8 minuti» ✅ |
| Volume del Sole / volume della Terra | 1.302.097 | «più di un milione» ✅ |
| Volume di Giove / volume della Terra | 1.321 | «più di 1.000» ✅ |
| Luce fino a Nettuno (30,07 UA) | 4,17 ore | «circa 4 ore» ✅ |
| Pale Blue Dot: 40,5 UA | 6,06 miliardi di km | «circa 6 miliardi» ✅ |
| JANUS: pallina da 6,7 cm a 1 km | 67 µrad, cioè 4–5 pixel da 15 µrad | ✅ |
| Firenze–Napoli in linea d'aria | 409 km | «circa 400» ✅ |
| Stazione di Rifredi–Duomo in linea d'aria | 3,4 km | «circa 3» ✅ |
| Duomo–foce dell'Arno | 80 km | dentro i 100 km ✅ |
| 1 km a 4–5 km/h | 12–15 minuti | «un quarto d'ora» ✅ |
| Orbite della Stazione Spaziale al giorno (92,9 min) | 15,5 | «16 albe» ✅ (lo dicono ASI e NASA) |
| Eratostene (circa 240 a.C.) | 2.265 anni fa | «più di 2.200» ✅ |
| Atmosfera di 100 km su una mela di 8 cm | 0,6 mm | «più o meno la buccia» ✅ |
| Giorno-luce | 25.902.068.371 km | «circa 26 miliardi» ✅ |
| Anni di viaggio di Voyager al 17 novembre 2026 | 49,2 | «quasi 50» ✅ |
| Segnale di Voyager: 22,4 W, antenna di 3,66 m a 8,4 GHz, ricevuto da 70 m | 3,5 × 10⁻¹⁹ W, rapporto 6 × 10¹⁹ | «miliardi di miliardi» ✅ |
| Voyager fino a 1.000 UA, a 3,6 UA all'anno | circa 280 anni | «circa 300 anni» ✅ |
| Voyager fino a 100.000 UA | circa 28.000 anni | «forse 30.000» ✅ |
| Anno-luce | 9.461 miliardi di km | «circa 9.500 miliardi» ✅ |
| Sole a 230 km/s | 828.000 km/h | «circa 800.000» ✅ |
| Anno galattico (26.670 anni-luce, 230 km/s) | circa 218 milioni di anni | «circa 230» ✅ |
| Laniakea, 160 megaparsec | 522 milioni di anni-luce | «circa 520» ✅ |
| Diametro dell'universo osservabile (2 × 46,5 miliardi di anni-luce) | 10²⁶·⁹⁴ m | esponente 26,94 ✅ |
| Googol / 10⁸⁰ | 10²⁰ | «molto più grande» ✅ |

## Incerti e da ricontrollare

- **M2, le Officine Galileo «qui».** Il testo di `quartiere` dice che la fabbrica era «qui», dentro la vista di 1 km attorno al punto di partenza. Va controllato in M2 con le coordinate del punto di partenza (che restano fuori dal repo), prima di disegnare un segno sull'area delle ex Officine. **Risolto in M2**: su OpenStreetMap l'area è l'«Ex Meccanotessile di Rifredi», con il nome alternativo «Ex Officine Galileo» (la stampa locale conferma che lì c'era la sede delle Officine); dista dal punto di partenza tra circa 750 e 980 m e sta tutta nella vista di 1 km di `quartiere`, centrata a sud-est (`tests/geo.test.ts`). Il testo non cambia.
- **Merate** (D6): quale strumento le Officine Galileo abbiano fatto per Merate resta aperto. Forse il telescopio Ruths (1968, «costruito in Italia»), non confermato.
- **La pagina dell'Opera del Duomo** sullo gnomone non si apre (403). Un frammento di ricerca attribuisce alla rivista dell'Opera cifre diverse (1467, 86 m, «il più alto d'Europa ancora in uso»): non è stato possibile leggerlo. 1475, 90 m e 4 cm si appoggiano a Museo Galileo, Sigismondi e MeteoWeb.
- **Rifredi**: la forma più antica del nome («Riofreddo», 1201) è citata da Wikipedia senza fonte.
- **La buccia della mela**: il paragone è della NOAA, non della NASA. Funziona con la cima dell'atmosfera a circa 50 km; con 100 km l'atmosfera è spessa circa il doppio della buccia. «Più o meno» copre la differenza.
- **Koch, «la prima donna»**: la NASA lo scrive nel comunicato del 2023 sull'equipaggio; le pagine NASA del 2026 non lo ripetono, ma non c'è nessun'altra donna nell'equipaggio.
- **La potenza del trasmettitore di Voyager** (circa 22 W) non è su nessuna pagina NASA o JPL. Il testo usa solo il paragone della lampadina, che invece è del JPL.
- **69,63 kB** non è scritto così su nasa.gov: viene dalla somma delle memorie elencate nelle FAQ della NASA.
- **«Tanti auguri e saluti»**: le parole italiane sono confermate da Wikipedia. La NASA mostra solo la traduzione inglese.
- **10⁸⁰ atomi**: nessuna pagina NASA o ESA dà la cifra. Ci sono una rivista dell'Università di Cambridge e un articolo scientifico.
- **Nebulosa di Orione**: la pagina NASA su M42 dà ancora 1.500 anni-luce, un valore vecchio. Le fonti più recenti (ESO, NASA Webb) dicono circa 1.350.

## Pagine che non si sono aperte

- Opera di Santa Maria del Fiore, `duomo.firenze.it` (403, protezione Cloudflare). Resta tra le fonti: si apre normalmente da un browser.
- Merriam-Webster (verifica Cloudflare). Resta tra le fonti; il contenuto è confermato da MathWorld e Plus Magazine.
- SIMBAD (connessione rifiutata): al suo posto le parallassi Gaia DR3 riportate da Wikipedia, confrontate con RECONS.
- Britannica, nobelprize.org, ADS (403 o 405): non servivano, le stesse informazioni erano su altre fonti.
- Documento IAU 2012 sull'unità astronomica (404): il valore è quello standard e coincide con la NASA.

## Ripasso di M8 (18 novembre 2026)

**Cosa:** solo quello che è arrivato dopo il fact-check del 17 novembre, cioè M2, M3, M5 e M7. Testi visibili: le etichette nuove di `labels.ts` (i luoghi, Artemis II, Juice, Nubi di Magellano, Laniakea) e la didascalia, il credito e il testo alternativo di «Pale Blue Dot». Dati di scena: `cosmos.ts` (nebulose, forma della Via Lattea, Gruppo Locale). Numeri nel codice delle scene: Stazione Spaziale, schiacciamento di Giove e Saturno, anelli, lune di Galileo, raggio dell'universo osservabile. I fatti dei disegni e dei suoni del Disco d'oro (M7). `CREDITS.md`.

**Come:** come la prima volta. Ogni fonte è stata aperta, i numeri sono stati ricalcolati con uno script: velocità al suolo della Stazione Spaziale, distanze comoventi, coordinate galattiche da ascensione retta e declinazione, raggi dei bracci di Reid e colleghi (2019), conversioni. La ricerca l'ha fatta un subagente; il rapporto e le decisioni sono di questa sessione.

**In breve:** 25 verifiche, **19 ✅ e 6 ⚠️, nessun ❌**. **Tutti i testi visibili nuovi sono corretti.** Le imprecisioni stanno in dati di scena e in una riga dei crediti. I dati sono stati corretti direttamente, come i dati numerici di `data.ts` nel primo controllo. La riga dei crediti è un testo visibile, nella pagina «È tutto vero», ed è proposta qui sotto. Gli anelli di Saturno sono stati controllati anche sulla texture: è trasparente fino a circa 1,23 raggi, dove comincia l'anello C, e la divisione di Cassini cade tra 1,95 e 1,99 raggi.

| # | Affermazione | Esito | Fonte | Nota |
|---|---|---|---|---|
| 1 | «Pale Blue Dot»: Voyager 1, 14 febbraio 1990; credito NASA/JPL-Caltech, versione del 2020 | ✅ | [NASA, Pale Blue Dot Revisited (PIA23645)](https://science.nasa.gov/photojournal/pale-blue-dot-revisited) | Scattata alle 4:48 GMT del 14 febbraio 1990; rielaborazione del 2020 |
| 2 | Testo alternativo: raggi di luce del Sole, la Terra un puntino dentro uno dei raggi | ✅ | stessa | Luce del Sole diffusa nell'ottica della camera; uno dei raggi passa proprio sulla Terra |
| 3 | Artemis II, un otto tra Terra e Luna; volo con equipaggio ad aprile 2026 | ✅ | [NASA, Artemis II](https://www.nasa.gov/mission/artemis-ii/); [cartella stampa](https://www.nasa.gov/artemis-ii-press-kit/) | Partita il 1° aprile 2026, rientrata il 10; traiettoria di ritorno libero «a forma di otto». Nella scena è uno schema |
| 4 | Juice arriva a Giove a luglio 2031 | ✅ | [ESA, Juice](https://www.esa.int/Science_Exploration/Space_Science/Juice) | |
| 5 | Stazione Spaziale: orbita inclinata di 51,6°, circa 7,2 km/s al suolo | ✅ | [NASA, facts and figures](https://www.nasa.gov/international-space-station/space-station-facts-and-figures/) | Ricalcolato: 7,66 km/s in orbita a 420 km, cioè 7,19 km/s al suolo |
| 6 | Virgo vicino a Pisa, bracci di 3 km | ✅ | [Virgo, il rivelatore](https://www.virgo-gw.eu/science/detector/) | A Cascina |
| 7 | Nubi di Magellano: direzioni e distanze (165.000 e 209.000 anni-luce) | ✅ | [Catalogo McConnachie, gennaio 2021](https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/community/nearby/) | Coordinate e moduli di distanza ricalcolati dal file del catalogo |
| 8 | Laniakea: il bacino di Tully e colleghi (2014), circa 520 milioni di anni-luce, circa 100.000 galassie, Grande Attrattore verso longitudine 307° | ✅ | [Tully et al. 2014](https://arxiv.org/abs/1409.0880); [NRAO](https://public.nrao.edu/news/supercluster-gbt/) | 160 Mpc = 522 milioni di anni-luce |
| 9 | Andromeda: direzione, 2,5 milioni di anni-luce, inclinata di 77°, anello a circa 33.000 anni-luce | ✅ | [NED, M31](https://ned.ipac.caltech.edu/srs/ObjectLookup?name=M31); [NASA, M31](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/); [Gordon et al. 2006](https://arxiv.org/abs/astro-ph/0601314) | 77° è l'inclinazione classica (Walterbos e Kennicutt 1987; altre stime 74–78°) |
| 10 | Galassia del Triangolo: direzione, 2.639.000 anni-luce, inclinata di 55° | ✅ | Catalogo McConnachie; [Kam et al. 2017](https://arxiv.org/abs/1706.04248) | 52–58° secondo il raggio |
| 11 | Via Lattea: 100.000 anni-luce; Sole a 26.000 dal centro; barra lunga 16.000 per lato a 27°; bracci aperti di 12°; Sagittario–Carena a 21.500 e Perseo a 30.500 anni-luce nella direzione del Sole | ⚠️ | [Reid et al. 2019](https://arxiv.org/abs/1910.03357); [GRAVITY 2019](https://arxiv.org/abs/1904.05721); [Wegg et al. 2015](https://arxiv.org/abs/1504.01401) | Sole: 26.600 anni-luce (Reid), 26.000 è la cifra arrotondata della NASA. Barra: 28–33° (Wegg). Apertura media dei bracci maggiori 10°, del Braccio Locale 11,4°. Bracci, riscalati a 26.000: Sagittario 21.900, Perseo 32.100. **Corretto:** la barra a 30°. **Lasciato:** vedi D-M8-1 |
| 12 | Distanze delle nebulose (11 valori) | ⚠️ | [Zucker et al. 2020](https://arxiv.org/abs/2001.00591); [Menten et al. 2007](https://arxiv.org/abs/0709.0485); [NASA, M45](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-45/) | Otto giuste. **Corrette:** Nebulosa California da 1.000 a 1.300 anni-luce (la sua stella ξ Persei, Gaia); Nebulosa di Gum da 1.300 a 1.450 (450 pc, Graham 1986); resti della Vela da 815 a 950 (la pulsar, 287 pc, Dodson et al. 2003). Nessuna di queste ha il nome a schermo |
| 13 | Galassie nane: Sagittario 86.000, Draco 247.000, Fornace 480.000, Leo I 827.000, NGC 6822 1.498.000 anni-luce | ✅ | Catalogo McConnachie | Coincidono tutte |
| 14 | Schiacciamento: Giove 0,935, Saturno 0,902 | ✅ | [NASA, scheda di Giove](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html); [di Saturno](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html) | |
| 15 | Anelli di Saturno da 1,166 a 2,328 raggi, divisione di Cassini al suo posto | ✅ | [NASA, anelli di Saturno](https://nssdc.gsfc.nasa.gov/planetary/factsheet/satringfact.html) | Il subagente segnalava che 1,166 cade nel tenue anello D: la texture però è trasparente fino a circa 1,23 raggi, dove comincia l'anello C. Cassini: 1,95–2,03 raggi |
| 16 | Le lune di Galileo nell'ordine vero, con le grandezze vere tra loro | ✅ | [NASA, satelliti di Giove](https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html) | |
| 17 | Universo osservabile: raggio di circa 46,5 miliardi di anni-luce; le galassie più lontane a circa 33 | ✅ | [MoM-z14](https://arxiv.org/abs/2505.11263) | Ricalcolato coi parametri di Planck 2018: z = 14,44, cioè 33,9 miliardi di anni-luce; orizzonte 46,2 |
| 18 | Il DNA (forma B) è una doppia elica destrorsa, circa 10,5 coppie di basi per giro, con solco maggiore e minore | ✅ | [LibreTexts, DNA structure](https://chem.libretexts.org/) | |
| 19 | Webb vede le stelle con sei punte lunghe e due corte | ✅ | [NASA/STScI, le punte di diffrazione di Webb](https://science.nasa.gov/wp-content/uploads/2023/07/webb-diffractionspikestranscriptstsci-01g77dqfw6pd35sh619tyxt8gt.pdf) | |
| 20 | Cupola di Brunelleschi: a sesto acuto, otto costoloni di marmo bianco, tamburo ottagonale con gli occhi, lanterna con la palla di rame dorato | ✅ | [Museo Galileo](https://brunelleschi.imss.fi.it/itineraries/place/TheDomeOfSantaMariaFiore.html); [DisegnareCon](https://disegnarecon.univaq.it/ojs/index.php/disegnarecon/article/download/24/19) | Il «quinto acuto» è la calotta interna, quella esterna è «quarto acuto». Il disegno è «a sesto acuto» e non dice di più |
| 21 | «Tanti auguri» è «Happy Birthday to You» delle sorelle Hill (1893), di pubblico dominio | ⚠️ | [The Register, 2015](https://www.theregister.com/2015/09/23/happy_birthday_copyright/); [MPR/NPR](https://www.mprnews.org/story/2015/09/23/npr-happy-birthday-song) | La canzone del 1893 è «Good Morning to All»: la melodia è la stessa, ed è di pubblico dominio da decenni. La sentenza americana del 2015 e la scadenza europea del 2017 riguardano le parole di «Happy Birthday». Il sito suona solo la melodia. **Proposta:** P-M8-1 |
| 22 | Morse di «CIAO» e tempi ITU | ✅ | [ITU-R M.1677-1](https://www.itu.int/rec/R-REC-M.1677-1-200910-I/) | |
| 23 | Il Disco d'oro si suona a 16⅔ giri al minuto | ✅ | [NASA, la copertina del Disco d'oro](https://science.nasa.gov/mission/voyager/golden-record-cover/) | Un giro in 3,6 secondi |
| 24 | Il battito del laboratorio, circa 72 al minuto, è quello di un bambino di 10 anni | ⚠️ | [MedlinePlus](https://medlineplus.gov/ency/article/003399.htm); [Cleveland Clinic](https://my.clevelandclinic.org/health/diagnostics/heart-rate) | 60–100 da 10 anni (MedlinePlus); 75–118 da 5 a 12 anni (Cleveland Clinic). **Corretto:** 80 battiti al minuto, dentro tutte e due |
| 25 | Crediti: Black Marble 2016, Blue Marble di novembre 2004, Solar System Scope CC BY 4.0, Natural Earth pubblico dominio, OpenStreetMap ODbL | ✅ | [NASA, Earth at night](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps); [Blue Marble NG](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/); [Solar System Scope](https://www.solarsystemscope.com/textures/); [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/); [OSM](https://www.openstreetmap.org/copyright) | |

### Proposte

| # | Dove | Testo attuale | Testo proposto | Motivo |
|---|---|---|---|---|
| P-M8-1 | `CREDITS.md`, «Il tuo Disco d'oro» (si legge nella pagina «È tutto vero») | La melodia di «Tanti auguri» è «Happy Birthday to You» di Mildred e Patty Hill (1893), di pubblico dominio. | La melodia di «Tanti auguri» è quella di «Good Morning to All» di Mildred e Patty Hill (1893), di pubblico dominio da decenni. | La canzone del 1893 aveva un altro titolo e altre parole; la melodia è la stessa (riga 21) |
| D-M8-1 | La forma della Via Lattea (`galaxy.ts`) | Il Sole disegnato a metà tra Sagittario (21.500) e Perseo (30.500) | (lasciare così) oppure ritoccare la forma perché Perseo stia a circa 32.000 anni-luce dal centro e il Sole più vicino a Sagittario | La galassia disegnata ha quattro bracci simmetrici con la stessa apertura: spostare solo Perseo vuol dire rifarne la forma. Il testo della tappa non dà questi numeri e «Come lo sappiamo?» dice già che è una ricostruzione. Consiglio di lasciarla |

**Decisioni di Nicola (18 novembre 2026):** P-M8-1 e D-M8-1 restano come sono: la riga dei crediti non cambia e la Via Lattea mantiene la sua forma.

### Pagine che non si sono aperte

Il sito dell'Opera del Duomo (403), alcune pagine di ego-gw.it (al loro posto virgo-gw.eu), SIMBAD (al suo posto NED e il calcolo delle coordinate), NCBI (captcha), una pagina di Visible Earth per il Blue Marble di novembre (rimanda a una pagina generica), l'articolo di Nature su Laniakea (al suo posto il testo completo su arXiv), l'articolo di Cha et al. (1999) sulla distanza della Vela (sostituita con quella della pulsar).
