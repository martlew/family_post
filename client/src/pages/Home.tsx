import { Button } from "@/components/ui/button";
import { Camera, Globe2, Heart, Pencil, Send, SmartphoneNfc } from "lucide-react";
import { Link } from "wouter";
import { setSelectedPlan } from "@/lib/auth";
import BrandMark from "@/components/BrandMark";

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
  const handlePlanSelection = (plan: "single" | "family-5" | "benefit-10") => {
    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.16),transparent_30%),linear-gradient(180deg,#f7f3ec_0%,#f3efe7_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-lg font-bold tracking-tight">Family Post</p>
              <p className="text-xs text-slate-500">Erinnerungen, die ankommen</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link href="/login">
              <Button variant="outline" className="w-full rounded-full border-slate-300 bg-white text-slate-800 hover:bg-slate-50 sm:w-auto">
                Anmelden
              </Button>
            </Link>
            <Link href="/register">
              <Button className="w-full rounded-full bg-teal-700 text-white hover:bg-teal-800 sm:w-auto">Jetzt Freude versenden</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 py-10 md:py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
            <div className="text-center md:text-left">
              <h1 className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:mx-0 md:text-6xl">
                Echte Erinnerungen verdienen einen echten Platz im Leben.
              </h1>
              <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left text-sm font-semibold leading-relaxed text-emerald-900 shadow-sm md:mx-0 md:text-base">
                <p>Viele unserer Postkarten erreichen ihre Empfänger innerhalb weniger Tage.</p>
                <p className="mt-1">So kam beispielsweise eine Sendung aus Ronda (Spanien) bereits nach zwei Tagen in Deutschland an.*</p>
                <p className="mt-1 text-xs font-medium text-emerald-800/90">* Die Lieferzeit kann je nach Zielland und Postlauf variieren.</p>
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-slate-600 md:mx-0 md:text-xl">
                Family Post verwandelt deine schönsten Momente in echte Postkarten, die im Briefkasten deiner Liebsten ankommen - persönlich, greifbar und voller Bedeutung.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-start">
                <Link href="/register">
                  <Button className="w-full rounded-full bg-teal-700 px-7 py-6 text-base font-semibold text-white hover:bg-teal-800 md:text-lg sm:w-auto">
                    🟢 Jetzt Erinnerung versenden
                  </Button>
                </Link>
                <p className="text-sm text-slate-500">In weniger als einer Minute erstellt.</p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-md rounded-[28px] border border-slate-200 bg-white/90 p-3 shadow-[0_22px_70px_rgba(15,23,42,0.16)] backdrop-blur-sm md:max-w-none">
              <div className="overflow-hidden rounded-[22px] bg-slate-950">
                <video
                  className="aspect-[9/16] w-full object-cover"
                  src="/emotion_004.mp4"
                  muted
                  playsInline
                  autoPlay
                  loop
                  preload="metadata"
                />
              </div>
              <p className="px-2 pt-3 text-sm text-slate-500">
                Eine echte Erinnerung.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 md:pb-10">
          <div className="mx-auto max-w-6xl rounded-2xl border border-teal-200/80 bg-white/85 px-4 py-3 text-center text-sm font-semibold text-teal-900 shadow-sm sm:rounded-full">
            ⭐ Premium-Druck &nbsp; | &nbsp; 🌍 Weltweiter Versand &nbsp; | &nbsp; 📬 Direkt in den Briefkasten &nbsp; | &nbsp; ❤️ Persönliche Unikate
          </div>
        </section>

        <section className="px-4 py-6 md:py-10">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-8 shadow-[0_20px_60px_rgba(180,83,9,0.10)]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-semibold text-amber-800">
              <SmartphoneNfc className="h-4 w-4" />
              Das emotionale Problem
            </div>
            <p className="max-w-4xl text-2xl font-semibold leading-relaxed text-slate-900 md:text-3xl">
              Family Post bringt genau diese Momente zurück.
            </p>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Die Lösung in 3 Schritten</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, description }) => (
                <article key={title} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-white shadow-md">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-950">{title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Der haptische Nutzen</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              {benefits.map((benefit) => (
                <article key={benefit.title} className="rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-[0_18px_50px_rgba(15,23,42,0.10)]">
                  <span className="mb-3 block text-3xl">{benefit.icon}</span>
                  <h3 className="text-lg font-bold text-slate-950">{benefit.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-10 md:pb-14">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Preise, die Erinnerungen fair machen</h2>
              <p className="mt-3 text-base text-slate-600 md:text-lg">All-inclusive mit Premium-Druck, echtem Porto und weltweitem Versand.</p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              <Link href="/register" onClick={() => handlePlanSelection("single")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition-all hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-[0_24px_55px_rgba(15,23,42,0.14)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Einzelticket</p>
                  <p className="mt-4 text-4xl font-black text-slate-950">3,99 €</p>
                  <p className="mt-2 text-sm text-slate-600">Für eine Postkarte ohne Abo und ohne Mindestlaufzeit.</p>
                </article>
              </Link>

              <Link href="/register" onClick={() => handlePlanSelection("family-5")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-emerald-300 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-[0_22px_60px_rgba(15,118,110,0.16)] transition-all hover:-translate-y-0.5 hover:border-teal-700/45 hover:shadow-[0_26px_62px_rgba(15,118,110,0.22)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Family-Paket (5er)</p>
                  <p className="mt-4 text-4xl font-black text-slate-950">18,99 €</p>
                  <p className="mt-2 text-sm text-slate-700">Für 5 Postkarten, kein Ablaufdatum, gemeinsam in der Familie nutzbar.</p>
                </article>
              </Link>

              <Link href="/register" onClick={() => handlePlanSelection("benefit-10")}>
                <article className="h-full cursor-pointer rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.10)] transition-all hover:-translate-y-0.5 hover:border-teal-700/35 hover:shadow-[0_24px_55px_rgba(15,23,42,0.14)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Vorteils-Paket (10er)</p>
                  <p className="mt-4 text-4xl font-black text-slate-950">34,99 €</p>
                  <p className="mt-2 text-sm text-slate-600">Für 10 Postkarten, kein Ablaufdatum, ideal für Vielschreiber.</p>
                </article>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 pb-12 pt-4 md:pb-16">
        <div className="mx-auto max-w-6xl rounded-[24px] bg-slate-950 px-6 py-10 text-center text-2xl font-semibold leading-relaxed text-slate-100 shadow-[0_24px_70px_rgba(15,23,42,0.25)] md:text-4xl">
          Wir verkaufen keine Postkarten. Wir machen Erinnerungen sichtbar. – Family Post
        </div>
      </footer>
    </div>
  );
}
