"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { AdminRefund } from "@/lib/admin-types";
import { Badge, Button, Card, EmptyState, IconTile, PageHeader, Skeleton, Stat } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function AdminRefundsPage() {
  return (
    <RequireAuth role="admin">
      <AdminRefundsContent />
    </RequireAuth>
  );
}

function AdminRefundsContent() {
  const [refunds, setRefunds] = useState<AdminRefund[] | null>(null);

  async function load() {
    setRefunds(await apiFetch<AdminRefund[]>("/admin/refunds"));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load refunds"));
  }, []);

  async function resolve(id: number, action: "approve" | "reject") {
    if (!confirm(`${action === "approve" ? "Approve" : "Reject"} this refund request?`)) return;
    try {
      await apiFetch(`/admin/refunds/${id}/${action}`, { method: "POST" });
      toast.success(action === "approve" ? "Refund approved." : "Refund rejected.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  const sortedRefunds = useMemo(() => {
    if (!refunds) return null;
    return [...refunds].sort((a, b) => (a.status === "pending") === (b.status === "pending") ? 0 : a.status === "pending" ? -1 : 1);
  }, [refunds]);

  const pending = refunds?.filter((r) => r.status === "pending") ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Refund Requests" subtitle="Refunds requested by drivers on bills at your stations." />

      {refunds !== null && refunds.length > 0 && (
        <Card className="p-5 flex flex-wrap gap-8">
          <Stat value={pending.length} label="pending review" />
          <Stat value={`₹${pending.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(2)}`} label="pending amount" />
          <Stat value={refunds.filter((r) => r.status === "approved").length} label="approved all-time" />
        </Card>
      )}

      <ul className="space-y-3">
        {refunds === null && [...Array(2)].map((_, i) => <Skeleton key={i} className="h-[76px]" />)}
        {sortedRefunds?.map((r) => (
          <Card key={r.id} className="p-4 flex flex-wrap items-center gap-3">
            <IconTile icon={RotateCcw} tone={r.status === "pending" ? "amber" : "slate"} />
            <div className="flex-1 min-w-[160px] text-sm">
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
        {refunds?.length === 0 && <EmptyState icon={RotateCcw}>No refund requests.</EmptyState>}
      </ul>
    </div>
  );
}
