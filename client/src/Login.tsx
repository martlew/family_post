import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import { getSelectedPlan, setAuthSession } from "@/lib/auth";

/**
 * FamilyPost Login Page in the same warm visual system as the landing page.
 */

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Login fehlgeschlagen.");
      }

      setAuthSession({ token: payload.token, user: payload.user });
      toast.success("Login erfolgreich.");

      const selectedPlan = getSelectedPlan();
      if (selectedPlan) {
        navigate("/editor");
        return;
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Server nicht erreichbar. Bitte spaeter erneut versuchen.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error || "Reset konnte nicht gestartet werden.");
      }

      toast.success(payload.message || "Reset-Anfrage wurde versendet.");
      setShowResetModal(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message || "Server nicht erreichbar. Bitte spaeter erneut versuchen.");
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden relative flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_30%),linear-gradient(180deg,#f7f3ec_0%,#f3efe7_100%)] text-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl opacity-25 animate-pulse" />
        <div
          className="absolute bottom-40 right-20 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl opacity-25 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      {/* Navigation */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 border-b border-slate-200/80 bg-white/85 backdrop-blur-md"
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
            <span className="text-xl font-bold text-slate-950">
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
          <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-[0_22px_70px_rgba(15,23,42,0.14)] backdrop-blur-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-slate-950 mb-2">
                Willkommen zurück
              </h1>
              <p className="text-slate-600 text-sm">
                Melde dich an, um deine Postkarten zu verwalten
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  E-Mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Passwort
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30 focus:border-teal-700/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 transition-colors"
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

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-sm text-teal-800 hover:text-teal-700 transition-colors"
                >
                  Passwort vergessen?
                </button>
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full group px-6 py-4 rounded-xl bg-teal-700 text-white font-bold text-lg hover:bg-teal-800 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? "Wird angemeldet…" : "Anmelden"}
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

            <div className="mt-6 text-center text-sm text-slate-600">
              Noch kein Konto?{" "}
              <Link
                href="/register"
                className="font-semibold text-teal-800 hover:text-teal-700 transition-colors"
              >
                Jetzt registrieren
              </Link>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </motion.div>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setShowResetModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-black text-slate-950">Passwort zuruecksetzen</h2>
            <p className="mt-2 text-sm text-slate-600">Gib die E-Mail-Adresse deines Kontos ein. Wir senden einen Reset-Hinweis.</p>
            <form className="mt-5 space-y-4" onSubmit={handleForgotPassword}>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@beispiel.de"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700/30"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isResetLoading}
                  className="flex-1 rounded-xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isResetLoading ? "Sende..." : "Reset senden"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}