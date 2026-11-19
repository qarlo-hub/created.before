// Fits the print inside the chest print area of the shirt (viewBox units).
// Text is only ever scaled uniformly: font-size changes, glyphs are never stretched.

import { SIZES } from './store.js';

export const FONT = "'Open Sans', sans-serif";
export const LETTER_SPACING = 0.03; // em
export const LINE_HEIGHT = 1.16;

// Print area on the 400x400 shirt viewBox (chest, below the collar).
export const PRINT = { cx: 200, top: 146, width: 128, height: 118 };

let ctx;
const cache = new Map();

function measure(line, weight) {
  const key = weight + '|' + line;
  if (cache.has(key)) return cache.get(key);
  ctx ??= document.createElement('canvas').getContext('2d');
  ctx.font = `${weight} 100px ${FONT}`;
  const w = ctx.measureText(line).width + Math.max(0, line.length - 1) * LETTER_SPACING * 100;
  cache.set(key, w);
  return w;
}

// Called once the web font is ready: earlier measurements used the fallback font.
export function clearMeasureCache() {
  cache.clear();
}

// Greedy word wrap of one explicit line at a given font size (viewBox units).
function wrapLine(line, fs, weight) {
  const words = line.split(/ +/);
  const out = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (cur && (measure(next, weight) * fs) / 100 > PRINT.width) {
      out.push(cur);
      cur = w;
    } else cur = next;
  }
  out.push(cur);
  return out;
}

const MIN_WRAP_FS = 10; // below this, wrapping is preferred over further shrinking

export function layoutPrint({ text, size, align, weight }) {
  const userLines = (text || '').split('\n');
  const preset = SIZES.find((s) => s.id === size)?.fs ?? 20;
  const widthOf = (ls) => Math.max(1, ...ls.map((l) => measure(l, weight)));

  // 1. the user's own line breaks, shrunk uniformly if needed
  let lines = userLines;
  let fs = Math.min(preset, (PRINT.width / widthOf(lines)) * 100, PRINT.height / (lines.length * LINE_HEIGHT));

  // 2. if that makes the print too small, add soft line breaks between words instead
  if (fs < Math.min(preset, 17)) {
    for (let f = preset; f >= MIN_WRAP_FS; f -= 0.5) {
      const wrapped = userLines.flatMap((l) => wrapLine(l, f, weight));
      const fitW = (PRINT.width / widthOf(wrapped)) * 100;
      const fitH = PRINT.height / (wrapped.length * LINE_HEIGHT);
      const best = Math.min(f, fitW, fitH);
      if (best > fs + 0.01) {
        fs = best;
        lines = wrapped;
      }
      if (best >= f - 0.01) break; // fits at this size: largest possible, stop
    }
  }

  const x =
    align === 'left' ? PRINT.cx - PRINT.width / 2 : align === 'right' ? PRINT.cx + PRINT.width / 2 : PRINT.cx;
  // Block is top-anchored, like a real chest print, but short prints sit slightly lower.
  const blockH = lines.length * fs * LINE_HEIGHT;
  const top = PRINT.top + Math.max(0, Math.min(14, (PRINT.height - blockH) * 0.18));
  return {
    lines,
    wrapped: lines.length !== userLines.length,
    fontSize: fs,
    scale: fs / preset, // < 1 when auto-fitted
    anchor: align === 'left' ? 'start' : align === 'right' ? 'end' : 'middle',
    x,
    firstBaseline: top + fs * 0.94,
    lineStep: fs * LINE_HEIGHT,
  };
}
