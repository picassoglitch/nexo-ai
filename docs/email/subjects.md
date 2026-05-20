# Supabase Auth — email subject lines

Copy/paste these into each template's **Subject** field on the Supabase
Dashboard → Authentication → Emails screen.

Supabase auto-substitutes `{{ .SiteURL }}` and other Go template variables
in the subject too (rarely useful, but legal).

| Template | Subject |
|---|---|
| Confirm signup | `Confirma tu cuenta en Nexo AI` |
| Invite user | `Te invitaron a Nexo AI` |
| Magic link | `Tu link de acceso a Nexo AI` |
| Change email address | `Confirma tu nuevo correo en Nexo AI` |
| Reset password | `Restablece tu contraseña en Nexo AI` |

The subject ↔ HTML body pairing is what the recipient sees first in their
inbox preview. The HTML templates assume these subjects and don't repeat
them as h1 inside the body.
