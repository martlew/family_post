import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";
import { buildApiUrl } from "@/lib/auth";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = new URLSearchParams(window.location.search).get("token") || "";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!token) {
      toast.error("Der Reset-Link ist ungültig.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Die Passwörter stimmen nicht überein.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(buildApiUrl("/api/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Das Passwort konnte nicht zurückgesetzt werden.");
      }

      toast.success(payload.message || "Dein Passwort wurde aktualisiert.");
      navigate("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Der Reset ist fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F7F3EA] text-[#0E4B40]">
      <header className="border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="px-1 py-1">
            <BrandMark compact />
          </Link>
        </div>
      </header>

      <main className="px-4 py-10 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-lg rounded-[28px] border border-[#D9E4DD] bg-white/90 p-6 shadow-[0_22px_70px_rgba(14,75,64,0.10)] sm:p-8"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-[#E4F1E9] p-3 text-[#0E4B40]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#0E4B40]">Passwort zurücksetzen</h1>
              <p className="text-sm text-[#4A635C]">Lege ein neues Passwort für dein Konto fest.</p>
            </div>
          </div>

          {!token && (
            <div className="mb-6 rounded-2xl border border-[#D96B5B]/30 bg-[#D96B5B]/10 px-4 py-3 text-sm text-[#D96B5B]">
              Der Reset-Link ist ungültig oder unvollständig.
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[#0E4B40]">
                Neues Passwort
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C99A3E]" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  className="w-full rounded-xl border border-[#D9E4DD] bg-white px-12 py-3 text-[#0E4B40] placeholder:text-[#7B8E86] focus:outline-none focus:ring-2 focus:ring-[#C99A3E]/30"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-[#0E4B40]">
                Passwort bestätigen
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#C99A3E]" />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Noch einmal eingeben"
                  className="w-full rounded-xl border border-[#D9E4DD] bg-white px-12 py-3 text-[#0E4B40] placeholder:text-[#7B8E86] focus:outline-none focus:ring-2 focus:ring-[#C99A3E]/30"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting || !token}
              whileHover={{ scale: isSubmitting ? 1 : 1.01 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.99 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0E4B40] px-6 py-4 text-lg font-bold text-white transition-all hover:bg-[#0B3E35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Wird gespeichert…" : "Passwort speichern"}
              {!isSubmitting && <ArrowRight className="h-5 w-5" />}
            </motion.button>
          </form>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}