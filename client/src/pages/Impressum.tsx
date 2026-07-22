import LegalLayout from "@/components/LegalLayout";

export default function Impressum() {
  return (
    <LegalLayout title="Impressum">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Angaben gemäß § 5 DDG</h2>
        <p className="mt-2">
          Martin Lewandowski
          <br />
          FamilyPostOS / foto-post-weltweit.de
          <br />
          Kampstr. 3
          <br />
          25693 St. Michaelisdonn
          <br />
          Deutschland
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Kontakt</h2>
        <p className="mt-2">
          E-Mail:{" "}
          <a href="mailto:info@foto-post-weltweit.de" className="underline underline-offset-4 hover:no-underline">
            info@foto-post-weltweit.de
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p className="mt-2">
          Martin Lewandowski
          <br />
          Kampstr. 3
          <br />
          25693 St. Michaelisdonn
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">Umsatzsteuer-Hinweis</h2>
        <p className="mt-2">
          Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung). Eine
          Umsatzsteuer-Identifikationsnummer ist derzeit in Beantragung.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">EU-Streitschlichtung</h2>
        <p className="mt-2">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:no-underline"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          . Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder
          verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </section>
    </LegalLayout>
  );
}
