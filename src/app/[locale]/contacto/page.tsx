import { setRequestLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/auth/session';
import { ContactPage } from '@/components/contact/contact-page';

export const metadata = {
  title: 'Contacto · Nexo AI',
  description:
    'Escríbenos sobre integraciones, partnerships, demos o cualquier consulta sobre la plataforma.',
};

export default async function ContactRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  return <ContactPage isAuthenticated={user !== null} />;
}
