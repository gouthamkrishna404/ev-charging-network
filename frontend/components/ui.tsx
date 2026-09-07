import { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, LucideIcon } from "lucide-react";

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
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
        interactive ? "transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function SectionHeading({ icon: Icon, title }: { icon?: LucideIcon; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {Icon && <Icon size={16} className="text-slate-400" strokeWidth={2} />}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  available: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  successful: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  charging: "bg-blue-50 text-blue-700 ring-blue-600/20",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  refunded: "bg-slate-100 text-slate-600 ring-slate-500/20",
  inactive: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/10",
  no_show: "bg-red-50 text-red-700 ring-red-600/10",
  failed: "bg-red-50 text-red-700 ring-red-600/10",
  rejected: "bg-red-50 text-red-700 ring-red-600/10",
  occupied: "bg-amber-50 text-amber-700 ring-amber-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  out_of_service: "bg-red-50 text-red-700 ring-red-600/10",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  open: "bg-amber-50 text-amber-700 ring-amber-600/20",
  super_admin: "bg-violet-50 text-violet-700 ring-violet-600/20",
  station_manager: "bg-slate-100 text-slate-600 ring-slate-500/20",
  finance_manager: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

export function Badge({ status }: { status: string }) {
  const style = badgeStyles[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
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
  size?: "sm" | "md";
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
  const sizes: Record<string, string> = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3.5 py-2 text-sm",
  };
  const variants: Record<string, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-sm shadow-indigo-600/20",
    secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50 bg-white",
    danger: "border border-red-200 text-red-700 hover:bg-red-50 bg-white",
    ghost: "text-slate-500 hover:text-slate-900 hover:bg-slate-100",
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
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center border border-dashed border-slate-200 rounded-xl">
      {Icon && <Icon size={22} className="text-slate-300" strokeWidth={1.5} />}
      <p className="text-sm text-slate-500 max-w-xs">{children}</p>
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`border border-slate-300 rounded-lg px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-shadow bg-white ${props.className ?? ""}`}
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
    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
    : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  return (
    <div className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2.5 ${styles}`}>
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm tracking-tight" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-slate-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <span className="block text-2xl font-semibold text-slate-900 tracking-tight">{value}</span>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
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
    <div className="flex flex-wrap gap-x-1 gap-y-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
            active === tab.key
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
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
          : "bg-white border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50"
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
    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none whitespace-nowrap">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${checked ? "bg-indigo-600" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </button>
      {label}
    </label>
  );
}

export function IconTile({ icon: Icon, tone = "slate" }: { icon: LucideIcon; tone?: "slate" | "indigo" | "amber" }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
  );
}
