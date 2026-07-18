"use client";

import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { BarChart3, ArrowUpRight } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

export type MonthlyTrendItem = {
  monthKey: string;
  label: string;
  count: number;
  total: number;
};

type MonthlyBillingChartProps = {
  monthlyTrend: MonthlyTrendItem[];
  formatINR: (value: number) => string;
  avgBillingPerMonth: number;
  peakMonth: { label: string; total: number };
  monthsWithInvoices: number;
};

function shortMonthLabel(label: string): string {
  return label.split(" ")[0] || label;
}

export default function MonthlyBillingChart({
  monthlyTrend,
  formatINR,
  avgBillingPerMonth,
  peakMonth,
  monthsWithInvoices,
}: MonthlyBillingChartProps) {
  const chartData = useMemo<ChartData<"bar" | "line">>(() => {
    const labels = monthlyTrend.map((m) => shortMonthLabel(m.label));

    return {
      labels,
      datasets: [
        {
          type: "bar" as const,
          label: "Billed Amount (INR)",
          data: monthlyTrend.map((m) => m.total),
          yAxisID: "yAmount",
          backgroundColor: "rgba(79, 70, 229, 0.88)",
          hoverBackgroundColor: "rgba(67, 56, 202, 0.95)",
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 36,
          order: 2,
        },
        {
          type: "line" as const,
          label: "Invoices Received (Qty)",
          data: monthlyTrend.map((m) => m.count),
          yAxisID: "yVolume",
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          pointBackgroundColor: "#059669",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          order: 1,
        },
      ],
    };
  }, [monthlyTrend]);

  const options = useMemo<ChartOptions<"bar" | "line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          titleFont: { size: 12, weight: "bold" },
          bodyFont: { size: 11, family: "ui-monospace, monospace" },
          padding: 12,
          cornerRadius: 12,
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex ?? 0;
              return monthlyTrend[idx]?.label || "";
            },
            label: (item: TooltipItem<"bar" | "line">) => {
              if (item.dataset.yAxisID === "yAmount") {
                return ` Expenditure: ${formatINR(Number(item.raw) || 0)}`;
              }
              return ` Invoices: ${Number(item.raw) || 0} received`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 11, weight: 600 },
          },
          border: { display: false },
        },
        yAmount: {
          type: "linear",
          position: "left",
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.25)",
            drawTicks: false,
          },
          border: { display: false, dash: [4, 4] },
          ticks: {
            color: "#6366f1",
            font: { size: 10, weight: 600 },
            maxTicksLimit: 5,
            callback: (value) => {
              const n = Number(value);
              if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
              if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
              if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
              return `₹${n}`;
            },
          },
          title: {
            display: true,
            text: "Amount (INR)",
            color: "#6366f1",
            font: { size: 10, weight: 700 },
          },
        },
        yVolume: {
          type: "linear",
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          border: { display: false },
          ticks: {
            color: "#059669",
            font: { size: 10, weight: 600 },
            precision: 0,
            maxTicksLimit: 5,
          },
          title: {
            display: true,
            text: "Invoice Qty",
            color: "#059669",
            font: { size: 10, weight: 700 },
          },
        },
      },
      animation: {
        duration: 450,
        easing: "easeOutQuart",
      },
    }),
    [formatINR, monthlyTrend]
  );

  const hasData = monthlyTrend.some((m) => m.total > 0 || m.count > 0);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-display font-bold text-gray-900">
              Monthly Billing &amp; Volumes
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dual-axis view of billed amount vs invoice volume over time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <div className="flex items-center gap-2 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-50">
            <span className="w-3.5 h-3.5 bg-gradient-to-br from-indigo-500 to-purple-400 rounded-md" />
            <span className="text-gray-700">Billed Amount (INR)</span>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-50">
            <span className="w-3.5 h-1.5 bg-emerald-500 rounded-full" />
            <span className="text-gray-700">Invoices Received (Qty)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="relative h-72 md:h-80 border border-gray-100/80 rounded-2xl p-4 bg-gradient-to-b from-gray-50/40 to-white">
            {hasData ? (
              <Chart type="bar" data={chartData} options={options} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <BarChart3 className="w-10 h-10 mb-2 text-gray-300" />
                <p className="text-sm font-medium">No monthly billing data yet</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-around space-y-4 bg-gradient-to-b from-gray-50 to-indigo-50/20 p-6 rounded-2xl border border-indigo-100/30">
          <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-widest block">
            Operational Trends
          </span>

          <div className="space-y-1 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-xs text-gray-500 font-semibold block">
              Average Billing / Month
            </span>
            <h4 className="text-lg font-bold text-slate-900 font-mono">
              {formatINR(avgBillingPerMonth)}
            </h4>
          </div>

          <div className="space-y-1 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 bg-rose-50 rounded-bl-full pointer-events-none flex items-start justify-end p-1.5">
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-xs text-rose-600 font-bold">Peak Invoice Activity</span>
            <h4
              className="text-base font-bold text-gray-900 truncate pr-6"
              title={peakMonth.label}
            >
              {peakMonth.label}
            </h4>
            <p className="text-[11px] text-gray-500 font-bold font-mono">
              {formatINR(peakMonth.total)}
            </p>
          </div>

          <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
            <p className="text-xs font-semibold text-indigo-950">
              Sustained operation across{" "}
              <strong className="font-bold text-indigo-600">
                {monthsWithInvoices} active months
              </strong>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
