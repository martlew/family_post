import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";

const legalLinks = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutz" },
  { href: "/agb", label: "AGB & Widerruf" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#D9E4DD] bg-white px-4 py-8 text-[#0E4B40] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="flex items-center justify-center sm:justify-start">
          <BrandMark compact className="w-[clamp(8rem,30vw,10rem)]" />
        </div>

        <nav aria-label="Rechtliche Seiten" className="flex flex-col flex-wrap items-center justify-center gap-x-6 gap-y-3 sm:flex-row">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-normal break-words text-sm font-medium text-[#0E4B40] underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="whitespace-normal break-words text-xs text-[#4A635C]">
          © {year} Family Post. Alle Rechte vorbehalten.
        </p>
      </div>
    </footer>
  );
}
