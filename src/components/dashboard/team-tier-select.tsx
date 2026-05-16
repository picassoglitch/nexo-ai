'use client';

import { useState, useTransition } from 'react';
import { useDashboard } from '@/lib/dashboard/store';
import { changeUserTier } from '@/lib/auth/tier-actions';
import type { SubscriptionTier } from '@/lib/auth/session';

const TIERS: Array<{ value: SubscriptionTier; label: string }> = [
  { value: 'FREE', label: 'Free' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ALL_ACCESS', label: 'All-Access' },
];

interface Props {
  userId: string;
  current: SubscriptionTier;
}

export function TeamTierSelect({ userId, current }: Props) {
  const [tier, setTier] = useState<SubscriptionTier>(current);
  const [pending, startTransition] = useTransition();
  const showToast = useDashboard((s) => s.showToast);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as SubscriptionTier;
    const prev = tier;
    setTier(next);
    startTransition(async () => {
      const res = await changeUserTier(userId, next);
      if (!res.ok) {
        setTier(prev);
        showToast(`<b>Error</b> · ${res.error ?? 'no se pudo cambiar el tier'}`);
        return;
      }
      showToast(`Tier cambiado a <b>${next.replace('_', '-')}</b>`);
    });
  }

  return (
    <select
      value={tier}
      onChange={handleChange}
      disabled={pending}
      style={{
        background: 'var(--cc-bg-2)',
        border: '1px solid var(--cc-line-2)',
        borderRadius: 7,
        padding: '6px 10px',
        color: 'var(--cc-txt)',
        fontFamily: 'inherit',
        fontSize: 12,
        cursor: pending ? 'not-allowed' : 'pointer',
        opacity: pending ? 0.7 : 1,
      }}
    >
      {TIERS.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
