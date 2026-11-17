/**
 * Texts and options for the "Crea il tuo Disco d'oro" mini-lab, opened from the Voyager stop.
 *
 * Rules (see CLAUDE.md):
 * - images are drawn by us (SVG/canvas), never photos;
 * - sounds are synthesised with the Web Audio API, no third-party audio files;
 * - nothing leaves the browser; the disc is saved as a PNG on the device.
 */
export const GOLDEN_RECORD = {
  title: `Il Disco d'oro`,

  intro: `Nel 1977, sulle due sonde Voyager, gli scienziati hanno messo un disco d'oro: un messaggio per chiunque, un giorno, dovesse trovarle. Un gruppo guidato dall'astronomo Carl Sagan ci ha messo 115 immagini della Terra, suoni della natura, musiche di tutto il mondo e saluti in 55 lingue. C'è anche l'italiano: una voce dice «Tanti auguri e saluti». In un certo senso, Voyager sta portando degli auguri anche a te.`,

  yourTurn: `Adesso tocca a te. Cosa metteresti nel tuo disco d'oro, per far conoscere la Terra a qualcuno che non l'ha mai vista?`,

  steps: {
    image: `1. Scegli un'immagine`,
    sound: `2. Scegli un suono`,
    message: `3. Scrivi un messaggio per le stelle`,
  },

  images: [
    { id: 'terra', label: `La Terra vista dallo spazio` },
    { id: 'duomo', label: `La cupola del Duomo di Firenze` },
    { id: 'albero', label: `Un albero` },
    { id: 'dna', label: `La doppia elica del DNA` },
    { id: 'mano', label: `Una mano che saluta` },
    { id: 'stella', label: `Una stella` },
  ],

  sounds: [
    { id: 'cuore', label: `Il battito del cuore` },
    { id: 'pioggia', label: `La pioggia` },
    { id: 'mare', label: `Le onde del mare` },
    { id: 'uccelli', label: `Il canto degli uccelli` },
    { id: 'compleanno', label: `Una melodia di compleanno` },
    { id: 'morse', label: `«CIAO» in codice Morse` },
  ],

  message: {
    placeholder: `Ciao! Qui sulla Terra…`,
    maxLength: 140,
    counter: `{n} caratteri su 140`,
  },

  actions: {
    create: `Crea il mio disco`,
    listen: `Ascolta`,
    save: `Salva il disco`,
    back: `Torna al viaggio`,
  },

  /** Text engraved around the generated disc. {data} = today's date in Italian format. */
  engraving: `Disco d'oro di una scienziata di 10 anni · Terra, Sistema Solare, Via Lattea · {data}`,

  sources: [
    { title: `NASA – Che cosa c'è sul Disco d'oro (115 immagini, suoni, musiche, saluti in 55 lingue)`, url: `https://science.nasa.gov/mission/voyager/golden-record-contents/` },
    { title: `Wikipedia – Contents of the Voyager Golden Record`, url: `https://en.wikipedia.org/wiki/Contents_of_the_Voyager_Golden_Record` },
    { title: `NASA – Golden Record: Greetings in 55 Languages`, url: `https://science.nasa.gov/mission/voyager/golden-record-contents/greetings/` },
  ],
} as const;
