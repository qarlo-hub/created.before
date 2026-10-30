"""Backtest della strategia "pareggio + progressione" sui 5 principali campionati.

Dati: Football-Data.co.uk (risultati + quote Bet365), via il dataset
https://github.com/xgabora/Club-Football-Match-Data-2000-2025 (file data/Matches.csv).

Uso:
    python backtest.py path/to/Matches.csv

Parte 1 - La frequenza di pareggio aumenta dopo una serie senza pareggi?
Parte 2 - Simulazione della strategia con progressione
          puntata_n = base + somma delle puntate perse nel ciclo (2, 4, 8, 16, ...).
"""
import sys
import random
from collections import defaultdict

import numpy as np
import pandas as pd

LEAGUES = {"I1": "Serie A", "E0": "Premier League", "SP1": "Liga",
           "D1": "Bundesliga", "F1": "Ligue 1"}
FIRST_SEASON, LAST_SEASON = 2006, 2025  # 2006/07 ... 2025/26 = 20 stagioni
BASE_STAKE = 2.0


def load(path, first=FIRST_SEASON, last=LAST_SEASON):
    d = pd.read_csv(path, low_memory=False,
                    usecols=["Division", "MatchDate", "HomeTeam", "AwayTeam",
                             "FTResult", "FTHome", "FTAway", "OddDraw", "MaxDraw"])
    d = d[d.Division.isin(LEAGUES)].copy()
    d["MatchDate"] = pd.to_datetime(d.MatchDate)
    d["Season"] = np.where(d.MatchDate.dt.month >= 7, d.MatchDate.dt.year, d.MatchDate.dt.year - 1)
    # 2019/20 si è chiuso tra luglio e inizio agosto 2020 per il Covid
    covid = (d.MatchDate >= "2020-07-01") & (d.MatchDate < "2020-08-20")
    d.loc[covid, "Season"] = 2019
    d = d[(d.Season >= first) & (d.Season <= last)].dropna(subset=["FTResult"])
    # quota mancante (~1%): uso la quota massima di mercato, altrimenti la mediana della stagione
    d["Odd"] = d.OddDraw.fillna(d.MaxDraw)
    d["Odd"] = d.Odd.fillna(d.groupby(["Division", "Season"]).Odd.transform("median"))
    return d.sort_values(["Division", "Season", "MatchDate"]).reset_index(drop=True)


def team_rows(d):
    """Una riga per squadra per partita, con lo stato PRIMA della partita."""
    rows = []
    for (div, season), g in d.groupby(["Division", "Season"], sort=False):
        teams = pd.unique(g[["HomeTeam", "AwayTeam"]].values.ravel())
        n = len(teams)
        st = {t: dict(pts=0, gd=0, gf=0, gp=0, streak=0, draws=0) for t in teams}
        for date, day in g.groupby("MatchDate", sort=True):
            table = sorted(teams, key=lambda t: (-st[t]["pts"], -st[t]["gd"], -st[t]["gf"]))
            pos = {t: i + 1 for i, t in enumerate(table)}
            for m in day.itertuples():
                draw = m.FTResult == "D"
                for t in (m.HomeTeam, m.AwayTeam):
                    s = st[t]
                    rows.append((div, season, n, t, s["gp"], pos[t], s["streak"], s["draws"],
                                 draw, m.Odd))
            for m in day.itertuples():
                draw = m.FTResult == "D"
                for t, gf, ga in ((m.HomeTeam, m.FTHome, m.FTAway), (m.AwayTeam, m.FTAway, m.FTHome)):
                    s = st[t]
                    s["gp"] += 1; s["gf"] += gf; s["gd"] += gf - ga
                    s["pts"] += 1 if draw else (3 if gf > ga else 0)
                    s["streak"] = 0 if draw else s["streak"] + 1
                    s["draws"] += draw
    return pd.DataFrame(rows, columns=["div", "season", "nteams", "team", "gp", "pos", "streak",
                                       "draws_so_far", "draw", "odd"])


