# Immagini, modelli e dati: dove prenderli

Regole:

- Usa solo risorse di questa lista, oppure altre con una licenza che permette l'uso in un sito pubblico. **Controlla la licenza sulla pagina al momento del download.**
- Ogni risorsa usata va registrata in `CREDITS.md`, nello stesso commit in cui entra nel repo.
- Niente foto di persone, niente immagini prese da siti a caso, niente risorse scaricate a runtime: tutto va in `public/` e nel bundle.
- Dove basta, preferisci la grafica procedurale: pesa meno e non ha problemi di licenza.

## Immagini e modelli

| Cosa | Dove | Licenza e credito |
|---|---|---|
| Terra di giorno (texture) | NASA Visible Earth, «Blue Marble Next Generation» | NASA, uso libero; credito «NASA Visible Earth» |
| Terra e Italia di notte | NASA Black Marble: <https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps> e <https://svs.gsfc.nasa.gov/30878> | NASA, uso libero; credito «NASA Earth Observatory» |
| Luna, Sole, pianeti, anelli di Saturno, nuvole | Solar System Scope: <https://www.solarsystemscope.com/textures> | CC BY 4.0; credito «© Solar System Scope», con link alla licenza |
| Modello 3D di Voyager | NASA 3D Resources: <https://nasa3d.arc.nasa.gov/detail/jpl-vtad-voyager>, repo <https://github.com/nasa/NASA-3D-Resources> | Le risorse sono dichiarate libere da copyright; seguire le linee guida NASA sull'uso dei media. In alternativa: modello procedurale stilizzato |
| Foto «Pale Blue Dot» (1990) | NASA/JPL-Caltech | NASA, uso libero; credito «NASA/JPL-Caltech» |
| Font | pacchetti `@fontsource/*` da npm | SIL Open Font License |
| Suoni | sintetizzati con Web Audio | nostri, nessun credito necessario |

## Dati geografici (M2)

Da preparare **una volta sola**, in locale, con script in `scripts/geodata/`. I file risultanti vanno in `public/data/` e si committano. Il sito non scarica mai dati a runtime.

### Rifredi e Firenze: OpenStreetMap

- Fonte: OpenStreetMap tramite Overpass API (<https://overpass-api.de>). Licenza ODbL: credito obbligatorio «© OpenStreetMap contributors» in `CREDITS.md` e nella pagina fonti.
- Rispetta la policy d'uso di Overpass: poche richieste, una tantum, con `timeout` adeguato.
- Bounding box indicativo per il comune di Firenze (sud, ovest, nord, est): `43.72, 11.15, 43.84, 11.34`. Verificalo prima di usarlo.
- Cosa scaricare: strade (`highway`), ferrovie (`railway=rail`), corsi d'acqua (`waterway=river|stream`, compresi Arno, Mugnone e Terzolle), specchi d'acqua (`natural=water`), parchi (`leisure=park`), l'impronta della cattedrale di Santa Maria del Fiore, la stazione `Firenze Rifredi`.
- Query di partenza:

```
[out:json][timeout:180];
(
  way["highway"](43.72,11.15,43.84,11.34);
  way["railway"="rail"](43.72,11.15,43.84,11.34);
  way["waterway"~"^(river|stream)$"](43.72,11.15,43.84,11.34);
  way["natural"="water"](43.72,11.15,43.84,11.34);
  way["leisure"="park"](43.72,11.15,43.84,11.34);
  way["building"="cathedral"](43.76,11.24,43.79,11.27);
  node["railway"="station"]["name"="Firenze Rifredi"](43.72,11.15,43.84,11.34);
);
out geom;
```

- Poi: proietta in coordinate locali in metri (centro su Rifredi), semplifica le linee in base alla scala a cui servono, quantizza, e salva JSON compatti (obiettivo: pochi MB in tutto).
- **Privacy**: niente edifici residenziali, niente scuole, niente punti di interesse oltre a quelli citati in `levels.ts`.

### Valle dell'Arno, Toscana, Italia

- Coste, confini e fiumi principali: Natural Earth (<https://www.naturalearthdata.com>, pubblico dominio), scala 1:10m.
- Confine della Toscana più preciso, se serve: confini amministrativi ISTAT (CC BY 3.0 IT, credito «ISTAT»).
- Luci notturne: ritaglio della Black Marble NASA (vedi sopra).
