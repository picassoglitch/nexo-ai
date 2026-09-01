'use client';

// Client button that asks the server for the engine's launch URL, then
// either opens it in a new tab (external_sso_redirect) or shows a toast
// with the error reason if the integration isn't ready.

import { useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';
import { getEngineLaunchUrl } from '@/lib/engines/launch-actions';

interface Props {
  engineId: string;
  engineName: string;
  label: string;
  /** When true (default), opens in a new tab so the user stays on Nexo AI.
   *  When false, navigates in the same tab. */
  newTab?: boolean;
}

export function EngineLaunchButton({ engineId, engineName, label, newTab = true }: Props) {
  const [pending, startTransition] = useTransition();
  const showToast = useWorkspace((s) => s.showToast);

  function onClick() {
    startTransition(async () => {
      const result = await getEngineLaunchUrl(engineId);
      if (!result.ok || !result.url) {
        // Distinguish the "not configured / placeholder" case from real errors —
        // placeholder is expected during development, not a failure.
        if (result.reason === 'not_configured') {
          showToast(
            `<b>${engineName}</b> todavía no está en línea. Se conecta en cuanto ${engineName} esté listo.`,
          );
        } else {
          showToast(`<b>Error</b> · ${result.error ?? 'No pudimos abrir el engine. Inténtalo de nuevo.'}`);
        }
        return;
      }
      if (newTab) {
        // window.open with a "noopener noreferrer" stand-in keeps the engine
        // from getting a window.opener handle back into Nexo AI's tab.
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = result.url;
      }
    });
  }

  return (
    <button type="button" className="ws-btn ws-btn-primary" onClick={onClick} disabled={pending}>
      {pending ? 'Abriendo…' : label}
    </button>
  );
}
