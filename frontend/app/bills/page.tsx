"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeIndianRupee, CreditCard, Receipt, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Bill } from "@/lib/types";
import { Badge, Button, Card, EmptyState, IconTile, Input, PageHeader, Skeleton, Stat } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function BillsPage() {
  return (
    <RequireAuth role="driver">
      <BillsContent />
    </RequireAuth>
  );
}

function BillsContent() {
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [refundReasonByBill, setRefundReasonByBill] = useState<Record<number, string>>({});
  const [refundFormOpenFor, setRefundFormOpenFor] = useState<number | null>(null);

  async function load() {
    const b = await apiFetch<Bill[]>("/bills/me");
    setBills(b);
  }

  useEffect(() => {
    load().catch((err) => toast.error(err instanceof ApiError ? err.message : "Failed to load your bills"));
  }, []);

  async function pay(billId: number) {
    try {
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ bill_id: billId, payment_method: "upi" }),
      });
      toast.success("Payment successful.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function requestRefund(paymentId: number) {
    const reason = refundReasonByBill[paymentId];
    if (!reason) {
      toast.error("Enter a reason for the refund request.");
      return;
    }
    try {
      await apiFetch(`/payments/${paymentId}/refund-request`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      toast.success("Refund requested — the operator will review it.");
      setRefundFormOpenFor(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  const sortedBills = useMemo(() => {
    if (!bills) return null;
    return [...bills].sort((a, b) => {
      if (!a.payment !== !b.payment) return a.payment ? 1 : -1;
      return new Date(b.generated_date).getTime() - new Date(a.generated_date).getTime();
    });
  }, [bills]);

  const totals = useMemo(() => {
    const paid = (bills ?? []).filter((b) => b.payment?.payment_status === "successful");
    const unpaid = (bills ?? []).filter((b) => !b.payment);
    return {
      totalSpent: paid.reduce((sum, b) => sum + Number(b.total_amount), 0),
      totalSaved: (bills ?? []).reduce((sum, b) => sum + Number(b.subscription_discount), 0),
      unpaidCount: unpaid.length,
      unpaidAmount: unpaid.reduce((sum, b) => sum + Number(b.total_amount), 0),
    };
  }, [bills]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Bills"
        subtitle="One bill per charging session, generated the moment you end it. Active subscription discounts are applied automatically before tax — network-wide, no matter which operator's station you're at."
      />

      {bills === null && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {bills !== null && bills.length > 0 && (
        <Card className="p-5 flex flex-wrap gap-8">
          <Stat value={`₹${totals.totalSpent.toFixed(2)}`} label="total spent" />
          <Stat value={`₹${totals.totalSaved.toFixed(2)}`} label="saved via subscription" />
          {totals.unpaidCount > 0 && (
            <Stat value={`₹${totals.unpaidAmount.toFixed(2)}`} label={`due on ${totals.unpaidCount} bill${totals.unpaidCount > 1 ? "s" : ""}`} />
          )}
        </Card>
      )}

      <ul className="space-y-3">
        {sortedBills?.map((bill) => (
          <Card key={bill.id} className={`p-4 ${!bill.payment ? "border-amber-200 ring-1 ring-amber-100" : ""}`}>
            <div className="flex flex-wrap items-start gap-3">
              <IconTile icon={Receipt} tone={bill.payment ? "slate" : "amber"} />
              <div className="flex-1 min-w-[160px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-100">{bill.station_name}</p>
                  {Number(bill.subscription_discount) > 0 && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-300 bg-indigo-500/15 rounded-full px-2 py-0.5">
                      <Sparkles size={10} /> discount applied
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {bill.connector_type_name} · {new Date(bill.generated_date).toLocaleString([], { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                </p>

                <div className="mt-3 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm max-w-xs">
                  <span className="text-slate-500">Energy</span>
                  <span className="text-right text-slate-300">₹{bill.energy_charge}</span>
                  {Number(bill.subscription_discount) > 0 && (
                    <>
                      <span className="text-emerald-400">Subscription discount</span>
                      <span className="text-right text-emerald-400">−₹{bill.subscription_discount}</span>
                    </>
                  )}
                  <span className="text-slate-500">Tax</span>
                  <span className="text-right text-slate-300">₹{bill.tax_amount}</span>
                  <span className="font-semibold text-slate-100 border-t border-slate-100 pt-1">Total</span>
                  <span className="text-right font-semibold text-slate-100 border-t border-slate-100 pt-1">₹{bill.total_amount}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {bill.payment ? (
                  <>
                    <Badge status={bill.payment.payment_status} />
                    {bill.payment.refund && <Badge status={bill.payment.refund.status} />}
                    {bill.payment.payment_status === "successful" && !bill.payment.refund && (
                      <Button variant="ghost" size="sm" onClick={() => setRefundFormOpenFor(bill.payment!.id)}>
                        <RotateCcw size={12} /> Request refund
                      </Button>
                    )}
                  </>
                ) : (
                  <Button size="sm" onClick={() => pay(bill.id)}>
                    <CreditCard size={12} /> Pay now
                  </Button>
                )}
              </div>
            </div>
            {refundFormOpenFor === bill.payment?.id && (
              <div className="mt-3 pl-[52px] flex gap-2 border-t border-slate-100 pt-3">
                <Input
                  placeholder="Reason for refund"
                  className="flex-1"
                  value={refundReasonByBill[bill.payment.id] ?? ""}
                  onChange={(e) => setRefundReasonByBill({ ...refundReasonByBill, [bill.payment!.id]: e.target.value })}
                />
                <Button onClick={() => requestRefund(bill.payment!.id)}>Submit</Button>
              </div>
            )}
          </Card>
        ))}
        {bills?.length === 0 && (
          <EmptyState icon={BadgeIndianRupee}>No bills yet — they appear automatically once you end a charging session.</EmptyState>
        )}
      </ul>
    </div>
  );
}
