import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="fixed top-4 right-4 z-50 flex gap-2 font-mono text-xs">
      <Link
        href="/sign-in"
        className="px-3 py-2 border border-white/40 bg-panel text-ink rounded-full hover:bg-white/10"
      >
        sign in
      </Link>
      <Link
        href="/account"
        className="px-3 py-2 border border-white/40 bg-panel text-ink rounded-full hover:bg-white/10"
      >
        account
      </Link>
    </div>
  );
}
