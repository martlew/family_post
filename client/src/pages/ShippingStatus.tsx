import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation, useParams } from "wouter";
import { ArrowLeft, Check, ClipboardList, Loader2, Mail, MapPin, Printer, Truck } from "lucide-react";
import { buildApiUrl, getAuthSession } from "@/lib/auth";

interface Postcard {
  id: string;
  imageUrl: string;
  message: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  createdAt: string;
}

export default function ShippingStatus() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!getAuthSession()) {
      navigate("/login");
      return;
    }

    const saved = localStorage.getItem("family_postcards");
    if (saved && params.id) {
      try {
        const list: Postcard[] = JSON.parse(saved);
        const found = list.find((item) => item.id === params.id);
        if (found) {
          setPostcard(found);
          return;
        }
      } catch (e) {
        console.error("Fehler beim Laden der Postkarte für Status:", e);
      }
    }

    if (params.id) {
      void fetch(buildApiUrl(`/api/postcards/${params.id}`))
        .then((response) => response.json().then((data) => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
          if (!ok || !data?.postcard) {
            return;
          }

          const postcardData = data.postcard as Postcard;
          setPostcard({
            id: postcardData.id,
            imageUrl: postcardData.imageUrl,
            message: postcardData.message,
            recipientName: postcardData.recipientName,
            recipientAddress: postcardData.recipientAddress,
            recipientCity: postcardData.recipientCity,
            createdAt: postcardData.createdAt,
          });
        })
        .catch((error) => {
          console.error("Fehler beim Laden der Postkarte vom Backend:", error);
        });
    }
  }, [navigate, params.id]);

  // Simulation der Liefer-Phasen
  useEffect(() => {
    if (currentStep < 4) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const steps = [
    {
      title: "Druckauftrag vorbereiten",
      description: "Postkarte wird im optimalen Format für den Druck gerendert.",
      icon: ClipboardList,
    },
    {
      title: "Postkarte wird gedruckt",
      description: "Hochauflösender Druck auf 300g Premium-Postkartenkarton.",
      icon: Printer,
    },
    {
      title: "An Postdienstleister übergeben",
      description: "Die Postkarte wurde frankiert und in das Logistiknetzwerk eingespeist.",
      icon: Truck,
      badge: "Versendet",
    },
    {
      title: "In der Zustellung",
      description: "Der Zusteller transportiert die Postkarte zum Empfänger vor Ort.",
      icon: Mail,
    },
    {
      title: "Erfolgreich im Briefkasten eingeworfen",
      description: "Zugestellt an die angegebene Adresse.",
      icon: MapPin,
      badge: "Zugestellt",
    },
  ];

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-[#F7F3EA] text-[#0E4B40]">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[#4A635C] transition-colors cursor-pointer hover:text-[#0E4B40]">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xl font-bold text-[#0E4B40]">
            Sendungsstatus
          </span>
        </div>
      </motion.nav>

      {/* Main Layout */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-8 px-4 py-8 md:flex-row md:py-12">
        {/* Left Column: Postcard preview */}
        {postcard && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex w-full flex-col items-center gap-4 md:w-80"
          >
            <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 bg-white/90">
              <img
                src={postcard.imageUrl}
                alt="Versendetes Motiv"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Empfänger</p>
              <h3 className="text-slate-900 font-bold text-lg">{postcard.recipientName}</h3>
              <p className="text-slate-600 text-sm">{postcard.recipientAddress}</p>
              <p className="text-slate-600 text-sm">{postcard.recipientCity}</p>
            </div>
          </motion.div>
        )}

        {/* Right Column: Shipping Status Timeline */}
        <div className="w-full flex-1 max-w-lg">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.12)] backdrop-blur-sm md:p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-teal-700" />
              <span>Zustellungsverlauf</span>
            </h2>

            {/* Timeline */}
            <div className="relative border-l-2 border-slate-200 ml-4 pl-8 space-y-8 py-2">
              {steps.map((step, idx) => {
                const isCompleted = currentStep > idx;
                const isActive = currentStep === idx;
                const StepIcon = step.icon;

                // Spezielle Logik für "Versendet" Badge (Schritt 2 / Index 2)
                const showVersendetBadge = step.badge === "Versendet" && currentStep >= 2;
                // Spezielle Logik für "Zugestellt" Badge (Schritt 4 / Index 4)
                const showZugestelltBadge = step.badge === "Zugestellt" && currentStep >= 4;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.1 }}
                    className={`relative ${isCompleted || isActive ? "opacity-100" : "opacity-40"}`}
                  >
                    {/* Circle Indicator on line */}
                    <div className="absolute -left-[43px] top-1 flex items-center justify-center">
                      <motion.div
                        animate={isActive ? { scale: [1, 1.2, 1], boxShadow: "0 0 10px rgba(15, 118, 110, 0.45)" } : {}}
                        transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-teal-700 border-teal-700 text-white"
                            : isActive
                            ? "bg-white border-teal-700 text-teal-700"
                            : "bg-slate-100 border-slate-300 text-slate-500"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isActive ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </motion.div>
                    </div>

                    {/* Step Content */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <StepIcon className={`w-4 h-4 ${isActive ? "text-teal-700 animate-pulse" : isCompleted ? "text-teal-700" : "text-slate-500"}`} />
                          <h3 className={`font-bold text-sm ${isActive ? "text-teal-700" : isCompleted ? "text-slate-900" : "text-slate-500"}`}>
                            {step.title}
                          </h3>
                        </div>

                        {/* Versendet-Badge mit grünem Lämpchen */}
                        {step.badge === "Versendet" && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className={`w-2 h-2 rounded-full ${showVersendetBadge ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-300"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${showVersendetBadge ? "text-green-700" : "text-slate-500"}`}>
                              {step.badge}
                            </span>
                          </div>
                        )}

                        {/* Zugestellt-Badge mit grünem Lämpchen */}
                        {step.badge === "Zugestellt" && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className={`w-2 h-2 rounded-full ${showZugestelltBadge ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-300"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${showZugestelltBadge ? "text-green-700" : "text-slate-500"}`}>
                              {step.badge}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed max-w-sm">
                        {step.description}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Success Section once step 4 is reached */}
            <AnimatePresence>
              {currentStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                  className="mt-8 pt-6 border-t border-slate-200 flex flex-col items-center gap-4 text-center overflow-hidden"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center text-green-700 shadow-lg shadow-green-500/10"
                  >
                    <Check className="w-8 h-8" />
                  </motion.div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base mb-1">
                      Postkarte erfolgreich zugestellt!
                    </h3>
                    <p className="text-slate-600 text-xs max-w-xs">
                      Deine Postkarte ist auf dem Weg in den echten Briefkasten.
                    </p>
                  </div>
                  <Link href="/dashboard" className="w-full cursor-pointer">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all text-center"
                    >
                      Zurück zu meinen Postkarten
                    </motion.div>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
