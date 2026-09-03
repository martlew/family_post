# Release-Checkliste

1. Änderungen nach `master` pushen, damit der DigitalOcean-Host den aktuellen Stand aus Git ziehen kann.
2. Per SSH auf den DigitalOcean-Server in Frankfurt gehen und ins Repo wechseln: `cd /opt/familypost`.
3. Den Release-Flow starten: `sudo ./deploy.sh`.
4. Im Output prüfen, dass Docker den Build neu erstellt und Nginx den aktuellen Stand ohne Fehler lädt.
5. `https://foto-post-weltweit.de/sitemap.xml` und den Backend-Health-Endpoint kurz prüfen, dann Release abschließen.
