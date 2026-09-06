"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Bill } from "@/lib/types";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

export default function BillsPage() {
  return (
    <RequireAuth role="driver">
      <BillsContent />
    </RequireAuth>
  );
}

function BillsContent() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [refundReasonByBill, setRefundReasonByBill] = useState<Record<number, string>>({});
  const [refundFormOpenFor, setRefundFormOpenFor] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const b = await apiFetch<Bill[]>("/bills/me");
    setBills(b);
  }

  useEffect(() => {
    load();
  }, []);

  async function pay(billId: number) {
    setMessage(null);
    try {
      await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({ bill_id: billId, payment_method: "upi" }),
      });
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function requestRefund(paymentId: number) {
    setMessage(null);
    const reason = refundReasonByBill[paymentId];
    if (!reason) {
      setMessage("Enter a reason for the refund request.");
      return;
    }
    try {
      await apiFetch(`/payments/${paymentId}/refund-request`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      setRefundFormOpenFor(null);
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Bills"
        subtitle="One bill per charging session, generated the moment you end it. Active subscription discounts are applied automatically before tax."
      />
      {message && <Alert type="error">{message}</Alert>}
      <ul className="space-y-3">
        {bills.map((bill) => (
          <Card key={bill.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm">
                <p>
                  Session #{bill.session_id} — energy ₹{bill.energy_charge}
                  {Number(bill.subscription_discount) > 0 && <> − discount ₹{bill.subscription_discount}</>} + tax ₹
                  {bill.tax_amount} = <span className="font-medium">₹{bill.total_amount}</span>
                </p>
                <p className="text-slate-500 text-xs mt-0.5">{new Date(bill.generated_date).toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {bill.payment ? (
                  <>
                    <Badge status={bill.payment.payment_status} />
                    {bill.payment.refund && <Badge status={bill.payment.refund.status} />}
                    {bill.payment.payment_status === "successful" && !bill.payment.refund && (
                      <Button variant="ghost" onClick={() => setRefundFormOpenFor(bill.payment!.id)}>
                        Request refund
                      </Button>
                    )}
                  </>
                ) : (
                  <Button onClick={() => pay(bill.id)}>Pay now</Button>
                )}
              </div>
            </div>
            {refundFormOpenFor === bill.payment?.id && (
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
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
        {bills.length === 0 && <EmptyState>No bills yet — they appear automatically once you end a charging session.</EmptyState>}
      </ul>
    </div>
  );
}
