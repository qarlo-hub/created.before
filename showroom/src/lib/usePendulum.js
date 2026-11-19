import { useCallback, useEffect, useRef } from 'react';

// A single shirt swinging on its hook (used outside the rack: detail view, editor preview).
// Writes `rotate()` straight to the element so React never re-renders per frame.
export function usePendulum(ref, { w0 = 6.4, zeta = 0.11, max = 0.3 } = {}) {
  const st = useRef({ th: 0, om: 0, raf: 0, last: 0 });

  const run = useCallback(() => {
    const s = st.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.033, (now - s.last) / 1000);
      s.last = now;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const h = dt / steps;
        s.om += (-w0 * w0 * s.th - 2 * zeta * w0 * s.om) * h;
        s.th = Math.max(-max, Math.min(max, s.th + s.om * h));
      }
      if (ref.current) ref.current.style.transform = `rotate(${s.th.toFixed(4)}rad)`;
      if (Math.abs(s.th) < 0.0004 && Math.abs(s.om) < 0.002) {
        s.th = 0;
        s.om = 0;
        if (ref.current) ref.current.style.transform = '';
        s.raf = 0;
        return;
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);
  }, [ref, w0, zeta, max]);

  useEffect(() => () => cancelAnimationFrame(st.current.raf), []);

  const kick = useCallback(
    (dOm) => {
      st.current.om += dOm;
      run();
    },
    [run]
  );
  const set = useCallback(
    (th, om = 0) => {
      st.current.th = th;
      st.current.om = om;
      run();
    },
    [run]
  );
  const settle = useCallback(() => {
    st.current.th = 0;
    st.current.om = 0;
  }, []);
  return { kick, set, settle, state: st };
}

// Pointer moving across a hanging shirt brushes it in the direction of travel.
export function useBrush(kick, gain = 0.0016) {
  const last = useRef(null);
  return useCallback(
    (e) => {
      const now = performance.now();
      const l = last.current;
      last.current = { x: e.clientX, t: now };
      if (!l || now - l.t > 120) return;
      const vx = (e.clientX - l.x) / Math.max(1, now - l.t); // px/ms
      kick(-vx * gain * 16);
    },
    [kick, gain]
  );
}
