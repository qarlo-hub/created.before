// Collection model + localStorage persistence.

// v2: new starting collection (bumping the key shows it to browsers that saved the old one)
export const STORAGE_KEY = 'rack-showroom.collection.v2';

export const SIZES = [
  { id: 'S', label: 'S', fs: 15 },
  { id: 'M', label: 'M', fs: 20 },
  { id: 'L', label: 'L', fs: 26 },
  { id: 'XL', label: 'XL', fs: 34 },
];
export const WEIGHTS = [
  { id: 400, label: 'Regular' },
  { id: 600, label: 'Semibold' },
  { id: 800, label: 'Bold' },
];
export const ALIGNS = ['left', 'center', 'right'];

export const MAX_CHARS = 120;
export const MAX_LINES = 6;

export const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`);

const SEED_TEXTS = ['GOVERNANCE\nDI CONTENUTO', 'DOBBIAMO\nTOGLIERCI\nIL VIZIO'];

export function initialCollection() {
  return SEED_TEXTS.map((text, i) => ({
    id: `seed-${i + 1}`,
    text,
    size: 'M',
    align: 'center',
    weight: 700,
    createdAt: 0,
  }));
}

export function sanitizeShirt(s) {
  const lines = String(s.text ?? '')
    .replace(/\r/g, '')
    .slice(0, MAX_CHARS)
    .split('\n')
    .slice(0, MAX_LINES);
  return {
    id: String(s.id || uid()),
    text: lines.join('\n'),
    size: SIZES.some((z) => z.id === s.size) ? s.size : 'M',
    align: ALIGNS.includes(s.align) ? s.align : 'center',
    weight: WEIGHTS.some((w) => w.id === Number(s.weight)) ? Number(s.weight) : 700,
    createdAt: Number(s.createdAt) || 0,
  };
}

export function loadCollection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialCollection();
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.shirts)) return initialCollection();
    const seen = new Set();
    return data.shirts
      .map(sanitizeShirt)
      .filter((s) => !seen.has(s.id) && seen.add(s.id));
  } catch {
    return initialCollection();
  }
}

export function saveCollection(shirts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, shirts }));
  } catch {
    /* storage unavailable (private mode / quota): keep working in memory */
  }
}
