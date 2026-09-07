"use client";

import { useEffect, useState } from "react";
import { History, Pencil, Plus, ShieldCheck, ShieldX, UserMinus, UserPlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { AuditLogEntry } from "@/lib/admin-types";
import { Card, EmptyState, PageHeader, Skeleton, Stat } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

const ACTION_ICONS: Record<string, LucideIcon> = {
  Create: Plus,
  Update: Pencil,
  Approve: ShieldCheck,
  Reject: ShieldX,
  Assign: UserPlus,
  Unassign: UserMinus,
};

export default function AuditLogPage() {
  return (
    <RequireAuth role="admin">
      <AuditLogContent />
    </RequireAuth>
  );
}

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);

  useEffect(() => {
    apiFetch<AuditLogEntry[]>("/admin/audit-log")
      .then(setEntries)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load audit log"));
  }, []);

  const weekCutoff = new Date().getTime() - 7 * 86400000;
  const recentCount = entries?.filter((e) => new Date(e.timestamp).getTime() >= weekCutoff).length ?? 0;

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Recent admin actions across your operator's stations." />
      {entries !== null && entries.length > 0 && (
        <Card className="p-5 mb-6 flex flex-wrap gap-8">
          <Stat value={entries.length} label="total actions" />
          <Stat value={recentCount} label="in the last 7 days" />
        </Card>
      )}
      {entries === null ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
      <Card>
        <ul className="divide-y divide-white/[0.06]">
          {entries.map((e) => {
            const Icon = ACTION_ICONS[e.action] ?? History;
            return (
              <li key={e.id} className="p-3.5 text-sm flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-100">{e.action}</span>{" "}
                  <span className="text-slate-500">
                    on {e.table_affected.replace(/_/g, " ")} #{e.record_id}
                  </span>
                  {e.description && <span className="text-slate-500"> — {e.description}</span>}
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
        {entries.length === 0 && <EmptyState icon={History}>No activity yet.</EmptyState>}
      </Card>
      )}
    </div>
  );
}
