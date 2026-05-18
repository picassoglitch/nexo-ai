import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { listThreadMessages } from '@/lib/messages/messages-data';
import { sendMessageFromUser, markThreadReadAsUser } from '@/lib/messages/messages-actions';
import { MessageThread } from '@/components/messages/message-thread';
import { MessageComposer } from '@/components/messages/message-composer';

export const metadata = { title: 'Mensajes' };

// Subscriber-side conversation with the Nexo AI admin team.
//
// One thread per user. We auto-mark the thread as read on page load so the
// unread badge in the sidebar drops to 0 as soon as the page renders — there
// is no separate "open conversation" gesture; visiting /app/messages IS the
// open gesture. The mark happens before the read so it doesn't race against
// realtime updates.
//
// The composer is a client component that calls sendMessageFromUser via
// server action. After a successful send, the action calls revalidatePath
// on /app/messages, which re-runs this RSC and renders the new bubble.

export default async function SubscriberMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSessionUser();
  if (!session) redirect('/sign-in?next=/app/messages');

  // Best-effort: clear the unread badge. We don't await the result — if it
  // fails (transient DB issue), the badge stays accurate and they retry on
  // refresh. We DO want the read marker before the listThreadMessages query
  // ideally, but Promise.all keeps the round-trip count down.
  await Promise.all([markThreadReadAsUser(), Promise.resolve()]);
  const messages = await listThreadMessages(session.user.id);

  return (
    <div className="cc-scroll">
      <div
        style={{
          marginBottom: 18,
          padding: '14px 18px',
          border: '1px solid var(--cc-line)',
          background: 'var(--cc-panel-2)',
          borderRadius: 'var(--cc-r-l)',
        }}
      >
        <h3 style={{ fontSize: 14, marginBottom: 4 }}>Habla con el equipo Nexo</h3>
        <p style={{ fontSize: 12.5, color: 'var(--cc-txt-3)', lineHeight: 1.5 }}>
          Este hilo va directo a los admins. Úsalo para ideas de producto, problemas,
          propuestas de colaboración o cualquier cosa que prefieras no mandar por correo.
          Solo nosotros lo vemos.
        </p>
      </div>

      <MessageThread
        messages={messages}
        viewer="USER"
        emptyMessage="Aún no hay mensajes en este hilo. Mándanos el primero abajo — leemos todo."
      />

      <div style={{ marginTop: 18 }}>
        <MessageComposer
          send={sendMessageFromUser}
          placeholder="Cuéntanos qué piensas. Enter envía · Shift+Enter agrega línea."
          buttonLabel="Enviar al equipo"
        />
      </div>
    </div>
  );
}
