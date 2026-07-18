# Founder Briefing

## Ursprung
Family Post entstand aus der Beobachtung, dass die Digitalisierung zwar Menschen verbindet, gleichzeitig aber eine Generation von dieser Entwicklung ausschliesst.
Waehrend Fotos heute in Sekunden um die Welt geschickt werden koennen, erreichen sie viele Grosseltern nie.
Gleichzeitig verlieren digitale Erinnerungen zunehmend ihren emotionalen Wert, weil sie in einer taeglichen Bilderflut untergehen.

---

## Das Grundproblem
Family Post loest zwei Probleme gleichzeitig:
1. Digitale Erinnerungen sind fluechtig. Sie verschwinden in Chats, Clouds oder alten Smartphones.
2. Viele Menschen besitzen keine digitale Infrastruktur, moechten aber trotzdem am Leben ihrer Familie teilnehmen.

---

## Unsere Mission
Wir verwandeln fluechtige digitale Erinnerungen in dauerhafte physische Erinnerungen.
Wir digitalisieren nicht aeltere Menschen.
Wir emotionalisieren die digitale Welt.

---

## Unsere Identitaet
Family Post ist keine Druckerei.
Family Post ist keine Postkartenfirma.
Family Post ist eine Plattform zur Bewahrung persoenlicher Erinnerungen.
Die Postkarte ist lediglich das erste physische Medium.

---

## Unsere Werte
- Familie
- Naehe
- Vertrauen
- Qualitaet
- Einfachheit
- Langlebigkeit
- Barrierefreiheit

---

## Unsere Prinzipien
1. Emotion vor Technologie.
2. Einfachheit vor Funktionsvielfalt.
3. Erinnerungen vor Reichweite.
4. Qualitaet vor Geschwindigkeit.
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
Wenn nicht, gehoert sie nicht zu Family Post.

---

## Operative Leitplanken fuer System-Agenten

### 1. Technische Infrastruktur & API
Die vollautomatische Postkarten-Abwicklung im Hintergrund erfolgt ueber die EchtPost-API. Frontend und Backend werden ueber den Manitu-Server und die angebundenen Produktionsdomains betrieben. Globale Erreichbarkeit, DNS-Stabilitaet und HTTPS folgen der aktuellen Manitu-/Domain-Konfiguration.

### 2. Die eiserne Preisgrenze
Unser Angebot folgt festen Paketpreisen, die das All-inclusive-Versprechen halten: Weltweiter Premium-Versand, hochwertiger 300g-Druck und echtes Porto sind immer komplett inklusive - ohne versteckte Kosten.

- Einzelticket: **4,99 EUR pro Karte** fuer gelegentliche Urlaubsgruesse.
- Family-Paket (5 Postkarten): **22,99 EUR** zum Sparpreis (kein Ablaufdatum, gemeinsam in der Familie nutzbar).
- Vorteils-Paket (10 Postkarten): **39,99 EUR** zum Bestpreis (kein Ablaufdatum, ideal fuer Vielschreiber).

Diese Preisstruktur bleibt im B2C-Bereich stets bindend und darf vom System niemals eigenstaendig ueberschritten werden.

### 3. Zahlungsabwicklung & Buerokratie-Minimierung
Wir nutzen nicht direkt Stripe. Stattdessen arbeiten wir mit Lemon Squeezy als Merchant of Record (MoR).

Das System muss darauf vorbereitet sein, Zahlungen, Abonnements und Rechnungsstellung vollstaendig ueber den MoR abzuwickeln.
Diese Loesung minimiert steuerliche Buerokratie und schuetzt das operative Geschaeft.

### 4. Zielsetzung
Unser primaerer Meilenstein ist ein stabiler monatlicher Umsatz von **500 EUR**.
Das entspricht etwa **30-50 treuen Familien-Kunden** in unseren Paketen.
Der Fokus liegt auf maximaler Lean-Entwicklung.

### 5. Marketing-Direktive
In allen kuenftigen Marketing-Dokumenten und Text-Generierungen verkaufen wir die Emotion und die Story, nicht die Technik.

Der Fokus liegt auf dem Szenario:
Oma hat kein Smartphone und lebt isoliert im analogen Alltag.
Enkel schicken Momente direkt in den Briefkasten.

### 6. KI-Zensur & das menschliche Veto
Sollte die automatisierte Bildzensur des Druckpartners faelschlicherweise ein harmloses, emotionales Familienbild blockieren, darf das System die Bestellung niemals eigenstaendig stornieren oder vollautomatisch erstatten. Jede Blockierung loest einen High-Priority-Alarm fuer ein menschliches Veto aus. Wir schuetzen die Emotion vor der Kaelte fehlerhafter Algorithmen.

### 7. Die Kulanz-Direktive
Bei Kundenanfragen oder verloren gegangenen Sendungen gilt: Im Zweifel immer fuer die Familie. Wir diskutieren nicht um Cent-Betraege oder Portokosten. Wenn eine Erinnerung den Briefkasten nicht erreicht hat, wird sie ohne Rueckfragen auf Firmenkosten neu gedruckt und versendet. Vertrauen steht ueber kurzfristigem Gewinn.
