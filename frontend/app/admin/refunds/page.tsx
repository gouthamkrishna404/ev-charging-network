"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminRefund } from "@/lib/admin-types";
import { Badge, Button, Card, EmptyState, IconTile, PageHeader } from "@/components/ui";
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
          <Card key={r.id} className="p-4 flex items-center gap-3">
            <IconTile icon={RotateCcw} tone={r.status === "pending" ? "amber" : "slate"} />
            <div className="flex-1 min-w-0 text-sm">
              <p className="text-slate-900">
                Payment #{r.payment_id} — <span className="font-semibold">₹{r.amount}</span>
              </p>
              <p className="text-slate-500">{r.reason}</p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(r.refund_date).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge status={r.status} />
              {r.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => resolve(r.id, "approve")}>
                    <Check size={12} /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => resolve(r.id, "reject")}>
                    <X size={12} /> Reject
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
        {refunds.length === 0 && <EmptyState icon={RotateCcw}>No refund requests.</EmptyState>}
      </ul>
    </div>
  );
}
