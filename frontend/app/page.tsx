"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isLoggedIn, getRole } from "@/lib/auth";
import { Button, Card } from "@/components/ui";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    setRole(getRole());
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center py-10">
        <h1 className="text-3xl font-semibold text-slate-900">⚡ Volt Grid</h1>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          An EV charging marketplace — find a station, book or walk up to a connector, charge, and pay.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          {loggedIn ? (
            <Link href={role === "admin" ? "/admin" : "/stations"}>
              <Button>{role === "admin" ? "Go to dashboard" : "Browse stations"}</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button>Log in</Button>
              </Link>
              <Link href="/register">
                <Button variant="secondary">Register</Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="font-medium text-sm">For drivers</p>
          <p className="text-sm text-slate-500 mt-1">
            Browse stations, book a connector or start charging on the spot, and pay when you&apos;re done.
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-medium text-sm">For operators</p>
          <p className="text-sm text-slate-500 mt-1">
            Manage stations, chargers and connectors, track bookings, revenue, and maintenance.
          </p>
        </Card>
        <Card className="p-4">
          <p className="font-medium text-sm">Concurrency-safe</p>
          <p className="text-sm text-slate-500 mt-1">
            A database-level constraint guarantees a connector can never be double-booked.
          </p>
        </Card>
      </div>
    </div>
  );
}
