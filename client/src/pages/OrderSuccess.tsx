import { CheckCircle2, Mail, MoveRight, Sparkles } from "lucide-react";
import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";

export default function OrderSuccess() {
  const params = new URLSearchParams(window.location.search);
  const draftId = params.get("draftId") || "";
  const status = params.get("status") || "complete";
  const isProcessing = status === "processing";

  const headline = isProcessing ? "Wir verarbeiten deine Bestellung gerade..." : "Deine Postkarte ist in Bearbeitung.";
  const description = isProcessing
    ? "Die Zahlung ist angekommen, der letzte Abgleich läuft noch. In wenigen Momenten geht es automatisch weiter, ohne dass du etwas tun musst."
    : "Wir haben die Zahlung verarbeitet und bereiten jetzt den Druck sowie den Versand vor. Du bekommst gleich alle weiteren Schritte per E-Mail.";

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
        <div className="mx-auto max-w-2xl rounded-[28px] border border-[#D9E4DD] bg-white/90 p-6 text-center shadow-[0_22px_70px_rgba(14,75,64,0.10)] sm:p-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E4F1E9] text-[#0E4B40] shadow-sm">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#C99A3E]/30 bg-[#FFF9EF] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#C99A3E]">
            <Sparkles className="h-4 w-4" />
            {isProcessing ? "Zahlung fast abgeschlossen" : "Danke für deine Bestellung!"}
          </p>
          <h1 className="text-3xl font-black leading-tight text-[#0E4B40] sm:text-5xl">
            {headline}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#4A635C] sm:text-lg">
            {description}
          </p>

          {draftId && (
            <div className="mx-auto mt-6 max-w-md rounded-2xl border border-[#D9E4DD] bg-[#F7F3EA] px-4 py-3 text-sm text-[#4A635C]">
              Vorgangs-ID: <span className="font-semibold text-[#0E4B40]">{draftId}</span>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/dashboard" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0E4B40] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0B3E35]">
              Zum Dashboard
              <MoveRight className="h-4 w-4" />
            </Link>
            <Link href="/editor" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D9E4DD] bg-white px-6 py-3 text-sm font-semibold text-[#0E4B40] transition-colors hover:bg-[#E4F1E9]">
              <Mail className="h-4 w-4" />
              Nächste Karte erstellen
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
