import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mail, Plus, Settings, X, RotateCw, CreditCard } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

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
  const [postcards, setPostcards] = useState<Postcard[]>([]);
  const [selectedPostcard, setSelectedPostcard] = useState<Postcard | null>(null);
  const [isModalFlipped, setIsModalFlipped] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const floatingCards = [
    { left: "6%", top: "22%", duration: 24, delay: 0 },
    { left: "18%", top: "72%", duration: 28, delay: 2 },
    { left: "34%", top: "18%", duration: 26, delay: 1 },
    { left: "52%", top: "78%", duration: 30, delay: 3 },
    { left: "68%", top: "24%", duration: 27, delay: 1.5 },
    { left: "82%", top: "68%", duration: 25, delay: 0.5 },
  ];

  useEffect(() => {
    const saved = localStorage.getItem("family_postcards");
    if (saved) {
      try {
        setPostcards(JSON.parse(saved));
      } catch (e) {
        console.error("Fehler beim Laden der Postkarten:", e);
      }
    }
  }, []);

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
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_30%),linear-gradient(180deg,#f7f3ec_0%,#f3efe7_100%)] text-slate-900">
      {/* Dashboard background with subtle floating postcards */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        {floatingCards.map((card, index) => (
          <motion.div
            key={`${card.left}-${card.top}`}
            className="absolute h-8 w-12 rounded-md border border-emerald-200/80 bg-white/75 shadow-[0_10px_28px_rgba(15,118,110,0.12)]"
            style={{ left: card.left, top: card.top }}
            animate={{
              y: [0, -20, 0],
              x: [0, index % 2 === 0 ? 10 : -10, 0],
              rotate: [-4, 3, -4],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: card.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: card.delay,
            }}
          >
            <div className="mx-1 mt-1 h-[2px] w-5 rounded bg-emerald-300/70" />
            <div className="mx-1 mt-1 h-[2px] w-8 rounded bg-emerald-200/70" />
          </motion.div>
        ))}
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/familypost-logo-isbKPGHDYE6gpsAJ5vRCgv.webp"
              alt="FamilyPost Logo"
              className="w-8 h-8"
            />
            <span className="text-xl font-bold text-slate-950">
              FamilyPost
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-xl p-2 text-slate-500 hover:bg-emerald-50 hover:text-teal-800 transition-all"
              aria-label="Einstellungen"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
            <Link
              href="/login"
              className="cursor-pointer rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-all hover:border-teal-700/40 hover:text-teal-800"
            >
              Abmelden
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <h1 className="mb-2 text-3xl font-black text-slate-950 md:text-4xl">
            Meine Postkarten
          </h1>
          <p className="text-slate-600">
            Erstelle und versende Postkarten direkt an deine Familie.
          </p>
        </motion.div>

        {/* CTA Card – Neue Postkarte */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-8"
        >
          <Link href="/editor" className="block w-full cursor-pointer">
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="group flex w-full flex-col items-center gap-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-8 text-left transition-all duration-300 hover:border-emerald-400 sm:flex-row"
            >
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-teal-700 shadow-lg shadow-emerald-900/20 transition-shadow group-hover:shadow-emerald-900/35">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="mb-1 text-xl font-bold text-slate-900">
                  Neue Postkarte erstellen
                </h2>
                <p className="text-sm text-slate-600">
                  Lade ein Foto hoch, schreibe eine persönliche Nachricht und
                  wähle einen Empfänger aus.
                </p>
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Postcards Grid or Empty State */}
        {postcards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {postcards.map((card, idx) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 + idx * 0.05 }}
                onClick={() => {
                  setSelectedPostcard(card);
                  setIsModalFlipped(false);
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-[0_14px_38px_rgba(15,23,42,0.10)] transition-all duration-300 hover:border-emerald-300 hover:bg-white"
              >
                {/* Image Preview */}
                <div className="relative aspect-[3/2] w-full overflow-hidden bg-slate-100">
                  <img
                    src={card.imageUrl}
                    alt="Postkarten Motiv"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute right-3 top-3 rounded border border-slate-200 bg-white/90 px-2 py-1 text-[10px] font-bold text-slate-600">
                    {card.createdAt}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="mb-1 truncate text-base font-bold text-slate-900">
                      {card.recipientName}
                    </h3>
                    <p className="truncate text-xs text-slate-500">
                      {card.recipientAddress}, {card.recipientCity}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 transition-colors group-hover:text-teal-700">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Postkarte ansehen & umdrehen</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Placeholder – leerer Zustand */
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white/90 p-12 text-center shadow-[0_14px_38px_rgba(15,23,42,0.10)]"
          >
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50">
              <Mail className="w-8 h-8 text-teal-700" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Noch keine Postkarten
            </h3>
            <p className="max-w-sm text-sm text-slate-600">
              Klicke auf „Neue Postkarte erstellen", um deine erste Postkarte zu
              gestalten und zu verschicken.
            </p>

            <div className="mt-4 flex gap-3 flex-wrap justify-center">
              <Link href="/editor" className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-all hover:border-teal-700/35 hover:text-teal-800">
                <Camera className="w-4 h-4" />
                <span>Foto hochladen</span>
              </Link>
              <Link href="/editor" className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition-all hover:border-teal-700/35 hover:text-teal-800">
                <Mail className="w-4 h-4" />
                <span>Empfänger wählen</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* DETAIL MODAL WITH 3D FLIP */}
      <AnimatePresence>
        {selectedPostcard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPostcard(null)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPostcard(null)}
                className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-center text-xl font-black text-slate-950 md:text-2xl">
                Postkarte an {selectedPostcard.recipientName}
              </h2>

              {/* 3D Postcard Container */}
              <div style={cardStyle} className="w-full max-w-lg aspect-[3/2] relative rounded-2xl my-4">
                <motion.div
                  style={innerCardStyle}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="w-full h-full relative"
                >
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
                </motion.div>
              </div>

              {/* Controls inside Modal */}
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsModalFlipped(!isModalFlipped)}
                  className="flex items-center gap-2 rounded-full bg-teal-700 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-teal-800"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Karte umdrehen ({isModalFlipped ? "Vorderseite" : "Rückseite"})</span>
                </motion.button>
                <Link href={`/shipping-status/${selectedPostcard.id}`} className="cursor-pointer">
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition-all hover:border-teal-700/35 hover:text-teal-800"
                  >
                    <span>🚚 Sendungsstatus prüfen</span>
                  </motion.a>
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative z-10 flex w-full max-w-md flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
