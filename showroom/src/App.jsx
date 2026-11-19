import { useCallback, useEffect, useRef, useState } from 'react';
import Rack from './components/Rack.jsx';
import ShirtDefs from './components/ShirtDefs.jsx';
import DetailView from './components/DetailView.jsx';
import EditorPanel from './components/EditorPanel.jsx';
import { initialCollection, loadCollection, saveCollection, uid } from './lib/store.js';
import { clearMeasureCache } from './lib/textFit.js';
import { FontContext } from './lib/fontContext.js';
import FabricFactory from './components/FabricFactory.jsx';
import { FabricContext } from './lib/fabric.js';

export default function App() {
  const [shirts, setShirts] = useState(loadCollection);
  const [selectedId, setSelectedId] = useState(null);
  const [originRect, setOriginRect] = useState(null);
  const [editor, setEditor] = useState(null); // { mode: 'add' } | { mode: 'edit', id }
  const [dropInId, setDropInId] = useState(null);
  const [fontVersion, setFontVersion] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [closing, setClosing] = useState(false);
  const [stepDir, setStepDir] = useState(1);
  const [fabric, setFabric] = useState(null);
  const rackRef = useRef(null);

  useEffect(() => saveCollection(shirts), [shirts]);

  useEffect(() => {
    let alive = true;
    Promise.all(
      [400, 600, 700, 800].map((w) => document.fonts?.load(`${w} 20px 'Open Sans'`).catch(() => null))
    ).then(() => {
      if (!alive) return;
      clearMeasureCache();
      setFontVersion((v) => v + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  const selected = shirts.find((s) => s.id === selectedId) ?? null;

  const select = useCallback((id) => {
    setOriginRect(rackRef.current?.getShirtRect(id) ?? null);
    setClosing(false);
    setSelectedId(id);
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setClosing(false);
  }, []);

  const reorder = useCallback((ids) => {
    setShirts((prev) => {
      const byId = new Map(prev.map((s) => [s.id, s]));
      return ids.map((id) => byId.get(id)).filter(Boolean);
    });
  }, []);

  const saveShirt = (data) => {
    if (editor?.mode === 'edit') {
      setShirts((prev) => prev.map((s) => (s.id === editor.id ? { ...s, ...data } : s)));
    } else {
      const id = uid();
      setShirts((prev) => [...prev, { id, createdAt: Date.now(), ...data }]);
      setDropInId(id);
      setSelectedId(null);
      requestAnimationFrame(() => requestAnimationFrame(() => rackRef.current?.ensureVisible(id)));
    }
    setEditor(null);
  };

  const deleteShirt = (id) => {
    setSelectedId(null);
    setClosing(false);
    setShirts((prev) => prev.filter((s) => s.id !== id));
  };

  const step = (dir) => {
    const i = shirts.findIndex((s) => s.id === selectedId);
    if (i < 0) return;
    const next = shirts[(i + dir + shirts.length) % shirts.length];
    setStepDir(dir);
    setSelectedId(next.id);
    rackRef.current?.ensureVisible(next.id);
  };

  const reset = () => {
    setSelectedId(null);
    setShirts(initialCollection());
    setConfirmReset(false);
  };

  return (
    <FontContext.Provider value={fontVersion}>
    <FabricContext.Provider value={fabric}>
      <ShirtDefs />
      {!fabric && <FabricFactory onReady={setFabric} />}
      <div className={`app${selected && !closing ? ' has-detail' : ''}${editor ? ' has-editor' : ''}`}>
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">created.before</span>
            <span className="brand-sep" />
            <span className="brand-sub">Showroom · Rack 01</span>
          </div>
          <button className="btn btn-solid" onClick={() => setEditor({ mode: 'add' })}>
            <span aria-hidden="true">+</span> Add T-shirt
          </button>
        </header>

        <main className="scene">
          <Rack
            ref={rackRef}
            shirts={shirts}
            hiddenId={selectedId}
            dimmed={(!!selected && !closing) || !!editor}
            dropInId={dropInId}
            onSelect={select}
            onReorder={reorder}
          />
          {shirts.length === 0 && (
            <div className="empty">
              <p>The rack is empty.</p>
              <button className="btn btn-line" onClick={() => setEditor({ mode: 'add' })}>
                + Add T-shirt
              </button>
            </div>
          )}
        </main>

        <footer className="bottombar">
          <p className="hint">
            <span>Hover to browse</span>
            <span>Drag to rearrange</span>
            <span>Click to view</span>
          </p>
          <div className="meta">
            <span className="count">{String(shirts.length).padStart(2, '0')} pieces</span>
            {confirmReset ? (
              <span className="confirm">
                Restore the initial collection?
                <button className="link" onClick={reset}>
                  Restore
                </button>
                <button className="link muted" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button className="link muted" onClick={() => setConfirmReset(true)}>
                Reset collection
              </button>
            )}
          </div>
        </footer>
      </div>

      {selected && (
        <DetailView
          key="detail"
          shirt={selected}
          index={shirts.findIndex((s) => s.id === selected.id)}
          total={shirts.length}
          originRect={originRect}
          getReturnRect={(id) => rackRef.current?.getShirtRect(id)}
          onClose={closeDetail}
          onCloseStart={() => setClosing(true)}
          stepDir={stepDir}
          onStep={step}
          onEdit={() => setEditor({ mode: 'edit', id: selected.id })}
          onDelete={() => deleteShirt(selected.id)}
          editorOpen={!!editor}
        />
      )}

      {editor && (
        <EditorPanel
          mode={editor.mode}
          initial={editor.mode === 'edit' ? shirts.find((s) => s.id === editor.id) : null}
          onCancel={() => setEditor(null)}
          onSave={saveShirt}
        />
      )}
    </FabricContext.Provider>
    </FontContext.Provider>
  );
}
