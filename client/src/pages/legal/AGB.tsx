import LegalLayout from "@/components/LegalLayout";

export default function AGB() {
  return (
    <LegalLayout title="AGB & Widerrufsrecht">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">1. Geltungsbereich</h2>
        <p className="mt-2">
          Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Bestellungen, die über die Plattform
          Family Post ([Firmenname / Rechtsform], [Straße Hausnummer], [PLZ Ort]) abgeschlossen werden.
          [Platzhaltertext – wird vor Live-Betrieb final ausgearbeitet.]
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">2. Vertragsschluss</h2>
        <p className="mt-2">
          Mit dem Abschluss einer Bestellung gibst du ein verbindliches Angebot zum Kauf und Versand einer
          oder mehrerer Postkarten ab. Der Vertrag kommt mit unserer Bestätigung bzw. dem Beginn der
          Ausführung zustande.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">3. Preise und Zahlung</h2>
        <p className="mt-2">
          Es gelten die zum Zeitpunkt der Bestellung angezeigten Preise inklusive gesetzlicher
          Umsatzsteuer. Die Zahlung erfolgt über die angebotenen Zahlungsmethoden.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">4. Widerrufsrecht</h2>
        <p className="mt-2">
          Verbraucher haben grundsätzlich ein 14-tägiges Widerrufsrecht. Da es sich bei unseren
          Postkarten um nach Kundenspezifikation angefertigte, personalisierte Waren handelt, kann das
          Widerrufsrecht gemäß § 312g Abs. 2 Nr. 1 BGB vorzeitig erlöschen, sobald mit der individuellen
          Anfertigung begonnen wurde. [Platzhaltertext – wird vor Live-Betrieb final ausgearbeitet.]
        </p>
        <p className="mt-2">
          Für Fragen zum Widerruf wende dich an{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">5. Haftung</h2>
        <p className="mt-2">
          Wir haften nach den gesetzlichen Bestimmungen. Für Verzögerungen beim Versand durch Dritte
          (z. B. Post- oder Zustelldienste) übernehmen wir keine Gewähr, sofern uns kein Verschulden trifft.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">6. Schlussbestimmungen</h2>
        <p className="mt-2">
          Es gilt das Recht der Bundesrepublik Deutschland. Sollte eine Bestimmung dieser AGB unwirksam
          sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </section>

      <p className="text-xs text-[#4A635C]">
        Dies ist ein Platzhaltertext. Die endgültigen AGB werden vor dem Live-Betrieb ergänzt.
      </p>
    </LegalLayout>
  );
}
