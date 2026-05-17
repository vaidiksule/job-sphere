"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminCharts } from "@/lib/types";

const COLORS = ["#5f6f52", "#e88c55", "#9db28e", "#d7c268", "#b6543c", "#66705d"];

export function AdminChartsPanel({ charts }: { charts: AdminCharts }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <ChartCard title="Users by role">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={charts.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label>
              {charts.usersByRole.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Application status">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={charts.statusBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
            <XAxis dataKey="status" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#5f6f52" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Signups by week">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={charts.signupsByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#e88c55" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Applications by week">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={charts.applicationsByWeek}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#5f6f52" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Fit score bands">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={charts.scoreBands}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
            <XAxis dataKey="band" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#9db28e" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top jobs by applicants">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={charts.topJobsByApplicants} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="jobTitle" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="#e88c55" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-[28px] p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}
