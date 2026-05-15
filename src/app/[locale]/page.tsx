import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-acid mb-4">{t('kicker')}</p>
      <h1 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-2xl">Nexo AI</h1>
      <p className="mt-6 text-ink-dim max-w-md">{t('comingSoon')}</p>
    </main>
  );
}
