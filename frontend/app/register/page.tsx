"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Alert, Button, Card, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone: phone || null }),
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4 text-center">Create your driver account</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Full name" className="w-full" value={name} onChange={(e) => setName(e.target.value)} required />
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
            minLength={8}
          />
          <Input
            placeholder="Phone (optional)"
            className="w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Register"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
