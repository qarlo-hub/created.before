import { SILHOUETTE } from './geometry.js';

// Gradients, filters and clip paths shared by every shirt instance (defined once per document).
export default function ShirtDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <DefsContent />
    </svg>
  );
}

export function DefsContent() {
  return (
      <defs>
        <clipPath id="tee-clip" clipPathUnits="userSpaceOnUse">
          <path d={SILHOUETTE} />
        </clipPath>

        {/* base cloth tone: soft top light falling off toward the hem */}
        <linearGradient id="tee-base" x1="0" y1="80" x2="0" y2="380" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2a2a2a" />
          <stop offset="0.28" stopColor="#1d1d1d" />
          <stop offset="0.75" stopColor="#161616" />
          <stop offset="1" stopColor="#101010" />
        </linearGradient>

        {/* cylindrical body shading: the cloth turns away at the sides */}
        <linearGradient id="tee-sides" x1="40" y1="0" x2="360" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#000" stopOpacity="0.55" />
          <stop offset="0.2" stopColor="#000" stopOpacity="0.5" />
          <stop offset="0.27" stopColor="#000" stopOpacity="0.12" />
          <stop offset="0.42" stopColor="#fff" stopOpacity="0.035" />
          <stop offset="0.62" stopColor="#000" stopOpacity="0" />
          <stop offset="0.74" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000" stopOpacity="0.65" />
        </linearGradient>

        <radialGradient id="tee-key" cx="150" cy="150" r="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="tee-neck-in" x1="0" y1="86" x2="0" y2="112" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#141414" />
          <stop offset="1" stopColor="#030303" />
        </linearGradient>

        <linearGradient id="chrome-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5d6063" />
          <stop offset="0.18" stopColor="#d9dcdf" />
          <stop offset="0.32" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#9da1a5" />
          <stop offset="0.72" stopColor="#4c4f52" />
          <stop offset="0.88" stopColor="#8d9195" />
          <stop offset="1" stopColor="#3a3c3e" />
        </linearGradient>
        <linearGradient id="chrome-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#4a4d50" />
          <stop offset="0.25" stopColor="#c9ccd0" />
          <stop offset="0.38" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#8b8f93" />
          <stop offset="1" stopColor="#3b3d40" />
        </linearGradient>

        <filter id="blur-xs" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id="blur-sm" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id="blur-md" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5.5" />
        </filter>
        <filter id="blur-lg" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="11" />
        </filter>

        <filter id="blur-xl" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="20" />
        </filter>

        {/* jersey knit grain */}
        <filter id="knit" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="1.1 0.55" numOctaves="2" seed="7" result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.75"
          />
        </filter>
        <pattern id="wales" width="2.2" height="6" patternUnits="userSpaceOnUse">
          <rect width="1" height="6" fill="#fff" opacity="0.5" />
        </pattern>
        {/* print ink: very slight softness so it sits in the fabric instead of floating on it */}
        <filter id="ink" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="1" seed="3" result="g" />
          <feColorMatrix in="g" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.55 1.22" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
      </defs>
  );
}
