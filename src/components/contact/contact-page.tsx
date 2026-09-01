import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';
import { ContactForm } from './contact-form';

export function ContactPage({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <>
      <LandingNav isAuthenticated={isAuthenticated} />

      <main className="page-shell">
        <div className="page-shell-inner">
          <p className="page-kicker">Contacto</p>
          <h1>Hablemos.</h1>
          <p className="page-sub">
            ¿Quieres una demo, integrar algo, sumarte como partner o saber cómo Nexo AI puede poner
            orden en tu operación? Escríbenos y te respondemos en menos de 24 horas hábiles.
          </p>

          <div className="page-card">
            <ContactForm />
          </div>

          <div className="page-fine">
            <span>· Te respondemos en menos de 24h hábiles</span>
            <span>· Tu correo no se publica</span>
            <span>· No te metemos a ningún newsletter</span>
          </div>
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
