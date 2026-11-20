import { useEffect, useRef } from 'react';
import { RASTER, VARIANTS } from '../lib/fabric.js';
import { DefsContent } from './ShirtDefs.jsx';
import { GarmentBase, GarmentSurface, PrintShade } from './Shirt.jsx';
import { PIECES } from './geometry.js';

const Silhouette = (props) => (
  <g {...props}>
    {PIECES.map((pc, i) => (
      <path key={i} d={pc.d} transform={pc.transform} />
    ))}
  </g>
);

/*
 * The cloth (knit noise, blurred drape, baked drop shadow) is expensive to repaint, and on the
 * rack shirts move every frame. So the cloth is rendered once from the same SVG components into
 * bitmaps; on the rack each shirt layers live vector parts (print, hanger, collar, hit area)
 * on top of them. The single-shirt views keep the fully live SVG.
 */
function Source({ kind, seed }) {
  const vb = `${RASTER.x} ${RASTER.y} ${RASTER.w} ${RASTER.h}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} width={RASTER.pxW} height={RASTER.pxH} data-kind={kind}>
      <DefsContent />
      {kind === 'fabric' ? (
        <>
          {/* baked shadow on the wall */}
          {/* the rack stands in front of the wall, lit from the ceiling: a soft shadow falls lower */}
          <Silhouette transform="translate(0 40) scale(1 1.02)" fill="#2a2016" opacity="0.2" filter="url(#blur-xl)" />
          <Silhouette transform="translate(0 14)" fill="#1e1a14" opacity="0.14" filter="url(#blur-lg)" />
          <Silhouette transform="translate(0 3)" fill="#000" opacity="0.28" filter="url(#blur-xs)" />
          <GarmentBase />
          <GarmentSurface seed={seed} />
        </>
      ) : (
        <PrintShade seed={seed} />
      )}
    </svg>
  );
}

async function rasterize(svgEl) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = RASTER.pxW;
    c.height = RASTER.pxH;
    c.getContext('2d').drawImage(img, 0, 0, RASTER.pxW, RASTER.pxH);
    const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob'))), 'image/png'));
    return URL.createObjectURL(blob);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FabricFactory({ onReady }) {
  const ref = useRef(null);
  useEffect(() => {
    let alive = true;
    const svgs = [...ref.current.querySelectorAll('svg')];
    Promise.all(svgs.map(rasterize))
      .then((urls) => {
        if (!alive) return urls.forEach(URL.revokeObjectURL);
        onReady({ fabric: urls.slice(0, VARIANTS.length), shade: urls[VARIANTS.length] });
      })
      .catch(() => {
        /* canvas unavailable or tainted: shirts simply stay fully vector */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'fixed', left: -99999, top: 0, width: 1, height: 1, overflow: 'hidden', pointerEvents: 'none' }}>
      {VARIANTS.map((v) => (
        <Source key={v} kind="fabric" seed={v} />
      ))}
      <Source kind="shade" seed={VARIANTS[0]} />
    </div>
  );
}
