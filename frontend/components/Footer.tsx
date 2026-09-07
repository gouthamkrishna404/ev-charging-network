import Link from "next/link";
import { LogoMark } from "./Logo";

const TECH = ["Next.js", "FastAPI", "PostgreSQL", "SQLAlchemy"];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.07] mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-display font-semibold text-slate-100">
          <LogoMark size={22} />
          Voltaic
        </Link>
        <p className="text-xs text-slate-500 order-3 sm:order-2">
          &copy; {new Date().getFullYear()} Voltaic. A demo EV charging marketplace.
        </p>
        <div className="flex items-center gap-2 order-2 sm:order-3">
          {TECH.map((t) => (
            <span key={t} className="text-[11px] font-medium text-slate-400 bg-white/[0.05] border border-white/10 rounded-full px-2.5 py-1">
              {t}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
