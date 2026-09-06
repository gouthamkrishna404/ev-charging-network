"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AuditLogEntry } from "@/lib/admin-types";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function AuditLogPage() {
  return (
    <RequireAuth role="admin">
      <AuditLogContent />
    </RequireAuth>
  );
}

function AuditLogContent() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  useEffect(() => {
    apiFetch<AuditLogEntry[]>("/admin/audit-log").then(setEntries);
  }, []);

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Recent admin actions across your operator's stations." />
      <Card>
        <ul className="divide-y divide-slate-100">
          {entries.map((e) => (
            <li key={e.id} className="p-3 text-sm flex justify-between">
              <span>
                <span className="font-medium">{e.action}</span> on {e.table_affected} #{e.record_id}
                {e.description && <span className="text-slate-500"> — {e.description}</span>}
              </span>
              <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                {new Date(e.timestamp).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        {entries.length === 0 && <EmptyState>No activity yet.</EmptyState>}
      </Card>
    </div>
  );
}
