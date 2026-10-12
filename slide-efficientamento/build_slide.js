// Genera una singola slide executive sull'efficientamento per 3 stream.
// Uso: node build_slide.js [data.json] [output.pptx]
const fs = require("fs");
const path = require("path");
const pptxgen = require("pptxgenjs");

const dataFile = process.argv[2] || path.join(__dirname, "data.json");
const outFile = process.argv[3] || path.join(__dirname, "efficientamento_stream.pptx");
const { streams } = JSON.parse(fs.readFileSync(dataFile, "utf8"));

// ---------- Validazione: nessun dato inventato ----------
const missing = [];
streams.forEach((s) => ["iniziale", "finale", "inizio", "fine"].forEach((k) => {
  if (s[k] === null || s[k] === undefined || s[k] === "") missing.push(`${s.nome}: ${k}`);
}));
const complete = missing.length === 0;
if (!complete) console.warn("DATI MANCANTI (slide generata come template):\n - " + missing.join("\n - "));

const errors = [];
const parseDate = (v) => { const d = new Date(v + "T00:00:00Z"); return isNaN(d) ? null : d; };
if (complete) streams.forEach((s) => {
  if (!Number.isFinite(s.iniziale) || !Number.isFinite(s.finale)) errors.push(`${s.nome}: valori non numerici`);
  if (s.finale > s.iniziale) errors.push(`${s.nome}: finale > iniziale`);
  s._start = parseDate(s.inizio); s._end = parseDate(s.fine);
  if (!s._start || !s._end) errors.push(`${s.nome}: data non valida (usare AAAA-MM-GG)`);
  else if (s._end < s._start) errors.push(`${s.nome}: fine precedente all'inizio`);
});
if (errors.length) { console.error("ERRORI NEI DATI:\n - " + errors.join("\n - ")); process.exit(1); }

// ---------- Calcoli ----------
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const fmtDate = (d) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const NA = "n.d.";
let tot = null;
if (complete) {
  streams.forEach((s) => { s.eliminati = s.iniziale - s.finale; });
  tot = streams.reduce((a, s) => ({ i: a.i + s.iniziale, f: a.f + s.finale, e: a.e + s.eliminati }), { i: 0, f: 0, e: 0 });
}

// ---------- Stile ----------
const COL = {
  ink: "1B2430", muted: "6B7684", line: "E3E7ED", card: "F4F6F9",
  initial: "C9D0D9",          // neutro: situazione iniziale
  final: "17375E",            // brand: situazione finale
  cut: "E8613C",              // accento: riduzione
  cutSoft: "FBE2D9",
  gantt: "5F7FA6",
};
const FONT = "Calibri";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "Efficientamento del processo – impatto per stream";
const slide = pres.addSlide();
slide.background = { color: "FFFFFF" };
const T = (text, o) => slide.addText(text, { isTextBox: true, fontFace: FONT, margin: 0, valign: "middle", ...o });

// ---------- Titolo ----------
const title = complete
  ? `Eliminati ${fmt(tot.e)} elementi non più necessari: da ${fmt(tot.i)} a ${fmt(tot.f)} sui tre stream`
  : "Eliminati [n.d.] elementi non più necessari: da [n.d.] a [n.d.] sui tre stream";
T(title, { x: 0.6, y: 0.4, w: 12.13, h: 0.85, fontSize: 26, bold: true, color: COL.ink, valign: "top", objectName: "Titolo" });
T("Numerica degli elementi per stream prima e dopo l'attività di analisi", {
  x: 0.6, y: 1.0, w: 12.13, h: 0.35, fontSize: 14, color: COL.muted, objectName: "Sottotitolo" });

