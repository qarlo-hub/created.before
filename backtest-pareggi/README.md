# Backtest: pareggi + progressione

Verifica della strategia "punta sul pareggio di una squadra di metà classifica che non pareggia da un po',
raddoppiando (puntata = 2 € + tutto il perso nel ciclo) finché non pareggia".

- Dati: Football-Data.co.uk (risultati + quote Bet365 del pareggio), tramite il dataset
  [xgabora/Club-Football-Match-Data-2000-2025](https://github.com/xgabora/Club-Football-Match-Data-2000-2025).
- Campionati: Serie A, Premier League, Liga, Bundesliga, Ligue 1. Stagioni 2006/07–2025/26
  (Liga 2006/07 assente nel dataset). 35.816 partite.
- Output completo: `risultati.txt`.

```bash
git clone --depth 1 https://github.com/xgabora/Club-Football-Match-Data-2000-2025.git
python backtest.py Club-Football-Match-Data-2000-2025/data/Matches.csv
```

## Regole simulate
- Metà classifica = posizione 6–15 (6–13 con 18 squadre) nella classifica del momento, senza guardare il futuro.
- Si inizia un ciclo solo dalla 4ª giornata giocata e fino al 75% della stagione.
- Si sceglie la squadra di metà classifica con la serie senza pareggi più lunga (soglia minima 0/3/5/7).
- Un ciclo alla volta per campionato. Ciclo perso se: si raggiunge il limite di puntate oppure finisce la stagione.
