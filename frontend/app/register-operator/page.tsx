"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, UserCog } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

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
    <div className="max-w-md mx-auto pt-6">
      <div className="flex flex-col items-center mb-6">
        <span className="w-11 h-11 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
          <Building2 size={20} className="text-amber-400" strokeWidth={2} />
        </span>
        <h1 className="font-display text-xl font-semibold text-slate-100 tracking-tight text-center">Register your charging network</h1>
        <p className="text-sm text-slate-500 mt-1.5 text-center max-w-sm">
          This creates your operator account and a super-admin login for you. You can add more admins and
          stations once you&apos;re in.
        </p>
      </div>
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <Building2 size={13} /> Operator
            </div>
            <Field label="Company / network name">
              <Input className="w-full" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} required />
            </Field>
            <Field label="Contact email">
              <Input
                type="email"
                className="w-full"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Phone (optional)">
              <Input className="w-full" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <UserCog size={13} /> Your admin login
            </div>
            <Field label="Your full name">
              <Input className="w-full" value={adminName} onChange={(e) => setAdminName(e.target.value)} required />
            </Field>
            <Field label="Your email">
              <Input
                type="email"
                className="w-full"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                className="w-full"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
          </div>

          {error && <Alert type="error">{error}</Alert>}
          <Button type="submit" loading={loading} className="w-full justify-center">
            Create operator account
          </Button>
        </form>
      </Card>
    </div>
  );
}
