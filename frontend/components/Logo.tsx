/**
 * Voltaic's mark: a custom angular bolt (not the stock lucide Zap glyph) on a
 * gradient tile running indigo -> violet -> volt, the same three hues used
 * everywhere else in the product. Sized via the `size` prop so it scales
 * cleanly from a 20px favicon-ish context up to the hero.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <defs>
        <linearGradient id="voltaic-mark-grad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#a3e635" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="8" fill="url(#voltaic-mark-grad)" />
      <path
        d="M15.6 5.5 8.4 15.8h4.3l-1.1 6.7 7.9-11.1h-4.5l0.6-5.9Z"
        fill="white"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display font-semibold tracking-tight ${className}`}>Voltaic</span>;
}

export default function Logo({ size = 28, wordmarkClassName = "" }: { size?: number; wordmarkClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <Wordmark className={wordmarkClassName} />
    </span>
  );
}
