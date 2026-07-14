# DNS und Domain-Konfiguration (FamilyPostOS)

## Hauptdomain
- Domain: foto-post-weltweit.de
- DNS-Provider: Manitu
- Nameserver: dns01.manitu.net, dns02.manitu.net
- Cloudflare: nicht genutzt

## Zielarchitektur
- Frontend (Netlify): foto-post-weltweit.de und www.foto-post-weltweit.de
- Backend/API (DigitalOcean Droplet): api.foto-post-weltweit.de

## DNS-Eintraege bei Manitu

### Frontend
- Host: @
- Typ: A
- Ziel: 75.2.60.5

- Host: www
- Typ: CNAME
- Ziel: foto-post-weltweit.de

### Backend/API
- Host: api
- Typ: A
- Ziel: 46.101.196.165

- Host: api
- Typ: AAAA
- Ziel: nicht gesetzt

## App-Konfiguration in diesem Repo
- Deploy-Default fuer API-Domain: api.foto-post-weltweit.de
- Deploy-Default fuer FRONTEND_ORIGIN: https://foto-post-weltweit.de,https://www.foto-post-weltweit.de,https://6a566eee41c42012a80dac40--foto-post-weltweit.netlify.app
- Frontend Production API URL Beispiel: https://api.foto-post-weltweit.de

## Netlify Domain-Einstellungen
- Custom Domain hinzufuegen: foto-post-weltweit.de
- Domain Alias hinzufuegen: www.foto-post-weltweit.de
- HTTPS/SSL fuer beide Domains aktiv lassen
- Primaerdomain je nach Wunsch auf Root oder www setzen (mit Redirect)

## Verifikation
1. DNS pruefen
   - nslookup foto-post-weltweit.de
   - nslookup www.foto-post-weltweit.de
   - nslookup api.foto-post-weltweit.de
2. Frontend pruefen
   - https://foto-post-weltweit.de
   - https://www.foto-post-weltweit.de
3. API pruefen
   - https://api.foto-post-weltweit.de/api/auth/health