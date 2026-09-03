# Backend Environment Variables

Single source of truth for the backend on DigitalOcean.

## Aktuell verwendet

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `PORT` | ja | Port, auf dem der Node-Server laeuft | `3000` |
| `NODE_ENV` | ja | Laufzeitmodus | `production` |
| `FRONTEND_ORIGIN` | ja | Erlaubte CORS-Origin(s) des Frontends | Kommagetrennt, z. B. `https://foto-post-weltweit.de,https://www.foto-post-weltweit.de` |
| `PRODIGI_API_KEY` | ja | API-Schluessel fuer die Prodigi Print-API (v4.0) | Geheim halten, nie ins Repo schreiben |
| `PRODIGI_ENV` | nein | Prodigi-Umgebung: `sandbox` fuer Tests, leer/`production` fuer Live | `sandbox` |
| `API_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL der API fuer Checkout-Redirects | `https://api.foto-post-weltweit.de` |
| `PUBLIC_BASE_URL` | ja fuer Checkout | Alternative oeffentliche Basis-URL der API fuer Checkout-Redirects | Fallback fuer alte Deployments |
| `FRONTEND_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL des Frontends fuer den Erfolgs-Redirect | `https://foto-post-weltweit.de` |
| `STRIPE_SECRET_KEY` | ja fuer Checkout | Stripe Secret Key fuer Checkout Sessions und Webhook Fulfillment | `sk_test_...` oder `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | ja fuer Webhook | Stripe Webhook Signing Secret | `whsec_...` |
| `DB_HOST` | ja fuer Checkout | Hostname der Postgres-Datenbank fuer Payment-Drafts | In Docker typischerweise `familypost_db` |
| `DB_PORT` | ja fuer Checkout | Datenbank-Port | Typisch `5432` |
| `DB_NAME` | ja fuer Checkout | Name der Datenbank | In der Produktion `familypost` |
| `DB_USER` | ja fuer Checkout | Datenbank-Benutzer | In der Produktion meist `postgres` |
| `DB_PASSWORD` | ja fuer Checkout | Datenbank-Passwort | Muss exakt dem `POSTGRES_PASSWORD` entsprechen |
| `DB_SSL` | nein | TLS fuer die DB-Verbindung | `true` oder `false`, lokal meist `false` |
| `DB_URL` | alternativ | Vollstaendige DB-Verbindungszeichenkette | Kann die einzelnen `DB_*`-Werte ersetzen; Alias `DATABASE_URL` wird von `deploy.sh` ebenfalls akzeptiert |
| `SMTP_HOST` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Server fuer Passwort-Reset- und Bestellbestaetigungs-E-Mails | Hostname des Mailservers |
| `SMTP_PORT` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Port | Typisch `587` oder `465` |
| `SMTP_USER` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Benutzer | Mailbox oder SMTP-Login |
| `SMTP_PASSWORD` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Passwort | Geheim halten |
| `SMTP_FROM` | ja fuer Reset-Mail & Bestellbestaetigung | Absenderadresse im Mail-From-Feld | z. B. `Family Post <no-reply@...>` |
| `SMTP_SECURE` | ja fuer Reset-Mail & Bestellbestaetigung | TLS fuer SMTP-Verbindung | `true` fuer 465, sonst meist `false` |

## Optionale Vite-Client-Varianten

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `VITE_API_URL` | nein | Oeffentliche API-Basis fuer den Frontend-Client | `https://api.foto-post-weltweit.de` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | nein | Stripe Publishable Key fuer Frontend-Integration | `pk_test_...` |
| `JWT_SECRET` | aktuell reserviert | Geplant fuer signierte Tokens / spaetere Auth-Funktionen | Starkes zufaelliges Secret verwenden |

## Hinweise

- Keine echten Passwoerter, Keys oder Tokens in diese Datei eintragen.
- Zum Eintragen echter Werte: `./setup_env.sh`.