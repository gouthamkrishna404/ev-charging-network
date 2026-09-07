import Link from "next/link";
import { Zap } from "lucide-react";

const TECH = ["Next.js", "FastAPI", "PostgreSQL", "SQLAlchemy"];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-1.5 font-display font-semibold text-slate-900">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Zap size={13} className="text-white" fill="white" strokeWidth={0} />
          </span>
          Volt Grid
        </Link>
        <p className="text-xs text-slate-400 order-3 sm:order-2">
          &copy; {new Date().getFullYear()} Volt Grid. A demo EV charging marketplace.
        </p>
        <div className="flex items-center gap-2 order-2 sm:order-3">
          {TECH.map((t) => (
            <span key={t} className="text-[11px] font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-1">
              {t}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
