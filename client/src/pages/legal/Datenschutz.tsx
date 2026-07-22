import LegalLayout from "@/components/LegalLayout";

export default function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">1. Verantwortlicher</h2>
        <p className="mt-2">
          [Firmenname / Rechtsform]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ] [Ort]
          <br />
          E-Mail:{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
        <p className="mt-2">
          Wir verarbeiten personenbezogene Daten (z. B. Name, Adresse, E-Mail-Adresse, Zahlungsdaten sowie
          hochgeladene Fotos und Textinhalte für Postkarten) ausschließlich im Rahmen der gesetzlichen
          Bestimmungen der DSGVO, um unsere Dienstleistung – die Erstellung und den Versand physischer
          Postkarten – zu erbringen. [Platzhaltertext – wird vor Live-Betrieb final ausgearbeitet.]
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">3. Zweck der Datenverarbeitung</h2>
        <p className="mt-2">
          Die von dir bereitgestellten Daten werden zur Auftragsabwicklung, zum Versand deiner Postkarten,
          zur Kommunikation sowie – soweit erforderlich – zur Erfüllung gesetzlicher Pflichten genutzt.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">4. Weitergabe an Dritte</h2>
        <p className="mt-2">
          Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragserfüllung notwendig ist
          (z. B. Druck- und Versanddienstleister, Zahlungsdienstleister) oder eine gesetzliche
          Verpflichtung besteht.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">5. Deine Rechte</h2>
        <p className="mt-2">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
          Datenübertragbarkeit sowie Widerspruch gegen die Verarbeitung deiner personenbezogenen Daten.
          Wende dich hierzu an{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
          .
        </p>
      </section>

      <p className="text-xs text-[#4A635C]">
        Dies ist ein Platzhaltertext. Die endgültige Datenschutzerklärung wird vor dem Live-Betrieb ergänzt.
      </p>
    </LegalLayout>
  );
}
