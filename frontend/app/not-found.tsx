import Link from "next/link";
import { Compass, Zap } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 gap-4">
      <span className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center">
        <Compass size={26} className="text-indigo-500" strokeWidth={1.75} />
      </span>
      <h1 className="font-display text-2xl font-semibold text-slate-100 tracking-tight">Page not found</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <div className="flex gap-3 mt-2">
        <Link href="/">
          <Button variant="secondary">Go home</Button>
        </Link>
        <Link href="/stations">
          <Button>
            <Zap size={14} /> Browse stations
          </Button>
        </Link>
      </div>
    </div>
  );
}
