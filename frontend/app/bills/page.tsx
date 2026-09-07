"use client";

import { useEffect, useState } from "react";
import { CreditCard, Receipt, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { Bill } from "@/lib/types";
import { Badge, Button, Card, EmptyState, IconTile, Input, PageHeader, Skeleton } from "@/components/ui";
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Bills"
        subtitle="One bill per charging session, generated the moment you end it. Active subscription discounts are applied automatically before tax."
      />
      <ul className="space-y-3">
        {bills === null && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[76px]" />)}
        {bills?.map((bill) => (
          <Card key={bill.id} className="p-4">
            <div className="flex items-start gap-3">
              <IconTile icon={Receipt} tone={bill.payment ? "slate" : "amber"} />
              <div className="flex-1 min-w-0 text-sm">
                <p className="text-slate-900">
                  Session #{bill.session_id} — energy ₹{bill.energy_charge}
                  {Number(bill.subscription_discount) > 0 && <> − discount ₹{bill.subscription_discount}</>} + tax ₹
                  {bill.tax_amount} = <span className="font-semibold">₹{bill.total_amount}</span>
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{new Date(bill.generated_date).toLocaleString()}</p>
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
          <EmptyState icon={Receipt}>No bills yet — they appear automatically once you end a charging session.</EmptyState>
        )}
      </ul>
    </div>
  );
}