def is_mid(pos, n):
    q = int(np.ceil(n * 0.25))
    return q + 1 <= pos <= n - q  # 20 squadre: 6-15; 18 squadre: 6-13


def part1(tr):
    tr = tr[tr.gp >= 3].copy()  # evito l'inizio stagione, quando la serie è per forza corta
    tr["mid"] = [is_mid(p, n) for p, n in zip(tr.pos, tr.nteams)]
    bins = [-1, 0, 1, 2, 3, 4, 5, 7, 10, 100]
    labels = ["0", "1", "2", "3", "4", "5", "6-7", "8-10", "11+"]
    tr["bucket"] = pd.cut(tr.streak, bins=bins, labels=labels)

    def summary(x):
        return pd.Series({
            "n": len(x),
            "freq_pareggio_%": 100 * x.draw.mean(),
            "prob_implicita_%": 100 * (1 / x.odd).mean(),
            "quota_media": x.odd.mean(),
            "ROI_puntata_fissa_%": 100 * ((x.draw * x.odd).sum() - len(x)) / len(x),
        })

    out = {}
    for name, sub in (("tutte le squadre", tr), ("solo metà classifica", tr[tr.mid])):
        out[name] = sub.groupby("bucket", observed=True).apply(summary, include_groups=False).round(1)

    # "ha già fatto tanti pareggi" -> pareggia meno? (partite 10-25)
    w = tr[(tr.gp >= 10) & (tr.gp <= 25)].copy()
    w["rate_so_far"] = pd.cut(w.draws_so_far / w.gp, [-0.01, 0.15, 0.25, 0.35, 1.0],
                              labels=["<15%", "15-25%", "25-35%", ">35%"])
    out["pareggi già fatti (giornate 10-25)"] = (
        w.groupby("rate_so_far", observed=True).apply(summary, include_groups=False).round(1))
    return out


def simulate(d, min_streak, cap=None, start_from=4, stop_frac=0.75, pick="longest",
             odds_col="Odd", seed=0):
    """Un ciclo attivo per campionato. Ritorna la lista dei cicli chiusi."""
    rng = random.Random(seed)
    cycles = []
    for (div, season), g in d.groupby(["Division", "Season"], sort=False):
        teams = list(pd.unique(g[["HomeTeam", "AwayTeam"]].values.ravel()))
        n = len(teams)
        rounds = 2 * (n - 1)
        st = {t: dict(pts=0, gd=0, gf=0, gp=0, streak=0) for t in teams}
        active = None  # dict(team, step, staked)
        for date, day in g.groupby("MatchDate", sort=True):
            for m in day.itertuples():
                if active and active["team"] in (m.HomeTeam, m.AwayTeam):
                    stake = BASE_STAKE + active["staked"]
                    active["staked"] += stake
                    active["step"] += 1
                    active["max_stake"] = stake
                    if m.FTResult == "D":
                        profit = stake * getattr(m, odds_col) - active["staked"]
                        cycles.append(dict(div=div, season=season, team=active["team"],
                                           steps=active["step"], staked=active["staked"],
                                           max_stake=stake, profit=profit, outcome="vinto"))
                        active = None
                    elif cap and active["step"] >= cap:
                        cycles.append(dict(div=div, season=season, team=active["team"],
                                           steps=active["step"], staked=active["staked"],
                                           max_stake=stake, profit=-active["staked"],
                                           outcome="stop al limite"))
                        active = None
            for m in day.itertuples():
                draw = m.FTResult == "D"
                for t, gf, ga in ((m.HomeTeam, m.FTHome, m.FTAway), (m.AwayTeam, m.FTAway, m.FTHome)):
                    s = st[t]
                    s["gp"] += 1; s["gf"] += gf; s["gd"] += gf - ga
                    s["pts"] += 1 if draw else (3 if gf > ga else 0)
                    s["streak"] = 0 if draw else s["streak"] + 1
            if active is None:
                table = sorted(teams, key=lambda t: (-st[t]["pts"], -st[t]["gd"], -st[t]["gf"]))
                cand = [t for i, t in enumerate(table)
                        if is_mid(i + 1, n) and st[t]["streak"] >= min_streak
                        and start_from <= st[t]["gp"] < stop_frac * rounds]
                if cand:
                    if pick == "longest":
                        best = max(st[t]["streak"] for t in cand)
                        cand = [t for t in cand if st[t]["streak"] == best]
                    active = dict(team=rng.choice(cand), step=0, staked=0.0, max_stake=0.0)
        if active and active["step"] > 0:  # stagione finita senza pareggio: perdita secca
            cycles.append(dict(div=div, season=season, team=active["team"], steps=active["step"],
                               staked=active["staked"], max_stake=active["max_stake"],
                               profit=-active["staked"], outcome="fine stagione"))
    return pd.DataFrame(cycles)


