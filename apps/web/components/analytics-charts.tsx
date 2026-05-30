"use client"

function getToken(){const m=document.cookie.match(/(?:^|;\s*)rapid_token=([^;]*)/);return m?decodeURIComponent(m[1]):null;};
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface ChartData {
  statusData: { name: string; value: number; color: string }[];
  riskData: { name: string; value: number; color: string }[];
  departmentData: { name: string; total: number; finalized: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  submitted: "#60a5fa",
  awaiting_agreement: "#f59e0b",
  approved: "#34d399",
  finalized: "#6366f1",
  execution_complete: "#10b981",
  rejected: "#f87171",
  changes_requested: "#fb923c",
};

const RISK_COLORS: Record<string, string> = {
  low: "#34d399",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function formatLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export function AnalyticsCharts() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    const token = getToken();
    if (!token) return;

    try {
      // Fetch all docs with high limit for analytics
      const res = await fetch(`${API}/documents?limit=100&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const docs: { status: string; riskLevel: string; department?: string }[] = json.data ?? [];

      // Status distribution
      const statusCounts: Record<string, number> = {};
      docs.forEach(d => { statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1; });
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({
        name: formatLabel(name), value, color: STATUS_COLORS[name] ?? "#94a3b8",
      }));

      // Risk distribution
      const riskCounts: Record<string, number> = {};
      docs.forEach(d => { riskCounts[d.riskLevel] = (riskCounts[d.riskLevel] ?? 0) + 1; });
      const riskData = Object.entries(riskCounts).map(([name, value]) => ({
        name: formatLabel(name), value, color: RISK_COLORS[name] ?? "#94a3b8",
      }));

      // Department breakdown
      const deptMap: Record<string, { total: number; finalized: number }> = {};
      docs.forEach(d => {
        const dept = d.department ?? "Unassigned";
        if (!deptMap[dept]) deptMap[dept] = { total: 0, finalized: 0 };
        deptMap[dept].total++;
        if (d.status === "finalized" || d.status === "execution_complete") deptMap[dept].finalized++;
      });
      const departmentData = Object.entries(deptMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6);

      setData({ statusData, riskData, departmentData });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[1,2,3].map(i => (
        <Card key={i} className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (!data) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-800">Analytics</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Status Distribution — Pie */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.statusData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.statusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {data.statusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {data.statusData.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-slate-500">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution — Pie */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Risk Level Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.riskData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data.riskData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                    {data.riskData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
              {data.riskData.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-slate-500">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Department Breakdown — Bar */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Decisions by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.departmentData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.departmentData} layout="vertical"
                  margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={72} stroke="#cbd5e1" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" name="Total" fill="#6366f1" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="finalized" name="Finalized" fill="#34d399" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
