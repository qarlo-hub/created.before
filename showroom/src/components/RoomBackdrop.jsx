import { forwardRef, useEffect, useRef } from 'react';
import { paintRoomSoon } from '../lib/room.js';

// A painted wall (no floor) filling its box; repainted when the box is resized.
const RoomBackdrop = forwardRef(function RoomBackdrop({ className, getLights, seed = 23 }, ref) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const lightsRef = useRef(getLights);
  lightsRef.current = getLights;

  useEffect(() => {
    const box = boxRef.current;
    let cancel = () => {};
    let last = '';
    const paint = () => {
      const w = box.clientWidth;
      const h = box.clientHeight;
      if (!w || !h) return;
      const lights = lightsRef.current?.(w, h) ?? [{ x: w / 2 }];
      const key = [w, h, ...lights.map((l) => Math.round(l.x))].join('|');
      if (key === last) return;
      last = key;
      cancel();
      cancel = paintRoomSoon(canvasRef.current, { width: w, height: h, lights, seed });
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(box);
    return () => {
      ro.disconnect();
      cancel();
    };
  }, [seed]);

  return (
    <div
      ref={(el) => {
        boxRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      className={className}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="room-canvas" />
    </div>
  );
});

export default RoomBackdrop;
