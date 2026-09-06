"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import Link from "next/link";
import { LogIn, Plug } from "lucide-react";
import { saveSession } from "@/lib/auth";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

interface TokenResponse {
  access_token: string;
  role: string;
  admin_role: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("driver@example.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<TokenResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveSession(res.access_token, res.role, res.admin_role);
      router.push(res.role === "admin" ? "/admin" : "/stations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-6">
      <div className="flex flex-col items-center mb-6">
        <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 mb-3">
          <Plug size={20} className="text-white" strokeWidth={2.5} />
        </span>
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="text-sm text-slate-500 mt-1">Log in to Volt Grid</p>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Email">
            <Input
              type="email"
              placeholder="you@example.com"
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              placeholder="••••••••"
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full justify-center">
            <LogIn size={15} /> Log in
          </Button>
        </form>
      </Card>
      <p className="text-xs text-slate-400 mt-4 text-center">
        Demo driver: driver@example.com / Password123!
        <br />
        Demo admin: admin@voltgrid.example / Password123!
      </p>
      <p className="text-sm text-slate-500 mt-6 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Register
        </Link>
      </p>
      <p className="text-sm text-slate-500 mt-2 text-center">
        Run a charging network?{" "}
        <Link href="/register-operator" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Register your operator account
        </Link>
      </p>
    </div>
  );
}
