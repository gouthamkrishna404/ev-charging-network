"use client";

import { useEffect, useState } from "react";
import { History, Pencil, Plus, ShieldCheck, ShieldX, UserMinus, UserPlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { AuditLogEntry } from "@/lib/admin-types";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
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

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Recent admin actions across your operator's stations." />
      {entries === null ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
      <Card>
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => {
            const Icon = ACTION_ICONS[e.action] ?? History;
            return (
              <li key={e.id} className="p-3.5 text-sm flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-900">{e.action}</span>{" "}
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
