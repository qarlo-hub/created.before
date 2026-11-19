import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Shirt from './Shirt.jsx';
import { SIZES, WEIGHTS } from '../lib/store.js';
import { layoutPrint } from '../lib/textFit.js';
import { usePendulum, useBrush } from '../lib/usePendulum.js';

const EASE_OUT = 'cubic-bezier(0.2, 0.85, 0.25, 1)';
const EASE_IN_OUT = 'cubic-bezier(0.55, 0, 0.25, 1)';

function flipFrom(el, rect) {
  if (!rect) return null;
  const f = el.getBoundingClientRect();
  if (!f.width) return null;
  const s = rect.size / f.width;
  return `translate(${rect.left - f.left}px, ${rect.top - f.top}px) scale(${s})`;
}

export default function DetailView({
  shirt,
  index,
  total,
  originRect,
  getReturnRect,
  onClose,
  onCloseStart,
  onStep,
  stepDir = 1,
  onEdit,
  onDelete,
  editorOpen,
}) {
  const flyRef = useRef(null); // FLIP layer (position/scale)
  const swingRef = useRef(null); // pendulum layer (rotation around the hook)
  const infoRef = useRef(null);
  const railRef = useRef(null);
  const backdropRef = useRef(null);
  const [phase, setPhase] = useState('in'); // in | idle | out
  const [confirmDelete, setConfirmDelete] = useState(false);
  const pend = usePendulum(swingRef);
  const brush = useBrush(pend.kick);
  const prevId = useRef(shirt.id);

  /* open: fly from the rack to the centre of the stage */
  useLayoutEffect(() => {
    const el = flyRef.current;
    const from = flipFrom(el, originRect);
    const anims = [];
    if (from) {
      anims.push(
        el.animate([{ transform: from }, { transform: 'none' }], { duration: 720, easing: EASE_OUT, fill: 'both' })
      );
      pend.set(originRect.rotate || 0, -1.1);
    } else {
      anims.push(el.animate([{ opacity: 0, transform: 'translateY(-24px)' }, { opacity: 1, transform: 'none' }], { duration: 500, easing: EASE_OUT, fill: 'both' }));
      pend.set(0.05, 0);
    }
    anims.push(
      infoRef.current.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], {
        duration: 520,
        delay: 220,
        easing: EASE_OUT,
        fill: 'both',
      })
    );
    anims.push(railRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 120, fill: 'both' }));
    backdropRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 560, easing: EASE_OUT, fill: 'both' });
    anims[0].finished.then(() => setPhase((p) => (p === 'in' ? 'idle' : p))).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* prev / next: slide the new shirt in from the side it comes from */
  useEffect(() => {
    if (prevId.current === shirt.id) return;
    const dir = stepDir;
    prevId.current = shirt.id;
    setConfirmDelete(false);
    flyRef.current.animate(
      [
        { transform: `translateX(${dir * 70}px)`, opacity: 0 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: 520, easing: EASE_OUT }
    );
    pend.set(dir * 0.09, 0);
    infoRef.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: EASE_OUT });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shirt.id]);

  const close = () => {
    if (phase === 'out') return;
    setPhase('out');
    onCloseStart?.();
    const el = flyRef.current;
    const rect = getReturnRect(shirt.id);
    el.getAnimations().forEach((a) => a.cancel());
    const to = flipFrom(el, rect);
    pend.set(pend.state.current.th, 0.9);
    infoRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'both' });
    railRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' });
    backdropRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 480, easing: EASE_IN_OUT, fill: 'both' });
    const a = to
      ? el.animate([{ transform: 'none' }, { transform: to }], { duration: 560, easing: EASE_IN_OUT, fill: 'both' })
      : el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'both' });
    a.finished.then(onClose).catch(onClose);
  };

  const remove = () => {
    setPhase('out');
    onCloseStart?.();
    pend.kick(1.6);
    infoRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, fill: 'both' });
    railRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, fill: 'both' });
    backdropRef.current.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 620, easing: EASE_IN_OUT, fill: 'both' });
    const a = flyRef.current.animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translateY(-3%)', opacity: 1, offset: 0.25 },
        { transform: 'translateY(55%)', opacity: 0 },
      ],
      { duration: 620, easing: 'cubic-bezier(0.5, 0, 0.75, 0.3)', fill: 'both' }
    );
    a.finished.then(onDelete).catch(onDelete);
  };

  /* keyboard */
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const onKey = (e) => {
      if (editorOpen) return;
      if (e.key === 'Escape') closeRef.current();
      else if (e.key === 'ArrowLeft') onStep(-1);
      else if (e.key === 'ArrowRight') onStep(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editorOpen, onStep]);

  const fit = layoutPrint(shirt);
  const sizeLabel = SIZES.find((s) => s.id === shirt.size)?.label ?? shirt.size;
  const weightLabel = WEIGHTS.find((w) => w.id === shirt.weight)?.label ?? shirt.weight;
  const no = (n) => String(n).padStart(2, '0');

  return (
    <div className={`detail phase-${phase}`} role="dialog" aria-modal="true" aria-label="T-shirt detail">
      <div ref={backdropRef} className="detail-backdrop" aria-hidden="true" />
      <button className="detail-back link" onClick={close}>
        <span aria-hidden="true">←</span> Back to rack
      </button>

      <div className="detail-stage">
        <div className="detail-hang">
          <div ref={railRef} className="detail-rail" aria-hidden="true" />
          <div ref={flyRef} className="detail-fly">
            <div
              ref={swingRef}
              className="detail-swing"
              onPointerMove={(e) => e.pointerType === 'mouse' && brush(e)}
              onPointerDown={() => pend.kick(0.35)}
            >
              <Shirt shirt={shirt} className="detail-svg" />
            </div>
          </div>
        </div>
      </div>

      <aside ref={infoRef} className="detail-info">
        <p className="eyebrow">
          No. {no(index + 1)} <span className="muted">/ {no(total)}</span>
        </p>
        <h1 className="detail-title" style={{ fontWeight: shirt.weight }}>
          {shirt.text.split('\n').map((l, i) => (
            <span key={i}>{l || ' '}</span>
          ))}
        </h1>
        <dl className="specs">
          <div>
            <dt>Garment</dt>
            <dd>T-shirt, black</dd>
          </div>
          <div>
            <dt>Print</dt>
            <dd>White · Open Sans {weightLabel}</dd>
          </div>
          <div>
            <dt>Text size</dt>
            <dd>
              {sizeLabel}
              {fit.scale < 0.995 && <span className="muted"> · auto-fitted {Math.round(fit.scale * 100)}%</span>}
            </dd>
          </div>
          <div>
            <dt>Alignment</dt>
            <dd className="cap">{shirt.align}</dd>
          </div>
        </dl>

        <div className="detail-actions">
          {confirmDelete ? (
            <div className="confirm-row">
              <span>Remove this T-shirt from the rack?</span>
              <button className="btn btn-solid" onClick={remove}>
                Delete
              </button>
              <button className="btn btn-line" onClick={() => setConfirmDelete(false)}>
                Keep
              </button>
            </div>
          ) : (
            <>
              <button className="btn btn-solid" onClick={onEdit}>
                Edit
              </button>
              <button className="btn btn-line" onClick={() => setConfirmDelete(true)}>
                Delete
              </button>
            </>
          )}
        </div>

        {total > 1 && (
          <nav className="detail-nav" aria-label="Browse collection">
            <button className="link" onClick={() => onStep(-1)}>
              ← Previous
            </button>
            <button className="link" onClick={() => onStep(1)}>
              Next →
            </button>
          </nav>
        )}
      </aside>
    </div>
  );
}
