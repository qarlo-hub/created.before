// Procedural showroom: lime-plaster wall lit by ceiling downlights, polished concrete floor.
// Painted once into a canvas (no image files, works offline).
//   - low-frequency light & material field computed at 1/Q resolution, upscaled smoothly
//   - fine grain, plaster pits and floor aggregate added at full resolution
//   - crisp details (shadow gap at the wall/floor joint) drawn last

const Q = 4; // low-res cell size in CSS px

function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, s) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s);
  const b = hash(xi + 1, yi, s);
  const c = hash(xi, yi + 1, s);
  const d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s, oct) {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  for (let i = 0; i < oct; i++) {
    sum += amp * vnoise(x, y, s + i * 17);
    norm += amp;
    amp *= 0.5;
    x *= 2.03;
    y *= 2.03;
  }
  return sum / norm;
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const WALL = [238, 235, 229];
const FLOOR = [170, 165, 158];

/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} o
 * @param {number} o.width   CSS px
 * @param {number} o.height  CSS px
 * @param {number|null} o.junction  y of the wall/floor joint (null: wall only)
 * @param {{x:number, y?:number, power?:number}[]} o.lights  downlight positions along the wall
 * @param {number} [o.seed]
 */
export function paintRoom(canvas, { width, height, junction = null, lights = [], seed = 11 }) {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(width));
  const H = Math.max(1, Math.round(height));
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';

  const jy = junction == null ? H + 1 : junction;
  const cx = W / 2;
  const lowW = Math.ceil(W / Q) + 2;
  const lowH = Math.ceil(H / Q) + 2;
  const low = document.createElement('canvas');
  low.width = lowW;
  low.height = lowH;
  const lctx = low.getContext('2d');
  const img = lctx.createImageData(lowW, lowH);
  const px = img.data;
  const scaleRef = Math.min(H, 900); // keeps light falloff consistent across screen sizes

  for (let j = 0; j < lowH; j++) {
    const y = j * Q;
    for (let i = 0; i < lowW; i++) {
      const x = i * Q;
      let r, g, b;
      if (y < jy) {
        /* ---- wall ---- */
        const m1 = fbm(x / 430, y / 430, seed, 4) - 0.5; // broad clouding of the lime wash
        const m2 = fbm(x / 95, y / 95, seed + 7, 3) - 0.5; // mid patches
        const xr = x * 0.95 + y * 0.31;
        const yr = -x * 0.31 + y * 0.95;
        const trowel = (fbm(xr / 170, yr / 26, seed + 13, 3) - 0.5) * smooth(0.42, 0.68, fbm(x / 320, y / 320, seed + 21, 2));
        const mat = 1 + m1 * 0.06 + m2 * 0.024 + trowel * 0.045;

        // light: dim ceiling band, scallops from each downlight, darker low wall
        let light = 0.84 + 0.03 * smooth(0, jy, y);
        let warm = 0;
        for (const L of lights) {
          const dy = y - (L.y ?? -0.04 * scaleRef);
          if (dy <= 0) continue;
          const dx = x - L.x;
          const sig = 26 + dy * 0.36;
          const gx = Math.exp(-(dx * dx) / (2 * sig * sig));
          // the lit area is bounded above by an arch: the classic downlight "scallop"
          const arch = smooth(0, 0.035 * scaleRef, dy - (dx * dx) / (0.55 * scaleRef));
          const fy = arch * smooth(0, 0.1 * scaleRef, dy) * Math.exp(-dy / (1.05 * scaleRef));
          const core = Math.exp(-(dx * dx) / (2 * (sig * 0.45) ** 2)) * Math.exp(-dy / (0.22 * scaleRef)) * smooth(0, 0.05 * scaleRef, dy);
          const k = (L.power ?? 1) * (gx * fy * 0.24 + core * 0.06 * arch);
          light += k;
          warm += k;
        }
        // ambient occlusion toward the floor, gentle falloff at the far sides
        if (junction != null) light -= 0.07 * Math.exp(-(jy - y) / 70);
        const side = (x - cx) / (W / 2);
        light -= 0.05 * side * side;
        const lum = mat * light;
        r = WALL[0] * lum + warm * 9;
        g = WALL[1] * lum + warm * 4;
        b = WALL[2] * lum - warm * 5;
      } else {
        /* ---- floor (perspective: t 0 at the wall, 1 at the viewer) ---- */
        const t = (y - jy) / Math.max(1, H - jy);
        const depth = 1 / (t + 0.06);
        const fx = (x - cx) / (36 + t * 300);
        const fz = depth * 2.2;
        const m1 = fbm(fx / 2.6, fz / 2.4, seed + 31, 4) - 0.5;
        const m2 = fbm(fx * 1.6, fz * 1.3, seed + 37, 2) - 0.5;
        const swirl = fbm(fx / 1.2 + m1 * 2, fz / 3, seed + 41, 3) - 0.5; // trowel swirls of polished concrete
        const mat = 1 + m1 * 0.11 + m2 * 0.04 + swirl * 0.06;
        let light = 0.92 + 0.13 * (1 - t) * (1 - t);
        let spec = 0;
        for (const L of lights) {
          const dx = x - L.x;
          const sig = 22 + t * 150;
          spec += (L.power ?? 1) * Math.exp(-(dx * dx) / (2 * sig * sig)) * Math.exp(-t * 2.4) * 0.16;
        }
        // reflected bright wall just behind the joint
        spec += 0.05 * Math.exp(-t * 9);
        const side = (x - cx) / (W / 2);
        light -= 0.07 * side * side * (0.4 + t);
        light -= 0.05 * Math.exp(-(y - jy) / 9); // contact shadow under the wall
        const lum = mat * light + spec;
        r = FLOOR[0] * lum + spec * 14;
        g = FLOOR[1] * lum + spec * 10;
        b = FLOOR[2] * lum + spec * 4;
      }
      const o = (j * lowW + i) * 4;
      px[o] = r;
      px[o + 1] = g;
      px[o + 2] = b;
      px[o + 3] = 255;
    }
  }
  lctx.putImageData(img, 0, 0);

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(low, 0, 0, lowW * Q, lowH * Q);

  /* ---- full-resolution grain ---- */
  const full = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = full.data;
  const jyPx = Math.round(jy * dpr);
  let seedR = (seed * 2654435761) >>> 0;
  const rnd = () => {
    seedR ^= seedR << 13;
    seedR ^= seedR >>> 17;
    seedR ^= seedR << 5;
    return (seedR >>> 0) / 4294967296;
  };
  for (let yy = 0; yy < canvas.height; yy++) {
    const amp = yy < jyPx ? 5.5 : 7.5;
    let o = yy * canvas.width * 4;
    for (let xx = 0; xx < canvas.width; xx++, o += 4) {
      const n = (rnd() + rnd() - 1) * amp;
      d[o] += n;
      d[o + 1] += n;
      d[o + 2] += n;
    }
  }
  ctx.putImageData(full, 0, 0);

  /* ---- sparse details: plaster pits, floor aggregate ---- */
  const wallArea = W * Math.min(jy, H);
  for (let k = 0, n = wallArea / 900; k < n; k++) {
    const x = rnd() * W;
    const y = rnd() * Math.min(jy, H);
    ctx.fillStyle = `rgba(90,80,70,${0.05 + rnd() * 0.08})`;
    ctx.fillRect(x, y, 0.8 + rnd() * 0.9, 0.8 + rnd() * 0.7);
  }
  if (junction != null) {
    const floorH = H - jy;
    for (let k = 0, n = (W * floorH) / 160; k < n; k++) {
      const t = Math.pow(rnd(), 0.7);
      const y = jy + t * floorH;
      const x = rnd() * W;
      const s = 0.5 + t * 1.8 * rnd();
      const light = rnd() > 0.55;
      ctx.fillStyle = light ? `rgba(240,236,228,${0.08 + rnd() * 0.12})` : `rgba(60,55,50,${0.06 + rnd() * 0.1})`;
      ctx.fillRect(x, y, s * (1.2 + rnd()), s * (0.35 + t * 0.6));
    }
    // shadow gap where the floor meets the wall, with a hairline catch-light on the floor edge
    ctx.fillStyle = 'rgba(30,25,20,0.35)';
    ctx.fillRect(0, jy - 1.2, W, 1.6);
    ctx.fillStyle = 'rgba(255,252,246,0.35)';
    ctx.fillRect(0, jy + 0.6, W, 0.8);
    const ao = ctx.createLinearGradient(0, jy - 26, 0, jy);
    ao.addColorStop(0, 'rgba(40,32,24,0)');
    ao.addColorStop(1, 'rgba(40,32,24,0.10)');
    ctx.fillStyle = ao;
    ctx.fillRect(0, jy - 26, W, 26);
  }
}

// Paint after the current frame so a heavy repaint never stalls an animation start.
export function paintRoomSoon(canvas, opts) {
  let cancelled = false;
  const run = () => !cancelled && canvas.isConnected && paintRoom(canvas, opts);
  const id = requestAnimationFrame(() => setTimeout(run, 0));
  return () => {
    cancelled = true;
    cancelAnimationFrame(id);
  };
}
