"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { Bill } from "@/lib/types";

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Bills</h1>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <ul className="space-y-2">
        {bills.map((bill) => (
          <li key={bill.id} className="border border-slate-200 rounded p-3 bg-white text-sm">
            <div className="flex items-center justify-between">
              <span>
                Session #{bill.session_id} &mdash; energy ₹{bill.energy_charge} + tax ₹{bill.tax_amount} ={" "}
                <span className="font-medium">₹{bill.total_amount}</span>
                <span className="text-slate-500"> &middot; {new Date(bill.generated_date).toLocaleString()}</span>
              </span>
              {bill.payment ? (
                <span className="text-green-700 text-xs">Paid ({bill.payment.transaction_reference})</span>
              ) : (
                <button onClick={() => pay(bill.id)} className="rounded bg-slate-900 text-white px-3 py-1 text-xs">
                  Pay now
                </button>
              )}
            </div>
          </li>
        ))}
        {bills.length === 0 && <p className="text-sm text-slate-500">No bills yet.</p>}
      </ul>
    </div>
  );
}
