# Tema survey Qualtrics: design system neutro

Personalizzazione **solo visiva** per la nuova esperienza di compilazione (layout "Simple").
Non modifica domande, opzioni, codici di risposta, logiche, validazioni né la struttura del CSV.

| File | Cosa contiene |
|---|---|
| `survey-theme.qualtrics.css` | **Il file da incollare in Qualtrics** (generato, senza `var()` né commenti) |
| `survey-theme.css` | Sorgente leggibile e commentata: si modifica solo questo |
| `build.py` | Rigenera `survey-theme.qualtrics.css` dal sorgente (`python3 build.py`) |
| `tests/visual-check.js` | Test: screenshot a 1280/390/320 px e audit di accessibilità axe sulla pagina reale |

## 1. Installazione

1. Apri la survey → **Look & Feel** (icona del pennello) → **Style**.
2. Nel campo **Custom CSS** cancella il contenuto precedente e incolla **tutto** `survey-theme.qualtrics.css`.
3. **Save**, poi **Preview** su desktop e su smartphone.
4. Lingua (decisa: italiano): **Survey options → Language** (o *Translate survey*), lingua principale = **Italiano**.
   Così i testi di sistema (pulsante, messaggi di errore) e l'attributo `lang` della pagina passano in italiano.

**Rollback:** svuota il campo Custom CSS e salva. Nessun'altra impostazione viene toccata.

> **Perché un file generato.** Al primo tentativo (28/10/2026) Qualtrics ha salvato solo i primi 1.599 caratteri del sorgente.
> Il testo si interrompeva esattamente prima del primo `var(...)`, quindi quasi tutto il tema era inattivo; anche il testo `<section …>` nei commenti era stato rimosso.
> La causa più probabile è il filtro di sicurezza del campo, ma non è documentata, quindi è un'ipotesi.
> Il file generato elimina tutti i possibili inneschi (nessun `var()`, nessun `<` o `>`, nessun commento, solo ASCII).
> **Controllo dopo il salvataggio:** l'ultima riga del campo deve essere la `}` finale della regola `prefers-reduced-motion`.

## 2. Design system

**Direzione:** sobria e fresca: un solo accento ciano, tra l'azzurro e il verde acqua, su grigi freddi. Nessuna decorazione.
L'unico elemento distintivo è la **scala segmentata** (NPS e scale numeriche), che rende visibile il continuum della scala.

| Token | Valore | Uso | Contrasto su bianco |
|---|---|---|---|
| `--st-ink` | `#1C2128` | Testo principale | 16,2:1 |
| `--st-graphite` | `#555E6B` | Testo secondario, etichette | 6,6:1 |
| `--st-line` | `#858D98` | Bordi dei controlli | 3,4:1 (≥ 3:1, WCAG 1.4.11) |
| `--st-divider` | `#DADDE2` | Separatori decorativi | — |
| `--st-accent` | `#0E9FBF` | Celle scelte, bordi selezionati, focus, pulsante (ciano chiaro) | 3,1:1: sufficiente per controlli e bordi, non per il testo |
| `--st-on-accent` | `#1C2128` | Testo sopra il ciano pieno (numero scelto, pulsante) | 5,2:1 (il bianco sarebbe 3,1:1) |
| `--st-accent-text` | `#0E7490` | Testo nel colore d'accento (link, pulsanti secondari) | 5,4:1 |
| `--st-accent-tint` | `#E6F6F8` | Sfondo dell'opzione selezionata | testo 14,6:1 |
| `--st-accent-hover` | `#F1FAFB` | Sfondo al passaggio del mouse | — |
| `--st-page` / `--st-paper` | `#F3F6F8` / `#FFFFFF` | Sfondo pagina / colonna | — |
| `--st-error` | `#B42318` | Errori | 6,6:1 |

- **Tipografia:** font di sistema (`system-ui`: SF Pro su iOS/macOS, Roboto su Android, Segoe UI su Windows).
  Non c'è nessuna chiamata esterna (privacy e prestazioni). Domanda 21 px / 600 (19 px su smartphone), risposte 16 px.
