import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { buildApiUrl, getSelectedPlan, setAuthSession } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

/**
 * FamilyPost Register Page in the same warm visual system as Home and Login.
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
      const res = await fetch(buildApiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Registrierung fehlgeschlagen.");
      }

      setAuthSession({ token: payload.token, user: payload.user });
      const selectedPlan = getSelectedPlan();
      navigate(selectedPlan ? "/editor" : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Etwas ist schiefgelaufen. Bitte versuche es erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#F7F3EA] text-[#0E4B40]">
      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center px-1"
          >
            <BrandMark compact />
          </Link>
        </div>
      </motion.nav>

      {/* Content */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-[#D9E4DD] bg-white/90 p-6 shadow-[0_22px_70px_rgba(14,75,64,0.10)] backdrop-blur-sm sm:p-8">
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-black text-[#0E4B40] md:text-3xl">
                Konto erstellen
              </h1>
              <p className="text-[#4A635C] text-sm">
                Tritt FamilyPost bei und versende Postkarten an deine Familie
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-[#D96B5B]/10 border border-[#D96B5B]/30 text-[#D96B5B] text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Vollständiger Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-semibold text-[#0E4B40] mb-2"
                >
                  Vollständiger Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C99A3E]" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#D9E4DD] bg-white text-[#0E4B40] placeholder:text-[#7B8E86] focus:outline-none focus:ring-2 focus:ring-[#C99A3E]/30 focus:border-[#C99A3E]/40 transition-all"
                  />
                </div>
              </div>

              {/* E-Mail */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-[#0E4B40] mb-2"
                >
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C99A3E]" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#D9E4DD] bg-white text-[#0E4B40] placeholder:text-[#7B8E86] focus:outline-none focus:ring-2 focus:ring-[#C99A3E]/30 focus:border-[#C99A3E]/40 transition-all"
                  />
                </div>
              </div>

              {/* Passwort */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-[#0E4B40] mb-2"
                >
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#C99A3E]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-[#D9E4DD] bg-white text-[#0E4B40] placeholder:text-[#7B8E86] focus:outline-none focus:ring-2 focus:ring-[#C99A3E]/30 focus:border-[#C99A3E]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7B8E86] hover:text-[#0E4B40] transition-colors"
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E4B40] px-6 py-4 text-lg font-bold text-white transition-all duration-300 hover:bg-[#0B3E35] disabled:cursor-not-allowed disabled:opacity-60"
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
            <div className="mt-6 text-center text-sm text-slate-600">
              Bereits ein Konto?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#0E4B40] hover:text-[#C99A3E] transition-colors"
              >
                Jetzt anmelden
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-[#4A635C] hover:text-[#0E4B40] transition-colors"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
}
