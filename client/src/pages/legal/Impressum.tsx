import LegalLayout from "@/components/LegalLayout";

export default function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Angaben gemäß § 5 TMG</h2>
        <p className="mt-2">
          [Firmenname / Rechtsform]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ] [Ort]
          <br />
          [Land]
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Kontakt</h2>
        <p className="mt-2">
          E-Mail:{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
          <br />
          Telefon: [Telefonnummer]
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Vertretungsberechtigt</h2>
        <p className="mt-2">[Name der/des Geschäftsführer(s)]</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Registereintrag</h2>
        <p className="mt-2">
          Registergericht: [Registergericht]
          <br />
          Registernummer: [Registernummer]
          <br />
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: [USt-IdNr.]
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p className="mt-2">
          [Name]
          <br />
          [Anschrift wie oben]
        </p>
      </section>

      <p className="text-xs text-[#4A635C]">
        Dies ist ein Platzhaltertext. Die endgültigen rechtlichen Angaben werden vor dem Live-Betrieb ergänzt.
      </p>
    </LegalLayout>
  );
}
