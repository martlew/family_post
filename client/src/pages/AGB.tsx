import LegalLayout from "@/components/LegalLayout";

export default function AGB() {
  return (
    <LegalLayout title="AGB & Widerrufsrecht">
      <section>
        <h2 className="text-lg font-semibold sm:text-xl">§ 1 Geltungsbereich &amp; Vertragspartner</h2>
        <p className="mt-2">
          Diese AGB gelten für alle Bestellungen über die Plattform foto-post-weltweit.de.
          Vertragspartner für die kaufmännische Zahlungsabwicklung ist der Verkäufer (Merchant of
          Record) Lemon Squeezy, LLC im Auftrag von FamilyPostOS / Martin Lewandowski.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">
          § 2 Leistungsbeschreibung &amp; Urheberrechte an hochgeladenen Bildern
        </h2>
        <p className="mt-2">
          (1) Der Kunde kann über unsere Plattform eigene Fotos hochladen, Texte eingeben und den
          Druck sowie den weltweiten postalischen Versand einer physischen Postkarte veranlassen.
        </p>
        <p className="mt-2">
          (2) Der Kunde versichert, dass er alle erforderlichen Rechte (insbesondere Urheber- und
          Persönlichkeitsrechte) an den hochgeladenen Bildern besitzt und keine rechtswidrigen,
          rassistischen oder beleidigenden Inhalte übermittelt.
        </p>
      </section>

      <section className="rounded-2xl border border-[#C99A3E]/40 bg-[#FFF9EF] p-4 sm:p-6">
        <h2 className="text-lg font-semibold sm:text-xl">Wichtige Widerrufsbelehrung</h2>
        <p className="mt-2 font-semibold">
          Ausschluss des Widerrufsrechts (§ 312g Abs. 2 Nr. 1 BGB)
        </p>
        <p className="mt-2">
          Das Gesetz gewährt Verbrauchern bei Fernabsatzverträgen grundsätzlich ein 14-tägiges
          Widerrufsrecht.
        </p>
        <p className="mt-2">
          Das Widerrufsrecht besteht jedoch NICHT bei Verträgen zur Lieferung von Waren, die nicht
          vorgefertigt sind und für deren Herstellung eine individuelle Auswahl oder Bestimmung
          durch den Verbraucher maßgeblich ist oder die eindeutig auf die persönlichen Bedürfnisse
          des Verbrauchers zugeschnitten sind.
        </p>
        <p className="mt-2">
          Da jede über foto-post-weltweit.de bestellte Postkarte ein Unikat ist (bedruckt mit
          Ihrem individuellen Foto und Text), ist das Widerrufsrecht ausgeschlossen, sobald der
          Druckauftrag gestartet wurde.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold sm:text-xl">§ 3 Haftungsausschluss für postalische Laufzeiten</h2>
        <p className="mt-2">
          Wir übergeben die fertigen Postkarten unverzüglich an den jeweiligen Postdienstleister.
          Für Verzögerungen auf dem postalischen Transportweg übernehmen wir keine Haftung.
        </p>
      </section>
    </LegalLayout>
  );
}
