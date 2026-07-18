# Anweisung Gesamtstruktur und Content

Diese Datei ist die Master-Anweisung fuer die aktuelle Content-Bereinigung und Struktur-Ausrichtung von Family Post.

## 1. Content-Stand

Die gueltigen Dokumente liegen im Ordner `familypost_docs/`:

- `brand.md`
- `strategy.md`
- `founder_briefing.md`
- `README_ANWEISUNG.md`
- `ANWEISUNG_GESAMT_STRUKTUR_UND_CONTENT.md`

Die Dokumentation muss den aktuellen technischen Stand widerspiegeln:

- EchtPost ist der operative Dienst fuer die Postkarten-Abwicklung.
- Lemon Squeezy ist der Merchant of Record fuer Zahlung, Checkout und Rechnungslogik.
- Der Live-Betrieb erfolgt ueber den Manitu-Server und die angebundenen Produktionsdomains.
- Veraltete Begriffe frueherer Druck- oder Hosting-Anbieter sind aus den gueltigen Docs zu entfernen.

## 2. Fixe Ordnerstruktur

Folgende Strukturen sind fix und muessen behalten beziehungsweise sauber gefuehrt werden:

- `inbox/`
- `drafts/`
- `finished/`
- `outbox/`
- `history/`
- `brain/`

Im Agentenbereich gilt als Zielstruktur:

- `agents/marketing/brain/`
- `agents/marketing/workspace/inbox/`
- `agents/marketing/workspace/drafts/`
- `agents/marketing/workspace/finished/`
- `agents/marketing/workspace/outbox/`
- `agents/marketing/history/`

## 3. Unklare Strukturen

Die Ordner `tasks/` und `company/` sind aktuell noch unklar.
Sie duerfen nicht geloescht, verschoben oder bereinigt werden, bis ihre Rolle explizit geklaert wurde.

## 4. Strategische Sperre

Zum aktuellen Zeitpunkt wird kein Automatisierungs-Skript fuer die Ordnerverwaltung gebaut.
Diese Sperre gilt, bis das Lemon-Squeezy- und EchtPost-Zahlungssystem im Live-Betrieb vollstaendig validiert ist.
