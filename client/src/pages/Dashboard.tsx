import { useEffect, useState } from "react";
import { Camera, Mail, Plus, Settings, X, RotateCw, CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { clearAuthSession, getAuthSession } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";

interface Postcard {
  id: string;
  imageUrl: string;
  message: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  createdAt: string;
}

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [isModalFlipped, setIsModalFlipped] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!getAuthSession()) {
      navigate("/login");
      return;
    }

    const saved = localStorage.getItem("family_postcards");
    if (saved) {
      try {
        setPostcards(JSON.parse(saved));
      } catch (e) {
        console.error("Fehler beim Laden der Postkarten:", e);
      }
    }
  }, [navigate]);

  // 3D Card Rotation Styles for Modal
  const cardStyle = {
    perspective: "1200px",
  };

  const innerCardStyle = {
    transformStyle: "preserve-3d" as const,
    transform: isModalFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  const faceStyle = {
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
  };

  const backFaceStyle = {
    backfaceVisibility: "hidden" as const,
    WebkitBackfaceVisibility: "hidden" as const,
    transform: "rotateY(180deg)",
  };

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-[#F7F3EA] text-[#0E4B40]">
      {/* Navigation */}
      <nav className="relative z-10 border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <BrandMark compact />
          </Link>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl p-2 text-[#4A635C] transition-all hover:bg-[#E4F1E9] hover:text-[#0E4B40]"
              aria-label="Einstellungen"
            >
              <Settings className="w-5 h-5" />
            </button>
            <Link
              href="/login"
              onClick={() => clearAuthSession()}
              className="cursor-pointer rounded-full border border-[#D9E4DD] bg-white px-4 py-2 text-sm text-[#0E4B40] transition-all hover:border-[#C99A3E]/40 hover:text-[#C99A3E]"
            >
              Abmelden
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-black text-[#0E4B40] md:text-4xl">
            Meine Postkarten
          </h1>
          <p className="text-[#4A635C]">
            Erstelle und versende Postkarten direkt an deine Familie.
          </p>
        </div>

        {/* CTA Card – Neue Postkarte */}
        <div className="mb-8">
          <Link href="/editor" className="block w-full cursor-pointer">
            <div className="group flex w-full flex-col items-center gap-6 rounded-2xl border border-[#D9E4DD] bg-gradient-to-r from-[#E4F1E9] via-white to-[#F7F3EA] p-8 text-left transition-all duration-300 hover:border-[#C99A3E]/40 sm:flex-row">
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0E4B40] shadow-lg shadow-[#0E4B40]/20 transition-shadow group-hover:shadow-[#0E4B40]/30">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="mb-1 text-xl font-bold text-[#0E4B40]">
                  Neue Postkarte erstellen
                </h2>
                <p className="text-sm text-[#4A635C]">
                  Lade ein Foto hoch, schreibe eine persönliche Nachricht und
                  wähle einen Empfänger aus.
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Postcards Grid or Empty State */}
        {postcards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postcards.map((card, idx) => (
              <div
                key={card.id}
                onClick={() => {
                  setSelectedPostcard(card);
                  setIsModalFlipped(false);
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#D9E4DD] bg-white/90 shadow-[0_14px_38px_rgba(14,75,64,0.08)] transition-all duration-300 hover:border-[#C99A3E]/40 hover:bg-white"
              >
                {/* Image Preview */}
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
                  <img
                    src={card.imageUrl}
                    alt="Postkarten Motiv"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute right-3 top-3 rounded border border-[#D9E4DD] bg-white/90 px-2 py-1 text-[10px] font-bold text-[#0E4B40]">
                    {card.createdAt}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="mb-1 truncate text-base font-bold text-[#0E4B40]">
                      {card.recipientName}
                    </h3>
                    <p className="truncate text-xs text-[#4A635C]">
                      {card.recipientAddress}, {card.recipientCity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0E4B40] transition-colors group-hover:text-[#C99A3E]">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Postkarte ansehen & umdrehen</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Placeholder – leerer Zustand */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#D9E4DD] bg-white/90 p-12 text-center shadow-[0_14px_38px_rgba(14,75,64,0.08)]">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E4F1E9]">
              <Mail className="w-8 h-8 text-[#0E4B40]" />
            </div>
            <h3 className="text-lg font-bold text-[#0E4B40]">
              Noch keine Postkarten
            </h3>
            <p className="max-w-sm text-sm text-[#4A635C]">
              Klicke auf „Neue Postkarte erstellen", um deine erste Postkarte zu
              gestalten und zu verschicken.
            </p>

            <div className="mt-4 flex gap-3 flex-wrap justify-center">
              <Link href="/editor" className="flex cursor-pointer items-center gap-2 rounded-full border border-[#D9E4DD] bg-white px-4 py-2 text-sm text-[#0E4B40] transition-all hover:border-[#C99A3E]/35 hover:text-[#C99A3E]">
                <Camera className="w-4 h-4" />
                <span>Foto hochladen</span>
              </Link>
              <Link href="/editor" className="flex cursor-pointer items-center gap-2 rounded-full border border-[#D9E4DD] bg-white px-4 py-2 text-sm text-[#0E4B40] transition-all hover:border-[#C99A3E]/35 hover:text-[#C99A3E]">
                <Mail className="w-4 h-4" />
                <span>Empfänger wählen</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL WITH 3D FLIP */}
      {selectedPostcard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setSelectedPostcard(null)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Schließen"
          />

          <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-[#D9E4DD] bg-white p-6 shadow-2xl md:p-8">
              {/* Close Button */}
              <button
                onClick={() => setSelectedPostcard(null)}
                className="absolute right-4 top-4 rounded-xl p-2 text-[#4A635C] transition-all hover:bg-[#E4F1E9] hover:text-[#0E4B40]"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-center text-xl font-black text-[#0E4B40] md:text-2xl">
                Postkarte an {selectedPostcard.recipientName}
              </h2>

              {/* 3D Postcard Container */}
              <div style={cardStyle} className="relative my-4 aspect-[3/2] w-full max-w-lg rounded-2xl">
                <div style={innerCardStyle} className="relative h-full w-full transition-transform duration-500 ease-in-out">
                  {/* FRONT SIDE */}
                  <div
                    style={faceStyle}
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl"
                  >
                    <img
                      src={selectedPostcard.imageUrl}
                      alt="Postkarte Vorderseite"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* BACK SIDE */}
                  <div
                    style={backFaceStyle}
                    className="absolute inset-0 h-full w-full flex-row overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-2xl"
                  >
                    {/* Left Half: Message */}
                    <div className="w-1/2 pr-4 border-r border-dashed border-gray-300 flex flex-col justify-between h-full font-serif text-sm leading-relaxed overflow-hidden">
                      <div className="break-words whitespace-pre-wrap flex-1 text-slate-700 text-xs">
                        {selectedPostcard.message}
                      </div>
                    </div>

                    {/* Right Half: Stamp and Recipient */}
                    <div className="w-1/2 pl-4 flex flex-col justify-between h-full">
                      {/* Stamp */}
                      <div className="flex justify-end">
                        <div className="flex h-16 w-12 flex-col items-center justify-center rounded border border-dashed border-teal-500/60 bg-emerald-50 p-1 text-[8px] font-bold text-teal-700 select-none">
                          <Mail className="mb-1 h-6 w-6 text-teal-700" />
                          FamilyPost
                        </div>
                      </div>

                      {/* Recipient Lines */}
                      <div className="space-y-2 font-serif text-[11px] text-slate-700 mt-2">
                        <div className="border-b border-gray-300 pb-1 min-h-[20px] font-bold">
                          {selectedPostcard.recipientName}
                        </div>
                        <div className="border-b border-gray-300 pb-1 min-h-[20px]">
                          {selectedPostcard.recipientAddress}
                        </div>
                        <div className="border-b border-gray-300 pb-1 min-h-[20px]">
                          {selectedPostcard.recipientCity}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls inside Modal */}
              <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setIsModalFlipped(!isModalFlipped)}
                  className="flex items-center gap-2 rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-teal-800"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Karte umdrehen ({isModalFlipped ? "Vorderseite" : "Rückseite"})</span>
                </button>
                <Link href={`/shipping-status/${selectedPostcard.id}`} className="cursor-pointer">
                  <a className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition-all hover:border-teal-700/35 hover:text-teal-800">
                    <span>🚚 Sendungsstatus prüfen</span>
                  </a>
                </Link>
              </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Schließen"
          />

          <div className="relative z-10 flex w-full max-w-md flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
              {/* Close Button */}
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-slate-950 md:text-2xl">
                  <Settings className="w-6 h-6 text-teal-700" />
                  <span>Mein Profil & Einstellungen</span>
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  Verwalte deine persönlichen Daten und Zahlungsinformationen.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Vollständiger Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Max Mustermann"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>

                {/* E-Mail */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    defaultValue="max@beispiel.de"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
                  />
                </div>

                {/* Zahlungsmethode verwalten */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-slate-700">
                    Zahlungsmethode verwalten
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-10 items-center justify-center rounded bg-slate-800 text-[10px] font-bold tracking-wider text-white">
                        VISA
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">Visa endend auf •••• 4242</p>
                        <p className="text-[10px] text-slate-500">Gültig bis 12/28</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => toast.info("Zahlungsmethode ändern wird simuliert.")}
                      className="text-xs font-semibold text-teal-800 transition-colors hover:text-teal-700"
                    >
                      Ändern
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition-all hover:border-slate-400"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Einstellungen erfolgreich gespeichert!");
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 rounded-xl bg-teal-700 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-teal-800"
                >
                  Speichern
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
