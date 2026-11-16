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

  /** Under every lens (see CLAUDE.md, «Inquadrature»). */
  lensNote: `ingrandito, non in scala`,

  places: {
    sun: `Sole`,
    moon: `Luna`,
    jupiterWithMoons: `Giove e le lune di Galileo`,
    saturn: `Saturno`,
    voyager1: `Voyager 1`,
    neptuneOrbit: `l'orbita di Nettuno`,
    oortCloud: `nube di Oort`,
    orionNebula: `Nebulosa di Orione`,
    milkyWay: `Via Lattea`,
    andromeda: `Andromeda`,
    triangulum: `Galassia del Triangolo`,
  },
} as const;
