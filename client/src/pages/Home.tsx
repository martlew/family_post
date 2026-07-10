import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mail, Pencil, Camera } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

/**
 * FamilyPost Landing Page - Modern Glasmorphism Design
 * Design Philosophy: "Kinetic Nostalgia" - Y2K meets modern glasmorphism
 * 
 * Key Design Elements:
 * - Warm coral (#ff845d) primary color with gradient accents
 * - Glasmorphic cards with blur and transparency
 * - Floating postcard animations
 * - Smooth scroll-triggered animations
 * - Asymmetric, organic layout
 */

// Floating postcard component
const FloatingPostcard = ({ 
  delay, 
  duration, 
  x, 
  y,
  rotation,
  image,
  startX = 0
}: { 
  delay: number; 
  duration: number; 
  x: number;
  y: number;
  rotation: number;
  image: string;
  startX?: number;
}) => {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{ opacity: 0, y: -150, x: startX, rotate: rotation, scale: 0.8 }}
      animate={{ 
        opacity: [0, 0.8, 0.9, 0],
        y: [y - 150, y + 250],
        x: [startX, startX + x],
        rotate: [rotation, rotation + 25],
        scale: [0.8, 1, 1, 0.7]
      }}
      transition={{
        duration,
        delay,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2
      }}
    >
      <div className="w-28 h-36 md:w-32 md:h-40 rounded-lg shadow-2xl overflow-hidden transform hover:shadow-orange-500/50 transition-shadow">
        <img 
          src={image} 
          alt="Flying postcard" 
          className="w-full h-full object-cover"
        />
      </div>
    </motion.div>
  );
};

// Animated badge component
const AnimatedBadge = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/40"
    >
      <span className="text-sm font-semibold text-orange-400">
        ⭐ Neu: FamilyPost MVP – jetzt in Beta
      </span>
    </motion.div>
  );
};

// Glasmorphic card component (reduced glass effect to match app)
const GlassCard = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true, margin: "-100px" }}
      className="p-6 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 shadow-xl hover:bg-slate-900/70 transition-all duration-300"
    >
      {children}
    </motion.div>
  );
};

