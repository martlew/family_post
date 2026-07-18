type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export default function BrandMark({ className = "", compact = false }: BrandMarkProps) {
  const sizeClass = compact
    ? "w-[clamp(10.75rem,40vw,13.5rem)] max-w-full h-auto shrink-0 object-contain"
    : "w-[clamp(12.5rem,44vw,16.5rem)] max-w-full h-auto shrink-0 object-contain";

  return (
    <img
      src="/logo.svg"
      alt="FamilyPost Logo"
      className={`block ${sizeClass} ${className}`}
    />
  );
}