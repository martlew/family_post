import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

/**
 * Shared layout for legal pages (Impressum, Datenschutz, AGB).
 * Uses fluid typography and avoids any truncation (no line-clamp / overflow-hidden)
 * so all text stays fully readable on small mobile screens.
 */
export default function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#F7F3EA] text-[#0E4B40]">
      <header className="border-b border-[#D9E4DD] bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link href="/" className="w-fit">
            <BrandMark compact className="w-[clamp(8rem,32vw,10rem)]" />
          </Link>
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-[#0E4B40] hover:underline"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
            Zurück zur Startseite
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="break-words text-2xl font-bold leading-snug sm:text-3xl md:text-4xl">{title}</h1>
          <div className="mt-6 space-y-6 whitespace-normal break-words text-sm leading-relaxed text-[#1E4038] sm:text-base">
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
