'use client';

// Composer used by both the subscriber /app/messages page and the admin
// /dashboard/messages reply panel. The action prop decides where the
// message goes — server actions handle persistence + revalidation.
//
// Behavior is intentionally minimal: textarea + send button + toast feedback.
// Enter sends (Shift+Enter newlines). Disable while pending. Reset on success.
//
// Styles live in src/styles/messages.css — shared with MessageThread, and
// imported by both shells, since this renders in the workspace and the admin
// command center alike.

import { useRef, useState, useTransition } from 'react';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  /** Server action receiving the body. Returns ok/error so we can toast. */
  send: (body: string) => Promise<{ ok: boolean; error?: string }>;
  /** Placeholder copy — differs subscriber vs admin context. */
  placeholder?: string;
  /** Send-button label (default: "Enviar"). */
  buttonLabel?: string;
  /** Soft cap on chars. Server still enforces 4000 hard cap. */
  maxChars?: number;
}

export function MessageComposer({
  send,
  placeholder = 'Escribe tu mensaje aquí…',
  buttonLabel = 'Enviar',
  maxChars = 4000,
}: Props) {
  const [body, setBody] = useState('');
  const [isPending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);
  // useWorkspace's toast is shared across the dashboard. Both routes mount
  // workspace-shell or dashboard-shell which render the toast container.
  const showToast = useWorkspace((s) => s.showToast);

  function submit() {
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await send(trimmed);
      if (!res.ok) {
        showToast(`<b>Error</b> · ${res.error ?? 'No pudimos enviar tu mensaje'}`);
        return;
      }
      setBody('');
      // Bring focus back so a quick second message is one keystroke away.
      taRef.current?.focus();
      showToast('Mensaje enviado.');
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends, Shift+Enter inserts a newline (standard chat affordance).
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const overLimit = body.length > maxChars;
  const disabled = isPending || !body.trim() || overLimit;

  return (
    <div className="msg-composer">
      <textarea
        ref={taRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        rows={3}
      />
      <div className="msg-composer-foot">
        <small className={`msg-count${overLimit ? ' over' : ''}`}>
          {body.length} / {maxChars}
          {overLimit && ' · excede el límite'}
        </small>
        <button type="button" className="msg-send" onClick={submit} disabled={disabled}>
          {isPending ? 'Enviando…' : buttonLabel}
        </button>
      </div>
    </div>
  );
}