- **Layout:** una colonna di lettura allineata a sinistra, larghezza massima 44rem; su smartphone tutto lo schermo, senza riquadro.
- **Controlli:** altezza 48 px, raggio 10 px. Lo stato selezionato usa sempre due segnali, colore più forma
  (riempimento o bordo doppio, pallino del radio), quindi non dipende solo dal colore.
- **Focus:** sulle scelte (NPS, scale, opzioni) l'anello esterno di 2 px compare **solo con la tastiera** (`:focus-visible`); con il mouse o il tocco la cella scelta resta di un solo colore. I browser senza `:has()` mostrano l'anello sempre, così chi usa la tastiera non lo perde mai.
  Campi di testo e menu a tendina: un unico bordo di 2 px nel colore d'accento, senza contorno esterno.
- **Movimento:** solo transizioni di colore di 0,12 s; tutte disattivate con `prefers-reduced-motion`.

## 3. Come funziona (perché è robusto)

1. **Variabili del tema (livello più stabile).** Qualtrics colora tutti i componenti con 56 variabili CSS (`--mixes-primary-1`, `--colors-primary-for-selected`, …).
   Il tema le ridefinisce in `html:root`, che vince sul blocco `:root` di Qualtrics indipendentemente dall'ordine di caricamento.
2. **Regole per tipo di domanda.** Ogni domanda è un `<section class="question {tipo}" id="question-QIDn">`.
   Le regole sono limitate al tipo (`.nps`, `.mc.vertical`, `.slider`, `.te`, `.cs`, `.ro`, `.matrix`, `.sbs`) e prefissate da `#page`, così non serve `!important`.
3. **Stati nativi.** Si usano le classi che Qualtrics già gestisce (`.selected`, `.focused`, `.unanswered`).
   Nessun JavaScript e nessun controllo sostituito: la registrazione delle risposte resta quella nativa.

## 4. Interventi per tipologia

| Domanda | Tipo | Problema | Intervento | Impatto sul dato |
|---|---|---|---|---|
| Q1 | NPS 0–10 | Caselle 29×29 px su mobile, punti separati | Scala segmentata a tutta larghezza, celle alte 48 px, cella scelta piena | Nessuno |
| Q11 | Scala numerica | Come Q1, 28×28 px | Stesso componente di Q1 | Nessuno |
| Q2 | Scelta singola verticale | Area cliccabile stretta quanto il testo | Righe a tutta larghezza (max 38rem), selezione = sfondo + bordo doppio + radio pieno | Nessuno |
| Q6 | Slider 0–100 | Il cursore fermo a 0 sembra una risposta "0" | Cursore tratteggiato e "–" al posto del valore finché non viene toccato | Nessuno |
| Q3 | Testo su più righe | Campo grigio e stretto | Campo bianco a tutta larghezza, alto 8rem, focus evidente | Nessuno |
| Q10 | Somma costante | Numeri allineati a sinistra | Allineamento a destra con cifre a larghezza fissa, totale in grassetto | Nessuno |
| Q7 | Ranking | Elementi stretti | Righe a tutta larghezza allineate alle opzioni di Q2. Il riordino da tastiera nativo resta | Nessuno |
| Q5 | Matrice | Con testi reali la colonna delle affermazioni (23%) andava a capo fino a 5 righe | Colonna delle affermazioni al 40% (min 9rem); la fisarmonica nativa su mobile resta | Nessuno |
| Q8 | Side by side | Intestazioni lunghe | Intestazioni di colonna che vanno a capo; fisarmonica nativa su mobile | Nessuno |
| Q4 | Testo descrittivo | Aveva lo stesso peso visivo di una domanda | Introduzione di sezione: filetto sopra, testo normale grigio grafite | Nessuno |
| Q13 | Drill-down (anno, marca, modello) | — | Nessuno stile dedicato; verificato che la selezione a cascata funzioni con il tema | Nessuno |
| Pulsante | Navigazione | — | 48 px, colore d'accento, allineato alla colonna delle domande | — |

