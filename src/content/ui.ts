/**
 * Interface strings, in Italian. Placeholders in braces are filled at runtime:
 *   {nome}  the child's name, only if present in the link hash (#nome=...), otherwise removed
 *   {km}    a number formatted with Italian separators (Intl.NumberFormat('it-IT'))
 *   {al}    a distance in light-years, one decimal, Italian format
 */
export const UI = {
  intro: {
    /** Shown only when the link contains #nome=...; otherwise skipped. */
    greeting: `Ciao, {nome}.`,
    /**
     * The first line follows the date in the link (#nata=AAAA-MM-GG), so it is never false:
     * `birthday` only on the day she turns 10, `before` / `after` on any other day,
     * `unknown` when the link has no date. At runtime it replaces `lines[0]`.
     */
    firstLine: {
      birthday: `Oggi compi 10 anni.`,
      before: `Stai per compiere 10 anni.`,
      after: `Hai compiuto 10 anni.`,
      unknown: `Questo viaggio è per i tuoi 10 anni.`,
    },
    lines: [
      `Oggi compi 10 anni.`,
      `10 sembra un numero piccolo.`,
      `Ma se continui a moltiplicare per 10, succede qualcosa di incredibile.`,
    ],
    start: `Inizia il viaggio`,
    soundHint: `Con le cuffie è ancora più bello.`,
  },

  hints: {
    touch: `Scorri verso l'alto o tocca ▶ per allontanarti. Tocca ◀ per tornare indietro.`,
    pointer: `Usa la rotella, le frecce della tastiera o i pulsanti ▶ e ◀.`,
  },

  controls: {
    forward: `Più lontano`,
    back: `Più vicino`,
    forwardAria: `Allontanati: moltiplica la scala per 10`,
    backAria: `Avvicinati: dividi la scala per 10`,
    soundOn: `Suono acceso`,
    soundOff: `Suono spento`,
    menu: `Menu`,
  },

  counter: {
    /** Label of the scale counter in Act I. */
    spaceLabel: `Quello che vedi è largo`,
    /** Label of the counter in Act II, when it counts numbers instead of metres. */
    numberLabel: `Il numero`,
    metres: `metri`,
  },

  panel: {
    more: `Tocca per saperne di più`,
    howWeKnow: `Come lo sappiamo?`,
    close: `Chiudi`,
  },

  voyager: {
    liveDistance: `In questo momento Voyager 1 è a circa {km} chilometri dalla Terra.`,
    sincePageOpened: `Da quando sei su questa pagina si è allontanato di altri {km} chilometri.`,
    /**
     * Used instead of `sincePageOpened` while the distance from the Earth is shrinking: every
     * year from late January to late April, when the Earth moves towards the probe faster
     * than the probe moves away (about 30 km/s against 17).
     */
    sincePageOpenedCloser: `Da quando sei su questa pagina si è avvicinato di {km} chilometri. Non ha fatto retromarcia: in questi mesi la Terra, girando intorno al Sole, gli corre dietro più veloce di lui.`,
    /** Before 18 Nov 2026, 10:16 UTC (see data.ts → VOYAGER_1.lightDayDateUTC). */
    milestoneBefore: `Il 18 novembre 2026 arriverà a un giorno-luce da noi: sarà la prima volta nella storia.`,
    /** From 18 Nov 2026, 10:16 UTC onwards. */
    milestoneAfter: `Dal 18 novembre 2026 è a più di un giorno-luce da noi: è la prima volta nella storia.`,
    openGoldenRecord: `Che cosa porta con sé?`,
  },

  bubble: {
    /** Used when the link contains #nata=AAAA-MM-GG. */
    exactRadius: `Oggi la tua luce è arrivata a {al} anni-luce da casa.`,
    starReached: `raggiunta dalla tua luce`,
    starNotYet: `la tua luce non ci è ancora arrivata`,
    /**
     * With #nata= in the link the texts of the stop `bolla` follow her real age, so that they
     * are never false (src/bubble.ts → bubbleStop). Without a date the stop reads as written
     * in levels.ts. {anni} = her age in whole years; {al} = the radius in light-years with
     * one decimal, never rounded up (the light has really got that far).
     */
    variants: {
      /** In the title, from her 11th birthday on, instead of «10 anni». */
      titleYears: `{anni} anni`,
      /**
       * In the caption, instead of «10» in «viaggia da 10 anni» and «un raggio di 10
       * anni-luce»: `before` her tenth birthday, `birthday` on a birthday and for about a
       * month after it, `after` for the rest of the year.
       */
      span: {
        before: `quasi 10`,
        birthday: `{anni}`,
        after: `più di {anni}`,
      },
      /** Under the counter, instead of «10 anni-luce in ogni direzione». */
      counterLine: `{al} anni-luce in ogni direzione`,
      /** Last sentence of «saperne di più», once the light has reached Epsilon Eridani (10.5 light-years). */
      epsilonReached: `La tua luce ha già raggiunto anche Epsilon Eridani, una stella più giovane del Sole.`,
      /** Last sentence of «Come lo sappiamo?», once 61 Cygni (11.4 light-years) is inside the bubble. */
      cygniReached: `Oggi è dentro la tua bolla.`,
    },
  },

  end: {
    replay: `Rifai il viaggio`,
    goldenRecord: `Crea il tuo Disco d'oro`,
    sources: `È tutto vero? Guarda le fonti`,
  },

  sourcesPage: {
    title: `È tutto vero`,
    intro: `Ogni numero di questo viaggio è stato controllato. Qui sotto trovi dove: se vuoi, puoi verificarlo anche tu. È così che lavorano gli scienziati.`,
    credits: `Immagini, dati e suoni`,
    back: `Torna al viaggio`,
  },

  errors: {
    noWebGL: `Questo dispositivo non riesce a mostrare la grafica 3D. Prova con un altro browser o un altro dispositivo.`,
  },
} as const;
