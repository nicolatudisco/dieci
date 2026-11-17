/**
 * Labels drawn in the scenes and small texts of the interface that are not in ui.ts.
 * They were added during development (M1): same rules as every other text. Italian, short,
 * true, in the tone of the rest. Nicola can edit them here.
 */
export const LABELS = {
  /** Next to the warm dot, when the scene does not make it obvious where she is. */
  youAreHere: `Tu sei qui`,

  /** In the finale and in the epilogue, where the two big buttons of the journey are gone. */
  continue: `Continua`,
  back: `Torna indietro`,

  /**
   * In the epilogue, the button that opens the story of the Golden Record, until the lab
   * exists (M7): then it becomes UI.end.goldenRecord, «Crea il tuo Disco d'oro».
   */
  goldenRecordStory: `Che cosa porta con sé Voyager?`,

  /** Under every lens (see CLAUDE.md, «Inquadrature»). */
  lensNote: `ingrandito, non in scala`,

  /** Along the trail of Voyager 1: its distance from the Earth, running. {km} = the number. */
  liveKilometres: `{km} km`,

  /**
   * On the edge of the bubble of the stop `bolla`, while it grows: how old she was when her
   * light was that far. {anni} = whole years. At the end of the growth the edge is today.
   */
  bubble: {
    whenOne: `quando avevi 1 anno`,
    whenYears: `quando avevi {anni} anni`,
    /** With her date of birth: the edge of the bubble is where her light is today. */
    today: `oggi`,
    /** Without a date the bubble is the one of a tenth birthday. */
    atTen: `a 10 anni`,
  },

  places: {
    // The ground (M2): only public places named in levels.ts.
    rifredi: `Rifredi`,
    station: `Stazione di Rifredi`,
    officineGalileo: `ex Officine Galileo`,
    duomo: `Duomo`,
    arno: `Arno`,
    florence: `Firenze`,
    pisa: `Pisa`,
    virgo: `Virgo`,
    sun: `Sole`,
    moon: `Luna`,
    jupiterWithMoons: `Giove e le lune di Galileo`,
    saturn: `Saturno`,
    voyager1: `Voyager 1`,
    neptuneOrbit: `l'orbita di Nettuno`,
    oortCloud: `nube di Oort`,
    /** Under the lens of the Oort cloud: what each of its points is. */
    iceBlock: `un blocco di ghiaccio`,
    orionNebula: `Nebulosa di Orione`,
    milkyWay: `Via Lattea`,
    andromeda: `Andromeda`,
    triangulum: `Galassia del Triangolo`,
  },
} as const;
