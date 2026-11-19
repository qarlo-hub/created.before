import { useEffect, useRef, useState } from 'react';
import Shirt from './Shirt.jsx';
import { ALIGNS, MAX_CHARS, MAX_LINES, SIZES, WEIGHTS } from '../lib/store.js';
import { layoutPrint } from '../lib/textFit.js';
import { usePendulum } from '../lib/usePendulum.js';

const AlignIcon = ({ a }) => {
  const rows = [14, 9, 12];
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      {rows.map((w, i) => {
        const x = a === 'left' ? 1 : a === 'right' ? 15 - w : (16 - w) / 2;
        return <rect key={i} x={x} y={1 + i * 4} width={w} height="1.6" fill="currentColor" />;
      })}
    </svg>
  );
};

export default function EditorPanel({ mode, initial, onCancel, onSave }) {
  const [text, setText] = useState(initial?.text ?? '');
  const [size, setSize] = useState(initial?.size ?? 'M');
  const [align, setAlign] = useState(initial?.align ?? 'center');
  const [weight, setWeight] = useState(initial?.weight ?? 700);
  const [closing, setClosing] = useState(false);
  const swingRef = useRef(null);
  const textRef = useRef(null);
  const pend = usePendulum(swingRef, { w0: 6.8, zeta: 0.14 });

  const draft = { id: initial?.id ?? 'preview', text, size, align, weight };
  const fit = layoutPrint(draft);
  const lines = text.split('\n').length;
  const valid = text.trim().length > 0;

  useEffect(() => {
    textRef.current?.focus();
    pend.set(0.06, 0);
  }, [pend]);

  // every change gives the preview a tiny nudge, like handling the garment
  const nudge = (k = 0.25) => pend.kick((Math.random() > 0.5 ? 1 : -1) * k);

  const close = (after) => {
    setClosing(true);
    setTimeout(after, 240);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(onCancel);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onText = (e) => {
    let v = e.target.value.replace(/\r/g, '');
    const parts = v.split('\n');
    if (parts.length > MAX_LINES) v = parts.slice(0, MAX_LINES).join('\n');
    setText(v.slice(0, MAX_CHARS));
    nudge(0.08);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!valid) return;
    const data = { text: text.replace(/\s+$/g, ''), size, align, weight };
    close(() => onSave(data));
  };

  return (
    <div className={`editor-layer${closing ? ' is-closing' : ''}`}>
      <div className="editor-scrim" onClick={() => close(onCancel)} />
      <form className="editor" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <header className="editor-head">
          <h2 id="editor-title">{mode === 'edit' ? 'Edit T-shirt' : 'New T-shirt'}</h2>
          <button type="button" className="link muted" onClick={() => close(onCancel)}>
            Close
          </button>
        </header>

        <div className="editor-preview" aria-hidden="true">
          <div className="editor-rail" />
          <div ref={swingRef} className="editor-swing">
            <Shirt shirt={draft} className="editor-svg" />
          </div>
        </div>

        <div className="editor-fields">
          <label className="field">
            <span className="field-label">
              Print text
              <span className="muted">
                {text.length}/{MAX_CHARS} · {lines}/{MAX_LINES} lines
              </span>
            </span>
            <textarea
              ref={textRef}
              value={text}
              onChange={onText}
              rows={3}
              placeholder={'TYPE YOUR\nMESSAGE'}
              spellCheck="false"
              style={{ textAlign: align, fontWeight: weight }}
            />
            <span className="field-help">
              Enter for a new line.
              {text.trim() && fit.wrapped && <> Long lines wrap automatically.</>}
              {text.trim() && fit.scale < 0.995 && (
                <> Auto-fitted to {Math.round(fit.scale * 100)}% so the print stays inside the chest area.</>
              )}
            </span>
          </label>

          <fieldset className="field">
            <legend className="field-label">Text size</legend>
            <div className="seg">
              {SIZES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className={size === s.id ? 'on' : ''}
                  aria-pressed={size === s.id}
                  onClick={() => {
                    setSize(s.id);
                    nudge();
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="field-row">
            <fieldset className="field">
              <legend className="field-label">Alignment</legend>
              <div className="seg">
                {ALIGNS.map((a) => (
                  <button
                    type="button"
                    key={a}
                    className={align === a ? 'on' : ''}
                    aria-pressed={align === a}
                    aria-label={`Align ${a}`}
                    title={`Align ${a}`}
                    onClick={() => {
                      setAlign(a);
                      nudge();
                    }}
                  >
                    <AlignIcon a={a} />
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="field">
              <legend className="field-label">Weight</legend>
              <div className="seg">
                {WEIGHTS.map((w) => (
                  <button
                    type="button"
                    key={w.id}
                    className={weight === w.id ? 'on' : ''}
                    aria-pressed={weight === w.id}
                    style={{ fontWeight: w.id }}
                    onClick={() => {
                      setWeight(w.id);
                      nudge();
                    }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <footer className="editor-foot">
          <button type="button" className="btn btn-line" onClick={() => close(onCancel)}>
            Cancel
          </button>
          <button type="submit" className="btn btn-solid" disabled={!valid}>
            {mode === 'edit' ? 'Save changes' : 'Add to rack'}
          </button>
        </footer>
      </form>
    </div>
  );
}
