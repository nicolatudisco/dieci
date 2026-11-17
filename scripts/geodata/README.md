# scripts/geodata

Script (Node, `.mjs`) che preparano **una volta sola**, in locale, i dati geografici delle tappe di M2 e li salvano, semplificati e compatti, in `public/data/` (che si committa). Il sito non scarica mai dati a runtime.

## Il punto di partenza (fuori da git)

Le coordinate del punto di partenza stanno solo in `scripts/geodata/origin.local.json`, che git ignora. Non vanno mai scritte altrove: né nel repo, né nei messaggi di commit. Formato:

```json
{
  "street": "nome della via (serve solo al controllo della privacy)",
  "houseNumber": "civico (idem)",
  "door": { "lat": 0, "lon": 0 },
  "origin": { "lat": 0, "lon": 0 }
}
```

`origin` è il punto «Tu sei qui»: il bordo interno del marciapiede pubblico, davanti al portone (`door`). Se il file manca, gli script si fermano: chiedi il punto a Nicola.

## Come si rifanno i dati

```sh
node scripts/geodata/build.mjs          # OSM e Natural Earth → rifredi.json, city.json, toscana.json, italia.json
node scripts/geodata/black-marble.mjs   # NASA Black Marble → night-italia.webp, night-toscana.webp, night.json
node scripts/geodata/globe.mjs          # il globo di terra e luna → globe-day, globe-lights, globe-clouds, globe-land (.webp)
node scripts/geodata/check-privacy.mjs  # prima di ogni commit: nessuna traccia del punto nel repo
```

I download grezzi finiscono in `scripts/geodata/cache/` (ignorata da git): rieseguire gli script non riscarica niente. Per avere dati più freschi, cancella la cache.

- **Proiezione**: ortografica centrata sul punto di partenza, in metri (+x est, +y nord), sulla sfera di raggio 6.371 km di `src/engine/stage.ts`. Vicino al punto è il piano locale; da lontano è la Terra vista dall'alto, quindi l'Italia combacia con il globo di `terra`.
- **Formato**: coordinate intere a passi di `q` metri, il primo punto assoluto e gli altri come differenze; di ogni elemento solo la classe (e la larghezza per strade e fiumi). Nessun nome, nessun altro tag. Lo legge `src/levels/geo/format.ts`.
- **Overpass**: poche richieste, per riquadro (mai per nome della via), con un server di riserva. Strade pubbliche (niente `service`, sentieri, gallerie, `access=private`), ferrovie, fiumi, acqua, parchi e boschi. Nessun edificio, tranne l'impronta del Duomo; dell'area delle ex Officine Galileo solo il contorno.

## Fonti e licenze

- OpenStreetMap, © OpenStreetMap contributors, licenza ODbL: città, Arno, autostrade.
- Natural Earth 1:10m, pubblico dominio: coste, confini, regione Toscana, posizione di Firenze e Pisa.
- NASA Black Marble 2016 (NASA Earth Observatory): luci notturne.
- NASA Blue Marble: Next Generation, novembre 2004 (NASA Earth Observatory): la Terra di giorno. Nuvole: Solar System Scope, CC BY 4.0. Il globo ha sempre il punto di partenza al centro e non gira, quindi le sue immagini coprono un solo emisfero, nella stessa proiezione ortografica di tutto il resto.
- Virgo: vertice e direzione dei bracci dalle costanti ufficiali dei rivelatori LIGO/Virgo, controllati sui bracci mappati in OSM.

I crediti per chi guarda il sito sono in `CREDITS.md`.
