import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

/**
 * FamilyPost Register Page
 * Matches the glassmorphism design of Login.tsx:
 * - Dark slate background with purple/violet gradient accents
 * - Glassmorphic card with blur and transparency
 * - Consistent typography, spacing, and Framer Motion patterns
 */

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // TODO: An eure echte Register-API anpassen
      // const res = await fetch("/api/auth/register", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ fullName, email, password }),
      // });
      // if (!res.ok) throw new Error("Registrierung fehlgeschlagen");

      // Simulierter Lade-Zustand (800ms), danach Weiterleitung zur Hauptseite
      await new Promise((resolve) => setTimeout(resolve, 800));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden relative flex flex-col">
      {/* Animated background elements – identisch mit Home.tsx */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl opacity-20 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        {/* Hero gradient overlay wie Home.tsx */}
        <div
          className="absolute inset-0 opacity-30"
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
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030113068/9BVyNnm67pq72smuxeHCsc/familypost-logo-isbKPGHDYE6gpsAJ5vRCgv.webp"
              alt="FamilyPost Logo"
              className="w-8 h-8"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              FamilyPost
            </span>
          </Link>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="p-8 rounded-2xl bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
                Konto erstellen
              </h1>
              <p className="text-gray-400 text-sm">
                Tritt FamilyPost bei und versende Postkarten an deine Familie
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/40 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Vollständiger Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-gray-300 mb-2"
                >
                  Vollständiger Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-300 mb-2"
                >
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-300 mb-2"
                >
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full group px-6 py-4 rounded-xl bg-violet-600 text-white font-bold text-lg hover:bg-violet-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Wird registriert…" : "Jetzt registrieren"}
                {!isLoading && (
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                )}
              </motion.button>
            </form>

            {/* Link zurück zum Login */}
            <div className="mt-6 text-center text-sm text-gray-400">
              Bereits ein Konto?{" "}
              <Link
                href="/login"
                className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
              >
                Jetzt anmelden
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
