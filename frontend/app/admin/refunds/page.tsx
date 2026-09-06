"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { AdminRefund } from "@/lib/admin-types";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function AdminRefundsPage() {
  return (
    <RequireAuth role="admin">
      <AdminRefundsContent />
    </RequireAuth>
  );
}

function AdminRefundsContent() {
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);

  async function load() {
    setRefunds(await apiFetch<AdminRefund[]>("/admin/refunds"));
  }

  useEffect(() => {
    load();
  }, []);

  async function resolve(id: number, action: "approve" | "reject") {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this refund request?`)) return;
    await apiFetch(`/admin/refunds/${id}/${action}`, { method: "POST" });
    await load();
  }

  return (
    <div>
      <PageHeader title="Refund Requests" subtitle="Refunds requested by drivers on bills at your stations." />
      <ul className="space-y-3">
        {refunds.map((r) => (
          <Card key={r.id} className="p-4 flex items-center justify-between">
            <div className="text-sm">
              <p>
                Payment #{r.payment_id} — ₹{r.amount}
              </p>
              <p className="text-slate-500">{r.reason}</p>
              <p className="text-xs text-slate-400">{new Date(r.refund_date).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge status={r.status} />
              {r.status === "pending" && (
                <>
                  <Button onClick={() => resolve(r.id, "approve")}>Approve</Button>
                  <Button variant="secondary" onClick={() => resolve(r.id, "reject")}>
                    Reject
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {refunds.length === 0 && <EmptyState>No refund requests.</EmptyState>}
      </ul>
    </div>
  );
}
