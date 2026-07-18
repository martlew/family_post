# Backend Environment Variables

Single source of truth for the backend on DigitalOcean.

## Aktuell verwendet

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `PORT` | ja | Port, auf dem der Node-Server laeuft | `3000` |
| `NODE_ENV` | ja | Laufzeitmodus | `production` |
| `FRONTEND_ORIGIN` | ja | Erlaubte CORS-Origin(s) des Frontends | Kommagetrennt, z. B. `https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app` |
| `ECHTPOST_API_KEY` | ja | API-Schluessel fuer den externen Postkarten-Provider | Geheim halten, nie ins Repo schreiben |
| `ECHTPOST_API_URL` | ja | Ziel-Endpoint fuer den externen Postkarten-Provider | Standard ist `https://api.echtpost.de/v2/cards` |
| `ECHTPOST_MOTIVE_ID` | ja | EchtPost-Motiv-ID fuer den Karten-Request | Eine im Konto vorhandene Motive-ID, z. B. `374` |
| `API_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL der API fuer Checkout-Redirects | `https://api.foto-post-weltweit.de` |
| `PUBLIC_BASE_URL` | ja fuer Checkout | Alternative oeffentliche Basis-URL der API fuer Checkout-Redirects | Fallback fuer alte Deployments |
| `FRONTEND_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL des Frontends fuer den Erfolgs-Redirect | `https://foto-post-weltweit.de` |
| `LEMON_SQUEEZY_API_KEY` | ja fuer Checkout | API-Schluessel fuer Checkout-Erzeugung und Order-Pruefung | Geheim halten, nie ins Repo schreiben |
| `LEMON_SQUEEZY_STORE_ID` | ja fuer Checkout | Lemon-Squeezy Store-ID | Die Store-ID aus dem Lemon-Squeezy-Dashboard |
| `LEMON_SQUEEZY_VARIANT_ID` | ja fuer Checkout | Variants-ID des Family-Post-Angebots | Die Produkt-/Variant-ID aus Lemon Squeezy |
| `LEMON_SQUEEZY_VARIANT_ID_SINGLE` | nein | Variant-ID fuer das Einzelticket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID` |
| `LEMON_SQUEEZY_VARIANT_ID_FAMILY_5` | nein | Variant-ID fuer das 5er-Paket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID` |
| `LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10` | nein | Variant-ID fuer das 10er-Paket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID` |
| `LEMON_SQUEEZY_TEST_MODE` | ja fuer Checkout-Test | Aktiviert den Testmodus im Checkout | `true` oder `false` |
| `DB_HOST` | ja fuer Checkout | Hostname der Postgres-Datenbank fuer Payment-Drafts | In Docker typischerweise `familypost_db` |
| `DB_PORT` | ja fuer Checkout | Datenbank-Port | Typisch `5432` |
| `DB_NAME` | ja fuer Checkout | Name der Datenbank | In der Produktion `familypost` |
| `DB_USER` | ja fuer Checkout | Datenbank-Benutzer | In der Produktion meist `postgres` |
| `DB_PASSWORD` | ja fuer Checkout | Datenbank-Passwort | Geheim halten |
| `DB_SSL` | nein | TLS fuer die DB-Verbindung | `true` oder `false`, lokal meist `false` |
| `DB_URL` | alternativ | Vollstaendige DB-Verbindungszeichenkette | Kann die einzelnen `DB_*`-Werte ersetzen |
| `SMTP_HOST` | ja fuer Reset-Mail | SMTP-Server fuer Passwort-Reset-E-Mails | Hostname des Mailservers |
| `SMTP_PORT` | ja fuer Reset-Mail | SMTP-Port | Typisch `587` oder `465` |
| `SMTP_USER` | ja fuer Reset-Mail | SMTP-Benutzer | Mailbox oder SMTP-Login |
| `SMTP_PASSWORD` | ja fuer Reset-Mail | SMTP-Passwort | Geheim halten |
| `SMTP_FROM` | ja fuer Reset-Mail | Absenderadresse im Mail-From-Feld | z. B. `Family Post <no-reply@...>` |
| `SMTP_SECURE` | ja fuer Reset-Mail | TLS fuer SMTP-Verbindung | `true` fuer 465, sonst meist `false` |

## Optionale Vite-Client-Varianten

Diese Werte koennen im Build vorkompiliert werden, wenn der Client sie braucht:

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `VITE_API_URL` | nein | Oeffentliche API-Basis fuer den Frontend-Client | `https://api.foto-post-weltweit.de` |
| `VITE_LEMON_SQUEEZY_STORE_ID` | nein | Oeffentliche Store-ID fuer klientseitige Checks | Entspricht der Store-ID |
| `VITE_LEMON_SQUEEZY_VARIANT_ID` | nein | Oeffentliche Variant-ID fuer klientseitige Checks | Entspricht der Variant-ID |
| `JWT_SECRET` | aktuell reserviert | Geplant fuer signierte Tokens / spaetere Auth-Funktionen | Starkes zufaelliges Secret verwenden |

## Hinweise

- Keine echten Passwoerter, Keys oder Tokens in diese Datei eintragen.
- Fuer das aktuelle Backend sind die ersten fuenf Zeilen unter "Aktuell verwendet" plus die `DB_*`-Zeilen die relevante Mindestkonfiguration.