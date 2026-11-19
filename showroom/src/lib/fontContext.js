import { createContext } from 'react';
// Bumped when the web font finishes loading so every print re-measures with real metrics.
export const FontContext = createContext(0);