// ---------- KPI complessivi ----------
const kpis = [
  { label: "Situazione iniziale", value: complete ? fmt(tot.i) : NA, color: COL.muted, dot: COL.initial },
  { label: "Elementi eliminati", value: complete ? "−" + fmt(tot.e) : NA, color: COL.cut, dot: COL.cut },
  { label: "Situazione finale", value: complete ? fmt(tot.f) : NA, color: COL.final, dot: COL.final },
];
const kY = 1.85, kH = 1.15, kW = 3.6, kGap = (12.13 - 3 * kW) / 2;
kpis.forEach((k, i) => {
  const x = 0.6 + i * (kW + kGap);
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: kY, w: kW, h: kH, rectRadius: 0.12,
    fill: { color: i === 1 ? COL.cutSoft : COL.card }, line: { type: "none" }, objectName: `KPI ${k.label}` });
  slide.addShape(pres.shapes.OVAL, { x: x + 0.3, y: kY + 0.27, w: 0.13, h: 0.13, fill: { color: k.dot }, line: { type: "none" } });
  T(k.label.toUpperCase(), { x: x + 0.52, y: kY + 0.18, w: kW - 0.8, h: 0.3, fontSize: 12, bold: true, color: COL.muted, charSpacing: 1 });
  T(k.value, { x: x + 0.3, y: kY + 0.5, w: kW - 0.6, h: 0.55, fontSize: 34, bold: true, color: k.color });
  if (i < 2) T("→", { x: x + kW, y: kY, w: kGap, h: kH, fontSize: 24, color: COL.initial, align: "center" });
});

// ---------- Intestazioni sezioni + legenda ----------
const secY = 3.38;
const tlX = 9.05, tlW = 12.73 - tlX;
T("CONFRONTO PER STREAM", { x: 0.6, y: secY, w: 3.5, h: 0.3, fontSize: 12, bold: true, color: COL.ink, charSpacing: 1 });
T("PERIODO DI ATTIVITÀ", { x: tlX, y: secY, w: tlW, h: 0.3, fontSize: 12, bold: true, color: COL.ink, charSpacing: 1 });
[["Iniziale", COL.initial], ["Eliminati", COL.cut], ["Finale", COL.final]].forEach(([lab, c], i) => {
  const lx = 4.35 + i * 1.35;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: lx, y: secY + 0.08, w: 0.24, h: 0.14, rectRadius: 0.04, fill: { color: c }, line: { type: "none" } });
  T(lab, { x: lx + 0.32, y: secY, w: 1.0, h: 0.3, fontSize: 12, color: COL.muted });
});
slide.addShape(pres.shapes.LINE, { x: 8.75, y: secY, w: 0, h: 3.55, line: { color: COL.line, width: 1 } });

// ---------- Righe per stream ----------
const rowY0 = 3.85, rowH = 0.92;
const barX = 2.35, maxBar = 5.0, numX = 7.5, numW = 1.05;
const maxInit = complete ? Math.max(...streams.map((s) => s.iniziale)) : 1;
const demo = [[1, 0.62], [0.72, 0.5], [0.5, 0.22]]; // proporzioni solo grafiche per il template

