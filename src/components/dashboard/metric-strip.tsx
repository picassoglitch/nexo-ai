'use client';

import { useEffect, useState } from 'react';
import type { StripValue } from '@/lib/data/types';

const META: Array<{
  id: StripValue['id'];
  label: string;
  led?: boolean;
  format: (v: number, total?: number) => string;
}> = [
  { id: 'active', label: 'Engines activos', led: true, format: (v) => `${v}` },
  { id: 'aicalls', label: 'AI calls / min', format: (v) => `${v}` },
  { id: 'rev', label: 'Ingresos hoy', format: (v) => `$${v.toLocaleString()}` },
  { id: 'streams', label: 'Streams en vivo', led: true, format: (v) => `${v}` },
  { id: 'queue', label: 'Carga de cola', format: (v) => `${v}%` },
  { id: 'gpu', label: 'GPU util', format: (v) => `${v}%` },
];

function Sparkline({ hist }: { hist: number[] }) {
  if (!hist.length) return <svg className="cc-spark" viewBox="0 0 54 22" />;
  const max = Math.max(...hist);
  const min = Math.min(...hist);
  const rng = max - min || 1;
  const pts = hist
    .map((v, i) => `${(i / (hist.length - 1)) * 54},${22 - ((v - min) / rng) * 20 - 1}`)
    .join(' ');
  return (
    <svg className="cc-spark" viewBox="0 0 54 22" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="var(--cc-green)" strokeWidth="1.4" />
    </svg>
  );
}

export function MetricStrip({ totalEngines }: { totalEngines: number }) {
  const [strip, setStrip] = useState<StripValue[]>([]);

  useEffect(() => {
    const src = new EventSource('/api/stream');
    src.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.kind === 'strip' && Array.isArray(data.strip)) {
          setStrip(data.strip as StripValue[]);
        }
      } catch {
        /* ignore parse errors */
      }
    };
    return () => src.close();
  }, []);

  const byId = new Map(strip.map((s) => [s.id, s]));
  return (
    <div className="cc-strip">
      {META.map((m) => {
        const v = byId.get(m.id);
        const value = v?.value ?? 0;
        const hist = v?.hist ?? [];
        return (
          <div key={m.id} className="cc-metric">
            <div className="cc-metric-l">
              {m.led && <span className="cc-metric-led" />}
              {m.label}
            </div>
            <div className="cc-metric-v">
              {m.format(value)}
              {m.id === 'active' && <small>/ {totalEngines}</small>}
            </div>
            <Sparkline hist={hist} />
          </div>
        );
      })}
    </div>
  );
}
