# Crediti

Questo file si completa durante lo sviluppo: ogni immagine, modello, font o dato che entra nel repo va registrato qui, con la sua licenza. Le fonti dei fatti scientifici sono nei campi `sources` di `src/content/levels.ts` e compaiono nella pagina «È tutto vero».

## Dati geografici

- Strade, ferrovie, fiumi, parchi, l'Arno, il Duomo e l'area delle ex Officine Galileo (`public/data/rifredi.json`, `city.json`, parte di `toscana.json`): © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), dati disponibili con licenza [ODbL](https://opendatacommons.org/licenses/odbl/). Scaricati una volta con gli script di `scripts/geodata/`.
- Coste, confini, laghi e la regione Toscana (`public/data/toscana.json`, `italia.json`): [Natural Earth](https://www.naturalearthdata.com), scala 1:10m, pubblico dominio.
- Luci notturne della Toscana e dell'Italia (`public/data/night-toscana.webp`, `night-italia.webp`): [NASA Black Marble 2016](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/), immagini del NASA Earth Observatory di Joshua Stevens, con i dati Suomi NPP VIIRS di Miguel Román, NASA Goddard Space Flight Center. Uso libero; credito «NASA Earth Observatory».

## Dati astronomici

- Distanza di Voyager 1 dalla Terra, un valore ogni due giorni dal 2026 al 2041 (`src/content/voyager-distance.ts`): [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), Solar System Dynamics Group, Jet Propulsion Laboratory. Dati di pubblico dominio; credito «NASA/JPL-Caltech». Scaricati una volta con `scripts/voyager-horizons.mjs`.
- Dove si trova la sonda Juice dell'ESA rispetto al Sole e alla Terra, un valore ogni cinque giorni dal 2026 all'arrivo a Giove nel 2031 (`src/content/juice-position.ts`): [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), traiettoria «JUICE_merged». Credito «NASA/JPL-Caltech». Scaricati una volta con `scripts/juice-horizons.mjs`.

## Immagini e texture

- La Terra di giorno (`public/data/globe-day.webp`): [NASA Blue Marble: Next Generation](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/), novembre 2004, con topografia e batimetria, di Reto Stöckli, NASA Earth Observatory (NASA Goddard Space Flight Center). Uso libero; credito «NASA Earth Observatory».
- Le luci della Terra di notte (`public/data/globe-lights.webp`): [NASA Black Marble 2016](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/), mappa da 3 km, come sopra. Credito «NASA Earth Observatory».
- Le nuvole della Terra (`public/data/globe-clouds.webp`) e le texture della Luna, di Giove, di Saturno e dei suoi anelli (`public/textures/`): © [Solar System Scope](https://www.solarsystemscope.com/textures/), licenza [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Ridimensionate e, per le nuvole, riproiettate.
- La foto «Pale Blue Dot» (`public/images/pale-blue-dot.webp`), scattata da Voyager 1 il 14 febbraio 1990, nella versione rielaborata del 2020 ([PIA23645](https://science.nasa.gov/photojournal/pale-blue-dot-revisited/)): NASA/JPL-Caltech, pubblico dominio. Ritagliata attorno al raggio di luce; il cerchio attorno alla Terra è disegnato dal sito, sopra la foto.
- Terra e mare del globo (`public/data/globe-land.webp`): [Natural Earth](https://www.naturalearthdata.com), scala 1:10m, pubblico dominio.

Le immagini del globo sono riproiettate una volta con `scripts/geodata/globe.mjs`, quelle dei pianeti ridimensionate con `scripts/textures.mjs`.

## Modelli 3D

_(da completare)_

## Font

Tutti i caratteri sono nel sito (pacchetti `@fontsource`), nessuno viene scaricato da altri server.

- [Fraunces](https://github.com/undercasetype/Fraunces), © 2020 The Fraunces Project Authors, licenza SIL Open Font License 1.1. Titoli e contatore.
- [Andika](https://software.sil.org/andika/), © 2004-2022 SIL International, licenza SIL Open Font License 1.1. Tutti i testi.

## Software

- [three.js](https://threejs.org), licenza MIT
- [Vite](https://vite.dev), licenza MIT
