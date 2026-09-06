"use client";

import { useEffect, useState } from "react";
import { UserCog, UserPlus } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { TeamAdmin } from "@/lib/admin-types";
import { Alert, Badge, Button, Card, EmptyState, Field, IconTile, Input, PageHeader, Select } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function TeamPage() {
  return (
    <RequireAuth role="admin">
      <TeamContent />
    </RequireAuth>
  );
}

function TeamContent() {
  const [team, setTeam] = useState<TeamAdmin[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("station_manager");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [canManage, setCanManage] = useState(false);

  async function load() {
    setTeam(await apiFetch<TeamAdmin[]>("/admin/team"));
  }

  useEffect(() => {
    setCanManage(isSuperAdmin());
    load();
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      await apiFetch("/admin/team", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      setMessage({ type: "success", text: "Team member added." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof ApiError ? err.message : "Something went wrong" });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Everyone with an admin login under your operator. Assign them to specific stations from My Stations."
      />
      {message && <Alert type={message.type}>{message.text}</Alert>}

      <ul className="space-y-2">
        {team.map((member) => (
          <Card key={member.id} className="p-3 flex items-center justify-between text-sm">
            <span className="flex items-center gap-3">
              <IconTile icon={UserCog} tone={member.role === "super_admin" ? "amber" : "indigo"} />
              <span>
                <span className="font-medium block">{member.name}</span>
                <span className="text-slate-500">{member.email}</span>
              </span>
            </span>
            <div className="flex items-center gap-2">
              <Badge status={member.role} />
              <Badge status={member.status} />
            </div>
          </Card>
        ))}
        {team.length === 0 && <EmptyState icon={UserCog}>No team members yet.</EmptyState>}
      </ul>

      {canManage ? (
        <Card className="p-5 max-w-md">
          <h2 className="font-medium text-sm text-slate-900 mb-3">Add a team member</h2>
          <form onSubmit={addMember} className="space-y-3">
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
            <Field label="Temporary password">
              <Input
                type="password"
                className="w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </Field>
            <Field label="Role">
              <Select className="w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="station_manager">Station manager</option>
                <option value="finance_manager">Finance manager</option>
                <option value="super_admin">Super admin</option>
              </Select>
            </Field>
            <Button type="submit" className="w-full justify-center">
              <UserPlus size={15} /> Add team member
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-sm text-slate-500">Only a super admin can add new team members.</p>
      )}
    </div>
  );
}
