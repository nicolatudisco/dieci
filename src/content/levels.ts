import type { Stop } from './types';

/**
 * The journey, in order. One entry per stop.
 *
 * - Texts are final and were fact-checked on 15 Nov 2026. Do not rewrite them without asking
 *   Nicola; typo fixes are fine. If a fact turns out to be wrong, propose the fix first.
 * - `exponent` is log10 of the width of the view in metres (kind 'space') or log10 of the
 *   number shown (kind 'number'). Values are monotonically increasing.
 * - `visual` is a brief for the scene, written for the developer. It is never shown.
 * - Sources marked "TODO fact-check" still need a primary source link (NASA, ESA, etc.).
 */
export const STOPS: Stop[] = [
  // ───────────────────────────── Act I: from Rifredi to the edge of the universe

  {
    id: 'partenza',
    kind: 'space',
    exponent: 0,
    title: `Si parte da te`,
    text: `Sei a Rifredi, seduta sulla soglia di un grande portone, col naso all'insù: guardi le stelle. Quello che vedi adesso è largo 1 metro. A ogni passo ci allontaneremo, e la scena diventerà 10 volte più grande.`,
    more: `Guarda il contatore: 10⁰ metri. Il numerino piccolo si chiama esponente e ti dice quanti zeri mettere dopo l'1. 10⁰ = 1, perché non ci sono zeri. 10¹ = 10, 10² = 100, 10³ = 1.000. Con gli esponenti si scrivono numeri enormi in pochissimo spazio. Ti serviranno: tra poco i numeri diventeranno giganteschi.`,
    counterLine: `un po' meno della tua altezza`,
    visual: `Notte serena. Vista dall'alto, camera che guarda in giù. Una bambina stilizzata seduta sulla soglia di un grande portone chiuso, ginocchia piegate e piedi appoggiati sull'asfalto, mani sulla soglia, viso rivolto al cielo (cioè verso la camera): silhouette morbida, mai realistica, nessun tratto del viso, nessun dettaglio che la renda riconoscibile. Deve stare tutta dentro l'inquadratura di 1 metro: con le ginocchia piegate occupa circa 75 × 60 cm (con le gambe distese supererebbe il metro, quindi no). La soglia attraversa l'inquadratura dietro di lei, con il filo del portone appena oltre: generico, senza numeri civici, targhe o insegne. Asfalto scuro con grana fine; la luce calda di un lampione fuori campo le disegna un'ombra lunga. Qui nasce il «punto caldo» (vedi CLAUDE.md, «Tu sei qui») che resterà visibile a tutte le scale.`,
    sources: [],
  },

  {
    id: 'strada',
    kind: 'space',
    exponent: 1,
    title: `10 metri`,
    text: `Un passo indietro, e la scena è già 10 volte più larga: 10 metri, più o meno la lunghezza di un autobus.`,
    more: `Ogni passo moltiplica per 10. Dopo 2 passi la scena è 100 volte più larga, dopo 3 passi 1.000 volte, dopo 6 passi un milione di volte. Moltiplicare tante volte per lo stesso numero fa crescere le cose in fretta: per arrivare al bordo di tutto l'universo che possiamo vedere bastano circa 27 passi.`,
    counterLine: `lungo come un autobus`,
    visual: `La stessa strada, larga 10 metri nell'inquadratura: asfalto, marciapiede, il grande portone chiuso visto dall'alto (il filo del muro e un pezzo di tetto), un lampione acceso con il suo cerchio di luce calda, un'auto parcheggiata, un tombino. Lei, piccola, ancora seduta sulla soglia, con il punto caldo. Le prime finestre illuminate ai bordi della scena. Tutto generico: nessun numero civico, targa o insegna. L'asse della strada è orientato come nei dati reali della tappa successiva, così il passaggio a 100 metri non ha salti.`,
    sources: [],
  },

  {
    id: 'rifredi',
    kind: 'space',
    exponent: 2,
    title: `Rifredi`,
    text: `100 metri: le strade di Rifredi, con le finestre accese. Sai da dove viene il nome? Da un torrente, il Terzolle, che anticamente era chiamato «rio freddo» per le sue acque gelide.`,
    more: `Il Terzolle nasce sulle colline di Cercina, a nord di Firenze. Scende attraversando Careggi e Rifredi e poi si getta nel Mugnone, che a sua volta finisce nell'Arno. I Romani lo chiamavano Rivus Frigidus, «ruscello freddo». Col passare dei secoli, da quel nome è nato «Rifredi».`,
    counterLine: `più o meno un campo da calcio`,
    visual: `Strade stilizzate di notte viste dall'alto (dati OpenStreetMap): strade come linee calde, isolati scuri, puntini di finestre accese, macchie di verde. NESSUN segno su case, scuole o altri luoghi privati: il punto caldo sta sul punto di partenza scelto da Nicola, sul bordo di una strada pubblica (vedi CLAUDE.md, «Dati geografici»); nessun edificio evidenziato, nessun numero civico, nessun nome di via. Se il Terzolle cade nell'inquadratura, mostrarlo come un filo d'acqua che riflette la luce.`,
    sources: [
      { title: `Città Metropolitana di Firenze – Torrente Terzolle`, url: `https://www.cittametropolitana.fi.it/wp-content/uploads/Torrente_Terzolle.pdf` },
      { title: `La Nazione – Rifredi, un rione a caccia di futuro`, url: `https://www.lanazione.it/firenze/cronaca/rifredi-un-rione-a-caccia-di-futuro-la-scommessa-delle-ex-fabbriche-1.8478526` },
    ],
  },

  {
    id: 'quartiere',
    kind: 'space',
    exponent: 3,
    title: `1 chilometro`,
    text: `1.000 metri, cioè 1 chilometro: a piedi ci vuole circa un quarto d'ora. Ecco la stazione di Rifredi e i binari. Qui, per circa 70 anni, c'è stata una famosa fabbrica di strumenti scientifici: le Officine Galileo.`,
    more: `Le Officine Galileo si trasferirono a Rifredi nel 1909. Costruivano strumenti per i laboratori di fisica, strumenti ottici e perfino grandi telescopi per gli osservatori astronomici di Asiago e di Merate. Nel 1980 la sede si spostò a Campi Bisenzio, a pochi chilometri da qui. La fabbrica esiste ancora, oggi fa parte di Leonardo e costruisce strumenti che volano nello spazio. Ricordatela: la ritroveremo vicino a Giove.`,
    counterLine: `un quarto d'ora a piedi`,
    visual: `Rifredi dall'alto: binari e stazione di Firenze Rifredi come segno riconoscibile (etichetta leggera), rete di strade luminose. Un segno per l'area delle ex Officine Galileo SOLO se la posizione è verificata su OpenStreetMap o su una fonte affidabile; altrimenti nessun segno.`,
    sources: [
      { title: `Museo Galileo – Officine Galileo: il trasferimento a Rifredi (1909)`, url: `https://exhibits.museogalileo.it/officinegalileo/section/GoodTimesBadTimes.html` },
      { title: `Museo Galileo – Officine Galileo, telescopi per Asiago e Merate`, url: `https://brunelleschi.imss.fi.it/itineraries/place/OfficineGalileo.html` },
      { title: `La Nazione – Leonardo a Campi Bisenzio, erede delle Officine Galileo`, url: `https://www.lanazione.it/cronaca/campi-bisenzio-leonardo-0354d158` },
      // TODO fact-check: fonte primaria per il trasferimento della sede a Campi Bisenzio nel 1980.
    ],
  },

  {
    id: 'firenze',
    kind: 'space',
    exponent: 4,
    title: `Firenze`,
    text: `10 chilometri: tutta Firenze, tagliata in due dall'Arno. Da Rifredi al Duomo ci sono circa 3 chilometri. E il Duomo nasconde un segreto: è anche uno strumento per studiare il Sole.`,
    more: `Nel 1475 l'astronomo fiorentino Paolo dal Pozzo Toscanelli fece mettere nella cupola del Duomo, a circa 90 metri d'altezza, una piastra di bronzo con un forellino largo 4 centimetri. Nei giorni vicini al 21 giugno, verso mezzogiorno, il Sole passa dal foro e disegna un disco di luce sul pavimento. Dalla posizione del disco si misurava il cammino del Sole nel cielo. È lo gnomone più alto del mondo.`,
    counterLine: `tutta la città`,
    visual: `Firenze di notte dall'alto: l'Arno come nastro scuro con riflessi, i ponti, la cupola del Duomo stilizzata e riconoscibile. Rifredi a nord del centro, con un'etichetta leggera e il punto caldo.`,
    sources: [
      { title: `Opera di Santa Maria del Fiore – Lo gnomone`, url: `https://duomo.firenze.it/it/eventi/3762/lo-gnomone` },
      { title: `MeteoWeb – Il Sole «intrappolato» nel Duomo di Firenze`, url: `https://www.meteoweb.eu/2019/06/sole-intrappolato-duomo-firenze-torna-il-suggestivo-fenomeno-gnomone/1271415/` },
    ],
  },

  {
    id: 'toscana',
    kind: 'space',
    exponent: 5,
    title: `La Toscana`,
    text: `100 chilometri: da Firenze fino al mare, lungo la valle dell'Arno. A Pisa, nel 1564, è nato Galileo Galilei. Fu tra i primi a puntare un cannocchiale verso il cielo, e quello che vide cambiò per sempre l'idea che avevamo dell'universo.`,
    more: `La scienza del cielo, in Toscana, continua ancora oggi. A Cascina, vicino a Pisa, c'è Virgo: due tunnel lunghi 3 chilometri, a forma di L, in cui corrono raggi laser. Virgo «ascolta» le onde gravitazionali, piccolissime vibrazioni dello spazio provocate da buchi neri che si scontrano lontanissimo. Riesce ad accorgersi se i tunnel si allungano di molto meno della larghezza di un atomo.`,
    counterLine: `da Firenze al mare`,
    visual: `La valle dell'Arno di notte come vista da un satellite, da Firenze alla costa: luci delle città, il fiume, il mare scuro. Etichette leggere: Firenze, Pisa (Galileo), Cascina (Virgo: i due bracci a L, piccoli ma riconoscibili).`,
    sources: [
      { title: `Asimmetrie (INFN) – Virgo, bracci di 3 km e sensibilità`, url: `https://archivio.asimmetrie.it/images/15/pdf/asimmetrie-9-15.pdf` },
      // TODO fact-check: fonte per Galileo (Pisa, 1564), es. Museo Galileo.
    ],
  },

  {
    id: 'italia',
    kind: 'space',
    exponent: 6.1,
    title: `L'Italia di notte`,
    text: `Ecco tutta l'Italia, vista dallo spazio di notte. Le città accese sembrano costellazioni. A circa 400 chilometri d'altezza, più o meno la distanza tra Firenze e Napoli, gira intorno alla Terra la Stazione Spaziale Internazionale.`,
    more: `Sulla Stazione Spaziale vivono degli astronauti. Fanno il giro della Terra in un'ora e mezza: per questo vedono 16 albe e 16 tramonti ogni giorno. Tra loro c'è stata Samantha Cristoforetti, la prima donna italiana nello spazio. Nel 2022 è diventata la prima donna europea a comandare la Stazione. È nata nel 1977, lo stesso anno in cui è partito un robot che incontreremo più avanti.`,
    counterLine: `più o meno la lunghezza dell'Italia`,
    visual: `L'Italia di notte (texture NASA Black Marble, vedi docs/ASSETS.md), la Toscana appena evidenziata. La Stazione Spaziale come puntino luminoso che attraversa la scena con una scia sottile.`,
    sources: [
      { title: `INAF – Cristoforetti comandante della Stazione Spaziale (2022)`, url: `https://www.media.inaf.it/2022/09/14/cristoforetti-comandante-della-stazione-spaziale/` },
      { title: `Geopop – Samantha Cristoforetti, prima donna italiana nello spazio`, url: `https://www.geopop.it/samantha-cristoforetti-vita-e-missioni/` },
      // TODO fact-check: fonte NASA per quota (~400 km) e periodo orbitale (~90 min) della ISS.
    ],
  },

  {
    id: 'terra',
    kind: 'space',
    exponent: 7.2,
    title: `La Terra`,
    text: `Ecco la Terra intera, larga circa 12.700 chilometri. Tutte le persone che conosci, tutti gli animali, tutti gli oceani, ogni posto in cui sei mai stata: è tutto su questa palla che gira.`,
    more: `Lo strato d'aria che respiriamo, l'atmosfera, è sottilissimo: se la Terra fosse una mela, l'atmosfera sarebbe spessa più o meno come la buccia. Da quassù non si vede nessun confine tra i Paesi. Si vedono solo terra, mare, nuvole e, sul lato della notte, le luci delle città.`,
    howWeKnow: `Più di 2.200 anni fa il greco Eratostene misurò la Terra con un bastone e un po' di geometria. Sapeva che a Siene, in Egitto, in un certo giorno dell'anno il Sole di mezzogiorno non faceva ombra. Lo stesso giorno, ad Alessandria, un bastone faceva un'ombra corta. Da quella piccola differenza calcolò quanto è grande la Terra, e arrivò sorprendentemente vicino alla misura vera.`,
    counterLine: `la Terra intera`,
    visual: `Globo con giorno e notte (terminatore), nuvole, bagliore azzurro dell'atmosfera sul bordo, luci delle città sul lato notturno. All'arrivo dall'Italia la Terra è orientata con l'Italia al centro, poi ruota lentamente.`,
    sources: [
      // TODO fact-check: fonte NASA per il diametro (12.742 km) e per Eratostene.
    ],
  },

  {
    id: 'luna',
    kind: 'space',
    exponent: 9,
    title: `La Luna`,
    text: `La Luna è a circa 384.000 chilometri. Se ci andassi a piedi, senza fermarti mai, ci metteresti quasi 9 anni: quasi tutta la tua vita. La luce, invece, ci mette poco più di un secondo.`,
    more: `Dal 1969 al 1972 dodici astronauti hanno camminato sulla Luna. Poi per più di 50 anni nessuno è tornato fin lassù. Ad aprile 2026 i quattro astronauti della missione Artemis II le hanno girato intorno, arrivando più lontano dalla Terra di qualsiasi essere umano prima di loro. Tra loro c'era Christina Koch, la prima donna a viaggiare fino alla Luna.`,
    howWeKnow: `Gli astronauti delle missioni Apollo hanno lasciato sulla Luna degli specchi speciali. Ancora oggi, dalla Terra, si spara un raggio laser verso quegli specchi e si misura quanto tempo ci mette la luce a tornare. Così conosciamo la distanza della Luna con un errore di pochi millimetri. E abbiamo scoperto che si allontana da noi di circa 4 centimetri all'anno.`,
    counterLine: `il viaggio fino alla Luna`,
    visual: `La Terra piccola, l'orbita della Luna come cerchio sottile, la Luna con i crateri. Facoltativo: la traiettoria a otto di Artemis II, appena accennata.`,
    sources: [
      { title: `Boeing – Artemis II crew back on Earth (aprile 2026)`, url: `https://www.boeing.com/features/2026/04/artemis-ii-crew-back-on-earth-after-historic-lunar-flyby` },
      { title: `Science News Explores – Artemis II's loop around the Moon`, url: `https://www.snexplores.org/article/artemis-orion-loop-farside-moon` },
      // Calcolo: 384.400 km a 5 km/h = 76.880 ore ≈ 8,8 anni. Luce: 384.400 / 299.792 ≈ 1,28 s.
      // TODO fact-check: fonte NASA per il laser ranging lunare (~3,8 cm/anno).
    ],
  },

  {
    id: 'sole',
    kind: 'space',
    exponent: 11.6,
    title: `Il Sole`,
    text: `Il Sole è una stella, a circa 150 milioni di chilometri da noi. In aereo ci vorrebbero circa 19 anni per arrivarci. La luce che ti scalda la faccia è partita dal Sole poco più di 8 minuti fa.`,
    more: `Il Sole è così grande che dentro ci starebbero più di un milione di Terre. Da solo contiene quasi tutta la materia del Sistema Solare. Intorno a lui girano otto pianeti: i quattro più vicini, Mercurio, Venere, Terra e Marte, sono fatti di roccia. Un consiglio da scienziata: non guardare mai il Sole direttamente, nemmeno per un attimo. Può rovinare gli occhi.`,
    counterLine: `la distanza Terra–Sole`,
    visual: `Il Sole luminoso con corona animata (shader), le orbite dei pianeti rocciosi come linee sottili, la Terra come puntino con l'etichetta «Tu sei qui».`,
    sources: [
      // Calcolo: 149,6 milioni di km a 900 km/h ≈ 19 anni. Luce: 149,6e6 / 299.792 ≈ 499 s ≈ 8 min 19 s.
      // TODO fact-check: fonte NASA per volume (~1,3 milioni di Terre) e massa (99,8% del Sistema Solare).
    ],
  },

  {
    id: 'giove',
    kind: 'space',
    exponent: 12.3,
    title: `Giove e le lune di Galileo`,
    text: `Giove è il pianeta più grande: dentro ci starebbero più di 1.000 Terre. Nel 1610 Galileo scoprì che gli girano intorno quattro lune, e le chiamò «Stelle Medicee», in onore dei Medici, la famiglia che governava Firenze.`,
    more: `Oggi quelle lune si chiamano Io, Europa, Ganimede e Callisto, e si pensa che sotto il ghiaccio di alcune ci siano oceani d'acqua. Per studiarle sta viaggiando la sonda europea Juice, che arriverà nel 2031: tu avrai circa 15 anni. A bordo c'è la fotocamera JANUS, costruita a Campi Bisenzio, nella fabbrica nata dalle Officine Galileo. Riesce a vedere una pallina da tennis a un chilometro di distanza.`,
    howWeKnow: `Galileo osservò Giove per molte notti di seguito e disegnò i puntini luminosi accanto al pianeta. Si spostavano: a volte erano a destra, a volte a sinistra, a volte sparivano. Capì che giravano intorno a Giove. Era la prova che non tutto, nel cielo, gira intorno alla Terra.`,
    counterLine: `fino a Giove`,
    visual: `Giove a bande con la Grande Macchia Rossa; le quattro lune galileiane come puntini con il loro nome. Una minuscola sonda Juice in viaggio verso Giove.`,
    sources: [
      { title: `Leonardo – JUICE e la camera JANUS (Campi Bisenzio)`, url: `https://space.leonardo.com/en/juice` },
      { title: `ESA – Juice's journey and Jupiter system tour (arrivo luglio 2031)`, url: `https://www.esa.int/ESA_Multimedia/Videos/2022/03/Juice_s_journey_and_Jupiter_system_tour` },
      { title: `La Nazione – Leonardo a Campi Bisenzio, erede delle Officine Galileo`, url: `https://www.lanazione.it/cronaca/campi-bisenzio-leonardo-0354d158` },
      // TODO fact-check: fonte per «Stelle Medicee» (1610) e volume di Giove (~1.300 Terre).
    ],
  },

  {
    id: 'pianeti-lontani',
    kind: 'space',
    exponent: 13,
    title: `I pianeti lontani`,
    text: `Saturno con i suoi anelli, poi Urano e Nettuno, gelati e lontanissimi. La luce del Sole ci mette circa 4 ore per arrivare fino a Nettuno. E da qui la Terra è soltanto un puntino.`,
    more: `Nel 1990 la sonda Voyager 1, a circa 6 miliardi di chilometri da casa, si voltò e scattò una foto della Terra. Nella foto la Terra è un puntino azzurro più piccolo di un pixel, dentro un raggio di luce del Sole. Quella foto si chiama «Pallido puntino azzurro». Ogni persona, ogni storia, ogni compleanno mai festeggiato: tutto è successo su quel puntino.`,
    counterLine: `fino a Nettuno`,
    visual: `Orbite dei pianeti esterni, Saturno con gli anelli in primo piano mentre si passa. Nell'approfondimento si può mostrare la vera foto «Pale Blue Dot» (NASA/JPL, pubblico dominio, vedi docs/ASSETS.md).`,
    sources: [
      // Calcolo: Nettuno a ~30 UA = 4,5 miliardi di km; luce ≈ 4,2 ore.
      // TODO fact-check: fonte NASA per la foto Pale Blue Dot (14 febbraio 1990, ~6 miliardi di km).
    ],
  },

  {
    id: 'voyager',
    kind: 'space',
    exponent: 13.7,
    special: 'voyager',
    title: `Voyager 1, il robot più lontano`,
    text: `Voyager 1 è un robot partito dalla Terra nel 1977. Viaggia da quasi 50 anni, ci manda ancora messaggi ed è la cosa costruita dall'uomo più lontana di sempre: è a circa un giorno-luce da noi.`,
    more: `Un giorno-luce è la strada che fa la luce in un giorno intero: circa 26 miliardi di chilometri. Un comando mandato a Voyager ci mette un giorno ad arrivare, e la risposta un altro giorno a tornare. Il suo trasmettitore è potente quanto la lampadina di un frigorifero, e il suo computer ha circa 70 kilobyte di memoria: meno di una sola foto fatta con un telefono. Eppure funziona ancora.`,
    howWeKnow: `Lo sappiamo perché lo ascoltiamo ancora. Antenne giganti, larghe 70 metri, in California, in Spagna e in Australia, raccolgono il suo segnale. Quando arriva sulla Terra è debolissimo: miliardi di miliardi di volte più debole della lampadina da cui è partito.`,
    counterLine: `un giorno-luce`,
    visual: `Voyager 1 stilizzata ma riconoscibile (grande antenna parabolica bianca, corpo a dieci lati, bracci lunghi), che si allontana; una scia tratteggiata la collega a un Sole ormai ridotto a stella. Pannello «vivo» con la distanza aggiornata (vedi ui.ts → voyager) e pulsante «Che cosa porta con sé?» che apre il Disco d'oro.`,
    sources: [
      { title: `EarthSky – Voyager 1 a un giorno-luce dalla Terra il 18 novembre 2026`, url: `https://earthsky.org/space/voyager-1-1-light-day-from-earth-november-17-18-2026/` },
      { title: `IFLScience – Confermata la data del 18 novembre 2026`, url: `https://iflscience.com/its-official-voyager-1-will-cross-the-1-light-day-threshold-on-november-18-2026-82733` },
      // TODO fact-check: fonte NASA/JPL per trasmettitore (~22 W), memoria (~69,6 kB) e antenne DSN da 70 m.
    ],
  },

  {
    id: 'oort',
    kind: 'space',
    exponent: 16.4,
    title: `La nube di Oort`,
    text: `Molto più in là c'è la nube di Oort: un guscio enorme di miliardi di blocchi di ghiaccio che circonda tutto il Sistema Solare. Si chiama «nube», ma non è fatta di vapore: i suoi pezzi sono lontanissimi l'uno dall'altro.`,
    more: `Da lì arrivano alcune delle comete che ogni tanto attraversano il cielo con la loro lunga coda. Voyager 1 ci metterà circa 300 anni per raggiungere l'inizio della nube, e forse 30.000 anni per attraversarla. La nube di Oort è il vero confine del Sistema Solare: più in là, la gravità delle altre stelle diventa più forte di quella del Sole.`,
    howWeKnow: `Nessuno l'ha mai vista: i suoi oggetti sono troppo piccoli, bui e lontani. Nel 1950 l'astronomo Jan Oort notò che molte comete arrivano da direzioni diverse e da distanze enormi. Pensò che dovessero venire da un gigantesco serbatoio intorno al Sole. Oggi quasi tutti gli astronomi lo pensano, ma aspettiamo ancora una prova diretta.`,
    counterLine: `i confini del Sistema Solare`,
    visual: `Guscio sferico di particelle tenui intorno al Sole, ormai una stella tra le altre. Qualche cometa che parte dal guscio verso l'interno.`,
    sources: [
      { title: `NASA – Oort Cloud: Facts`, url: `https://science.nasa.gov/solar-system/oort-cloud/facts` },
      { title: `NASA – Solar System Perspective (300 e 30.000 anni)`, url: `https://www.nasa.gov/image-article/solar-system-perspective` },
    ],
  },

  {
    id: 'bolla',
    kind: 'space',
    exponent: 17.5,
    special: 'bubble',
    title: `La bolla dei tuoi 10 anni`,
    text: `La luce corre a quasi 300.000 chilometri al secondo. La luce partita dalla Terra il giorno in cui sei nata viaggia da 10 anni, in tutte le direzioni: ha formato una bolla con un raggio di 10 anni-luce. Questa bolla ha esattamente la tua età.`,
    more: `Un anno-luce è la strada che fa la luce in un anno: circa 9.500 miliardi di chilometri. Dentro la tua bolla ci sono già Proxima Centauri, la stella più vicina al Sole (4,2 anni-luce), la stella di Barnard e Sirio, la più luminosa del cielo notturno (8,6 anni-luce). Quando avrai 10 anni e mezzo, la tua luce raggiungerà Epsilon Eridani, una stella più giovane del Sole.`,
    howWeKnow: `Prova anche tu: allunga il braccio, alza il pollice e guardalo chiudendo prima un occhio e poi l'altro. Il pollice sembra saltare. Gli astronomi fanno lo stesso con le stelle, usando come «occhi» la Terra a gennaio e la Terra a luglio: più una stella è vicina, più salta. Nel 1838 Friedrich Bessel misurò così la distanza di 61 Cygni, a circa 11 anni-luce. Appena fuori dalla tua bolla.`,
    counterLine: `10 anni-luce in ogni direzione`,
    visual: `Una sfera di luce calda e trasparente centrata sul Sole che si espande lentamente fino a 10 anni-luce. Le stelle vicine (data.ts → NEARBY_STARS, posizioni 3D da RA/Dec e distanza) come punti etichettati: si accendono quando la sfera le raggiunge. Epsilon Eridani appena fuori, che pulsa piano. È il momento emotivo del viaggio: musica (se attiva) e ritmo più lento. Se il link contiene #nata=AAAA-MM-GG, il raggio è calcolato esattamente dalla data; altrimenti è 10 anni-luce.`,
    sources: [
      { title: `OpenStax Astronomy – The Nearest Stars`, url: `https://courses.lumenlearning.com/suny-astronomy/?p=32` },
      { title: `Universe Today – Nearest Stars`, url: `https://www.universetoday.com/25220/nearest-stars/` },
      // TODO fact-check: fonte per Bessel e 61 Cygni (1838).
    ],
  },

  {
    id: 'nebulose',
    kind: 'space',
    exponent: 19.4,
    title: `Dove nascono le stelle`,
    text: `Ora vediamo migliaia di anni-luce: il Sole è diventato una stella qualunque, tra tante. In mezzo alle stelle ci sono le nebulose: nubi vere, questa volta, fatte di gas e polvere. È lì che nascono le stelle nuove.`,
    more: `La più famosa è la Nebulosa di Orione, a circa 1.300 anni-luce. Nelle sere d'inverno, lontano dalle luci, la puoi vedere anche a occhio nudo: è la macchiolina sfumata sotto le tre stelle della «cintura» di Orione. Lì dentro, in questo momento, si stanno formando stelle e forse pianeti. Anche il Sole è nato in una nube così, circa 4,6 miliardi di anni fa.`,
    counterLine: `il nostro angolo di galassia`,
    visual: `Campo di stelle con nebulose colorate (rosa, blu), a strati o volumetriche; la Nebulosa di Orione riconoscibile ed etichettata. Il Sole come punto con «Tu sei qui».`,
    sources: [
      // TODO fact-check: fonte NASA/ESA per la distanza della Nebulosa di Orione (~1.344 anni-luce).
    ],
  },

  {
    id: 'via-lattea',
    kind: 'space',
    exponent: 21.2,
    title: `La Via Lattea`,
    text: `Ecco la nostra galassia, la Via Lattea: una gigantesca girandola di stelle, tra 100 e 400 miliardi, larga circa 100.000 anni-luce. Il Sole sta in un braccio laterale, lontano dal centro.`,
    more: `Anche il Sole gira intorno al centro della galassia, portandosi dietro tutti i pianeti, a circa 800.000 chilometri all'ora. Eppure ci mette circa 230 milioni di anni a fare un giro completo. L'ultima volta che il Sistema Solare era in questo punto del giro, sulla Terra comparivano i primi dinosauri. Al centro della galassia c'è un buco nero con la massa di 4 milioni di Soli.`,
    howWeKnow: `La striscia chiara che si vede d'estate, lontano dalle luci delle città, è la Via Lattea vista da dentro: guardiamo il disco di stelle di taglio. Nessuno l'ha mai fotografata da fuori. Per disegnarla, gli astronomi misurano la posizione e il movimento di moltissime stelle: il satellite europeo Gaia ne ha misurate quasi due miliardi. Quella che vedi qui è una ricostruzione.`,
    counterLine: `la nostra galassia`,
    visual: `Galassia a spirale barrata procedurale vista dall'alto: bracci, polveri scure, nucleo dorato. Marker «Tu sei qui» su un braccio minore, a circa metà strada tra il centro e il bordo.`,
    sources: [
      { title: `Live Science – How long is a galactic year?`, url: `https://www.livescience.com/how-long-galactic-year.html` },
      // TODO fact-check: fonti per numero di stelle, Sagittarius A* (~4 milioni di masse solari), Gaia (~1,8 miliardi di stelle).
    ],
  },

  {
    id: 'andromeda',
    kind: 'space',
    exponent: 22.8,
    title: `Andromeda e le galassie vicine`,
    text: `La Via Lattea non è sola. A 2,5 milioni di anni-luce c'è Andromeda, una galassia ancora più grande della nostra. Insieme a decine di galassie più piccole formano il Gruppo Locale.`,
    more: `La luce di Andromeda che vedi stanotte è partita 2,5 milioni di anni fa, quando sulla Terra vivevano i primi antenati degli esseri umani. Quindi Andromeda non la vediamo com'è oggi, ma com'era allora: guardare lontano nello spazio vuol dire guardare indietro nel tempo. Da un posto molto buio la puoi vedere anche a occhio nudo, come una macchiolina sfumata.`,
    howWeKnow: `Fino a circa 100 anni fa nessuno sapeva che esistessero altre galassie. Nel 1912 l'astronoma americana Henrietta Leavitt scoprì una regola: certe stelle pulsano, e più sono luminose, più lentamente pulsano. Nel 1923 Edwin Hubble trovò una di queste stelle dentro Andromeda e, grazie alla regola di Leavitt, calcolò che era lontanissima, fuori dalla Via Lattea. Di colpo l'universo diventò immensamente più grande.`,
    counterLine: `il Gruppo Locale`,
    visual: `Via Lattea e Andromeda come due spirali, la Galassia del Triangolo più piccola, le Nubi di Magellano vicino alla Via Lattea; etichette leggere.`,
    sources: [
      { title: `Astronomy – 5 ottobre 1923: Hubble scopre galassie oltre la Via Lattea`, url: `https://www.astronomy.com/today-in-the-history-of-astronomy/oct-5th-1923-hubble-discovers-galaxies-beyond-the-milky-way/` },
    ],
  },

  {
    id: 'laniakea',
    kind: 'space',
    exponent: 24.8,
    title: `Laniakea, il cielo immenso`,
    text: `Le galassie si raccolgono in gruppi e ammassi, tenuti insieme dalla gravità, e gli ammassi formano superammassi. Il nostro si chiama Laniakea: è largo circa 520 milioni di anni-luce e contiene circa 100.000 galassie.`,
    more: `In hawaiano «Laniakea» vuol dire «cielo immenso». Il nome è un omaggio ai navigatori polinesiani, che attraversavano l'oceano Pacifico orientandosi con le stelle. I suoi confini sono stati tracciati nel 2014 da astronomi che hanno misurato come si muovono migliaia di galassie. Come l'acqua che scende verso valle, le galassie di Laniakea scivolano tutte verso lo stesso punto.`,
    counterLine: `il nostro superammasso`,
    visual: `Galassie come punti, con linee di flusso che convergono verso un unico bacino (il Grande Attrattore); il confine di Laniakea come una superficie sfumata; «Tu sei qui» in periferia.`,
    sources: [
      { title: `W. M. Keck Observatory – Laniakea, «cielo immenso»`, url: `https://keckobservatory.org/?p=4435` },
      { title: `Wikipedia – Laniakea Supercluster`, url: `https://en.wikipedia.org/wiki/Laniakea_Supercluster` },
    ],
  },

  {
    id: 'rete-cosmica',
    kind: 'space',
    exponent: 25.6,
    title: `La rete cosmica`,
    text: `Da qui le galassie non sono sparse a caso: formano lunghi filamenti luminosi, come i fili di una ragnatela, intorno a enormi spazi quasi vuoti. Gli astronomi la chiamano rete cosmica.`,
    more: `Ogni puntino che vedi qui è un'intera galassia, con miliardi di stelle. Immagina di tenere un granello di sabbia a braccio teso contro il cielo: copre un pezzettino minuscolo. Il telescopio spaziale James Webb ha fotografato un pezzetto di cielo grande così, e dentro ha trovato migliaia di galassie.`,
    howWeKnow: `Per disegnare la rete, gli astronomi hanno misurato la posizione di milioni di galassie, una per una. La luce di una galassia lontana ci arriva un po' «arrossata»: più è arrossata, più la galassia è lontana. È come se l'universo, espandendosi, stirasse la luce mentre viaggia.`,
    counterLine: `miliardi di anni-luce`,
    visual: `Rete cosmica procedurale: filamenti di punti luminosi, nodi più brillanti, vuoti scuri. Una lenta deriva che dà profondità.`,
    sources: [
      { title: `ESA – Webb's first deep field («un granello di sabbia a braccio teso»)`, url: `https://www.esa.int/Science_Exploration/Space_Science/Webb/Webb_delivers_deepest_image_of_Universe_yet` },
    ],
  },

  {
    id: 'universo',
    kind: 'space',
    exponent: 26.94,
    title: `L'universo osservabile`,
    text: `Siamo arrivati al bordo di tutto quello che possiamo vedere: l'universo osservabile. È una sfera con noi al centro, non perché siamo speciali, ma perché è l'universo visto da qui. Dentro ci sono centinaia di miliardi di galassie.`,
    more: `L'universo ha circa 13,8 miliardi di anni. La luce è velocissima, ma non arriva all'istante: possiamo vedere solo le cose la cui luce ha avuto il tempo di raggiungerci. Il bordo dell'universo osservabile è come l'orizzonte in mare: non è la fine del mare, è solo fin dove arrivano i tuoi occhi. Oltre, l'universo quasi certamente continua.`,
    howWeKnow: `Il bordo è a circa 46 miliardi di anni-luce. Ma se l'universo ha 13,8 miliardi di anni, come è possibile? Mentre la luce viaggiava verso di noi, lo spazio stesso si allargava, come un palloncino che si gonfia. Così le galassie da cui è partita quella luce, nel frattempo, si sono allontanate ancora di più.`,
    counterLine: `tutto quello che possiamo vedere`,
    visual: `La rete cosmica racchiusa in una sfera il cui bordo brilla come una superficie di luce antica (ispirata alla radiazione cosmica di fondo, procedurale). «Noi» al centro come punto caldo.`,
    sources: [
      { title: `Wikipedia – Observable universe`, url: `https://en.wikipedia.org/wiki/Observable_universe` },
      { title: `Live Science – How many galaxies are in the universe?`, url: `https://livescience.com/space/how-many-galaxies-are-in-the-universe` },
    ],
  },

  // ───────────────────────────── Act II: beyond the universe, only numbers

  {
    id: 'oltre',
    kind: 'number',
    exponent: 30,
    title: `E adesso?`,
    text: `Hai superato il bordo dell'universo osservabile. Qui non c'è più niente da misurare con i metri. Ma i numeri non finiscono mai. Continuiamo?`,
    more: `I numeri hanno un superpotere: per quanto grande sia un numero, puoi sempre aggiungere 1 e trovarne uno più grande. Per questo sono infiniti. Da qui in avanti il contatore non misura più quanto è largo qualcosa: conta e basta.`,
    counterLine: `da qui in poi contiamo, non misuriamo`,
    visual: `L'universo osservabile si rimpicciolisce fino a diventare un punto. Il contatore ha un piccolo «glitch» giocoso: la parola «metri» scivola via. Nero profondissimo con cifre che affiorano e si dissolvono.`,
    sources: [],
  },

  {
    id: 'atomi',
    kind: 'number',
    exponent: 80,
    title: `Tutti gli atomi dell'universo`,
    text: `Tutto è fatto di atomi, pezzettini di materia piccolissimi. In tutto l'universo osservabile ce ne sono circa 10⁸⁰: un 1 seguito da 80 zeri. Ogni stella, ogni pianeta, ogni persona.`,
    more: `Gli atomi del tuo corpo sono antichissimi. Il carbonio delle tue cellule, l'ossigeno che respiri e il ferro nel tuo sangue sono stati fabbricati dentro stelle che poi li hanno sparsi nello spazio, miliardi di anni fa. Sei fatta, letteralmente, di polvere di stelle.`,
    counterLine: `un 1 seguito da 80 zeri`,
    visual: `Gli 80 zeri che si scrivono uno dopo l'altro finché riempiono lo schermo, andando a capo come serve sul telefono.`,
    sources: [
      { title: `Wikipedia – Observable universe (numero di atomi, circa 10⁸⁰)`, url: `https://en.wikipedia.org/wiki/Observable_universe` },
    ],
  },

  {
    id: 'googol',
    kind: 'number',
    exponent: 100,
    title: `Un googol`,
    text: `Un 1 seguito da 100 zeri si chiama googol. Il nome l'ha inventato un bambino di 9 anni, Milton Sirotta, nipote di un matematico americano. Un googol è molto più grande del numero di tutti gli atomi dell'universo osservabile.`,
    more: `Molti anni dopo, due giovani informatici che stavano creando un motore di ricerca scelsero un nome ispirato al googol, per far capire quante cose volevano trovare. Quel nome è Google. Anche i bambini, a volte, inventano parole che poi usa tutto il mondo.`,
    counterLine: `un 1 seguito da 100 zeri`,
    visual: `Il googol scritto per intero (100 zeri) che si compone sullo schermo, leggibile anche su telefono andando a capo.`,
    sources: [
      { title: `Merriam-Webster – googol (coniato da Milton Sirotta, 9 anni)`, url: `https://www.merriam-webster.com/dictionary/Googol` },
    ],
  },

  {
    id: 'googolplex',
    kind: 'number',
    exponent: 1e100,
    exponentLabel: `10^googol`,
    title: `Un googolplex`,
    text: `E se dopo l'1 mettessi un googol di zeri? Ottieni un googolplex. Non potresti mai scriverlo: anche scrivendo una cifra su ogni atomo dell'universo osservabile, gli atomi finirebbero molto prima degli zeri.`,
    more: `Eppure esistono numeri ancora più grandi di un googolplex, e i matematici continuano a studiarli. È questa la differenza tra le cose e i numeri: l'universo che possiamo vedere ha un bordo, i numeri no.`,
    counterLine: `un 1 seguito da un googol di zeri`,
    visual: `Gli zeri iniziano a scorrere sempre più veloci finché diventano una cascata di luce che riempie tutto: è la transizione verso il finale (finale.ts).`,
    sources: [],
  },
];