def report_sim(c, label):
    total = c.profit.sum()
    wins = (c.outcome == "vinto").sum()
    losses = c[c.outcome != "vinto"]
    # capitale necessario: massima esposizione di un singolo ciclo (somma puntate)
    return dict(strategia=label, cicli=len(c), cicli_vinti=wins,
                cicli_persi=len(losses), passi_max=int(c.steps.max()),
                puntata_max=c.max_stake.max(), esposizione_max=c.staked.max(),
                profitto_totale=round(total, 0),
                puntato_totale=round(c.staked.sum(), 0),
                ROI_pct=round(100 * total / c.staked.sum(), 1),
                stagioni_in_perdita=int((c.groupby(["div", "season"]).profit.sum() < 0).sum()),
                stagioni_tot=c.groupby(["div", "season"]).ngroups)


def main(path):
    pd.set_option("display.width", 200); pd.set_option("display.max_columns", 30)
    d = load(path)
    print(f"Partite: {len(d)}  stagioni: {d.Season.min()}/{d.Season.min()+1 - 2000:02d} - "
          f"{d.Season.max()}/{d.Season.max()+1 - 2000:02d}  pareggi: {100*(d.FTResult=='D').mean():.1f}%  "
          f"quota media X: {d.Odd.mean():.2f}")
    print(d.groupby("Division").apply(lambda x: pd.Series({
        "partite": len(x), "pareggi_%": round(100 * (x.FTResult == "D").mean(), 1),
        "quota_media_X": round(x.Odd.mean(), 2),
        "prob_implicita_%": round(100 * (1 / x.Odd).mean(), 1)}), include_groups=False))

    print("\n===== PARTE 1: frequenza di pareggio in base alla serie senza pareggi =====")
    for name, tab in part1(team_rows(d)).items():
        print(f"\n--- {name} ---\n{tab}")

    print("\n===== PARTE 2: simulazione strategia (1 ciclo alla volta per campionato) =====")
    res = []
    for ms in (0, 3, 5, 7):
        for cap in (None, 10, 8, 6):
            c = simulate(d, min_streak=ms, cap=cap)
            res.append(report_sim(c, f"serie>={ms}, limite={cap or 'nessuno'}"))
            if ms == 3 and cap is None:
                detail = c
    res.append(report_sim(simulate(d, 3, odds_col="MaxDraw"), "serie>=3, nessun limite, quota MAX mercato"))
    print(pd.DataFrame(res).to_string(index=False))

    print("\n--- dettaglio serie>=3 senza limite: distribuzione dei passi per ciclo ---")
    print(detail.steps.value_counts().sort_index().to_string())
    print("\n--- cicli peggiori ---")
    print(detail.sort_values("staked", ascending=False).head(10).to_string(index=False))
    print("\n--- profitto per stagione (somma 5 campionati) ---")
    print(detail.groupby("season").profit.sum().round(0).to_string())


if __name__ == "__main__":
    main(sys.argv[1])
