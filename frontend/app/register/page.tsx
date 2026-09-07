"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Car, UserPlus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

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
    <div className="max-w-sm mx-auto pt-6">
      <div className="flex flex-col items-center mb-6">
        <span className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
          <Car size={20} className="text-indigo-600" strokeWidth={2} />
        </span>
        <h1 className="font-display text-xl font-semibold text-slate-900 tracking-tight">Create your driver account</h1>
        <p className="text-sm text-slate-500 mt-1">Free — start browsing stations right away.</p>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name">
            <Input className="w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              className="w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              className="w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Phone (optional)">
            <Input className="w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full justify-center">
            <UserPlus size={15} /> Register
          </Button>
        </form>
      </Card>
      <p className="text-sm text-slate-500 mt-6 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
