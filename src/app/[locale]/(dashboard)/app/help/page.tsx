import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';
import { HelpFaq } from '@/components/workspace/help-faq';

export const metadata = { title: 'Preguntas frecuentes' };

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <section className="ws-section ws-enter">
        <HelpFaq />
      </section>

      <section className="ws-section">
        <div className="ws-notice">
          <div className="ws-notice-body">
            <h3>¿No encontraste lo que buscabas?</h3>
            <p>
              Escríbenos por Mensajes y te contesta una persona real, normalmente el mismo día. Sin
              tickets y sin bots.
            </p>
          </div>
          <Link href={'/app/messages' as Route} className="ws-btn ws-btn-primary ws-btn-sm">
            Escribir al equipo
          </Link>
        </div>
      </section>
    </>
  );
}
