import LegalLayout from "@/components/LegalLayout";

export default function Datenschutz() {
  return (
    <LegalLayout title="Datenschutzerklärung">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">1. Datenschutz auf einen Blick</h2>
        <p className="mt-2">
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren
          personenbezogenen Daten passiert, wenn Sie unsere Website besuchen oder eine Postkarte
          gestalten und versenden.
        </p>
        <p className="mt-2">
          Verantwortlicher für die Datenverarbeitung: Martin Lewandowski, E-Mail:{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">2. Hosting &amp; Infrastruktur</h2>
        <p className="mt-2">
          Unsere Website und das Backend werden bei DigitalOcean LLC (USA / EU-Rechenzentren)
          gehostet. Beim Aufruf der Website werden temporär Server-Logfiles (IP-Adresse, Datum,
          Uhrzeit, Browser-Typ) zur Gewährleistung der IT-Sicherheit verarbeitet
          (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">3. Auftrags- und Bilddatenverarbeitung (Kernfunktion)</h2>
        <p className="mt-2">
          Wenn Sie über unsere Website eine Postkarte erstellen, verarbeiten wir die von Ihnen
          hochgeladenen Fotodateien, den Kartentext sowie die Empfängeradresse. Diese Daten werden
          ausschließlich zum Zweck der Erstellung, des Drucks und der postalischen Zustellung der
          Karte verarbeitet (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
        <p className="mt-2">
          Zur Ausführung des Drucks und Versands übermitteln wir das gestaltete Kartenmotiv, den
          Text sowie die Empfängeradresse an unseren spezialisierten Druck- und
          Versanddienstleister.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">4. Zahlungsabwicklung (Lemon Squeezy)</h2>
        <p className="mt-2">
          Die Zahlungsabwicklung erfolgt über den Anbieter Lemon Squeezy (Lemon Squeezy, LLC, USA)
          als „Merchant of Record". Wenn Sie eine Postkarte kostenpflichtig bestellen, erfolgt die
          Eingabe Ihrer Zahlungsdaten direkt auf den abgesicherten Systemen von Lemon Squeezy. Wir
          speichern selbst keine Kreditkarten- oder Bankdaten.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">5. Ihre Rechte</h2>
        <p className="mt-2">
          Sie haben jederzeit das Recht auf kostenlose Auskunft über Ihre gespeicherten
          personenbezogenen Daten, deren Herkunft und Empfänger sowie den Zweck der
          Datenverarbeitung und ein Recht auf Berichtigung oder Löschung dieser Daten. Wenden Sie
          sich hierzu an{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
