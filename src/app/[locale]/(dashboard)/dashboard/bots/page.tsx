import { setRequestLocale } from 'next-intl/server';
import { OperatorSurface, Toolbar } from '@/components/dashboard/operator-rows';

// /dashboard/bots reuses the operator surface from /dashboard (Operaciones)
// with the same filtering + categorization. Per the prototype's PAGE_META design,
// only the title/sub change — handled by the shell via PAGE_META[pathname].
export default async function BotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Toolbar />
      <div className="cc-scroll">
        <OperatorSurface />
      </div>
    </>
  );
}
