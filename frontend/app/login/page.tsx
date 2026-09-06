"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import { Alert, Button, Card, Input } from "@/components/ui";

interface TokenResponse {
  access_token: string;
  role: string;
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
      saveSession(res.access_token, res.role);
      router.push(res.role === "admin" ? "/admin" : "/stations");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4 text-center">Log in</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="Email"
            className="w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            className="w-full"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in..." : "Log in"}
          </Button>
        </form>
      </Card>
      <p className="text-xs text-slate-500 mt-4 text-center">
        Demo driver: driver@example.com / Password123!
        <br />
        Demo admin: admin@voltgrid.example / Password123!
      </p>
    </div>
  );
}
