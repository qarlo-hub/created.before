# Rack Showroom

Showroom digitale interattivo: una rella in acciaio cromato con T-shirt nere stampate in bianco (Open Sans).
React 19 + Vite, nessuna libreria di animazione: la fisica (molle e pendolo) è scritta a mano e gira in un unico loop `requestAnimationFrame`.

```bash
cd showroom
npm install
npm run dev          # http://localhost:5173
npm run build        # dist/  (statico, base relativa)
npm run build:single # dist-single/index.html, un unico file autosufficiente
```

## Interazioni
- **Hover**: la maglietta sotto il cursore segue leggermente la mano, sale in primo piano e le vicine si scostano; passando sopra le grucce oscillano nella direzione del movimento.
- **Drag** (mouse, penna, touch): la maglietta segue il puntatore con un po' di peso, le altre scorrono negli slot liberi, al rilascio si assesta con inerzia e oscillazione. Sotto i 5–9 px di movimento è un click.
- **Click/tap**: transizione FLIP verso la vista singola (gruccia + rella, testo, specifiche, Edit/Delete, Previous/Next, `Esc`/frecce).
- **+ Add T-shirt**: pannello laterale con anteprima live, testo multiriga, dimensione S–XL, allineamento, peso.
- Tastiera: `Tab` sulle magliette, `Invio` apre, `Shift + ←/→` sposta.
- Collezione salvata in `localStorage` (`rack-showroom.collection.v1`); "Reset collection" ripristina le 6 iniziali.

## Struttura
| File | Ruolo |
|---|---|
| `src/components/Rack.jsx` | layout responsive, fisica, hover/drag/pan, z-index |
| `src/components/Shirt.jsx` | T-shirt SVG a livelli separati: tessuto, stampa, gruccia, colletto, area di click |
| `src/components/FabricFactory.jsx` | renderizza una volta il tessuto (rumore, pieghe sfocate, ombra) in bitmap per la rella |
| `src/components/DetailView.jsx` / `EditorPanel.jsx` | vista singola e editor |
| `src/lib/textFit.js` | misura del testo, a capo automatico e riduzione uniforme nell'area di stampa |
| `src/lib/store.js` | modello dati, sanitizzazione, persistenza |

Nota prestazioni: i filtri SVG del tessuto sono costosi da ridipingere a ogni frame; sulla rella sono pre-renderizzati in bitmap (scritta, gruccia e colletto restano vettoriali). Nella vista singola e nell'editor tutto è SVG live.
