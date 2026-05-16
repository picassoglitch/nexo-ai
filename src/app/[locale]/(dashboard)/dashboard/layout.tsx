import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { requireUser } from '@/lib/auth/session';
import './dashboard.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--cc-body',
  display: 'swap',
});
const grotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--cc-disp',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--cc-mono',
  display: 'swap',
});

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate: any unauthenticated visit to /dashboard bounces to /sign-in?next=/dashboard
  await requireUser('/dashboard');

  return (
    <div className={`${inter.variable} ${grotesk.variable} ${mono.variable}`}>{children}</div>
  );
}