// ---------- Asse temporale ----------
const axisY = rowY0 + 3 * rowH - 0.02;
slide.addShape(pres.shapes.LINE, { x: tlX, y: axisY, w: tlW, h: 0, line: { color: COL.initial, width: 1 } });
if (complete) {
  const MESI = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  const min = Math.min(...streams.map((t) => +t._start)), max = Math.max(...streams.map((t) => +t._end));
  const span = Math.max(max - min, 1);
  const d0 = new Date(min), d1 = new Date(max);
  const months = (d1.getUTCFullYear() - d0.getUTCFullYear()) * 12 + d1.getUTCMonth() - d0.getUTCMonth() + 1;
  const step = Math.max(1, Math.ceil(months / 5));
  for (let m = 1; m <= months; m += step) {
    const t = Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + m, 1);
    if (t >= max) break;
    const x = tlX + ((t - min) / span) * tlW;
    slide.addShape(pres.shapes.LINE, { x, y: rowY0, w: 0, h: axisY - rowY0, line: { color: COL.line, width: 0.75, dashType: "dash" } });
    const d = new Date(t);
    T(`${MESI[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, { x: x - 0.4, y: axisY + 0.05, w: 0.8, h: 0.25, fontSize: 11, color: COL.muted, align: "center" });
  }
}

streams.forEach((s, i) => {
  const y = rowY0 + i * rowH;
  if (i > 0) slide.addShape(pres.shapes.LINE, { x: 0.6, y: y - 0.07, w: 7.95, h: 0, line: { color: COL.line, width: 0.75 } });
  T(s.nome, { x: 0.6, y: y + 0.05, w: 1.65, h: 0.36, fontSize: 16, bold: true, color: COL.ink });
  T(complete ? `−${fmt(s.eliminati)} eliminati` : `${NA} eliminati`, { x: 0.6, y: y + 0.4, w: 1.7, h: 0.3, fontSize: 13, bold: true, color: COL.cut });

  const [ri, rf] = complete ? [s.iniziale / maxInit, s.finale / maxInit] : demo[i];
  const wI = Math.max(ri * maxBar, 0.02), wF = rf * maxBar;
  const yI = y + 0.1, yF = y + 0.43, bh = 0.26;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: barX, y: yI, w: wI, h: bh, rectRadius: 0.05, fill: { color: COL.initial }, line: { type: "none" }, objectName: `${s.nome} iniziale` });
  if (wF > 0.01) slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: barX, y: yF, w: wF, h: bh, rectRadius: 0.05, fill: { color: COL.final }, line: { type: "none" }, objectName: `${s.nome} finale` });
  if (wI - wF > 0.01) slide.addShape(pres.shapes.RECTANGLE, { x: barX + wF, y: yF, w: wI - wF, h: bh,
    fill: { color: COL.cutSoft }, line: { color: COL.cut, width: 1, dashType: "dash" }, objectName: `${s.nome} eliminati` });

  T(complete ? fmt(s.iniziale) : NA, { x: numX, y: yI - 0.03, w: numW, h: bh + 0.06, fontSize: 14, color: COL.muted, align: "right" });
  T(complete ? fmt(s.finale) : NA, { x: numX, y: yF - 0.03, w: numW, h: bh + 0.06, fontSize: 16, bold: true, color: COL.final, align: "right" });

  // Timeline (Gantt semplificato)
  let gx = tlX + 0.05, gw = tlW * 0.5 + 0.05 * i * 10, label = "gg/mm/aaaa – gg/mm/aaaa";
  if (complete) {
    const min = Math.min(...streams.map((t) => +t._start)), max = Math.max(...streams.map((t) => +t._end));
    const span = Math.max(max - min, 1);
    gx = tlX + ((+s._start - min) / span) * tlW;
    gw = Math.max(((+s._end - +s._start) / span) * tlW, 0.08);
    label = `${fmtDate(s._start)} – ${fmtDate(s._end)}`;
  } else gx = tlX + i * 0.6, gw = tlW * 0.5;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: gx, y: yF, w: gw, h: bh, rectRadius: 0.13, fill: { color: COL.gantt }, line: { type: "none" }, objectName: `${s.nome} periodo` });
  const lw = 2.3;
  const lx = Math.min(gx, tlX + tlW - lw);
  T(label, { x: lx, y: yI - 0.03, w: lw, h: bh + 0.06, fontSize: 12, color: COL.ink, align: "left" });
});

// ---------- Nota ----------
T("Elementi eliminati = numerica iniziale − numerica finale. Totali calcolati come somma dei tre stream.", {
  x: 0.6, y: 7.0, w: 8.0, h: 0.25, fontSize: 10, color: COL.muted });
if (!complete) T("TEMPLATE – dati da inserire in data.json", { x: 8.73, y: 7.0, w: 4.0, h: 0.25, fontSize: 10, bold: true, color: COL.cut, align: "right" });

pres.writeFile({ fileName: outFile }).then(() => console.log("Creato: " + outFile));
