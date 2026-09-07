"use client";

import { ReactNode, useEffect } from "react";
import { AlertTriangle, CheckCircle2, Loader2, LucideIcon, X } from "lucide-react";

export function Card({
  children,
  className = "",
  interactive = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm shadow-[0_8px_24px_-14px_rgba(0,0,0,0.6)] ${
        interactive
          ? "transition-all duration-200 hover:bg-white/[0.06] hover:shadow-[0_20px_36px_-14px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 hover:border-indigo-400/30 cursor-pointer active:translate-y-0 active:shadow-sm"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-slate-100 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({ icon: Icon, title }: { icon?: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={16} className="text-slate-500" strokeWidth={2} />}
      <p className="text-sm font-semibold text-slate-300">{title}</p>
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  available: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  successful: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  approved: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25",
  confirmed: "bg-blue-500/15 text-blue-300 ring-blue-400/25",
  charging: "bg-blue-500/15 text-blue-300 ring-blue-400/25",
  in_progress: "bg-blue-500/15 text-blue-300 ring-blue-400/25",
  completed: "bg-white/[0.06] text-slate-300 ring-white/15",
  refunded: "bg-white/[0.06] text-slate-300 ring-white/15",
  inactive: "bg-white/[0.06] text-slate-300 ring-white/15",
  cancelled: "bg-red-500/15 text-red-300 ring-red-400/25",
  no_show: "bg-red-500/15 text-red-300 ring-red-400/25",
  failed: "bg-red-500/15 text-red-300 ring-red-400/25",
  rejected: "bg-red-500/15 text-red-300 ring-red-400/25",
  occupied: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  reserved: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  out_of_service: "bg-red-500/15 text-red-300 ring-red-400/25",
  pending: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  open: "bg-amber-500/15 text-amber-300 ring-amber-400/25",
  super_admin: "bg-violet-500/15 text-violet-300 ring-violet-400/25",
  station_manager: "bg-white/[0.06] text-slate-300 ring-white/15",
  finance_manager: "bg-white/[0.06] text-slate-300 ring-white/15",
};

export function Badge({ status }: { status: string }) {
  const style = badgeStyles[status] ?? "bg-white/[0.06] text-slate-300 ring-white/15";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap active:scale-[0.97]";
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
    lg: "px-5 py-2.75 text-base",
  };
  const variants: Record<string, string> = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-500 shadow-[0_1px_2px_rgba(79,70,229,0.4),0_4px_14px_-2px_rgba(79,70,229,0.5)] hover:shadow-[0_1px_2px_rgba(79,70,229,0.4),0_6px_20px_-2px_rgba(79,70,229,0.6)]",
    secondary: "border border-white/15 text-slate-200 hover:bg-white/[0.06] hover:border-white/25 bg-white/[0.02]",
    danger: "border border-red-500/30 text-red-300 hover:bg-red-500/10 bg-transparent",
    ghost: "text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function EmptyState({ children, icon: Icon }: { children: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-white/15 rounded-xl">
      {Icon && <Icon size={22} className="text-slate-400" strokeWidth={1.5} />}
      <p className="text-sm text-slate-400 max-w-xs">{children}</p>
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/60 transition-shadow ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`bg-[#131120] border border-white/12 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400/60 transition-shadow ${props.className ?? ""}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

export function Alert({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const isError = type === "error";
  const Icon = isError ? AlertTriangle : CheckCircle2;
  const styles = isError
    ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/25"
    : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25";
  return (
    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-white/15">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <span className="block text-2xl font-semibold text-slate-100 tracking-tight tabular-nums">{value}</span>
      <span className="text-sm text-slate-400">{label}</span>
    </div>
  );
}

export function StatCard({
  icon: Icon,
  value,
  label,
  tone = "indigo",
  hint,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  tone?: "slate" | "indigo" | "amber" | "emerald" | "volt";
  hint?: string;
}) {
  return (
    <Card className="p-4 sm:p-5 flex items-center gap-3.5">
      <IconTile icon={Icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-semibold text-slate-100 tracking-tight tabular-nums truncate">{value}</p>
        <p className="text-xs sm:text-sm text-slate-400 truncate">{label}</p>
        {hint && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{hint}</p>}
      </div>
    </Card>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-white/[0.06] ${className}`}>
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-0.5 bg-white/[0.05] border border-white/10 rounded-full p-1 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 text-sm font-medium px-3.5 py-1.5 rounded-full transition-all ${
            value === opt.value ? "bg-white/12 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {opt.icon && <opt.icon size={14} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ProgressRing({
  size = 88,
  strokeWidth = 7,
  progress,
  tone = "indigo",
  children,
}: {
  size?: number;
  strokeWidth?: number;
  /** 0-1, or null for an indeterminate spinning ring (e.g. an open-ended charging session). */
  progress: number | null;
  tone?: "indigo" | "volt";
  children?: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = progress === null ? 0.28 : Math.min(1, Math.max(0, progress));
  const color = tone === "volt" ? "var(--color-volt-500)" : "var(--color-indigo-500)";
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className={progress === null ? "animate-spin" : "-rotate-90"} style={{ animationDuration: "1.4s" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-[#100e1a] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col animate-slide-up-sheet sm:animate-scale-in"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <p className="font-semibold text-slate-100">{title}</p>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-slate-200 p-1 -m-1 rounded-full hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon?: LucideIcon }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-1 gap-y-1 border-b border-white/10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
            active === tab.key
              ? "border-indigo-400 text-indigo-300"
              : "border-transparent text-slate-500 hover:text-slate-300"
          }`}
        >
          {tab.icon && <tab.icon size={14} />}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
        active
          ? "bg-indigo-600 border-indigo-600 text-white"
          : "bg-white/[0.03] border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none whitespace-nowrap">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? "bg-indigo-600" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
      {label}
    </label>
  );
}

export function IconTile({
  icon: Icon,
  tone = "slate",
}: {
  icon: LucideIcon;
  tone?: "slate" | "indigo" | "amber" | "emerald" | "volt";
}) {
  const tones: Record<string, string> = {
    slate: "bg-white/[0.06] text-slate-300",
    indigo: "bg-indigo-500/15 text-indigo-300",
    amber: "bg-amber-500/15 text-amber-300",
    emerald: "bg-emerald-500/15 text-emerald-300",
    volt: "bg-volt-500/15 text-volt-400",
  };
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
  );
}
