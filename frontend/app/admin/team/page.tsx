"use client";

import { useEffect, useState } from "react";
import { UserCog, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { isSuperAdmin } from "@/lib/auth";
import { TeamAdmin } from "@/lib/admin-types";
import { Badge, Button, Card, EmptyState, Field, IconTile, Input, PageHeader, Select, Skeleton, Stat } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function TeamPage() {
  return (
    <RequireAuth role="admin">
      <TeamContent />
    </RequireAuth>
  );
}

function TeamContent() {
  const [team, setTeam] = useState<TeamAdmin[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("station_manager");
  const [canManage, setCanManage] = useState(false);

  async function load() {
    setTeam(await apiFetch<TeamAdmin[]>("/admin/team"));
  }

  useEffect(() => {
    setCanManage(isSuperAdmin());
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load team"));
  }, []);

  async function addMember(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/admin/team", {
        method: "POST",
        body: JSON.stringify({ name, email, password, role }),
      });
      setName("");
      setEmail("");
      setPassword("");
      toast.success("Team member added.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="Everyone with an admin login under your operator. Assign them to specific stations from My Stations."
      />

      {team !== null && team.length > 0 && (
        <Card className="p-5 flex flex-wrap gap-8">
          <Stat value={team.length} label="team members" />
          <Stat value={team.filter((t) => t.status === "active").length} label="active" />
          <Stat value={team.filter((t) => t.role === "super_admin").length} label="super admins" />
        </Card>
      )}

      <ul className="space-y-2">
        {team === null && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[60px]" />)}
        {team?.map((member) => (
          <Card key={member.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-3 min-w-0">
              <IconTile icon={UserCog} tone={member.role === "super_admin" ? "amber" : "indigo"} />
              <span className="min-w-0">
                <span className="font-medium block truncate">{member.name}</span>
                <span className="text-slate-500 block truncate">{member.email}</span>
              </span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge status={member.role} />
              <Badge status={member.status} />
            </div>
          </Card>
        ))}
        {team?.length === 0 && <EmptyState icon={UserCog}>No team members yet.</EmptyState>}
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
