import { setRequestLocale } from 'next-intl/server';
import type { Route } from 'next';
import { Link } from '@/i18n/routing';

export const metadata = { title: 'Historial' };

export default async function HistoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="ws-empty ws-enter">
      <div className="ws-empty-ic" aria-hidden="true">
        ≡
      </div>
      <h3>Todavía no has corrido nada</h3>
      <p>
        Cuando corras tu primer engine —en prueba o en vivo— aquí vas a ver cada trabajo, cuánto
        tardó, qué tokens gastó y cómo salió.
      </p>
      <Link href={'/app/engines' as Route} className="ws-btn ws-btn-primary">
        Elegir un engine
      </Link>
    </div>
  );
}
