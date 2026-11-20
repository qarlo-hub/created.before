// Shared geometry of the shirt drawing (400 x 400 viewBox).
export const VB = 400;
export const PIVOT = { x: 200, y: 29 }; // where the hook rests on the rail
export const RAIL = { cy: 37, r: 8 }; // rail centre / radius, viewBox units
export const HEM_Y = 372;

// The garment is three overlapping pieces: the body and two sleeves hanging over its sides.
// Body: back neck → left shoulder → armhole → left side → hem → right side → right armhole → shoulder.
export const BODY =
  'M166 90 C150 95 120 104 96 114 C101 134 103 156 103 176 ' +
  'C104 232 100 300 102.4 364 Q102.8 369.2 108 369.6 C160 375 240 375 292 369.6 Q297.2 369.2 297.6 364 C300 300 296 232 297 176 ' +
  'C297 156 299 134 304 114 C280 104 250 95 234 90 Q200 84 166 90 Z';

// Left sleeve, hanging from the hanger tip: rounded cap, outer edge falling steeply,
// bowed hem with soft corners, inner corner resting just over the body side.
export const SLEEVE =
  'M97 112.5 C85 119 75 131 68.5 146 C63 158 57 175 53 191 C52.5 196 54 199 57 201 ' +
  'C70 207 88 213 105 214 C108 214 109.5 211.5 108.6 208.5 C106.5 199 104.8 189 104.2 179 C103.6 160 102 134 97 112.5 Z';
// The right sleeve is the left one mirrored around the centre line.
export const MIRROR = 'matrix(-1 0 0 1 400 0)';

// Union of the pieces, for clip paths, hit areas and cast shadows.
export const PIECES = [
  { d: BODY },
  { d: SLEEVE },
  { d: SLEEVE, transform: MIRROR },
];

// Neck opening (inside of the back visible through the front neckline).
export const NECK_OPENING = 'M167 90 Q200 84 233 90 C229 104 216 110 200 110 C184 110 171 104 167 90 Z';
// Front rib collar band (outer edge, then inner edge back).
export const COLLAR_BAND =
  'M161 90 C163 108 180 118 200 118 C220 118 237 108 239 90 L233 90 C229 104 216 110 200 110 C184 110 171 104 167 90 Z';
export const COLLAR_MID = 'M164 90 C167 106 182 114 200 114 C218 114 233 106 236 90';
