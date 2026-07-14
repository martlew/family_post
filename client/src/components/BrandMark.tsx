type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export default function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const sizeClass = compact
    ? "h-12 w-auto max-w-[210px] sm:h-14 sm:max-w-[240px]"
    : "h-16 w-auto max-w-[280px] sm:h-20 sm:max-w-[360px]";

  return (
    <img
      src="/logo.svg"
      alt="FamilyPost Logo"
      className={`block object-contain ${sizeClass} ${className}`}
    />
  );
}