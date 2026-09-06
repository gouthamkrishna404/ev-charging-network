"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { Alert, Button, Card, Input } from "@/components/ui";

export default function RegisterOperatorPage() {
  const router = useRouter();
  const [operatorName, setOperatorName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/register-operator", {
        method: "POST",
        body: JSON.stringify({
          operator_name: operatorName,
          contact_email: contactEmail,
          phone: phone || null,
          admin_name: adminName,
          admin_email: adminEmail,
          admin_password: adminPassword,
        }),
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-1 text-center">Register your charging network</h1>
      <p className="text-sm text-slate-500 mb-4 text-center">
        This creates your operator account and a super-admin login for you. You can add more admins and
        stations once you&apos;re in.
      </p>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Operator</p>
            <Input
              placeholder="Company / network name"
              className="w-full"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Contact email"
              className="w-full"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
            <Input
              placeholder="Phone (optional)"
              className="w-full"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Your admin login</p>
            <Input
              placeholder="Your full name"
              className="w-full"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Your email"
              className="w-full"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              className="w-full"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating account..." : "Create operator account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
