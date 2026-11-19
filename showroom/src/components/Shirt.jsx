import { memo, useContext, useMemo } from 'react';
import { FontContext } from '../lib/fontContext.js';
import { FabricContext, RASTER, variantFor } from '../lib/fabric.js';
import { SILHOUETTE, NECK_OPENING, COLLAR_BAND, COLLAR_MID, VB } from './geometry.js';
import { layoutPrint, FONT, LETTER_SPACING } from '../lib/textFit.js';

// Small deterministic PRNG so each shirt drapes a little differently but consistently.
function rng(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) h = Math.imul(h ^ seedStr.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- Hanger: chrome wire hook + twisted neck ---------- */
export const Hanger = memo(function Hanger() {
  const hook = 'M200 96 L200 34 C200 22 211 19 212.5 29';
  const twist = [];
  for (let y = 70; y < 95; y += 3.4) twist.push(`M198 ${y + 2.6} L202 ${y}`);
  return (
    <g className="hanger" pointerEvents="none">
      {/* contact shadow of the hook on the cloth */}
      <ellipse cx="201" cy="96" rx="7" ry="2.4" fill="#000" opacity="0.5" filter="url(#blur-xs)" />
      <path d={hook} fill="none" stroke="#2e3133" strokeWidth="3.6" strokeLinecap="round" />
      <path d={hook} fill="none" stroke="#a7abaf" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M199.2 94 L199.2 34 C199.3 24.5 207 21 210.6 25" fill="none" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" opacity="0.9" />
      {/* twisted wire section above the collar */}
      <path d="M200 96 L200 68" stroke="#2b2e30" strokeWidth="5" strokeLinecap="round" />
      <path d="M200 96 L200 68" stroke="#8f9397" strokeWidth="3.8" strokeLinecap="round" />
      <path d={twist.join(' ')} stroke="#f4f5f6" strokeWidth="0.9" strokeLinecap="round" opacity="0.85" />
      <path d={twist.map((s) => s.replace(/M198 ([\d.]+)/, (m, y) => `M198.6 ${+y + 1.2}`)).join(' ')} stroke="#3a3d40" strokeWidth="0.6" opacity="0.7" />
    </g>
  );
});

/* ---------- Print: white Open Sans lettering, never distorted ---------- */
export const Print = memo(function Print({ text, size, align, weight, ink = true }) {
  const fontVersion = useContext(FontContext);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const p = useMemo(() => layoutPrint({ text, size, align, weight }), [text, size, align, weight, fontVersion]);
  return (
    <text
      className="print"
      x={p.x}
      y={p.firstBaseline}
      textAnchor={p.anchor}
      fontFamily={FONT}
      fontWeight={weight}
      fontSize={p.fontSize}
      letterSpacing={`${LETTER_SPACING}em`}
      fill="#fbfaf7"
      filter={ink ? 'url(#ink)' : undefined}
      pointerEvents="none"
    >
      {p.lines.map((line, i) => (
        <tspan key={i} x={p.x} dy={i === 0 ? 0 : p.lineStep}>
          {line || ' '}
        </tspan>
      ))}
    </text>
  );
});

/* ---------- Garment: cloth, drape, seams, collar ---------- */
function useFolds(seed) {
  return useMemo(() => {
    const r = rng(seed);
    const j = (a) => (r() - 0.5) * 2 * a;
    const lx = 120 + j(6);
    const rx = 282 + j(6);
    const cx = 200 + j(10);
    return {
      light: [
        // drape from the hanger tips
        `M${lx - 6} 128 C${lx} 200 ${lx - 10 + j(4)} 280 ${lx - 2} 366`,
        `M${rx + 4} 130 C${rx - 2} 210 ${rx + 8 + j(4)} 290 ${rx} 366`,
        // drag lines neck → armpit
        `M172 106 Q144 132 112 168`,
        `M228 106 Q256 132 288 168`,
        // sleeves
        `M93 128 Q78 152 64 182`,
        `M307 128 Q322 152 336 182`,
        // lower body soft swell
        `M${cx - 30} 300 C${cx - 26} 330 ${cx - 34} 350 ${cx - 28} 368`,
      ],
      dark: [
        `M${lx + 12} 138 C${lx + 18} 210 ${lx + 8 + j(5)} 290 ${lx + 14} 368`,
        `M${rx - 14} 140 C${rx - 20} 214 ${rx - 10 + j(5)} 292 ${rx - 16} 368`,
        `M178 114 Q150 146 120 180`,
        `M222 114 Q250 146 280 180`,
        `M101 150 Q97 172 90 198`,
        `M299 150 Q303 172 310 198`,
        `M${cx + 6 + j(6)} 282 C${cx + 10} 318 ${cx + 2} 344 ${cx + 8} 370`,
        `M${cx - 48} 330 Q${cx - 44} 352 ${cx - 50} 370`,
        `M${cx + 52} 326 Q${cx + 48} 350 ${cx + 54} 370`,
      ],
    };
  }, [seed]);
}

const SEAM_DARK = '#050505';
const SEAM_LIGHT = '#3c3c3c';

export const GarmentBase = memo(function GarmentBase() {
  return (
    <g pointerEvents="none">
      <path d={SILHOUETTE} fill="url(#tee-base)" />
      <path d={NECK_OPENING} fill="url(#tee-neck-in)" />
      {/* inner back neck tape */}
      <path d="M168 90.5 Q200 85 232 90.5" fill="none" stroke="#0e0e0e" strokeWidth="5" />
      <path d="M170 93 Q200 88 230 93" fill="none" stroke="#000" strokeWidth="1.6" opacity="0.7" />
    </g>
  );
});

export const GarmentSurface = memo(function GarmentSurface({ seed }) {
  const f = useFolds(seed);
  return (
    <g pointerEvents="none">
      <g clipPath="url(#tee-clip)">
        <rect x="0" y="0" width={VB} height={VB} fill="url(#tee-sides)" />
        <rect x="0" y="0" width={VB} height={VB} fill="url(#tee-key)" />
        {/* drape */}
        <g filter="url(#blur-md)">
          {f.dark.map((d, i) => (
            <path key={'d' + i} d={d} stroke="#000" strokeWidth={i < 2 ? 12 : 8} fill="none" opacity={i < 2 ? 0.5 : 0.38} />
          ))}
          {f.light.map((d, i) => (
            <path key={'l' + i} d={d} stroke="#fff" strokeWidth={i < 2 ? 9 : 6} fill="none" opacity={0.085} />
          ))}
        </g>
        {/* hanger tips pushing the shoulders */}
        <ellipse cx="101" cy="122" rx="9" ry="6" fill="#fff" opacity="0.07" filter="url(#blur-sm)" />
        <ellipse cx="299" cy="122" rx="9" ry="6" fill="#fff" opacity="0.045" filter="url(#blur-sm)" />
        {/* sleeves sit slightly behind the body plane */}
        <path d="M95 115 C82 131 64 158 49 184 Q67 197 86 207 C92 196 98 184 102 174 C104 150 100 130 95 115Z" fill="#000" opacity="0.18" />
        <path d="M305 115 C318 131 336 158 351 184 Q333 197 314 207 C308 196 302 184 298 174 C296 150 300 130 305 115Z" fill="#000" opacity="0.3" />
        {/* hem turn-up */}
        <path d="M100 362 C160 369 240 369 300 362" stroke="#000" strokeWidth="9" fill="none" opacity="0.35" filter="url(#blur-sm)" />
        <path d="M101 356.5 C160 363.5 240 363.5 299 356.5" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.06" />
        {/* jersey texture */}
        <rect x="0" y="0" width={VB} height={VB} fill="url(#wales)" opacity="0.025" />
        <rect x="0" y="0" width={VB} height={VB} filter="url(#knit)" opacity="0.09" />
      </g>

      {/* seams & stitching */}
      <g fill="none" strokeLinecap="round">
        {/* shoulder seams */}
        <path d="M165 93 C149 98 121 107 97 118" stroke={SEAM_DARK} strokeWidth="1.3" opacity="0.8" />
        <path d="M165 94.6 C149 99.6 121 108.6 97 119.6" stroke={SEAM_LIGHT} strokeWidth="0.7" opacity="0.6" />
        <path d="M235 93 C251 98 279 107 303 118" stroke={SEAM_DARK} strokeWidth="1.3" opacity="0.8" />
        <path d="M235 94.6 C251 99.6 279 108.6 303 119.6" stroke={SEAM_LIGHT} strokeWidth="0.7" opacity="0.5" />
        {/* armholes */}
        <path d="M96 117 C104 134 106 154 102.5 174" stroke={SEAM_DARK} strokeWidth="1.4" opacity="0.85" />
        <path d="M97.8 118 C105.8 135 107.8 155 104.3 174" stroke={SEAM_LIGHT} strokeWidth="0.7" opacity="0.55" />
        <path d="M304 117 C296 134 294 154 297.5 174" stroke={SEAM_DARK} strokeWidth="1.4" opacity="0.85" />
        <path d="M302.2 118 C294.2 135 292.2 155 295.7 174" stroke={SEAM_LIGHT} strokeWidth="0.7" opacity="0.4" />
        {/* sleeve hems: crease + twin-needle stitch */}
        <path d="M55 176.5 Q71 188 89 198" stroke="#000" strokeWidth="1.2" opacity="0.7" />
        <path d="M55.6 178.5 Q71.6 190 89.4 200" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.6 1.3" opacity="0.9" />
        <path d="M52.6 181.5 Q68.6 193 87.4 203" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.6 1.3" opacity="0.7" />
        <path d="M345 176.5 Q329 188 311 198" stroke="#000" strokeWidth="1.2" opacity="0.7" />
        <path d="M344.4 178.5 Q328.4 190 310.6 200" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.6 1.3" opacity="0.7" />
        <path d="M347.4 181.5 Q331.4 193 312.6 203" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.6 1.3" opacity="0.5" />
        {/* bottom hem stitch */}
        <path d="M102.5 359 C160 366 240 366 297.5 359" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.7 1.3" opacity="0.85" />
        <path d="M102.5 362.6 C160 369.6 240 369.6 297.5 362.6" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.7 1.3" opacity="0.6" />
      </g>

      {/* outline: soft edge so the black reads against the wall */}
      <path d={SILHOUETTE} fill="none" stroke="#000" strokeWidth="1" opacity="0.55" />
    </g>
  );
});

// The print follows the cloth: a fraction of the drape shading is laid over the ink.
export const PrintShade = memo(function PrintShade({ seed }) {
  const f = useFolds(seed);
  return (
    <g pointerEvents="none" clipPath="url(#tee-clip)">
      <rect x="0" y="0" width={VB} height={VB} fill="url(#tee-sides)" opacity="0.35" />
      <g filter="url(#blur-md)" opacity="0.4">
        {f.dark.map((d, i) => (
          <path key={i} d={d} stroke="#000" strokeWidth={8} fill="none" opacity={0.35} />
        ))}
      </g>
      <rect x="0" y="0" width={VB} height={VB} filter="url(#knit)" opacity="0.07" />
    </g>
  );
});

export const Collar = memo(function Collar() {
  return (
    <g pointerEvents="none">
      <path d={COLLAR_BAND} fill="#1b1b1b" />
      {/* rib knit: a dense dash along the band reads as vertical ribs */}
      <path d={COLLAR_MID} fill="none" stroke="#0b0b0b" strokeWidth="7" strokeDasharray="0.7 1.1" />
      <path d="M167.5 90.5 C171.5 104 184 110.5 200 110.5 C216 110.5 228.5 104 232.5 90.5" fill="none" stroke="#000" strokeWidth="1.2" />
      <path d="M161.5 91 C163.5 108 180 117.5 200 117.5 C220 117.5 236.5 108 238.5 91" fill="none" stroke="#3a3a3a" strokeWidth="0.6" opacity="0.8" />
      {/* collar seam stitch */}
      <path d="M159.5 92 C161 111.5 179.5 121 200 121 C220.5 121 239 111.5 240.5 92" fill="none" stroke={SEAM_LIGHT} strokeWidth="0.55" strokeDasharray="1.5 1.2" opacity="0.8" />
      <path d="M163 92 C165 104 176 112 186 114.5" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.07" />
    </g>
  );
});

/* ---------- Composite T-shirt on its hanger ---------- */
// mode "raster": cloth from pre-rendered bitmaps (cheap to move, used on the rack)
// mode "live":   everything as live SVG (single-shirt views)
const Shirt = memo(function Shirt({ shirt, className, title, mode = 'live' }) {
  const fabric = useContext(FabricContext);
  const raster = mode === 'raster' && fabric;
  const img = (href) => (
    <image href={href} x={RASTER.x} y={RASTER.y} width={RASTER.w} height={RASTER.h} preserveAspectRatio="none" pointerEvents="none" />
  );
  return (
    <svg
      className={className}
      viewBox={`0 0 ${VB} ${VB}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title ?? `Black T-shirt printed “${shirt.text.replace(/\n/g, ' ')}”`}
      data-mode={raster ? 'raster' : 'live'}
    >
      {raster ? (
        img(fabric.fabric[variantFor(shirt.id)])
      ) : (
        <>
          <GarmentBase />
          <GarmentSurface seed={shirt.id} />
        </>
      )}
      <Print text={shirt.text} size={shirt.size} align={shirt.align} weight={shirt.weight} ink={!raster} />
      {raster ? img(fabric.shade) : <PrintShade seed={shirt.id} />}
      <Hanger />
      <Collar />
      {/* hit area: the real silhouette + the hook, so overlapping shirts are picked precisely */}
      <path className="hit" d={SILHOUETTE} fill="transparent" />
      <path className="hit" d="M200 96 L200 30" stroke="transparent" strokeWidth="14" />
    </svg>
  );
});

export default Shirt;