## 5. Verifica

Eseguita il 16/10/2026 sulla survey di prova e ripetuta il 28/10/2026 sulla versione con i testi reali
(`SV_0qWGJutGePeHFT8`, sandbox), iniettando `survey-theme.qualtrics.css` nella pagina reale con Chromium.
**Non è stata inviata nessuna risposta.**

| Controllo | Prima | Dopo |
|---|---|---|
| Scroll orizzontale a 1280 / 390 / 320 px | no | no |
| Cella NPS su mobile (390 px) | 29×29 | 33×48 |
| Cella NPS a 320 px | 24×24 | 28×48 |
| Cella scala numerica a 320 px | 24×24 | 26×44 |
| Opzione di scelta singola (390 px) | 71×44 | 358×52 |
| Pulsante Avanti | 44 px | 48 px |
| Selezione registrata nell'input nativo (NPS, scelta singola, scala, slider) | sì | sì |
| axe-core 4.10, tag WCAG 2.0/2.1/2.2 A-AA | 0 violazioni | 0 violazioni |
| Drill-down Q13: la scelta del 1° livello abilita il 2° | sì | sì |

Per ripetere il test:

```bash
npm i playwright axe-core
node tests/visual-check.js "<link della survey>" survey-theme.css ./out   # dopo
node tests/visual-check.js "<link della survey>" none ./out-before        # prima
```

### Da verificare manualmente in Qualtrics (non verificabile da qui)

- [ ] CSS incollato nel campo Custom CSS: stesso risultato di questo test, sia in Preview sia sul link pubblicato.
- [ ] iPhone (Safari) e Android (Chrome) reali: scala NPS su una riga, nessuno scroll orizzontale.
- [ ] Zoom del browser al 200%: testi e controlli leggibili, nessuna sovrapposizione.
- [ ] Tastiera: Tab tra le domande, frecce dentro le scale, Invio/Spazio nel ranking.
- [ ] Lettore di schermo (VoiceOver o NVDA): le etichette lette restano quelle di Qualtrics.
- [ ] Messaggi di errore: quando attiverai le risposte obbligatorie o le validazioni, controllare il colore `#B42318` e la leggibilità.
- [ ] Export CSV di una risposta di prova: colonne e valori identici a prima (il tema non può alterarli, ma va confermato).

## 6. Limiti noti

- Le classi usate (`.nps`, `.choice-label`, `.selected`…) **non sono un'interfaccia documentata** da Qualtrics: un aggiornamento della piattaforma potrebbe cambiarle.
  Il tema si degrada in modo sicuro (si torna allo stile Qualtrics, le risposte funzionano comunque). Dopo ogni aggiornamento Qualtrics, ripeti il test.
- Il trattino "–" dello slider non toccato è solo visivo: i lettori di schermo non lo annunciano.
- Il layout delle scelte singole orizzontali o a colonne non è stato ridisegnato (non presente nella survey).
- Side by side su desktop: con intestazioni lunghe la tabella può superare di circa 20 px il margine destro della colonna. È così anche senza tema (comportamento nativo).
- Il tema di brand dell'organizzazione potrebbe bloccare il campo Custom CSS in altri ambienti: è stato verificato solo sulla sandbox.

## 7. Manutenzione

- Per cambiare colore o dimensioni modifica **solo i token** nella sezione 1 di `survey-theme.css`, poi esegui `python3 build.py` e incolla di nuovo il file generato.
- Per un nuovo tipo di domanda aggiungi una sezione limitata alla sua classe (`#page .{tipo} …`), senza regole globali.
- Interventi in sospeso, su tua indicazione: correzioni P0 (Q13, vincolo totale = 100 in Q10, ricodifica di "idk" in Q5, testo segnaposto di Q4), interruzioni di pagina, testi definitivi.
