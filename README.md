# Dieci

Un viaggio in potenze di 10: da un prato a Rifredi, a Firenze, fino al bordo dell'universo osservabile. E poi oltre, dove restano solo i numeri.

È un regalo per un decimo compleanno. Ogni numero che compare nel viaggio è vero ed è stato controllato: le fonti sono nel sito stesso, nella pagina «È tutto vero».

## Provarlo in locale

Serve Node.js (versione LTS).

```bash
npm install
npm run dev
```

## Come è fatto

- Vite, TypeScript e three.js. Sito statico, nessun dato raccolto, nessuna chiamata di rete.
- Tutti i testi sono in `src/content/`.
- `npm run shots` fa gli screenshot del viaggio su desktop, tablet e telefono.
- Il sito si pubblica da solo su GitHub Pages a ogni push su `main`.

Costruito con [Claude Code](https://claude.com/claude-code). Crediti di immagini e dati in [CREDITS.md](CREDITS.md).
