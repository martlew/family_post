import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ArrowLeft, Camera, Mail, RotateCw, Send, Upload, Image as ImageIcon } from "lucide-react";
import { getAuthSession } from "@/lib/auth";

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
  const [recipientPostalCode, setRecipientPostalCode] = useState("");
  const [recipientCity, setRecipientCity] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [isPostalLookupLoading, setIsPostalLookupLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"image" | "text">("image");
  const [promoCode, setPromoCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getAuthSession()) {
      navigate("/login");
    }
  }, [navigate]);

  const floatingCards = [
    { left: "8%", top: "20%", duration: 26, delay: 0 },
    { left: "20%", top: "76%", duration: 30, delay: 2 },
    { left: "40%", top: "18%", duration: 24, delay: 1 },
    { left: "58%", top: "76%", duration: 29, delay: 2.5 },
    { left: "74%", top: "24%", duration: 25, delay: 0.5 },
    { left: "88%", top: "68%", duration: 27, delay: 1.5 },
  ];

  const handlePostalLookup = async (postalCode: string) => {
    if (!/^\d{5}$/.test(postalCode)) {
      setCitySuggestions([]);
      return;
    }

    try {
      setIsPostalLookupLoading(true);
      const response = await fetch(`https://api.zippopotam.us/de/${postalCode}`);
      if (!response.ok) {
        setCitySuggestions([]);
        return;
      }

      const data = await response.json();
      const suggestions = Array.from(
        new Set(
          (data?.places ?? [])
            .map((place: { "place name"?: string; state?: string }) => {
              const placeName = place["place name"];
              if (!placeName) return "";
              return place.state ? `${placeName} (${place.state})` : placeName;
            })
            .filter(Boolean),
        ),
      );

      setCitySuggestions(suggestions);
      if (!recipientCity && suggestions.length === 1) {
        setRecipientCity(suggestions[0]);
      }
    } catch {
      setCitySuggestions([]);
    } finally {
      setIsPostalLookupLoading(false);
    }
  };

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
    if (!recipientName || !recipientAddress || !recipientPostalCode || !recipientCity) {
      toast.error("Bitte fülle die Empfänger-Daten vollständig aus!");
      setActiveTab("text");
      return;
    }

    if (!/^\d{5}$/.test(recipientPostalCode)) {
      toast.error("Bitte gib eine gültige 5-stellige PLZ ein.");
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
        recipientCity: `${recipientPostalCode} ${recipientCity}`,
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
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_30%),linear-gradient(180deg,#f7f3ec_0%,#f3efe7_100%)] text-slate-900">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-25 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl opacity-25 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        {floatingCards.map((card, index) => (
          <motion.div
            key={`${card.left}-${card.top}`}
            className="absolute h-8 w-12 rounded-md border border-emerald-200/80 bg-white/75 shadow-[0_10px_28px_rgba(15,118,110,0.12)]"
            style={{ left: card.left, top: card.top }}
            animate={{
              y: [0, -20, 0],
              x: [0, index % 2 === 0 ? 9 : -9, 0],
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
          <Link href="/dashboard" className="flex items-center gap-2 text-slate-600 hover:text-teal-800 transition-colors cursor-pointer text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück zum Dashboard</span>
          </Link>
          <span className="text-xl font-bold text-slate-950">
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
                className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white/90 flex items-center justify-center"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt="Postkarte Vorderseite" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center text-center p-6 text-slate-600">
                    <Camera className="w-16 h-16 mb-4 text-teal-700/80" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Vorderseite</h3>
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
                    <div className="w-12 h-16 border border-dashed border-teal-500/70 rounded bg-emerald-50 flex flex-col items-center justify-center p-1 text-[8px] text-teal-700 font-bold select-none">
                      <Mail className="w-6 h-6 mb-1 text-teal-700" />
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
                      {recipientPostalCode || recipientCity ? (
                        `${recipientPostalCode} ${recipientCity}`.trim()
                      ) : (
                        <span className="text-gray-400">PLZ & Ort</span>
                      )}
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
              className="px-5 py-2.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
            >
              <RotateCw className="w-4 h-4" />
              <span>Karte umdrehen ({isFlipped ? "Vorderseite" : "Rückseite"})</span>
            </motion.button>
          </div>
        </div>

        {/* Right Column: Editor Sidebar */}
        <div className="w-full lg:w-96 flex flex-col">
          <div className="p-6 rounded-2xl bg-white/90 backdrop-blur-sm border border-slate-200 shadow-[0_22px_60px_rgba(15,23,42,0.12)] flex flex-col h-full">
            {/* Tabs Header */}
            <div className="mb-6 flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("image");
                  setIsFlipped(false);
                }}
                className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all ${
                  activeTab === "image"
                    ? "bg-teal-700 text-white shadow"
                    : "text-slate-500 hover:text-slate-700"
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
                    ? "bg-teal-700 text-white shadow"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                2. Gruß & Adresse
              </button>
            </div>

            {/* TAB CONTENT: IMAGE SELECT / UPLOAD */}
            {activeTab === "image" && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-slate-900 font-bold text-base">Bild hochladen</h3>
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
                    className="w-full py-6 border-2 border-dashed border-slate-300 hover:border-teal-700/40 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-emerald-50/40 transition-all cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-teal-700 transition-colors" />
                    <span className="text-slate-700 text-sm font-semibold">Eigenes Foto hochladen</span>
                    <span className="text-slate-500 text-xs">Unterstützt JPG, PNG</span>
                  </motion.button>

                  <div className="pt-2">
                    <h3 className="text-slate-900 font-bold text-base mb-3">Oder Vorlage wählen</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {TEMPLATE_IMAGES.map((img) => (
                        <div
                          key={img.id}
                          onClick={() => selectTemplate(img.url)}
                          className={`group relative aspect-[3/2] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                            imageUrl === img.url ? "border-teal-700 scale-[1.02]" : "border-slate-300 hover:border-slate-400"
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute inset-x-0 bottom-0 bg-slate-950/70 p-1.5 text-center">
                            <span className="text-[10px] font-bold text-white">{img.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200">
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
                    className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
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
                    <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm resize-none"
                    />
                    <div className="flex justify-end mt-1 text-[10px] text-slate-500">
                      {message.length} / 280 Zeichen
                    </div>
                  </div>

                  {/* Empfänger Name */}
                  <div>
                    <label htmlFor="rec-name" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm"
                    />
                  </div>

                  {/* Empfänger Adresse */}
                  <div>
                    <label htmlFor="rec-addr" className="block text-sm font-semibold text-slate-700 mb-1.5">
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
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm"
                    />
                  </div>

                  {/* Empfänger PLZ */}
                  <div>
                    <label htmlFor="rec-postal" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      PLZ
                    </label>
                    <input
                      id="rec-postal"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{5}"
                      maxLength={5}
                      required
                      value={recipientPostalCode}
                      onChange={(e) => {
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 5);
                        setRecipientPostalCode(digitsOnly);
                        setIsFlipped(true);
                        void handlePostalLookup(digitsOnly);
                      }}
                      placeholder="12345"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm"
                    />
                    <div className="mt-1 text-[10px] text-slate-500">
                      {isPostalLookupLoading ? "PLZ wird geprüft..." : "5-stellige deutsche Postleitzahl"}
                    </div>
                  </div>

                  {/* Empfänger Ort */}
                  <div>
                    <label htmlFor="rec-city" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Ort
                    </label>
                    <input
                      id="rec-city"
                      type="text"
                      required
                      list="city-suggestions"
                      value={recipientCity}
                      onChange={(e) => {
                        setRecipientCity(e.target.value);
                        setIsFlipped(true);
                      }}
                      placeholder="z. B. Schöningen"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm"
                    />
                    <datalist id="city-suggestions">
                      {citySuggestions.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>

                  {/* Gutscheincode */}
                  <div>
                    <label htmlFor="promo-code" className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Gutschein- / Admin-Code (optional)
                    </label>
                    <input
                      id="promo-code"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="z.B. ELTERN-PREMIUM-2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all text-sm"
                    />
                    {promoCode === "ELTERN-PREMIUM-2026" && (
                      <p className="text-xs text-emerald-700 mt-1 font-semibold flex items-center gap-1 animate-pulse">
                        <span>✓ Code aktiv: 100% Rabatt (Stripe übersprungen)</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-200 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("image");
                      setIsFlipped(false);
                    }}
                    className="px-4 py-3 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-sm transition-all"
                  >
                    Zurück
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    className="flex-1 py-3 rounded-xl bg-teal-700 text-white font-bold text-sm hover:bg-teal-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
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
