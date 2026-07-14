# Backend Environment Variables

Single source of truth for the backend on DigitalOcean.

## Aktuell verwendet

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `PORT` | ja | Port, auf dem der Node-Server laeuft | `3000` |
| `NODE_ENV` | ja | Laufzeitmodus | `production` |
| `FRONTEND_ORIGIN` | ja | Erlaubte CORS-Origin(s) des Frontends | Kommagetrennt, z. B. `https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app` |
| `ECHTPOST_API_KEY` | ja | API-Schluessel fuer den externen Postkarten-Provider | Geheim halten, nie ins Repo schreiben |
| `ECHTPOST_API_URL` | ja | Ziel-Endpoint fuer den externen Postkarten-Provider | Standard ist die EchtPost-API-URL |
| `PUBLIC_BASE_URL` | ja fuer Checkout | Oeffentliche Basis-URL der App fuer Redirects | `https://foto-post-weltweit.de` |
| `LEMON_SQUEEZY_API_KEY` | ja fuer Checkout | API-Schluessel fuer Checkout-Erzeugung und Order-Pruefung | Geheim halten, nie ins Repo schreiben |
| `LEMON_SQUEEZY_STORE_ID` | ja fuer Checkout | Lemon-Squeezy Store-ID | Die Store-ID aus dem Lemon-Squeezy-Dashboard |
| `LEMON_SQUEEZY_VARIANT_ID` | ja fuer Checkout | Variants-ID des Family-Post-Angebots | Die Produkt-/Variant-ID aus Lemon Squeezy |
| `LEMON_SQUEEZY_TEST_MODE` | ja fuer Checkout-Test | Aktiviert den Testmodus im Checkout | `true` oder `false` |
| `JWT_SECRET` | aktuell reserviert | Geplant fuer signierte Tokens / spaetere Auth-Funktionen | Starkes zufaelliges Secret verwenden |

## Optional oder zukunftig sinnvoll

| Variable | Pflicht | Zweck | Beispiel / Hinweis |
| --- | --- | --- | --- |
| `DB_HOST` | nein | Hostname der Datenbank | Nur benoetigt, wenn Persistenz hinzukommt |
| `DB_PORT` | nein | Datenbank-Port | Haefig `5432` fuer PostgreSQL |
| `DB_NAME` | nein | Name der Datenbank | Freie Namenswahl |
| `DB_USER` | nein | Datenbank-Benutzer | Geheim halten |
| `DB_PASSWORD` | nein | Datenbank-Passwort | Geheim halten |
| `DB_SSL` | nein | Ob TLS fuer DB-Verbindungen genutzt wird | `true` oder `false` |
| `DB_URL` | nein | Vollstaendige Datenbank-Connection-URL | Praktisch fuer Deployment und lokale Reproduktion |

## Hinweise

- Keine echten Passwoerter, Keys oder Tokens in diese Datei eintragen.
- Fuer das aktuelle Backend sind die ersten fuenf Zeilen unter "Aktuell verwendet" die relevante Mindestkonfiguration.
- Wenn spaeter eine Datenbank hinzukommt, sollten die `DB_*`-Variablen hier und in der `.env.example` synchron ergaenzt werden.