// Shared geometry of the shirt drawing (400 x 400 viewBox).
export const VB = 400;
export const PIVOT = { x: 200, y: 29 }; // where the hook rests on the rail
export const RAIL = { cy: 37, r: 8 }; // rail centre / radius, viewBox units
export const HEM_Y = 372;

// Outer silhouette: back neck → left shoulder → left sleeve → left side → hem → right…
export const SILHOUETTE =
  'M166 90 C150 95 120 104 95 115 C82 131 64 158 49 184 Q67 197 86 207 C92 196 98 184 102 174 ' +
  'C104 232 100 300 102.4 364 Q102.8 369.2 108 369.6 C160 375 240 375 292 369.6 Q297.2 369.2 297.6 364 C300 300 296 232 298 174 ' +
  'C302 184 308 196 314 207 Q333 197 351 184 C336 158 318 131 305 115 C280 104 250 95 234 90 Q200 84 166 90 Z';

// Neck opening (inside of the back visible through the front neckline).
export const NECK_OPENING = 'M167 90 Q200 84 233 90 C229 104 216 110 200 110 C184 110 171 104 167 90 Z';
// Front rib collar band (outer edge, then inner edge back).
export const COLLAR_BAND =
  'M161 90 C163 108 180 118 200 118 C220 118 237 108 239 90 L233 90 C229 104 216 110 200 110 C184 110 171 104 167 90 Z';
export const COLLAR_MID = 'M164 90 C167 106 182 114 200 114 C218 114 233 106 236 90';
