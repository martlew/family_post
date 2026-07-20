import { Button } from "@/components/ui/button";
import { Camera, Heart, Mail, Pencil, Send, SmartphoneNfc } from "lucide-react";
import { Link } from "wouter";
import { setSelectedPlan } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";
import HeroPostcardMotion from "@/components/HeroPostcardMotion";
import { motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    icon: Camera,
    title: "Teile einen Moment",
    description: "Wähle deinen schönsten Moment aus dem Urlaub oder aus dem Alltag aus.",
  },
  {
    icon: Pencil,
    title: "Sag etwas Persönliches",
    description: "Füge ein paar persönliche Worte hinzu, die wirklich ankommen.",
  },
  {
    icon: Send,
    title: "Wir bringen Freude in den Briefkasten",
    description: "Druck, Versand und Zustellung laufen im Hintergrund für dich.",
  },
];

const benefits = [
  { icon: "📷", title: "Bleibt sichtbar", description: "Keine Erinnerung verschwindet im Chatverlauf." },
  { icon: "📬", title: "Kommt im echten Leben an", description: "Ein Briefkasten genügt - kein Smartphone nötig." },
  { icon: "❤️", title: "Fühlt sich persönlicher an", description: "Jede Karte wird zu einem kleinen Unikat." },
  { icon: "🌍", title: "Kommt weltweit an", description: "Fast jede Adresse kann erreicht werden." },
];

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const handlePlanSelection = (plan: "single" | "family-5" | "benefit-10") => {
    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-dvh bg-[#F7F3EA] text-[#0E4B40]">
      <header className="sticky top-0 z-50 border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center px-1 sm:px-0 sm:gap-5">
            <BrandMark />
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/login">
              <Button variant="outline" className="w-full rounded-full border-[#D9E4DD] bg-white text-[#0E4B40] hover:bg-[#E4F1E9] sm:w-auto">
                Anmelden
              </Button>
            </Link>
            <Link href="/register">
              <Button className="w-full rounded-full bg-[#0E4B40] text-white hover:bg-[#0B3E35] sm:w-auto">Jetzt Erinnerung versenden</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <motion.section
          className="relative overflow-hidden px-4 py-10 sm:py-12 md:py-20"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <div
            className="absolute inset-0 bg-[url('/hero-background.svg')] bg-no-repeat opacity-15 md:bg-cover md:bg-center md:opacity-18"
            style={{ backgroundSize: "420px auto", backgroundPosition: "left top" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F7F3EA] via-[#F7F3EA]/88 to-[#F7F3EA]/30" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-[1.02fr_0.98fr] md:gap-10">
            <div className="text-left md:text-left">
              <div className="mx-auto mb-6 hidden w-full max-w-[32rem] overflow-hidden rounded-[24px] border border-[#D9E4DD] bg-white/70 shadow-[0_18px_50px_rgba(14,75,64,0.10)] md:mx-0 md:block md:max-w-[34rem]">
                <video
                  className="aspect-[16/10] w-full object-cover sm:aspect-[4/3] md:aspect-[16/10]"
                  src="/creative/shots/emotions/emotion_004_seamless_perfect_vp9.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              </div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#C99A3E]/25 bg-[#FFF9EF] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#C99A3E] md:mx-0">
                Premium Postkarten aus echten Momenten
              </div>
              <h1
                className="mx-auto max-w-3xl text-left text-[2.4rem] font-black leading-[1.05] tracking-tight text-[#0E4B40] sm:text-5xl md:mx-0 md:max-w-none md:text-6xl md:leading-[1.02]"
              >
                Echte Erinnerungen verdienen einen <span className="text-[#C99A3E]">echten Platz im Leben.</span>
              </h1>
              <div className="mt-5 flex justify-start md:hidden">
                <div className="relative w-full max-w-[19rem] overflow-hidden rounded-[18px] border border-[#C99A3E]/28 bg-white p-2 shadow-[0_20px_45px_rgba(14,75,64,0.18)]" style={{ transform: "rotate(-4deg)" }}>
                  <div className="absolute inset-x-5 top-3 h-1 rounded-full bg-[#C99A3E]/70" />
                  <img
                    src="/hero-mobile-mockup.png"
                    alt="FamilyPost Postkarten-Mockup"
                    className="h-auto w-full rounded-[14px] object-cover"
                  />
                </div>
              </div>
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-[#D9E4DD] bg-[#E4F1E9] px-5 py-4 text-left text-sm font-semibold leading-relaxed text-[#0E4B40] shadow-sm md:mx-0 md:px-4 md:py-3 md:text-sm lg:p-4 lg:text-sm">
                <p>Viele unserer Postkarten erreichen ihre Empfänger innerhalb weniger Tage.</p>
                <p className="mt-1">So kam beispielsweise eine Sendung aus Ronda (Spanien) bereits nach zwei Tagen in Deutschland an.*</p>
                <p className="mt-1 text-xs font-medium text-[#4A635C]">* Die Lieferzeit kann je nach Zielland und Postlauf variieren.</p>
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#4A635C] md:mx-0 md:text-xl">
                Family Post verwandelt deine schönsten Momente in echte Postkarten, die im Briefkasten deiner Liebsten ankommen - persönlich, greifbar und voller Bedeutung.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:justify-start">
                <Link href="/register">
                  <Button className="flex w-full items-center gap-2 rounded-full bg-[#0E4B40] px-7 py-6 text-base font-semibold text-white hover:bg-[#0B3E35] md:text-lg sm:w-auto">
                    <Mail className="h-4 w-4" />
                    Jetzt Freude versenden
                  </Button>
                </Link>
                <p className="text-sm text-[#4A635C]">In weniger als einer Minute erstellt.</p>
              </div>
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="mt-7 flex flex-wrap gap-3 pb-2 pr-2 md:mt-8"
              >
                {[
                  "Premium Druck",
                  "Weltweit Versand",
                  "Persönliche Grüße",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="shrink-0 rounded-full border border-[#0E4B40]/15 bg-[#FFF9EF] px-4 py-2 text-xs font-semibold text-[#0E4B40] shadow-sm"
                  >
                    {badge}
                  </span>
                ))}
              </motion.div>
            </div>

            <div className="hidden md:block">
              <HeroPostcardMotion />
            </div>
          </div>
        </motion.section>

        <section className="px-4 pb-6 md:pb-10">
          <div className="mx-auto max-w-6xl rounded-2xl border border-[#D9E4DD] bg-white/85 px-4 py-3 text-center text-sm font-semibold text-[#0E4B40] shadow-sm sm:rounded-full">
            ⭐ Premium-Druck &nbsp; | &nbsp; 🌍 Weltweiter Versand &nbsp; | &nbsp; 📬 Direkt in den Briefkasten &nbsp; | &nbsp; ❤️ Persönliche Unikate
          </div>
        </section>

        <section className="px-4 py-6 md:py-10">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-[#D9E4DD] bg-gradient-to-br from-[#E4F1E9] to-white p-8 shadow-[0_20px_60px_rgba(14,75,64,0.08)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D9E4DD] bg-white px-4 py-2 text-sm font-semibold text-[#0E4B40]">
              <SmartphoneNfc className="h-4 w-4" />
              Das emotionale Problem
            </div>
            <p className="max-w-4xl text-2xl font-semibold leading-relaxed text-[#0E4B40] md:text-3xl">
              Family Post bringt genau diese Momente zurück.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black tracking-tight text-[#0E4B40] md:text-5xl">Die Lösung in 3 Schritten</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-[24px] border border-[#D9E4DD] bg-white p-6 shadow-[0_18px_50px_rgba(14,75,64,0.08)]">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-[#0E4B40] text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-[#0E4B40]">{title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[#4A635C]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black tracking-tight text-[#0E4B40] md:text-5xl">Der haptische Nutzen</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-[24px] border border-[#D9E4DD] bg-white p-6 text-center shadow-[0_18px_50px_rgba(14,75,64,0.08)]">
                  <span className="mb-3 block text-3xl">{benefit.icon}</span>
                  <h3 className="text-lg font-bold text-[#0E4B40]">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#4A635C]">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 md:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-[#0E4B40] md:text-5xl">Preise, die Erinnerungen fair machen</h2>
              <p className="mt-3 text-base text-[#4A635C] md:text-lg">All-inclusive mit Premium-Druck, echtem Porto und weltweitem Versand.</p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <Link href="/register" onClick={() => handlePlanSelection("single")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-[#D9E4DD] bg-white p-6 shadow-[0_18px_50px_rgba(14,75,64,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#C99A3E]/35 hover:shadow-[0_24px_55px_rgba(14,75,64,0.12)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C99A3E]">Einzelticket</p>
                  <p className="mt-4 text-4xl font-black text-[#0E4B40]">4,99 €</p>
                  <p className="mt-2 text-sm text-[#4A635C]">Für eine Postkarte ohne Abo und ohne Mindestlaufzeit.</p>
                  <div className="mt-5 inline-flex rounded-full bg-[#0E4B40] px-4 py-2 text-sm font-semibold text-white">Jetzt Erinnerung versenden</div>
                </article>
              </Link>

              <Link href="/register" onClick={() => handlePlanSelection("family-5")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-[#C99A3E]/35 bg-gradient-to-b from-[#E4F1E9] to-white p-6 shadow-[0_22px_60px_rgba(14,75,64,0.10)] transition-all hover:-translate-y-0.5 hover:border-[#C99A3E]/55 hover:shadow-[0_26px_62px_rgba(14,75,64,0.14)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0E4B40]">Family-Paket (5er)</p>
                  <p className="mt-4 text-4xl font-black text-[#0E4B40]">22,99 €</p>
                  <p className="mt-2 text-sm text-[#4A635C]">Für 5 Postkarten, kein Ablaufdatum, gemeinsam in der Familie nutzbar.</p>
                  <div className="mt-5 inline-flex rounded-full bg-[#0E4B40] px-4 py-2 text-sm font-semibold text-white">Jetzt Erinnerung versenden</div>
                </article>
              </Link>

              <Link href="/register" onClick={() => handlePlanSelection("benefit-10")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-[#D9E4DD] bg-white p-6 shadow-[0_18px_50px_rgba(14,75,64,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#C99A3E]/35 hover:shadow-[0_24px_55px_rgba(14,75,64,0.12)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0E4B40]">Vorteils-Paket (10er)</p>
                  <p className="mt-4 text-4xl font-black text-[#0E4B40]">39,99 €</p>
                  <p className="mt-2 text-sm text-[#4A635C]">Für 10 Postkarten, kein Ablaufdatum, ideal für Vielschreiber.</p>
                  <div className="mt-5 inline-flex rounded-full bg-[#0E4B40] px-4 py-2 text-sm font-semibold text-white">Jetzt Erinnerung versenden</div>
                </article>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-12 pt-4 md:pb-16">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 rounded-[24px] bg-[#0E4B40] px-6 py-10 text-center text-white shadow-[0_24px_70px_rgba(14,75,64,0.22)]">
          <div className="rounded-full bg-[#F7F3EA] px-4 py-2 shadow-sm">
            <BrandMark compact />
          </div>
          <div className="text-2xl font-semibold leading-relaxed md:text-4xl">
            Wir verkaufen keine Postkarten. Wir machen Erinnerungen sichtbar.
          </div>
          <p className="max-w-2xl text-sm text-white/80 md:text-base">
            Family Post verbindet digitale Momente mit echtem Papier, echtem Porto und echter Nähe.
          </p>
        </div>
      </footer>
    </div>
  );
}
