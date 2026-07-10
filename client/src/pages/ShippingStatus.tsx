import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useParams } from "wouter";
import { ArrowLeft, Check, ClipboardList, Loader2, Mail, MapPin, Printer, Truck } from "lucide-react";

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
  const [postcard, setPostcard] = useState<Postcard | null>(null);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("family_postcards");
    if (saved && params.id) {
      try {
        const list: Postcard[] = JSON.parse(saved);
        const found = list.find((item) => item.id === params.id);
        if (found) {
          setPostcard(found);
        }
      } catch (e) {
        console.error("Fehler beim Laden der Postkarte für Status:", e);
      }
    }
  }, [params.id]);

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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative flex flex-col">
      {/* Background-Design */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl opacity-20 animate-pulse"
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
          <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Sendungsstatus
          </span>
        </div>
      </motion.nav>

      {/* Main Layout */}
      <div className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-4 py-12 flex flex-col md:flex-row gap-8 items-center justify-center">
        {/* Left Column: Postcard preview */}
        {postcard && (
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full md:w-80 flex flex-col items-center gap-4"
          >
            <div className="w-full aspect-[3/2] rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900/60">
              <img
                src={postcard.imageUrl}
                alt="Versendetes Motiv"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Empfänger</p>
              <h3 className="text-white font-bold text-lg">{postcard.recipientName}</h3>
              <p className="text-gray-500 text-sm">{postcard.recipientAddress}</p>
              <p className="text-gray-500 text-sm">{postcard.recipientCity}</p>
            </div>
          </motion.div>
        )}

        {/* Right Column: Shipping Status Timeline */}
        <div className="flex-1 w-full max-w-lg">
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Truck className="w-5 h-5 text-violet-400" />
              <span>Zustellungsverlauf</span>
            </h2>

            {/* Timeline */}
            <div className="relative border-l-2 border-slate-800 ml-4 pl-8 space-y-8 py-2">
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
                        animate={
                          isActive
                            ? { scale: [1, 1.2, 1], shadow: "0 0 10px rgba(139, 92, 246, 0.5)" }
                            : {}
                        }
                        transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          isCompleted
                            ? "bg-violet-600 border-violet-600 text-white"
                            : isActive
                            ? "bg-slate-900 border-violet-500 text-violet-400"
                            : "bg-slate-950 border-slate-800 text-gray-600"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : isActive ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                        )}
                      </motion.div>
                    </div>

                    {/* Step Content */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <StepIcon className={`w-4 h-4 ${isActive ? "text-violet-400 animate-pulse" : isCompleted ? "text-violet-500" : "text-gray-600"}`} />
                          <h3 className={`font-bold text-sm ${isActive ? "text-violet-400" : isCompleted ? "text-white" : "text-gray-500"}`}>
                            {step.title}
                          </h3>
                        </div>

                        {/* Versendet-Badge mit grünem Lämpchen */}
                        {step.badge === "Versendet" && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className={`w-2 h-2 rounded-full ${showVersendetBadge ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-700"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${showVersendetBadge ? "text-green-400" : "text-slate-600"}`}>
                              {step.badge}
                            </span>
                          </div>
                        )}

                        {/* Zugestellt-Badge mit grünem Lämpchen */}
                        {step.badge === "Zugestellt" && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className={`w-2 h-2 rounded-full ${showZugestelltBadge ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-slate-700"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${showZugestelltBadge ? "text-green-400" : "text-slate-600"}`}>
                              {step.badge}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed max-w-sm">
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
                  className="mt-8 pt-6 border-t border-slate-800 flex flex-col items-center gap-4 text-center overflow-hidden"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-14 h-14 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 shadow-lg shadow-green-500/10"
                  >
                    <Check className="w-8 h-8" />
                  </motion.div>
                  <div>
                    <h3 className="text-white font-bold text-base mb-1">
                      Postkarte erfolgreich zugestellt!
                    </h3>
                    <p className="text-gray-400 text-xs max-w-xs">
                      Deine Postkarte ist auf dem Weg in den echten Briefkasten.
                    </p>
                  </div>
                  <Link href="/dashboard" className="w-full cursor-pointer">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold shadow-lg shadow-violet-600/30 transition-all text-center"
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
