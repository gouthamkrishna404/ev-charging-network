import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const badgeStyles: Record<string, string> = {
  active: "bg-green-50 text-green-700 ring-green-600/20",
  available: "bg-green-50 text-green-700 ring-green-600/20",
  confirmed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  charging: "bg-blue-50 text-blue-700 ring-blue-600/20",
  completed: "bg-slate-100 text-slate-600 ring-slate-500/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/10",
  no_show: "bg-red-50 text-red-700 ring-red-600/10",
  failed: "bg-red-50 text-red-700 ring-red-600/10",
  rejected: "bg-red-50 text-red-700 ring-red-600/10",
  occupied: "bg-amber-50 text-amber-700 ring-amber-600/20",
  reserved: "bg-amber-50 text-amber-700 ring-amber-600/20",
  out_of_service: "bg-red-50 text-red-700 ring-red-600/10",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  successful: "bg-green-50 text-green-700 ring-green-600/20",
  approved: "bg-green-50 text-green-700 ring-green-600/20",
  refunded: "bg-slate-100 text-slate-600 ring-slate-500/20",
  open: "bg-amber-50 text-amber-700 ring-amber-600/20",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-600/20",
};

export function Badge({ status }: { status: string }) {
  const style = badgeStyles[status] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    secondary: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    danger: "border border-red-200 text-red-700 hover:bg-red-50",
    ghost: "text-slate-600 hover:bg-slate-100",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-sm text-slate-500 py-6 text-center">{children}</p>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${props.className ?? ""}`}
    />
  );
}

export function Alert({ type, children }: { type: "error" | "success"; children: ReactNode }) {
  const styles =
    type === "error"
      ? "bg-red-50 text-red-700 ring-1 ring-red-200"
      : "bg-green-50 text-green-700 ring-1 ring-green-200";
  return <p className={`text-sm rounded-md px-3 py-2 ${styles}`}>{children}</p>;
}

export function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500 text-sm" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
