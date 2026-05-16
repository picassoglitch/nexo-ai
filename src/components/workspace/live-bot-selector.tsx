'use client';

import { useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { setSelectedLiveBot } from '@/lib/auth/selected-bot-actions';

interface Props {
  botId: string;
  botName: string;
  isCurrentlySelected: boolean;
}

export function LiveBotSelectButton({ botId, botName, isCurrentlySelected }: Props) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState(isCurrentlySelected);
  const showToast = useWorkspace((s) => s.showToast);

  function handleClick() {
    if (pending || selected) return;
    startTransition(async () => {
      const res = await setSelectedLiveBot(botId);
      if (!res.ok) {
        showToast(`<b>Error</b> · ${res.error}`);
        return;
      }
      setSelected(true);
      showToast(`<b>${botName}</b> ahora corre en vivo. Tu slot Pro está ocupado.`);
    });
  }

  if (selected) {
    return (
      <button
        type="button"
        disabled
        className="cc-mod-badge gr"
        style={{
          cursor: 'default',
          fontFamily: 'var(--cc-mono), monospace',
          padding: '5px 10px',
          fontWeight: 600,
        }}
      >
        ● EN VIVO
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      style={{
        background: 'transparent',
        border: '1px solid var(--cc-green)',
        color: 'var(--cc-green)',
        padding: '6px 12px',
        borderRadius: 7,
        fontFamily: 'inherit',
        fontSize: 11.5,
        fontWeight: 600,
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      {pending ? '…' : 'Activar en vivo'}
    </button>
  );
}
