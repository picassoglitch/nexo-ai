import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { listThreadMessages, markThreadReadForUser } from '@/lib/messages/messages-data';
import { sendMessageFromUser } from '@/lib/messages/messages-actions';
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

  // Best-effort: clear the unread badge. Pure write (no revalidatePath) so it's
  // safe to call during render — calling a revalidating server action here is
  // what crashed this page ("revalidatePath cannot be called during render").
  // The sidebar badge refreshes on the next navigation.
  await markThreadReadForUser(session.user.id);
  const messages = await listThreadMessages(session.user.id);

  return (
    <div className="ws-thread ws-enter">
      <div className="ws-notice info">
        <div className="ws-notice-body">
          <h3>Esto llega directo al equipo</h3>
          <p>
            Escríbenos ideas, fallas que encontraste o propuestas de colaboración. Te contesta una
            persona, normalmente el mismo día. Nadie más ve este hilo.
          </p>
        </div>
      </div>

      <MessageThread
        messages={messages}
        viewer="USER"
        emptyMessage="Todavía no hay mensajes. Escríbenos el primero aquí abajo — leemos todo."
      />

      <MessageComposer
        send={sendMessageFromUser}
        placeholder="Cuéntanos qué tienes en mente. Enter envía · Shift+Enter agrega línea."
        buttonLabel="Enviar al equipo"
      />
    </div>
  );
}
