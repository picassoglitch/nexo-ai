'use client';

export function ActivityRail() {
  return (
    <aside className="cc-rail">
      <div className="cc-rail-h">
        <span className="cc-rail-t">Actividad de IA</span>
        <span className="cc-live">
          <i />
          En vivo
        </span>
      </div>
      <div className="cc-feed" id="ccFeed">
        {/* Events stream in via SSE in CHECKPOINT 4. Empty for now. */}
      </div>
      <div className="cc-rail-foot">
        <div className="cc-rstat">
          <div className="cc-rs-l">Trabajos IA / h</div>
          <div className="cc-rs-v cy">—</div>
        </div>
        <div className="cc-rstat">
          <div className="cc-rs-l">Cola</div>
          <div className="cc-rs-v">—</div>
        </div>
        <div className="cc-rstat">
          <div className="cc-rs-l">Tokens hoy</div>
          <div className="cc-rs-v">—</div>
        </div>
        <div className="cc-rstat">
          <div className="cc-rs-l">Ingresos hoy</div>
          <div className="cc-rs-v gr">$0</div>
        </div>
      </div>
    </aside>
  );
}
