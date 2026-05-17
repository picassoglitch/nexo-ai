'use client';

// Two tiny inline selects for the admin engines table — one for status,
// one for tier_required. Optimistic UI + toast feedback + router.refresh()
// so the row count + badges update immediately after a successful change.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/lib/dashboard/store';
import {
  changeEngineStatus,
  changeEngineTierRequired,
} from '@/lib/engines/admin-actions';
import type { EngineStatus } from '@/lib/data/types';
import type { SubscriptionTier } from '@/lib/auth/session';

const STATUS_OPTS: Array<{ value: EngineStatus; label: string }> = [
  { value: 'active', label: 'Activo' },
  { value: 'coming_soon', label: 'Próximamente' },
  { value: 'deprecated', label: 'Deprecado' },
];

const TIER_OPTS: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ALL_ACCESS', label: 'All-Access' },
];

const selectStyle = (pending: boolean): React.CSSProperties => ({
  background: 'var(--cc-bg-2)',
  border: '1px solid var(--cc-line-2)',
  borderRadius: 7,
  padding: '5px 9px',
  color: 'var(--cc-txt)',
  fontFamily: 'inherit',
  fontSize: 11.5,
  cursor: pending ? 'not-allowed' : 'pointer',
  opacity: pending ? 0.7 : 1,
});

export function EngineStatusSelect({
  engineId,
  current,
  engineName,
}: {
  engineId: string;
  current: EngineStatus;
  engineName: string;
}) {
  const [value, setValue] = useState<EngineStatus>(current);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useDashboard((s) => s.showToast);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as EngineStatus;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const res = await changeEngineStatus(engineId, next);
      if (!res.ok) {
        setValue(prev);
        showToast(`<b>Error</b> · ${res.error}`);
        return;
      }
      showToast(`<b>${engineName}</b> · status → ${next}`);
      router.refresh();
    });
  }

  return (
    <select value={value} onChange={onChange} disabled={pending} style={selectStyle(pending)}>
      {STATUS_OPTS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function EngineTierSelect({
  engineId,
  current,
  engineName,
}: {
  engineId: string;
  current: SubscriptionTier;
  engineName: string;
}) {
  const [value, setValue] = useState<SubscriptionTier>(current);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const showToast = useDashboard((s) => s.showToast);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SubscriptionTier;
    const prev = value;
    setValue(next);
    startTransition(async () => {
      const res = await changeEngineTierRequired(engineId, next);
      if (!res.ok) {
        setValue(prev);
        showToast(`<b>Error</b> · ${res.error}`);
        return;
      }
      showToast(`<b>${engineName}</b> · requiere ${next.replace('_', '-')}`);
      router.refresh();
    });
  }

  return (
    <select value={value} onChange={onChange} disabled={pending} style={selectStyle(pending)}>
      {TIER_OPTS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
