import { createContext } from 'react';

// Pre-rendered cloth bitmaps ({ fabric: url[], shade: url }) or null while not ready.
export const FabricContext = createContext(null);

export const RASTER = { x: -24, y: 0, w: 448, h: 448, px: 1024 };
export const VARIANTS = ['drape-a', 'drape-b', 'drape-c'];

export function variantFor(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % VARIANTS.length;
}

