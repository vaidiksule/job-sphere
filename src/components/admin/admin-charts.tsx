"use client";

import type { ReactElement } from "react";
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
import { cn } from "@/lib/utils";

const COLORS = ["#5f6f52", "#e88c55", "#9db28e", "#d7c268", "#b6543c", "#66705d"];

function formatLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function AdminChartsPanel({ charts }: { charts: AdminCharts }) {
  const statusData = charts.statusBreakdown.map((row) => ({
    ...row,
    label: formatLabel(row.status),
  }));

  return (
    <div className="space-y-5">
      <div className="charts-grid grid gap-5 lg:grid-cols-2">
        <ChartCard title="Users by role">
          <ChartBox>
            <PieChart>
              <Pie data={charts.usersByRole} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={80} label isAnimationActive={false}>
                {charts.usersByRole.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Application status">
          <ChartBox>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#5f6f52" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Signups by week">
          <ChartBox>
            <LineChart data={charts.signupsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#e88c55" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Applications by week">
          <ChartBox>
            <LineChart data={charts.applicationsByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#5f6f52" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Fit score bands">
          <ChartBox>
            <BarChart data={charts.scoreBands}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="band" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#9db28e" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Top jobs by applicants">
          <ChartBox tall>
            <BarChart data={charts.topJobsByApplicants} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="jobTitle" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#e88c55" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>
      </div>

      <div className="charts-grid grid gap-5 lg:grid-cols-2">
        <ChartCard title="Hiring funnel" subtitle="Applications at each active stage">
          <ChartBox tall>
            <BarChart data={charts.hiringFunnel} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="stage" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#5f6f52" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Resume analysis status">
          <ChartBox tall>
            <PieChart>
              <Pie data={charts.analysisStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label isAnimationActive={false}>
                {charts.analysisStatus.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Avg fit score by week">
          <ChartBox>
            <LineChart data={charts.avgFitByWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value, name) => [value, name === "avgFit" ? "Avg fit %" : name]} />
              <Line type="monotone" dataKey="avgFit" stroke="#5f6f52" strokeWidth={2} dot={{ r: 3 }} name="Avg fit" isAnimationActive={false} />
            </LineChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Top companies by applications">
          <ChartBox tall>
            <BarChart data={charts.topCompanies} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="company" width={110} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#d7c268" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Highest avg fit by job" subtitle="Roles with strongest candidate match">
          <ChartBox tall>
            <BarChart data={charts.avgFitByJob} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="jobTitle" width={120} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [value, name === "avgFit" ? "Avg fit %" : name]}
                labelFormatter={(label, payload) => {
                  const row = payload?.[0]?.payload as { companyName?: string } | undefined;
                  return row?.companyName ? `${label} · ${row.companyName}` : label;
                }}
              />
              <Bar dataKey="avgFit" fill="#9db28e" radius={[0, 8, 8, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Applicants per job" subtitle="How many roles sit in each volume bucket">
          <ChartBox>
            <BarChart data={charts.applicationsPerJobBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="bucket" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [value, "Jobs"]} />
              <Bar dataKey="jobCount" fill="#e88c55" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Workplace type (jobs)">
          <ChartBox>
            <PieChart>
              <Pie data={charts.workplaceTypes} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label isAnimationActive={false}>
                {charts.workplaceTypes.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Open vs closed jobs">
          <ChartBox>
            <PieChart>
              <Pie data={charts.openVsClosedJobs} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label isAnimationActive={false}>
                {charts.openVsClosedJobs.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Improvement priority" subtitle="From AI analysis recommendations">
          <ChartBox>
            <BarChart data={charts.improvementPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(42,56,34,0.1)" />
              <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#b6543c" radius={[8, 8, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartBox>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartBox({ tall, children }: { tall?: boolean; children: ReactElement }) {
  return (
    <div className={cn("chart-print-host w-full", tall && "chart-print-host--tall")} style={{ height: tall ? 280 : 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-[28px] p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}