// Step item component
const StepItem = ({ 
  icon: Icon, 
  title, 
  description,
  delay 
}: { 
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  delay: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="flex gap-4"
    >
      <div className="flex-shrink-0">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-lg">
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-gray-300 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Floating postcards background animation */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
        <FloatingPostcard 
          delay={0} 
          duration={8} 
          x={100}
          y={300}
          rotation={-15}
          startX={-50}
          image="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/postcard-flying-1-mdcdTFNSk3Np5AWeQsFVHG.webp"
        />
        <FloatingPostcard 
          delay={2} 
          duration={10} 
          x={-150}
          y={400}
          rotation={25}
          startX={100}
          image="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/postcard-flying-2-NdgsktMxx87jYTKNuqUTAG.webp"
        />
        <FloatingPostcard 
          delay={4} 
          duration={9} 
          x={120}
          y={500}
          rotation={-20}
          startX={-80}
          image="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/postcard-flying-1-mdcdTFNSk3Np5AWeQsFVHG.webp"
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <motion.nav
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="sticky top-0 z-50 backdrop-blur-sm bg-slate-950/80 border-b border-slate-800"
        >
          <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/familypost-logo-isbKPGHDYE6gpsAJ5vRCgv.webp"
                alt="FamilyPost Logo"
                className="w-8 h-8"
              />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
                FamilyPost
              </span>
            </div>
            {/* FIX: internes Routing via wouter statt externer 404-URL */}
            <Link href="/login">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2 rounded-full bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-all duration-300 cursor-pointer"
              >
                Anmelden
              </motion.a>
            </Link>
          </div>
        </motion.nav>

        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center justify-center px-4 py-20">
          {/* Hero background image */}
          <div 
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/hero-gradient-bg-KJkiHKwPCDUe2rS4hxJHrk.webp)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `translateY(${scrollY * 0.5}px)`
            }}
          />
          
          <div className="relative z-10 max-w-3xl text-center">
            <AnimatedBadge />
            
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight"
            >
              Oma hat kein <br />
              <span className="bg-gradient-to-r from-orange-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Smartphone.
              </span>
              <br />
              Aber einen Briefkasten.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-6 text-lg md:text-xl text-gray-300 leading-relaxed"
            >
              Verwandle deine Fotos in echte Postkarten und schicke sie direkt an Eltern und Großeltern. Wir drucken und versenden sie für dich.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              {/* Kostenlos starten → Registrierung */}
              <Link href="/register">
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="group px-8 py-4 rounded-xl bg-orange-500 text-white font-bold text-lg hover:bg-orange-600 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  Kostenlos starten
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </motion.a>
              </Link>
              <motion.a
                href="#how-it-works"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-xl bg-slate-800 border border-slate-600 text-white font-bold text-lg hover:bg-slate-700 transition-all duration-300"
              >
                Mehr erfahren
              </motion.a>
            </motion.div>
          </div>
        </section>

        {/* How it works section */}
        <section id="how-it-works" className="relative py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                So einfach funktioniert es
              </h2>
              <p className="text-gray-400 text-lg">
                Drei Schritte zu einer echten Postkarte im Briefkasten
              </p>
            </motion.div>

            <GlassCard>
              <div className="space-y-8">
                <StepItem
                  icon={Camera}
                  title="Foto hochladen"
                  description="Wähle einfach dein schönstes Urlaubsfoto aus oder lade dein ganz eigenes, selbst gestaltetes Postkarten-Design hoch."
                  delay={0}
                />
                <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                <StepItem
                  icon={Pencil}
                  title="Nachricht schreiben"
                  description="Füge optional einen kurzen Gruß hinzu – ganz persönlich, direkt aus dem Urlaub."
                  delay={0.1}
                />
                <div className="h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                <StepItem
                  icon={Mail}
                  title="Postkarte landet im Briefkasten"
                  description="Perfekt für Eltern und Großeltern ohne Smartphone oder Internet."
                  delay={0.2}
                />
              </div>
            </GlassCard>
          </div>
        </section>

        {/* Pricing section */}
        <section className="relative py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4">
                Unsere Tarife
              </h2>
              <p className="text-gray-400 text-lg">
                Finde das passende Paket für deine Urlaubsgrüße – ohne versteckte Kosten
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* Card 1: Einzelticket */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:border-violet-500/30 hover:shadow-violet-500/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-bold text-lg">Einzelticket</h3>
                    <p className="text-gray-400 text-xs mt-1">Für gelegentliche Urlaubsgrüße</p>
                  </div>
                  <div>
                    <span className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">3,99 €</span>
                    <span className="text-gray-500 text-sm"> / Karte</span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>1× Postkarte zum Sofort-Druck</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Weltweiter Premium-Versand</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>300g hochwertiger Druck</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link href="/register" className="inline-block w-full py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white font-bold text-sm text-center transition-all cursor-pointer">
                    Jetzt registrieren
                  </Link>
                </div>
              </motion.div>

              {/* Card 2: Family-Paket (Beliebt) */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-slate-900/80 backdrop-blur-sm border-2 border-violet-500/50 hover:border-violet-500 hover:shadow-violet-500/10 shadow-lg shadow-violet-500/5 transition-all duration-300 flex flex-col justify-between relative transform md:-translate-y-2"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-violet-600 border border-violet-400 text-[10px] font-black uppercase tracking-wider text-white">
                  Sehr beliebt
                </div>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-bold text-lg">Family-Paket</h3>
                    <p className="text-violet-400 text-xs mt-1 font-semibold">Für die ganze Familie</p>
                  </div>
                  <div>
                    <span className="text-4xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">14,99 €</span>
                    <span className="text-gray-400 text-xs block mt-1 font-medium">2,99 € pro Postkarte (25% Rabatt)</span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>5× Postkarten zum Sparpreis</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Weltweiter Premium-Versand</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Kein Ablaufdatum der Postkarten</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Gemeinsam nutzbar</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link href="/register" className="inline-block w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm text-center shadow-lg shadow-violet-600/30 transition-all cursor-pointer">
                    Jetzt sparen
                  </Link>
                </div>
              </motion.div>

              {/* Card 3: Vorteils-Paket */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:border-violet-500/30 hover:shadow-violet-500/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h3 className="text-white font-bold text-lg">Vorteils-Paket</h3>
                    <p className="text-gray-400 text-xs mt-1">Für Weltenbummler & Vielschreiber</p>
                  </div>
                  <div>
                    <span className="text-4xl font-black bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">24,99 €</span>
                    <span className="text-gray-400 text-xs block mt-1 font-medium">2,49 € pro Postkarte (37% Rabatt)</span>
                  </div>
                  <div className="h-px bg-slate-800" />
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>10× Postkarten zum Bestpreis</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Weltweiter Premium-Versand</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Kein Ablaufdatum der Postkarten</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span>Ideal für längere Reisen</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link href="/register" className="inline-block w-full py-3 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 text-white font-bold text-sm text-center transition-all cursor-pointer">
                    Jetzt registrieren
                  </Link>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="relative py-12 px-4 border-t border-white/10 backdrop-blur-xl"
        >
          <div className="max-w-6xl mx-auto text-center text-gray-400 text-sm">
            <p className="mb-4">&copy; 2026 FamilyPost | Eine Marke von foto-post-weltweit.de</p>
            <div className="flex justify-center gap-6">
              <a href="#" className="hover:text-white transition-colors">Impressum</a>
              <span>|</span>
              <a href="#" className="hover:text-white transition-colors">Datenschutz</a>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
}