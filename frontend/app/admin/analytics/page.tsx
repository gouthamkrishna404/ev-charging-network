"use client";

import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeIndianRupee, Building2, Star, Zap } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { AnalyticsOverview } from "@/lib/admin-types";
import { Alert, Card, IconTile, PageHeader, Select, Skeleton } from "@/components/ui";
import RequireAuth from "@/components/RequireAuth";

const CONNECTOR_COLORS = ["#4f46e5", "#f59e0b", "#10b981", "#ec4899", "#06b6d4"];

export default function AdminAnalyticsPage() {
  return (
    <RequireAuth role="admin">
      <AdminAnalyticsContent />
    </RequireAuth>
  );
}

function AdminAnalyticsContent() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    apiFetch<AnalyticsOverview>(`/admin/analytics/overview?days=${days}`)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load analytics"));
  }, [days]);

  const dailyChart = (data?.daily ?? []).map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Revenue, session volume, and connector usage across every station you manage."
        action={
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />
      {error && <Alert type="error">{error}</Alert>}

      {!data && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Card className="p-4 flex items-center gap-3">
              <IconTile icon={BadgeIndianRupee} tone="indigo" />
              <div>
                <p className="text-xl font-semibold text-slate-900">₹{data.kpis.total_revenue.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-500">All-time revenue</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <IconTile icon={Zap} tone="amber" />
              <div>
                <p className="text-xl font-semibold text-slate-900">{data.kpis.total_sessions.toLocaleString("en-IN")}</p>
                <p className="text-xs text-slate-500">Completed sessions</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <IconTile icon={Building2} tone="slate" />
              <div>
                <p className="text-xl font-semibold text-slate-900">{data.kpis.active_stations}</p>
                <p className="text-xs text-slate-500">Active stations</p>
              </div>
            </Card>
            <Card className="p-4 flex items-center gap-3">
              <IconTile icon={Star} tone="amber" />
              <div>
                <p className="text-xl font-semibold text-slate-900">{data.kpis.avg_rating ?? "—"}</p>
                <p className="text-xs text-slate-500">Average rating</p>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <p className="text-sm font-semibold text-slate-700 mb-4">Revenue trend</p>
            {dailyChart.length === 0 ? (
              <p className="text-sm text-slate-400 py-10 text-center">No billed sessions in this window yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === "revenue" ? `₹${Number(value).toFixed(2)}` : String(value),
                      name === "revenue" ? "Revenue" : "Sessions",
                    ]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Revenue by station</p>
              {data.by_station.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(200, data.by_station.length * 34)}>
                  <BarChart data={data.by_station} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      dataKey="station_name"
                      type="category"
                      width={150}
                      tick={{ fontSize: 11, fill: "#475569" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Revenue"]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <p className="text-sm font-semibold text-slate-700 mb-4">Sessions by connector type</p>
              {data.by_connector_type.length === 0 ? (
                <p className="text-sm text-slate-400 py-10 text-center">No completed sessions yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.by_connector_type} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="type_name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="sessions" radius={[4, 4, 0, 0]}>
                      {data.by_connector_type.map((_, i) => (
                        <Cell key={i} fill={CONNECTOR_COLORS[i % CONNECTOR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
