"""Simulazione con le regole esatte indicate dall'utente.

- Squadre ammesse: 9°-15° posto nella classifica finale della stagione PRECEDENTE
  nello stesso campionato (le neopromosse sono escluse).
- Si inizia il ciclo solo su una squadra con almeno 5 partite di fila senza pareggio
  e meno di 5 pareggi stagionali.
- Progressione: 2, 3, 5, 10, 20, 40, 80, 160, ... (dalla 3ª puntata = somma delle precedenti)
  finché la squadra non pareggia.
- Se la stagione finisce prima del pareggio, le puntate del ciclo sono perse.

Uso:
    python strategia_utente.py path/to/Matches.csv
"""
import sys
import random

import pandas as pd

from backtest import load, LEAGUES

PREV_POS = range(9, 16)
MIN_STREAK = 5
MAX_DRAWS = 4  # "mai su squadre che hanno raggiunto i 5 pareggi"


def stake_at(step):
    """Puntata n-esima (1-based): 2, 3, 5, 10, 20, 40, ..."""
    seq = [2.0, 3.0]
    while len(seq) < step:
        seq.append(sum(seq))
    return seq[step - 1]


def final_tables(d):
    out = {}
    for (div, season), g in d.groupby(["Division", "Season"], sort=False):
        st = {}
        for m in g.itertuples():
            for t, gf, ga in ((m.HomeTeam, m.FTHome, m.FTAway), (m.AwayTeam, m.FTAway, m.FTHome)):
                s = st.setdefault(t, [0, 0, 0])
                s[0] += 1 if gf == ga else (3 if gf > ga else 0)
                s[1] += gf - ga
                s[2] += gf
        table = sorted(st, key=lambda t: (-st[t][0], -st[t][1], -st[t][2]))
        out[(div, season)] = {t: i + 1 for i, t in enumerate(table)}
    return out


def simulate(d, tables, cap=None, parallel=False, odds_col="Odd", seed=0):
    """parallel=False: un ciclo alla volta per campionato (squadra con la serie più lunga).
    parallel=True: un ciclo indipendente per ogni squadra che soddisfa i criteri."""
    rng = random.Random(seed)
    cycles, flows = [], []  # flows: (data, variazione del capitale impegnato)
    for (div, season), g in d.groupby(["Division", "Season"], sort=False):
        prev = tables.get((div, season - 1))
        if prev is None:
            continue
        teams = list(pd.unique(g[["HomeTeam", "AwayTeam"]].values.ravel()))
        eligible = {t for t in teams if prev.get(t) in PREV_POS}
        st = {t: dict(streak=0, draws=0) for t in teams}
        active = {}  # team -> dict(step, staked, start)

        def close(t, date, outcome, profit):
            a = active.pop(t)
            cycles.append(dict(div=div, season=season, team=t, start=a["start"], end=date,
                               steps=a["step"], staked=a["staked"], max_stake=stake_at(a["step"]),
                               profit=profit, outcome=outcome))
            flows.append((date, -a["staked"]))

        last_date = None
        for date, day in g.groupby("MatchDate", sort=True):
            last_date = date
            for m in day.itertuples():
                for t in (m.HomeTeam, m.AwayTeam):
                    if t not in active:
                        continue
                    a = active[t]
                    a["step"] += 1
                    stake = stake_at(a["step"])
                    a["staked"] += stake
                    flows.append((date, stake))
                    if m.FTResult == "D":
                        close(t, date, "vinto", stake * getattr(m, odds_col) - a["staked"])
                    elif cap and a["step"] >= cap:
                        close(t, date, "stop al limite", -a["staked"])
            for m in day.itertuples():
                draw = m.FTResult == "D"
                for t in (m.HomeTeam, m.AwayTeam):
                    st[t]["streak"] = 0 if draw else st[t]["streak"] + 1
                    st[t]["draws"] += draw
            cand = [t for t in eligible if t not in active
                    and st[t]["streak"] >= MIN_STREAK and st[t]["draws"] <= MAX_DRAWS]
            if not cand or (active and not parallel):
                continue
            if not parallel:
                best = max(st[t]["streak"] for t in cand)
                cand = [rng.choice([t for t in cand if st[t]["streak"] == best])]
            for t in cand:
                active[t] = dict(step=0, staked=0.0, start=date)
        for t in [t for t, a in active.items() if a["step"] > 0]:
            close(t, last_date, "fine stagione", -active[t]["staked"])
    c = pd.DataFrame(cycles)
    f = pd.DataFrame(flows, columns=["date", "delta"]).groupby("date").delta.sum().sort_index()
    return c, f.cumsum().max()


def summary(c, peak, label):
    lost = c[c.outcome != "vinto"]
    by_season = c.groupby(["div", "season"]).profit.sum()
    return {
        "scenario": label,
        "cicli": len(c),
        "persi": len(lost),
        "passi_max": int(c.steps.max()),
        "puntata_max_€": c.max_stake.max(),
        "capitale_impegnato_max_€": round(peak),
        "puntato_tot_€": round(c.staked.sum()),
        "profitto_€": round(c.profit.sum()),
        "ROI_%": round(100 * c.profit.sum() / c.staked.sum(), 1),
        "stagioni_in_perdita": f"{(by_season < 0).sum()}/{len(by_season)}",
    }


def main(path):
    pd.set_option("display.width", 250); pd.set_option("display.max_columns", 30)
    d_all = load(path, first=2005)
    tables = final_tables(d_all)
    d = d_all[d_all.Season >= 2006]
    print("Progressione:", [stake_at(i) for i in range(1, 13)])

    rows, details = [], {}
    for parallel in (False, True):
        mode = "tutte le squadre idonee" if parallel else "1 squadra per campionato"
        for cap in (None, 12, 10, 8):
            c, peak = simulate(d, tables, cap=cap, parallel=parallel)
            rows.append(summary(c, peak, f"{mode}, limite={cap or 'nessuno'}"))
            details[(parallel, cap)] = c
        c, peak = simulate(d, tables, cap=10, parallel=parallel, odds_col="MaxDraw")
        rows.append(summary(c, peak, f"{mode}, limite=10, quota MAX mercato"))
    print(pd.DataFrame(rows).to_string(index=False))

    for parallel in (False, True):
        c = details[(parallel, None)]
        title = "tutte le squadre idonee" if parallel else "1 squadra per campionato"
        print(f"\n===== Dettaglio senza limite: {title} =====")
        print("\nPartite necessarie per arrivare al pareggio (cicli):")
        print(c.steps.value_counts().sort_index().to_string())
        print("\nCicli più costosi:")
        print(c.sort_values("staked", ascending=False).head(10)
              [["div", "season", "team", "start", "end", "steps", "staked", "max_stake", "profit", "outcome"]]
              .to_string(index=False))
        print("\nPer campionato:")
        print(c.groupby("div").agg(cicli=("profit", "size"), passi_max=("steps", "max"),
                                   profitto=("profit", "sum")).rename(index=LEAGUES).round(0))
        print("\nProfitto per stagione:")
        print(c.groupby("season").profit.sum().round(0).to_string())


if __name__ == "__main__":
    main(sys.argv[1])
