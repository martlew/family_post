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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative flex flex-col">
      {/* Background – identisch mit Home.tsx */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/hero-gradient-bg-KJkiHKwPCDUe2rS4hxJHrk.webp)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 backdrop-blur-sm bg-slate-950/80 border-b border-slate-800"
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/familypost-logo-isbKPGHDYE6gpsAJ5vRCgv.webp"
              alt="FamilyPost Logo"
              className="w-8 h-8"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              FamilyPost
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800 transition-all"
              aria-label="Einstellungen"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
            <Link
              href="/login"
              className="px-4 py-2 rounded-full border border-slate-600 text-sm text-gray-300 hover:text-white hover:border-slate-400 transition-all cursor-pointer"
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
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            Meine Postkarten
          </h1>
          <p className="text-gray-400">
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
              className="w-full p-8 rounded-2xl bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30 hover:border-orange-500/60 transition-all duration-300 flex flex-col sm:flex-row items-center gap-6 text-left group"
            >
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  Neue Postkarte erstellen
                </h2>
                <p className="text-gray-400 text-sm">
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
                className="rounded-2xl overflow-hidden bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 hover:border-violet-500/50 hover:bg-slate-900/70 transition-all duration-300 shadow-xl cursor-pointer group flex flex-col"
              >
                {/* Image Preview */}
                <div className="aspect-[3/2] w-full overflow-hidden bg-slate-950 relative">
                  <img
                    src={card.imageUrl}
                    alt="Postkarten Motiv"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-slate-950/80 text-[10px] text-gray-400 font-bold border border-slate-800">
                    {card.createdAt}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div>
                    <h3 className="text-white font-bold text-base mb-1 truncate">
                      {card.recipientName}
                    </h3>
                    <p className="text-gray-400 text-xs truncate">
                      {card.recipientAddress}, {card.recipientCity}
                    </p>
                  </div>
                  <div className="text-xs text-violet-400 font-semibold group-hover:text-violet-300 transition-colors flex items-center gap-1.5">
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
            className="p-12 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 flex flex-col items-center justify-center text-center gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-2">
              <Mail className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-bold text-white">
              Noch keine Postkarten
            </h3>
            <p className="text-gray-400 text-sm max-w-sm">
              Klicke auf „Neue Postkarte erstellen", um deine erste Postkarte zu
              gestalten und zu verschicken.
            </p>

            <div className="mt-4 flex gap-3 flex-wrap justify-center">
              <Link href="/editor" className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 hover:border-slate-500 text-gray-400 hover:text-white text-sm transition-all cursor-pointer">
                <Camera className="w-4 h-4" />
                <span>Foto hochladen</span>
              </Link>
              <Link href="/editor" className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 hover:border-slate-500 text-gray-400 hover:text-white text-sm transition-all cursor-pointer">
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl z-10 flex flex-col items-center gap-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedPostcard(null)}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-xl md:text-2xl font-black text-white text-center">
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
                    className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-950"
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
                    className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-white text-slate-800 p-6 flex flex-row"
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
                        <div className="w-12 h-16 border border-dashed border-violet-400/80 rounded bg-violet-50/50 flex flex-col items-center justify-center p-1 text-[8px] text-violet-500 font-bold select-none">
                          <Mail className="w-6 h-6 mb-1 text-violet-400" />
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
                  className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/30"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Karte umdrehen ({isModalFlipped ? "Vorderseite" : "Rückseite"})</span>
                </motion.button>
                <Link href={`/shipping-status/${selectedPostcard.id}`} className="cursor-pointer">
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 font-semibold text-sm transition-all flex items-center gap-2 shadow-lg"
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900/90 border border-slate-700/60 rounded-3xl p-6 md:p-8 shadow-2xl z-10 flex flex-col gap-6"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white hover:bg-slate-800/50 transition-all"
                aria-label="Schließen"
              >
                <X className="w-6 h-6" />
              </button>

              <div>
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                  <Settings className="w-6 h-6 text-violet-400" />
                  <span>Mein Profil & Einstellungen</span>
                </h2>
                <p className="text-gray-400 text-xs mt-1">
                  Verwalte deine persönlichen Daten und Zahlungsinformationen.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Vollständiger Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Max Mustermann"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                  />
                </div>

                {/* E-Mail */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    defaultValue="max@beispiel.de"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                  />
                </div>

                {/* Zahlungsmethode verwalten */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Zahlungsmethode verwalten
                  </label>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-slate-800 rounded flex items-center justify-center text-[10px] text-white font-bold tracking-wider">
                        VISA
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Visa endend auf •••• 4242</p>
                        <p className="text-[10px] text-gray-500">Gültig bis 12/28</p>
                      </div>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => toast.info("Zahlungsmethode ändern wird simuliert.")}
                      className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
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
                  className="flex-1 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white font-semibold text-sm transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success("Einstellungen erfolgreich gespeichert!");
                    setIsSettingsOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/30"
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
