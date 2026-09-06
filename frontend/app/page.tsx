"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLoggedIn } from "@/lib/auth";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">EV Charging Network Management System</h1>
      <p className="text-slate-600">
        Browse charging stations, book a connector, start a charging session, and pay your bill.
      </p>
      {loggedIn ? (
        <Link href="/stations" className="inline-block rounded bg-slate-900 text-white px-4 py-2 text-sm">
          Browse stations
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="inline-block rounded bg-slate-900 text-white px-4 py-2 text-sm">
            Log in
          </Link>
          <Link href="/register" className="inline-block rounded border border-slate-300 px-4 py-2 text-sm">
            Register
          </Link>
        </div>
      )}
    </div>
  );
}
