# Crediti

Questo file si completa durante lo sviluppo: ogni immagine, modello, font o dato che entra nel repo va registrato qui, con la sua licenza. Le fonti dei fatti scientifici sono nei campi `sources` di `src/content/levels.ts` e compaiono nella pagina «È tutto vero».

## Dati geografici

- Strade, ferrovie, fiumi, parchi, l'Arno, il Duomo e l'area delle ex Officine Galileo (`public/data/rifredi.json`, `city.json`, parte di `toscana.json`): © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), dati disponibili con licenza [ODbL](https://opendatacommons.org/licenses/odbl/). Scaricati una volta con gli script di `scripts/geodata/`.
- Coste, confini, laghi e la regione Toscana (`public/data/toscana.json`, `italia.json`): [Natural Earth](https://www.naturalearthdata.com), scala 1:10m, pubblico dominio.
- Luci notturne della Toscana e dell'Italia (`public/data/night-toscana.webp`, `night-italia.webp`): [NASA Black Marble 2016](https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/), immagini del NASA Earth Observatory di Joshua Stevens, con i dati Suomi NPP VIIRS di Miguel Román, NASA Goddard Space Flight Center. Uso libero; credito «NASA Earth Observatory».

## Dati astronomici

- Distanza di Voyager 1 dalla Terra, un valore ogni due giorni dal 2026 al 2041 (`src/content/voyager-distance.ts`): [NASA/JPL Horizons](https://ssd.jpl.nasa.gov/horizons/), Solar System Dynamics Group, Jet Propulsion Laboratory. Dati di pubblico dominio; credito «NASA/JPL-Caltech». Scaricati una volta con `scripts/voyager-horizons.mjs`.

## Immagini e texture

_(da completare)_

## Modelli 3D

_(da completare)_

## Font

Tutti i caratteri sono nel sito (pacchetti `@fontsource`), nessuno viene scaricato da altri server.

- [Fraunces](https://github.com/undercasetype/Fraunces), © 2020 The Fraunces Project Authors, licenza SIL Open Font License 1.1. Titoli e contatore.
- [Andika](https://software.sil.org/andika/), © 2004-2022 SIL International, licenza SIL Open Font License 1.1. Tutti i testi.

## Software

- [three.js](https://threejs.org), licenza MIT
- [Vite](https://vite.dev), licenza MIT
