import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Camera, Mail, RotateCw, Send, Upload, Image as ImageIcon } from "lucide-react";

interface Postcard {
  id: string;
  imageUrl: string;
  message: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  createdAt: string;
}

const TEMPLATE_IMAGES = [
  {
    id: "beach",
    name: "Sandstrand",
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "mountains",
    name: "Berglandschaft",
    url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "garden",
    name: "Blumenmeer",
    url: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "city",
    name: "Stadtreise",
    url: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=800&q=80",
  },
];

export default function Editor() {
  const [, navigate] = useLocation();
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "text">("image");
  const [promoCode, setPromoCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
        toast.success("Foto erfolgreich hochgeladen!");
        setIsFlipped(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectTemplate = (url: string) => {
    setImageUrl(url);
    toast.success("Vorlage ausgewählt!");
    setIsFlipped(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl) {
      toast.error("Bitte wähle zuerst ein Foto aus!");
      setActiveTab("image");
      return;
    }
    if (!message) {
      toast.error("Bitte gib eine Nachricht ein!");
      setActiveTab("text");
      return;
    }
    if (!recipientName || !recipientAddress || !recipientCity) {
      toast.error("Bitte fülle die Empfänger-Daten vollständig aus!");
      setActiveTab("text");
      return;
    }

    setIsLoading(true);

    try {
      // Kurze Vorbereitungssimulation
      await new Promise((resolve) => setTimeout(resolve, 800));

      const isPromoPaid = promoCode === "ELTERN-PREMIUM-2026";

      const newPostcard: Postcard & { isPromoPaid?: boolean } = {
        id: Math.random().toString(36).substring(2, 9),
        imageUrl,
        message,
        recipientName,
        recipientAddress,
        recipientCity,
        isPromoPaid,
        createdAt: new Date().toLocaleDateString("de-DE", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      };

      const existing = localStorage.getItem("family_postcards");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(newPostcard);
      localStorage.setItem("family_postcards", JSON.stringify(list));

      if (isPromoPaid) {
        toast.success("Admin-Gutschein aktiv! Stripe wurde übersprungen.");
      } else {
        toast.success("Zahlung erfolgreich! Sendung wird verfolgt...");
      }
      navigate(`/shipping-status/${newPostcard.id}`);
    } catch (err) {
      toast.error("Übertragung fehlgeschlagen. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3D Card Rotation Styles
  const cardStyle = {
    perspective: "1200px",
  };

  const innerCardStyle = {
    transformStyle: "preserve-3d" as const,
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
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
      {/* Background elements */}
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
          <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors cursor-pointer text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Dashboard</span>
          </Link>
          <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
            Postkarten-Designer
          </span>
        </div>
      </motion.nav>

      {/* Editor Content */}
      <div className="relative z-10 flex-1 max-w-6xl mx-auto w-full px-4 py-8 flex flex-col lg:flex-row gap-8 items-center lg:items-stretch justify-center">
        {/* Left Column: 3D Postcard Preview */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] w-full">
          {/* Postcard Container */}
          <div style={cardStyle} className="w-full max-w-lg aspect-[3/2] relative rounded-2xl">
            <motion.div
              style={innerCardStyle}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="w-full h-full relative"
            >
              {/* FRONT SIDE */}
              <div
                style={faceStyle}
                className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900/60 flex items-center justify-center"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Postkarte Vorderseite" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-center p-6 text-gray-400">
                    <Camera className="w-16 h-16 mb-4 text-violet-400/80" />
                    <h3 className="text-lg font-bold text-white mb-2">Vorderseite</h3>
                    <p className="text-sm max-w-xs">
                      Lade links ein Bild hoch oder wähle eines unserer schönen Naturmotive.
                    </p>
                  </div>
                )}
              </div>

              {/* BACK SIDE */}
              <div
                style={backFaceStyle}
                className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-white text-slate-800 p-6 flex flex-row"
              >
                {/* Left Half: Message */}
                <div className="w-1/2 pr-4 border-r border-dashed border-gray-300 flex flex-col justify-between h-full font-serif text-sm leading-relaxed overflow-hidden">
                  <div className="break-words whitespace-pre-wrap flex-1 text-slate-700 text-xs">
                    {message || (
                      <span className="text-gray-400 italic">Deine Nachricht wird hier angezeigt...</span>
                    )}
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
                      {recipientName || <span className="text-gray-400 font-normal">Name des Empfängers</span>}
                    </div>
                    <div className="border-b border-gray-300 pb-1 min-h-[20px]">
                      {recipientAddress || <span className="text-gray-400">Straße & Hausnummer</span>}
                    </div>
                    <div className="border-b border-gray-300 pb-1 min-h-[20px]">
                      {recipientCity || <span className="text-gray-400">PLZ & Ort</span>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Controls below card */}
          <div className="mt-6 flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-600/30"
            >
              <RotateCw className="w-4 h-4" />
              <span>Karte umdrehen ({isFlipped ? "Vorderseite" : "Rückseite"})</span>
            </motion.button>
          </div>
        </div>

        {/* Right Column: Editor Sidebar */}
        <div className="w-full lg:w-96 flex flex-col">
          <div className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 shadow-2xl flex flex-col h-full">
            {/* Tabs Header */}
            <div className="flex bg-slate-950/50 p-1 rounded-xl mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("image");
                  setIsFlipped(false);
                }}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "image"
                    ? "bg-violet-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                1. Bild wählen
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("text");
                  setIsFlipped(true);
                }}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "text"
                    ? "bg-violet-600 text-white shadow"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                2. Gruß & Adresse
              </button>
            </div>

            {/* TAB CONTENT: IMAGE SELECT / UPLOAD */}
            {activeTab === "image" && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-white font-bold text-base">Bild hochladen</h3>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-6 border-2 border-dashed border-slate-700 hover:border-violet-500 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-slate-800/20 transition-all cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 text-gray-500 group-hover:text-violet-400 transition-colors" />
                    <span className="text-gray-300 text-sm font-semibold">Eigenes Foto hochladen</span>
                    <span className="text-gray-500 text-xs">Unterstützt JPG, PNG</span>
                  </motion.button>

                  <div className="pt-2">
                    <h3 className="text-white font-bold text-base mb-3">Oder Vorlage wählen</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {TEMPLATE_IMAGES.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => selectTemplate(img.url)}
                          className={`group relative aspect-[3/2] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            imageUrl === img.url ? "border-violet-500 scale-[1.02]" : "border-slate-800 hover:border-slate-600"
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 p-1.5 text-center">
                            <span className="text-[10px] font-bold text-white">{img.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!imageUrl) {
                        toast.error("Bitte wähle oder lade zuerst ein Bild hoch.");
                        return;
                      }
                      setActiveTab("text");
                      setIsFlipped(true);
                    }}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/30"
                  >
                    <span>Weiter zu Gruß & Adresse</span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* TAB CONTENT: TEXT & RECIPIENT */}
            {activeTab === "text" && (
              <form onSubmit={handleSend} className="space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Grußtext */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-300 mb-1.5">
                      Grußtext (Rückseite)
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      maxLength={280}
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        setIsFlipped(true);
                      }}
                      placeholder="Liebe Omi, liebe Grüße aus dem wunderschönen Urlaub! Wir vermissen dich..."
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm resize-none"
                    />
                    <div className="flex justify-end mt-1 text-[10px] text-gray-500">
                      {message.length} / 280 Zeichen
                    </div>
                  </div>

                  {/* Empfänger Name */}
                  <div>
                    <label htmlFor="rec-name" className="block text-sm font-semibold text-gray-300 mb-1.5">
                      Name des Empfängers
                    </label>
                    <input
                      id="rec-name"
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => {
                        setRecipientName(e.target.value);
                        setIsFlipped(true);
                      }}
                      placeholder="Oma Gertrude Mustermann"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                  </div>

                  {/* Empfänger Adresse */}
                  <div>
                    <label htmlFor="rec-addr" className="block text-sm font-semibold text-gray-300 mb-1.5">
                      Straße & Hausnummer
                    </label>
                    <input
                      id="rec-addr"
                      type="text"
                      required
                      value={recipientAddress}
                      onChange={(e) => {
                        setRecipientAddress(e.target.value);
                        setIsFlipped(true);
                      }}
                      placeholder="Blumenweg 12"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                  </div>

                  {/* Empfänger PLZ / Ort */}
                  <div>
                    <label htmlFor="rec-city" className="block text-sm font-semibold text-gray-300 mb-1.5">
                      PLZ & Ort
                    </label>
                    <input
                      id="rec-city"
                      type="text"
                      required
                      value={recipientCity}
                      onChange={(e) => {
                        setRecipientCity(e.target.value);
                        setIsFlipped(true);
                      }}
                      placeholder="12345 Schöningen"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                  </div>

                  {/* Gutscheincode */}
                  <div>
                    <label htmlFor="promo-code" className="block text-sm font-semibold text-gray-300 mb-1.5">
                      Gutschein- / Admin-Code (optional)
                    </label>
                    <input
                      id="promo-code"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="z.B. ELTERN-PREMIUM-2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-sm"
                    />
                    {promoCode === "ELTERN-PREMIUM-2026" && (
                      <p className="text-xs text-green-400 mt-1 font-semibold flex items-center gap-1 animate-pulse">
                        <span>✓ Code aktiv: 100% Rabatt (Stripe übersprungen)</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("image");
                      setIsFlipped(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white font-semibold text-sm transition-all"
                  >
                    Zurück
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
                  >
                    {isLoading ? (
                      <span>Druck wird gestartet...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Postkarte versenden</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
