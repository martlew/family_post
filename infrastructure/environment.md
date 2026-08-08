# Backend Environment Variables

Single source of truth for the backend on DigitalOcean.

## Aktuell verwendet

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `PORT` | ja | Port, auf dem der Node-Server laeuft | `3000` |
| `NODE_ENV` | ja | Laufzeitmodus | `production` |
| `FRONTEND_ORIGIN` | ja | Erlaubte CORS-Origin(s) des Frontends | Kommagetrennt, z. B. `https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app` |
| `MYPOSTCARD_API_KEY` | ja | API-Schluessel fuer die MyPostcard B2B-API (v1.8) | Geheim halten, nie ins Repo schreiben |
| `MYPOSTCARD_USERNAME` | ja | Account-Benutzername fuer die MyPostcard-Authentifizierung | Geheim halten |
| `MYPOSTCARD_PASSWORD` | ja | Account-Passwort fuer die MyPostcard-Authentifizierung | Geheim halten |
| `MYPOSTCARD_CAMPAIGN_ID` | nein | Ordnet Bestellungen optional einer MyPostcard-Kampagne zu | z. B. `374` |
| `MYPOSTCARD_API_BASE_URL` | nein | Basis-URL der MyPostcard-API; Versand weltweit in unter 24 Stunden, Bildformat 1748x1240 px | Standard ist `https://www.mypostcard.com` |
| `API_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL der API fuer Checkout-Redirects | `https://api.foto-post-weltweit.de` |
| `PUBLIC_BASE_URL` | ja fuer Checkout | Alternative oeffentliche Basis-URL der API fuer Checkout-Redirects | Fallback fuer alte Deployments |
| `FRONTEND_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL des Frontends fuer den Erfolgs-Redirect | `https://foto-post-weltweit.de` |
| `LEMON_SQUEEZY_API_KEY` | ja fuer Checkout | API-Schluessel fuer Checkout-Erzeugung und Order-Pruefung | Geheim halten, nie ins Repo schreiben; einziges Feld hier, das `deploy.sh` hart erzwingt |
| `LEMON_SQUEEZY_STORE_ID` | nein | Lemon-Squeezy Store-ID (oeffentlich, keine geheime ID) | Default `429090` in Code und `deploy.sh`, falls leer/Platzhalter |
| `LEMON_SQUEEZY_VARIANT_ID` | nein | Basis-Variant-ID, wird fuer alle Plaene verwendet wenn die spezifischen `_SINGLE`/`_FAMILY_5`/`_BENEFIT_10`-Werte fehlen | Die numerische Variant-ID aus dem Lemon-Squeezy-Dashboard; wenn leer, greift der hartkodierte Default in `server/index.ts` |
| `LEMON_SQUEEZY_VARIANT_ID_SINGLE` | nein | Variant-ID fuer das Einzelticket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID`, dann auf hartkodiertes Default `1896112` |
| `LEMON_SQUEEZY_VARIANT_ID_FAMILY_5` | nein | Variant-ID fuer das 5er-Paket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID`, dann auf hartkodiertes Default `1896131` |
| `LEMON_SQUEEZY_VARIANT_ID_BENEFIT_10` | nein | Variant-ID fuer das 10er-Paket | Fallback auf `LEMON_SQUEEZY_VARIANT_ID`, dann auf hartkodiertes Default `1896134` |
| `LEMON_SQUEEZY_TEST_MODE` | ja fuer Checkout-Test | Aktiviert den Testmodus im Checkout | `true` oder `false` |
| `DB_HOST` | ja fuer Checkout | Hostname der Postgres-Datenbank fuer Payment-Drafts | In Docker typischerweise `familypost_db` |
| `DB_PORT` | ja fuer Checkout | Datenbank-Port | Typisch `5432` |
| `DB_NAME` | ja fuer Checkout | Name der Datenbank | In der Produktion `familypost` |
| `DB_USER` | ja fuer Checkout | Datenbank-Benutzer | In der Produktion meist `postgres` |
| `DB_PASSWORD` | ja fuer Checkout | Datenbank-Passwort | Muss exakt dem `POSTGRES_PASSWORD` entsprechen, mit dem der `familypost_db`-Container erstellt wurde (kein docker-compose.yml im Repo, Container wird manuell auf dem Droplet betrieben). Weicht es ab, schlaegt `create-checkout` mit `password authentication failed for user "postgres"` fehl. `deploy.sh`/`fix_env_and_rebuild.sh` brechen nur bei diesem und `LEMON_SQUEEZY_API_KEY`/`DB_URL` hart ab, wenn noch ein `REPLACE_WITH_...`-Platzhalter steht - alle anderen Variablen bekommen einen Dummy-Default plus Warnung. Zum Nachtragen echter Werte ohne `nano`: `./setup_env.sh`. |
| `DB_SSL` | nein | TLS fuer die DB-Verbindung | `true` oder `false`, lokal meist `false` |
| `DB_URL` | alternativ | Vollstaendige DB-Verbindungszeichenkette | Kann die einzelnen `DB_*`-Werte ersetzen; Alias `DATABASE_URL` wird von `deploy.sh` ebenfalls akzeptiert |
| `SMTP_HOST` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Server fuer Passwort-Reset- und Bestellbestaetigungs-E-Mails | Hostname des Mailservers |
| `SMTP_PORT` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Port | Typisch `587` oder `465` |
| `SMTP_USER` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Benutzer | Mailbox oder SMTP-Login |
| `SMTP_PASSWORD` | ja fuer Reset-Mail & Bestellbestaetigung | SMTP-Passwort | Geheim halten |
| `SMTP_FROM` | ja fuer Reset-Mail & Bestellbestaetigung | Absenderadresse im Mail-From-Feld | z. B. `Family Post <no-reply@...>` |
| `SMTP_SECURE` | ja fuer Reset-Mail & Bestellbestaetigung | TLS fuer SMTP-Verbindung | `true` fuer 465, sonst meist `false` |

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