'use client';

export function MainShell() {
  return (
    <main className="cc-main">
      <div className="cc-strip">
        {/* Metric strip wires up in CHECKPOINT 4 (SSE-driven) */}
        <div className="cc-metric-placeholder">Métricas en vivo — CHECKPOINT 4</div>
      </div>

      <div className="cc-ph">
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <button type="button" className="cc-mtoggle" aria-label="Menu">
            ☰
          </button>
          <div>
            <h1 className="cc-pg-title">Operaciones</h1>
            <div className="cc-pg-sub">
              Todos los sistemas, agentes y trabajos de IA — estado en vivo.
            </div>
          </div>
        </div>
        <div className="cc-tools">
          <button type="button" className="cc-cmdk">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ width: 14, height: 14 }}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <span>Buscar o ejecutar…</span>
            <kbd>⌘K</kbd>
          </button>
          <button type="button" className="cc-ibtn" title="Notificaciones">
            🔔
          </button>
        </div>
      </div>

      <div className="cc-tbar">
        <div className="cc-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" />
          </svg>
          <input placeholder="Filtrar sistemas por nombre, tipo o entorno…" disabled />
        </div>
        <div className="cc-chips">
          {['Trading', 'Streaming', 'Content AI', 'AI Agents', 'Research', 'Internal'].map((c) => (
            <span key={c} className="cc-chip">
              {c}
              <span className="cc-chip-n">—</span>
            </span>
          ))}
        </div>
      </div>

      <div className="cc-scroll">
        <div className="cc-empty-state">
          ▸ Operador rows + featured strip se renderizan en CHECKPOINT 4 (datos de Supabase + SSE).
        </div>
      </div>
    </main>
  );
}
