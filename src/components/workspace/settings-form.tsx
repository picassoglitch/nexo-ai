'use client';

import { useEffect, useState } from 'react';
import { useWorkspace } from '@/lib/workspace/store';

interface Props {
  defaultName: string;
  defaultEmail: string;
  defaultLocale: 'en' | 'es';
}

interface Prefs {
  notifyCritical: boolean;
  notifyDaily: boolean;
  notifyMarketing: boolean;
  twoFA: boolean;
  locale: 'en' | 'es';
  timezone: string;
}

const DEFAULT_PREFS: Omit<Prefs, 'locale'> = {
  notifyCritical: true,
  notifyDaily: true,
  notifyMarketing: false,
  twoFA: true,
  timezone: 'America/Mexico_City',
};

const STORAGE_KEY = 'nexo:settings:prefs';

// One shape for every preference row, so the groups below read as one list
// rather than three ad-hoc layouts. Declared at module scope: a component
// defined inside render is re-created on every render and loses its state.
function ToggleRow({
  label,
  title,
  sub,
  on,
  onToggle,
}: {
  label: string;
  title: string;
  sub: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="ws-row">
      <div className="ws-row-body">
        <div className="ws-row-name">{title}</div>
        <div className="ws-row-sub">{sub}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        className={`ws-switch${on ? ' on' : ''}`}
        onClick={onToggle}
      />
    </div>
  );
}

export function SettingsForm({ defaultName, defaultEmail, defaultLocale }: Props) {
  const showToast = useWorkspace((s) => s.showToast);

  const [name, setName] = useState(defaultName);
  const [prefs, setPrefs] = useState<Prefs>({ ...DEFAULT_PREFS, locale: defaultLocale });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate saved prefs from localStorage on mount (no SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPrefs((p) => ({ ...p, ...parsed, locale: parsed.locale ?? p.locale }));
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, []);

  function persist(next: Prefs) {
    setPrefs(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function toggle<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    const next = { ...prefs, [key]: value };
    persist(next);
  }

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    showToast(`Perfil actualizado — <b>${name}</b>`);
    // TODO: persist to profiles.full_name via Supabase update in step 04.
  }

  if (!hydrated) {
    return <div className="ws-sub">Cargando…</div>;
  }

  return (
    <>
      <section className="ws-section">
        <div className="ws-sl">Tus datos</div>
        <form className="ws-card ws-form" onSubmit={saveProfile}>
          <div className="ws-field">
            <label htmlFor="set-name">Nombre</label>
            <input
              id="set-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="ws-field">
            <label htmlFor="set-email">Correo</label>
            <input id="set-email" type="email" value={defaultEmail} disabled />
            <p className="ws-field-hint">
              Tu correo es tu identidad de acceso. Para cambiarlo, escríbenos por Mensajes.
            </p>
          </div>
          <button type="submit" className="ws-btn ws-btn-primary" style={{ alignSelf: 'flex-start' }}>
            Guardar cambios
          </button>
        </form>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Idioma y zona horaria</div>
        <div className="ws-card ws-form">
          <div className="ws-field">
            <label htmlFor="set-locale">Idioma</label>
            <select
              id="set-locale"
              value={prefs.locale}
              onChange={(e) => toggle('locale', e.target.value as 'en' | 'es')}
            >
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className="ws-field">
            <label htmlFor="set-tz">Zona horaria</label>
            <select
              id="set-tz"
              value={prefs.timezone}
              onChange={(e) => toggle('timezone', e.target.value)}
            >
              <option value="America/Mexico_City">Ciudad de México</option>
              <option value="America/New_York">Nueva York</option>
              <option value="America/Los_Angeles">Los Ángeles</option>
              <option value="Europe/Madrid">Madrid</option>
            </select>
          </div>
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Avisos</div>
        <div className="ws-list">
          <ToggleRow
            label="Avisar de errores críticos"
            title="Errores críticos"
            sub="Te avisamos por correo cuando algo se cae."
            on={prefs.notifyCritical}
            onToggle={() => toggle('notifyCritical', !prefs.notifyCritical)}
          />
          <ToggleRow
            label="Resumen diario"
            title="Resumen diario"
            sub="Lo que corrió, lo que ganaste y lo que falló, a las 09:00."
            on={prefs.notifyDaily}
            onToggle={() => toggle('notifyDaily', !prefs.notifyDaily)}
          />
          <ToggleRow
            label="Eventos de marketing"
            title="Eventos de marketing"
            sub="Cuando una publicación se vuelve viral o sube la interacción."
            on={prefs.notifyMarketing}
            onToggle={() => toggle('notifyMarketing', !prefs.notifyMarketing)}
          />
        </div>
      </section>

      <section className="ws-section">
        <div className="ws-sl">Seguridad</div>
        <div className="ws-list">
          <ToggleRow
            label="Autenticación en dos pasos"
            title="Verificación en dos pasos"
            sub="Un código de tu app autenticadora además de tu contraseña. Obligatorio para roles admin."
            on={prefs.twoFA}
            onToggle={() => toggle('twoFA', !prefs.twoFA)}
          />
        </div>
      </section>
    </>
  );
}
