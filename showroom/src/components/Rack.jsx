import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import Shirt from './Shirt.jsx';
import RackStructure from './RackStructure.jsx';
import { PIVOT, RAIL, VB } from './geometry.js';
import { paintRoomSoon } from '../lib/room.js';

/* ------------------------------------------------------------------ *
 *  Tuning                                                             *
 * ------------------------------------------------------------------ */
const SLIDE = { k: 135, zeta: 0.6 }; // hanger sliding on the rail (slightly under-damped → soft elastic settle)
const HELD = { k: 520, zeta: 0.9 }; // shirt held in the hand: follows the pointer with a little weight
const SWING = { w0: 7.2, zeta: 0.12, couple: 0.24, max: 0.32 }; // pendulum around the hook
const LIFT = { k: 260, zeta: 0.55 };
const DRAG_THRESHOLD = { mouse: 5, pen: 6, touch: 9 };

const springStep = (x, v, target, { k, zeta }, dt) => {
  const c = 2 * zeta * Math.sqrt(k);
  const a = k * (target - x) - c * v;
  return a;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ------------------------------------------------------------------ *
 *  Layout                                                             *
 * ------------------------------------------------------------------ */
// The stage fills the screen (the room runs behind the header and footer);
// the rack itself is laid out between these bands.
const BANDS = { top: 84, bottom: 64 };

function computeLayout(stageW, stageH, n) {
  const narrow = stageW < 720;
  const padTop = narrow ? 76 : BANDS.top;
  const padBottom = narrow ? 58 : BANDS.bottom;
  const availH = Math.max(200, stageH - padTop - padBottom);
  const sidePad = Math.max(18, stageW * 0.035);
  const usable = stageW - 2 * sidePad;
  const count = Math.max(1, n);
  // Preferred: light overlap (~0.64 W between hooks). Shirt size limited by height and a max.
  const wFit = usable / (1.04 + (count - 1) * 0.56);
  const minW = narrow ? clamp(stageW * 0.62, 160, 260) : 200;
  let W = Math.min(Math.max(Math.min(wFit, 430), minW), availH * 0.62);
  W = Math.max(110, W);
  const end = W * 0.52; // hook → upright distance at the ends
  let spacing = count > 1 ? (usable - 2 * end) / (count - 1) : 0;
  // on phones the rack scrolls instead of stacking shirts so tightly that sleeves cover prints
  const minSpacing = (narrow ? 0.6 : 0.34) * W;
  spacing = count > 1 ? clamp(spacing, minSpacing, 0.66 * W) : 0;
  const rackLen = 2 * end + (count - 1) * spacing; // upright to upright
  const contentW = Math.max(stageW, rackLen + 2 * sidePad);
  const x0 = (contentW - rackLen) / 2;
  const t = (2 * RAIL.r * W) / VB; // tube thickness = rail diameter on the shirt drawing
  const rackH = W * 1.3;
  const block = W * 0.1 + rackH;
  const top = padTop + Math.max(0, (availH - block) * 0.45);
  const railY = top + W * 0.1;
  const floorY = Math.min(stageH - 8, railY + rackH);
  // the rack stands a little in front of the wall: the joint sits above its feet
  const junction = floorY - W * 0.15;
  // one ceiling downlight roughly every shirt-and-a-half along the rack
  const nLights = Math.max(2, Math.round(rackLen / (W * 1.25)));
  const lights = Array.from({ length: nLights }, (_, i) => ({ x: x0 + ((i + 0.5) * rackLen) / nLights }));
  return {
    stageW,
    stageH,
    W,
    spacing,
    contentW,
    panMax: Math.max(0, contentW - stageW),
    x0,
    x1: x0 + rackLen,
    firstX: x0 + end,
    railY,
    floorY,
    junction,
    lights,
    t,
    scale: W / VB,
  };
}

/* ------------------------------------------------------------------ *
 *  Rack                                                               *
 * ------------------------------------------------------------------ */
const Rack = forwardRef(function Rack({ shirts, hiddenId, dimmed, dropInId, onSelect, onReorder }, ref) {
  const stageRef = useRef(null);
  const trackRef = useRef(null);
  const els = useRef(new Map()); // id -> wrapper element
  const bodies = useRef(new Map()); // id -> physics state
  const order = useRef(shirts.map((s) => s.id));
  const [layout, setLayout] = useState(null);
  const L = useRef(null);
  L.current = layout;

  // interaction state (refs: mutated at pointer rate, read at frame rate)
  const pointer = useRef({ x: 0, y: 0, vx: 0, t: 0, inside: false });
  const hover = useRef(null);
  const press = useRef(null); // { id, pointerId, type, startX, startY, grabDX, dragging }
  const pan = useRef({ x: 0, v: 0, target: null, drag: null });
  const focusId = useRef(null);
  const hiddenRef = useRef(hiddenId);
  hiddenRef.current = hiddenId;
  const cbs = useRef({ onSelect, onReorder });
  cbs.current = { onSelect, onReorder };

  /* --- keep order in sync with the collection (never mid-drag) --- */
  useEffect(() => {
    if (press.current?.dragging) return;
    order.current = shirts.map((s) => s.id);
    const ids = new Set(order.current);
    for (const id of bodies.current.keys()) if (!ids.has(id)) bodies.current.delete(id);
  }, [shirts]);

  /* --- measure stage --- */
  useLayoutEffect(() => {
    const el = stageRef.current;
    const measure = () => setLayout(computeLayout(el.clientWidth, el.clientHeight, order.current.length));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (el) setLayout(computeLayout(el.clientWidth, el.clientHeight, shirts.length));
  }, [shirts.length]);

  const slotX = (i, lay) => lay.firstX + i * lay.spacing;

  /* --- paint the room whenever its geometry changes --- */
  const roomRef = useRef(null);
  const roomKey = layout
    ? [layout.contentW, layout.stageH, layout.junction, ...layout.lights.map((l) => l.x)].map(Math.round).join('|')
    : '';
  useEffect(() => {
    const lay = L.current;
    if (!lay || !roomRef.current) return;
    return paintRoomSoon(roomRef.current, {
      width: lay.contentW,
      height: lay.stageH,
      junction: lay.junction,
      lights: lay.lights,
    });
  }, [roomKey]);

  /* --- physics loop --- */
  useEffect(() => {
    let raf;
    let last = performance.now();
    let acc = 0;
    const H = 1 / 120;

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const lay = L.current;
      if (!lay) return;
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;

      const ids = order.current;
      const W = lay.W;
      const p = press.current;
      const draggingId = p?.dragging ? p.id : null;
      const hoverId = draggingId ?? (dimmed ? null : hover.current ?? focusId.current);
      const P = pan.current;

      // init new bodies
      ids.forEach((id, i) => {
        if (!bodies.current.has(id)) {
          const drop = id === dropInId;
          bodies.current.set(id, {
            x: slotX(i, lay),
            vx: 0,
            y: drop ? -W * 1.1 : 0,
            vy: 0,
            th: drop ? 0.12 : 0,
            om: 0,
            s: 1,
            vs: 0,
            z: -1,
            vis: '',
          });
        }
      });

      // auto-pan while dragging near the stage edges
      if (draggingId && lay.panMax > 0 && pointer.current.inside) {
        const sx = pointer.current.sx;
        const edge = Math.min(90, lay.stageW * 0.12);
        if (sx < edge) P.x -= ((edge - sx) / edge) * 14;
        else if (sx > lay.stageW - edge) P.x += ((sx - (lay.stageW - edge)) / edge) * 14;
        P.x = clamp(P.x, 0, lay.panMax);
      }

      // reorder while dragging: the held shirt claims the nearest slot
      if (draggingId) {
        const b = bodies.current.get(draggingId);
        const from = ids.indexOf(draggingId);
        const to = clamp(Math.round((b.x - lay.firstX) / (lay.spacing || 1)), 0, ids.length - 1);
        if (to !== from && lay.spacing > 0) {
          ids.splice(from, 1);
          ids.splice(to, 0, draggingId);
          // the neighbour that gets displaced receives a small knock
          const knocked = ids[from];
          const kb = knocked && bodies.current.get(knocked);
          if (kb) kb.om += (to > from ? 1 : -1) * 0.9;
        }
      }

      const fIndex = hoverId ? ids.indexOf(hoverId) : -1;
      const fBody = hoverId ? bodies.current.get(hoverId) : null;

      while (acc >= H) {
        acc -= H;
        // pan inertia
        if (!P.drag) {
          if (P.target != null) {
            P.x += (P.target - P.x) * 0.18;
            if (Math.abs(P.target - P.x) < 0.5) P.target = null;
            P.v = 0;
          } else if (Math.abs(P.v) > 1) {
            P.x += P.v * H;
            P.v *= 0.94;
          }
          const over = P.x < 0 ? P.x : P.x > lay.panMax ? P.x - lay.panMax : 0;
          if (over) P.x -= over * 0.2;
        }

        ids.forEach((id, i) => {
          const b = bodies.current.get(id);
          if (!b) return;
          const held = id === draggingId;
          let tx = slotX(i, lay);
          let ty = 0;
          let ts = 1;
          if (held) {
            tx = pointer.current.x + P.x - p.grabDX;
            ty = -W * 0.03;
            ts = 1.045;
          } else if (fIndex >= 0) {
            if (id === hoverId) {
              // the shirt under the hand follows it a little
              tx += clamp((pointer.current.x + P.x - tx) * 0.22, -W * 0.07, W * 0.07);
              ty = -W * 0.008;
              ts = 1.022;
            } else {
              // neighbours slide away as a group to open a gap around the focused shirt;
              // the push fades only slowly so the others don't bunch up against each other
              const side = i < fIndex ? -1 : 1;
              const d = Math.abs(i - fIndex);
              const amp = (draggingId ? 0.19 : 0.17) * W;
              tx += side * amp * Math.max(0.35, 1 - 0.14 * (d - 1));
              const lo = lay.firstX - W * 0.13;
              const hi = slotX(ids.length - 1, lay) + W * 0.13;
              tx = clamp(tx, lo + (i) * W * 0.04, hi - (ids.length - 1 - i) * W * 0.04);
            }
          }
          const ax = springStep(b.x, b.vx, tx, held ? HELD : SLIDE, H);
          b.vx += ax * H;
          b.x += b.vx * H;

          // pendulum: hook accelerating sideways makes the shirt swing the other way
          const a = (ax / W) * SWING.couple;
          const alpha = -SWING.w0 * SWING.w0 * b.th + a * (held ? 0.8 : 1) - 2 * SWING.zeta * SWING.w0 * b.om;
          b.om += alpha * H;
          b.th = clamp(b.th + b.om * H, -SWING.max, SWING.max);

          const ay = springStep(b.y, b.vy, ty, LIFT, H);
          b.vy += ay * H;
          b.y += b.vy * H;
          if (b.y > 0 && b.vy > 0 && !held) {
            // landing on the rail: small bounce + swing
            b.vy *= -0.25;
            b.y = 0;
          }
          const as = springStep(b.s, b.vs, ts, { k: 300, zeta: 0.7 }, H);
          b.vs += as * H;
          b.s += b.vs * H;
        });
      }

      // write transforms
      const scale = lay.scale;
      const pivotX = PIVOT.x * scale;
      const pivotY = PIVOT.y * scale;
      const railTop = lay.railY - RAIL.r * scale - (RAIL.cy - RAIL.r - PIVOT.y) * scale;
      const offX = -P.x;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${offX.toFixed(2)}px,0,0)`;
      ids.forEach((id, i) => {
        const b = bodies.current.get(id);
        const el = els.current.get(id);
        if (!b || !el) return;
        const tx = b.x - pivotX;
        const ty = railTop - pivotY + b.y;
        el.style.transform = `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) rotate(${b.th.toFixed(4)}rad) scale(${b.s.toFixed(4)})`;
        const z = id === draggingId ? 900 : id === hoverId ? 800 : 10 + i;
        if (b.z !== z) {
          el.style.zIndex = z;
          b.z = z;
        }
        const vis = id === hiddenRef.current ? 'hidden' : '';
        if (b.vis !== vis) {
          el.style.visibility = vis;
          b.vis = vis;
        }
        el.classList.toggle('is-hover', id === hoverId && !draggingId);
        el.classList.toggle('is-held', id === draggingId);
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [dimmed, dropInId]);

  /* --- pointer handling --- */
  const toLocal = (e) => {
    const r = stageRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const trackPointer = (e) => {
    const { x, y } = toLocal(e);
    const P = pointer.current;
    const now = performance.now();
    const dt = Math.max(1, now - P.t) / 1000;
    const vx = (x - P.x) / dt;
    P.vx = P.vx * 0.6 + vx * 0.4;
    P.x = x;
    P.sx = x;
    P.y = y;
    P.t = now;
    P.inside = true;
  };

  const shirtIdFrom = (target) => target?.closest?.('[data-shirt-id]')?.getAttribute('data-shirt-id') ?? null;

  const brush = (id, strength = 1) => {
    // a hand brushing through the hangers: impulse in the direction of travel
    const b = bodies.current.get(id);
    const lay = L.current;
    if (!b || !lay) return;
    const v = clamp(pointer.current.vx / lay.W, -6, 6);
    b.om -= v * 0.11 * strength;
  };

  const onPointerMove = (e) => {
    trackPointer(e);
    if (press.current) return;
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    const id = shirtIdFrom(e.target);
    if (id !== hover.current) {
      if (id) brush(id, 1);
      hover.current = id;
    } else if (id) {
      brush(id, 0.06);
    }
  };

  const onPointerLeave = () => {
    pointer.current.inside = false;
    if (!press.current) hover.current = null;
  };

  const endPress = useCallback((e, cancelled) => {
    const p = press.current;
    if (!p || (e && e.pointerId !== p.pointerId)) return;
    window.removeEventListener('pointermove', p.move);
    window.removeEventListener('pointerup', p.up);
    window.removeEventListener('pointercancel', p.cancel);
    document.body.classList.remove('is-grabbing');
    press.current = null;
    if (p.kind === 'pan') {
      pan.current.drag = null;
      return;
    }
    if (p.pointerType !== 'mouse') hover.current = null;
    if (p.dragging) {
      // release: keep the hand's velocity so the hanger glides and settles
      const b = bodies.current.get(p.id);
      const lay = L.current;
      if (b && lay) b.vx = clamp(pointer.current.vx * 0.6, -lay.W * 8, lay.W * 8);
      const before = p.orderBefore.join('|');
      if (order.current.join('|') !== before) cbs.current.onReorder([...order.current]);
    } else if (!cancelled) {
      cbs.current.onSelect(p.id);
    }
  }, []);

  const onPointerDown = (e) => {
    if (e.button !== 0 || press.current || dimmed) return;
    trackPointer(e);
    const id = shirtIdFrom(e.target);
    const lay = L.current;
    if (!lay) return;
    const { x, y } = toLocal(e);
    const base = { pointerId: e.pointerId, pointerType: e.pointerType, startX: x, startY: y };
    if (!id) {
      if (lay.panMax <= 0) return;
      press.current = { ...base, kind: 'pan' };
      pan.current.drag = { startX: x, startPan: pan.current.x };
      pan.current.target = null;
    } else {
      e.preventDefault();
      const b = bodies.current.get(id);
      press.current = {
        ...base,
        kind: 'shirt',
        id,
        grabDX: x + pan.current.x - b.x,
        dragging: false,
        orderBefore: [...order.current],
      };
      hover.current = id;
      if (e.pointerType !== 'mouse') brush(id, 0.5);
    }
    const p = press.current;
    p.move = (ev) => {
      if (ev.pointerId !== p.pointerId) return;
      trackPointer(ev);
      const { x: mx } = toLocal(ev);
      if (p.kind === 'pan') {
        const P = pan.current;
        const raw = P.drag.startPan - (mx - P.drag.startX);
        const lim = L.current?.panMax ?? 0;
        P.x = raw < 0 ? raw * 0.35 : raw > lim ? lim + (raw - lim) * 0.35 : raw;
        P.v = -pointer.current.vx;
        return;
      }
      if (!p.dragging) {
        const d = Math.hypot(mx - p.startX, pointer.current.y - p.startY);
        if (d > (DRAG_THRESHOLD[p.pointerType] ?? 6)) {
          p.dragging = true;
          document.body.classList.add('is-grabbing');
        }
      }
    };
    p.up = (ev) => endPress(ev, false);
    p.cancel = (ev) => endPress(ev, true);
    window.addEventListener('pointermove', p.move);
    window.addEventListener('pointerup', p.up);
    window.addEventListener('pointercancel', p.cancel);
  };

  const onWheel = (e) => {
    const lay = L.current;
    if (!lay || lay.panMax <= 0 || dimmed) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    const P = pan.current;
    P.target = clamp((P.target ?? P.x) + d, 0, lay.panMax);
  };

  useEffect(() => () => endPress(null, true), [endPress]);

  /* --- keyboard: arrows move focus, Shift+arrows move the shirt, Enter opens --- */
  const onKeyDown = (e, id) => {
    const ids = order.current;
    const i = ids.indexOf(id);
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cbs.current.onSelect(id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const j = clamp(i + (e.key === 'ArrowLeft' ? -1 : 1), 0, ids.length - 1);
      if (j === i) return;
      if (e.shiftKey) {
        ids.splice(i, 1);
        ids.splice(j, 0, id);
        const b = bodies.current.get(id);
        if (b) b.om += (j > i ? 1 : -1) * 0.6;
        cbs.current.onReorder([...ids]);
      } else {
        els.current.get(ids[j])?.focus();
      }
    }
  };

  /* --- API for the detail transition --- */
  useImperativeHandle(ref, () => ({
    getShirtRect(id) {
      const lay = L.current;
      const b = bodies.current.get(id);
      const stage = stageRef.current;
      if (!lay || !b || !stage) return null;
      const r = stage.getBoundingClientRect();
      const s = lay.scale;
      const railTop = lay.railY - RAIL.r * s - (RAIL.cy - RAIL.r - PIVOT.y) * s;
      return {
        left: r.left - pan.current.x + b.x - PIVOT.x * s,
        top: r.top + railTop - PIVOT.y * s + b.y,
        size: lay.W,
        rotate: b.th,
      };
    },
    ensureVisible(id) {
      const lay = L.current;
      const i = order.current.indexOf(id);
      if (!lay || i < 0 || lay.panMax <= 0) return;
      const x = slotX(i, lay);
      pan.current.target = clamp(x - lay.stageW / 2, 0, lay.panMax);
    },
    kick(id, amount = 1) {
      const b = bodies.current.get(id);
      if (b) b.om += amount;
    },
  }));

  return (
    <div
      ref={stageRef}
      className={`stage${dimmed ? ' is-dimmed' : ''}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onWheel={onWheel}
    >
      {layout && (
        <>
          <div ref={trackRef} className="track" style={{ width: layout.contentW }}>
            <canvas ref={roomRef} className="room" aria-hidden="true" />
            <div className="rack-layer">
            <RackStructure
              width={layout.contentW}
              height={layout.stageH}
              x0={layout.x0}
              x1={layout.x1}
              railY={layout.railY}
              floorY={layout.floorY}
              t={layout.t}
            />
            {shirts.map((s) => (
              <div
                key={s.id}
                ref={(el) => (el ? els.current.set(s.id, el) : els.current.delete(s.id))}
                className="tee"
                data-shirt-id={s.id}
                tabIndex={dimmed ? -1 : 0}
                role="button"
                aria-label={`${s.text.replace(/\n/g, ' ')}. Press Enter to view, Shift + arrow keys to move.`}
                onKeyDown={(e) => onKeyDown(e, s.id)}
                onFocus={() => (focusId.current = s.id)}
                onBlur={() => focusId.current === s.id && (focusId.current = null)}
                style={{
                  width: layout.W,
                  height: layout.W,
                  transformOrigin: `${PIVOT.x * layout.scale}px ${PIVOT.y * layout.scale}px`,
                }}
              >
                <Shirt shirt={s} className="tee-svg" mode="raster" />
              </div>
            ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default Rack;
