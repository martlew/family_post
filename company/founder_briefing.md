# Founder Briefing

## Ursprung
Family Post entstand aus der Beobachtung, dass die Digitalisierung zwar Menschen verbindet, gleichzeitig aber eine Generation von dieser Entwicklung ausschließt.
Während Fotos heute in Sekunden um die Welt geschickt werden können, erreichen sie viele Großeltern nie.
Gleichzeitig verlieren digitale Erinnerungen zunehmend ihren emotionalen Wert, weil sie in einer täglichen Bilderflut untergehen.

---

## Das Grundproblem
Family Post löst zwei Probleme gleichzeitig:
1. Digitale Erinnerungen sind flüchtig. Sie verschwinden in Chats, Clouds oder alten Smartphones.
2. Viele Menschen besitzen keine digitale Infrastruktur, möchten aber trotzdem am Leben ihrer Familie teilnehmen.

---

## Unsere Mission
Wir verwandeln flüchtige digitale Erinnerungen in dauerhafte physische Erinnerungen.
Wir digitalisieren nicht ältere Menschen.
Wir emotionalisieren die digitale Welt.

---

## Unsere Identität
Family Post ist keine Druckerei.
Family Post ist keine Postkartenfirma.
Family Post ist eine Plattform zur Bewahrung persönlicher Erinnerungen.
Die Postkarte ist lediglich das erste physische Medium.

---

## Unsere Werte
- Familie
- Nähe
- Vertrauen
- Qualität
- Einfachheit
- Langlebigkeit
- Barrierefreiheit

---

## Unsere Prinzipien
1. Emotion vor Technologie.
2. Einfachheit vor Funktionsvielfalt.
3. Erinnerungen vor Reichweite.
4. Qualität vor Geschwindigkeit.
5. Vertrauen vor kurzfristigem Umsatz.
6. Technologie bleibt unsichtbar.
7. Jede neue Funktion muss Erinnerungen wertvoller machen.

---

## Was Family Post nicht ist
- keine Billig-Druckerei
- kein soziales Netzwerk
- kein Messenger
- keine Foto-Cloud
- keine Werbeplattform

---

## Fundamentale Entscheidungsregel
Jede Entscheidung muss eine Frage beantworten:
**Hilft sie dabei, Erinnerungen dauerhaft wertvoller zu machen?**
Wenn nicht, gehört sie nicht zu Family Post.

---

## 🛠️ Operative Leitplanken (Ergänzung für System-Agenten)

### 1. Technische Infrastruktur & API
Die vollautomatische Postkarten-Abwicklung im Hintergrund erfolgt über die **EchtPost-API**. Frontend und Backend werden über den **Manitu-Server** und die angebundenen Produktionsdomains betrieben. Globale Erreichbarkeit, DNS-Stabilität und HTTPS folgen der aktuellen Manitu-/Domain-Konfiguration.

### 2. Die eiserne Preisgrenze
Unser Angebot folgt festen Paketpreisen, die das All-inclusive-Versprechen halten: Weltweiter Premium-Versand, hochwertiger 300g-Druck und echtes Porto sind immer komplett inklusive – ohne versteckte Kosten.

- Einzelticket: **4,99 € pro Karte** für gelegentliche Urlaubsgrüße.
- Family-Paket (5 Postkarten): **22,99 €** zum Sparpreis (kein Ablaufdatum, gemeinsam in der Familie nutzbar).
- Vorteils-Paket (10 Postkarten): **39,99 €** zum Bestpreis (kein Ablaufdatum, ideal für Vielschreiber).

Diese Preisstruktur bleibt im B2C-Bereich stets bindend und darf vom System niemals eigenständig überschritten werden.

### 3. Zahlungsabwicklung & Bürokratie-Minimierung
Wir nutzen nicht direkt Stripe. Stattdessen arbeiten wir mit Lemon Squeezy als Merchant of Record (MoR).

Das System muss darauf vorbereitet sein, Zahlungen, Abonnements und Rechnungsstellung vollständig über den MoR abzuwickeln.
Diese Lösung minimiert steuerliche Bürokratie und schützt das operative Geschäft.

### 4. Zielsetzung
Unser primärer Meilenstein ist ein stabiler monatlicher Umsatz von **500 €**.
Das entspricht etwa **30–50 treuen Familien-Kunden** in unseren Paketen.
Der Fokus liegt auf maximaler Lean-Entwicklung.

### 5. Marketing-Direktive
In allen künftigen Marketing-Dokumenten und Text-Generierungen verkaufen wir die Emotion und die Story, nicht die Technik.

Der Fokus liegt auf dem Szenario:
Oma hat kein Smartphone und lebt isoliert im analogen Alltag.
Enkel schicken Momente direkt in den Briefkasten.

### 6. KI-Zensur & Das menschliche Veto
Sollte die automatisierte Bildzensur des Druckpartners fälschlicherweise ein harmloses, emotionales Familienbild blockieren, darf das System die Bestellung **niemals** eigenständig stornieren oder vollautomatisch erstatten. Jede Blockierung löst einen High-Priority-Alarm für ein menschliches Veto (Prüfung durch den Gründer) aus. Wir schützen die Emotion vor der Kälte fehlerhafter Algorithmen.

### 4. Die Kulanz-Direktive (Support-Regel)
Bei Kundenanfragen oder verloren gegangenen Sendungen gilt das Gesetz: *„Im Zweifel immer für die Familie. Wir diskutieren nicht um Cent-Beträge oder Portokosten. Wenn eine Erinnerung den Briefkasten nicht erreicht hat, wird sie ohne Rückfragen auf Firmenkosten neu gedruckt und versendet. Vertrauen steht über kurzfristigem Gewinn.“*