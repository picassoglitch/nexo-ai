// Server-rendered thread of message bubbles. No client interactivity here —
// the composer is a separate client component. Keeping read-side rendering on
// the server lets RSC stream the history without a flash.
//
// Styles live in src/styles/messages.css, which both shells import: this
// component renders inside the subscriber workspace AND the admin command
// center, so it can't depend on either one's tokens directly.

import type { MessageRow } from '@/lib/messages/messages-data';

interface Props {
  messages: MessageRow[];
  /** Which side is the viewer? Determines bubble alignment + color. */
  viewer: 'USER' | 'ADMIN';
  /** Empty-state copy when the thread has zero messages. */
  emptyMessage?: string;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MessageThread({ messages, viewer, emptyMessage }: Props) {
  if (messages.length === 0) {
    return (
      <div className="msg-empty">
        {emptyMessage ?? 'Aún no hay mensajes. Escribe abajo y empieza la conversación.'}
      </div>
    );
  }

  return (
    <div className="msg-thread">
      {messages.map((m) => {
        // Viewer's own messages sit right and carry the accent; the
        // counterpart's sit left on the neutral panel.
        const fromViewer = m.sender_role === viewer;
        return (
          <div key={m.id} className={`msg-line${fromViewer ? ' mine' : ''}`}>
            <div className="msg-bubble">
              {m.body}
              <div className="msg-meta">
                {m.sender_role === 'ADMIN' ? 'equipo Nexo · ' : ''}
                {formatTime(m.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
