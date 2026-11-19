import { memo } from 'react';

// Chrome tube profile, from the lit top edge to the bottom edge.
const STOPS = [
  [0, '#4f5255'],
  [0.12, '#b9bdc1'],
  [0.26, '#ffffff'],
  [0.4, '#c9ccd0'],
  [0.62, '#6c7074'],
  [0.84, '#a3a7ab'],
  [1, '#35383a'],
];

function Lin({ id, x1, y1, x2, y2 }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      {STOPS.map(([o, c]) => (
        <stop key={o} offset={o} stopColor={c} />
      ))}
    </linearGradient>
  );
}

function Bend({ id, cx, cy, rIn, rOut }) {
  const k = rIn / rOut;
  return (
    <radialGradient id={id} cx={cx} cy={cy} r={rOut} gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#35383a" />
      {[...STOPS].reverse().map(([o, c]) => (
        <stop key={o} offset={k + (1 - k) * (1 - o)} stopColor={c} />
      ))}
    </radialGradient>
  );
}

/**
 * Free-standing bent-tube garment rack. Coordinates are in track pixels.
 * x0/x1: tube centre-lines of the uprights, railY: rail centre, floorY: floor contact line.
 */
const RackStructure = memo(function RackStructure({ width, height, x0, x1, railY, floorY, t, prefix = 'rk' }) {
  const h = t / 2;
  const R = t * 2.2; // bend radius (centre-line)
  const rIn = R - h;
  const rOut = R + h;
  const footW = t * 7;
  const footH = t * 0.85;
  const lowBar = floorY - t * 3.2;
  const id = (n) => `${prefix}-${n}`;
  return (
    <svg className="rack-structure" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <Lin id={id('h')} x1="0" y1="0" x2="0" y2="1" />
        <Lin id={id('vl')} x1="0" y1="0" x2="1" y2="0" />
        <Lin id={id('vr')} x1="1" y1="0" x2="0" y2="0" />
        <Bend id={id('bl')} cx={x0 + R} cy={railY + R} rIn={rIn} rOut={rOut} />
        <Bend id={id('br')} cx={x1 - R} cy={railY + R} rIn={rIn} rOut={rOut} />
        <filter id={id('shadow')} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation={t * 0.9} />
        </filter>
        <linearGradient id={id('foot')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="0.35" stopColor="#1c1c1c" />
          <stop offset="1" stopColor="#0b0b0b" />
        </linearGradient>
      </defs>

      {/* contact shadows on the floor */}
      <ellipse cx={(x0 + x1) / 2} cy={floorY + footH * 0.4} rx={(x1 - x0) / 2 + footW * 0.4} ry={t * 0.9} fill="#000" opacity="0.16" filter={`url(#${id('shadow')})`} />
      <ellipse cx={x0} cy={floorY + footH * 0.3} rx={footW * 0.6} ry={t * 0.5} fill="#000" opacity="0.35" filter={`url(#${id('shadow')})`} />
      <ellipse cx={x1} cy={floorY + footH * 0.3} rx={footW * 0.6} ry={t * 0.5} fill="#000" opacity="0.35" filter={`url(#${id('shadow')})`} />

      {/* uprights */}
      <rect x={x0 - h} y={railY + R} width={t} height={floorY - footH - railY - R} fill={`url(#${id('vl')})`} />
      <rect x={x1 - h} y={railY + R} width={t} height={floorY - footH - railY - R} fill={`url(#${id('vr')})`} />
      {/* bends */}
      <path
        d={`M${x0 - h} ${railY + R} A${rOut} ${rOut} 0 0 1 ${x0 + R} ${railY - h} L${x0 + R} ${railY + h} A${rIn} ${rIn} 0 0 0 ${x0 + h} ${railY + R} Z`}
        fill={`url(#${id('bl')})`}
      />
      <path
        d={`M${x1 + h} ${railY + R} A${rOut} ${rOut} 0 0 0 ${x1 - R} ${railY - h} L${x1 - R} ${railY + h} A${rIn} ${rIn} 0 0 1 ${x1 - h} ${railY + R} Z`}
        fill={`url(#${id('br')})`}
      />
      {/* top rail */}
      <rect x={x0 + R - 0.5} y={railY - h} width={x1 - x0 - 2 * R + 1} height={t} fill={`url(#${id('h')})`} />
      {/* lower stretcher bar */}
      <rect x={x0} y={lowBar - h * 0.8} width={x1 - x0} height={t * 0.8} fill={`url(#${id('h')})`} />
      {/* weld collars */}
      {[x0, x1].map((x) => (
        <rect key={x} x={x - h * 1.25} y={lowBar - h * 1.1} width={t * 1.25} height={t * 1.1} fill={`url(#${id(x === x0 ? 'vl' : 'vr')})`} />
      ))}
      {/* feet */}
      {[x0, x1].map((x) => (
        <g key={'f' + x}>
          <rect x={x - footW / 2} y={floorY - footH} width={footW} height={footH} fill={`url(#${id('foot')})`} />
          <rect x={x - footW / 2} y={floorY - footH} width={footW} height={Math.max(1, footH * 0.14)} fill="#fff" opacity="0.18" />
          <rect x={x - footW / 2 + t * 0.2} y={floorY - footH * 0.18} width={t * 1.1} height={footH * 0.4} fill="#000" />
          <rect x={x + footW / 2 - t * 1.3} y={floorY - footH * 0.18} width={t * 1.1} height={footH * 0.4} fill="#000" />
        </g>
      ))}
    </svg>
  );
});

export default RackStructure;
