type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export default function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const sizeClass = compact
    ? "h-12 sm:h-14 md:h-16 w-auto shrink-0 object-contain"
    : "h-14 sm:h-16 md:h-20 w-auto shrink-0 object-contain";

  return (
    <img
      src="/logo.svg"
      alt="FamilyPost Logo"
      className={`block ${sizeClass} ${className}`}
    />
  );
}