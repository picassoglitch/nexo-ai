'use client';

import { useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { setSelectedLiveEngine } from '@/lib/auth/selected-engine-actions';

interface Props {
  engineId: string;
  engineName: string;
  isCurrentlySelected: boolean;
  /** If the engine is coming_soon or deprecated, the button is disabled with
   *  a teaser message instead of an active CTA. */
  disabled?: boolean;
  disabledReason?: string;
}

export function LiveEngineSelectButton({
  engineId,
  engineName,
  isCurrentlySelected,
  disabled,
  disabledReason,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(isCurrentlySelected);
  const showToast = useWorkspace((s) => s.showToast);

  function handleClick() {
    if (pending || selected || disabled) return;
    startTransition(async () => {
      const res = await setSelectedLiveEngine(engineId);
      if (!res.ok) {
        showToast(`<b>Error</b> · ${res.error}`);
        return;
      }
      setSelected(true);
      showToast(`<b>${engineName}</b> ahora corre en vivo. Tu slot Pro está ocupado.`);
    });
  }

  // Already the live one: the card's status badge already says so, so the
  // button would just be a second, unclickable copy of the same fact.
  if (selected) return null;

  if (disabled) {
    return (
      <button
        type="button"
        className="ws-btn ws-btn-ghost ws-btn-sm"
        disabled
        title={disabledReason}
      >
        {disabledReason ?? 'No disponible'}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="ws-btn ws-btn-ghost ws-btn-sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? 'Activando…' : 'Activar en vivo'}
    </button>
  );
}

// Back-compat alias for any straggler import sites.
export { LiveEngineSelectButton as LiveBotSelectButton };
