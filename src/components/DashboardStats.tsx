import React from "react";
import { 
  FolderKanban, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock,
  Sparkles,
  PieChart,
} from "lucide-react";
import MonthlyBillingChart from "@/src/components/MonthlyBillingChart";

interface StatsData {
  totalVendors: number;
  totalInvoices: number;
  totalAmount: number;
  categories: { name: string; count: number; total: number }[];
  vendors: { vendorId: string; vendorName: string; invoiceCount: number; totalAmount: number }[];
}

interface MonthlyTrendItem {
  monthKey: string;
  label: string;
  count: number;
  total: number;
}

interface DashboardStatsProps {
  stats: StatsData | null;
  loading: boolean;
  monthlyTrend: MonthlyTrendItem[];
  statusKPIs: {
    paidCount: number;
    paidSum: number;
    holdCount: number;
    holdSum: number;
    rejectedCount: number;
    rejectedSum: number;
    pendingCount: number;
    pendingSum: number;
  };
  onStatusClick?: (status: string) => void;
}

export default function DashboardStats({ stats, loading, monthlyTrend, statusKPIs, onStatusClick }: DashboardStatsProps) {
  if (loading || !stats) {
    return (
      <div id="stats-loading-skeleton" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-gray-100 rounded-3xl border border-gray-200/50"></div>
          ))}
        </div>
        <div className="h-72 bg-gray-100 rounded-3xl border border-gray-200/50 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-gray-100 rounded-3xl border border-gray-200/50 animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded-3xl border border-gray-200/50 animate-pulse"></div>
        </div>
      </div>
    );
  }

  // Format currency in INR
  const formatINR = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Modern, colorful linear gradients for category cards and progress bars
  const gradients: Record<string, string> = {
    "Rent": "from-blue-500 to-indigo-600",
    "Manpower": "from-purple-500 to-violet-600",
    "Vehicle rent": "from-amber-400 to-orange-500",
    "Repairs & maintenance": "from-emerald-400 to-teal-500",
    "Electricity": "from-rose-500 to-pink-600",
    "Others": "from-slate-400 to-slate-500",
  };

  const textColors: Record<string, string> = {
    "Rent": "text-indigo-600",
    "Manpower": "text-violet-600",
    "Vehicle rent": "text-orange-600",
    "Repairs & maintenance": "text-emerald-600",
    "Electricity": "text-pink-600",
    "Others": "text-gray-500",
  };

  const bgLightColors: Record<string, string> = {
    "Rent": "bg-indigo-50/80 border-indigo-100",
    "Manpower": "bg-violet-50/80 border-violet-100",
    "Vehicle rent": "bg-orange-50/80 border-orange-100",
    "Repairs & maintenance": "bg-emerald-50/80 border-emerald-100",
    "Electricity": "bg-pink-50/80 border-pink-100",
    "Others": "bg-slate-50/80 border-slate-100",
  };

  // Simple hashing to get initial letter & vibrant avatar color for vendor listings
  const getVendorInitial = (name: string) => {
    return name ? name.trim().charAt(0).toUpperCase() : "?";
  };

  const getVendorColor = (name: string) => {
    const code = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      "from-pink-500 to-rose-600 text-white shadow-pink-100",
      "from-amber-500 to-orange-600 text-white shadow-amber-100",
      "from-emerald-500 to-teal-600 text-white shadow-emerald-100",
      "from-blue-500 to-indigo-600 text-white shadow-blue-100",
      "from-violet-500 to-purple-600 text-white shadow-violet-100",
      "from-cyan-500 to-blue-600 text-white shadow-cyan-100"
    ];
    return colors[code % colors.length];
  };

  const maxCategoryTotal = Math.max(...stats.categories.map(c => c.total), 1);
  const totalCategorySum = stats.categories.reduce((acc, c) => acc + c.total, 0) || 1;

  // Insight Calculations
  const peakMonth = monthlyTrend.reduce((max, item) => item.total > max.total ? item : max, { label: "N/A", total: 0 });
  const monthsWithInvoices = monthlyTrend.filter(m => m.total > 0).length || 1;
  const avgBillingPerMonth = stats.totalAmount / monthsWithInvoices;

  return (
    <div id="dashboard-stats" className="space-y-8 animate-fade-in">
      
      {/* Premium Dashboard Header & Sparkle Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 md:p-8 text-white shadow-lg shadow-indigo-100 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              SMILe Intelligence Center
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight">
              Operational Analytics
            </h2>
            <p className="text-indigo-100 text-sm max-w-xl">
              Track vendor invoice health, regional hub spending, and category cost distributions in real time.
            </p>
          </div>

          <div className="flex gap-4 md:gap-8 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 self-stretch md:self-auto justify-around">
            <div className="text-center px-2">
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest block">Total Invoices</span>
              <p className="text-xl md:text-2xl font-bold font-mono mt-1 text-white">{stats.totalInvoices}</p>
            </div>
            <div className="w-[1px] bg-white/15 self-stretch"></div>
            <div className="text-center px-2">
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest block">Gross Amount</span>
              <p className="text-xl md:text-2xl font-bold font-mono mt-1 text-amber-300">{formatINR(stats.totalAmount)}</p>
            </div>
            <div className="w-[1px] bg-white/15 self-stretch"></div>
            <div className="text-center px-2">
              <span className="text-[10px] text-indigo-200 uppercase font-bold tracking-widest block">Active Partners</span>
              <p className="text-xl md:text-2xl font-bold font-mono mt-1 text-white">{stats.totalVendors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Column Status KPI Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Paid KPI */}
        <div 
          onClick={() => onStatusClick?.("Paid")}
          className="bg-white rounded-3xl border-l-4 border-l-emerald-500 border-y border-r border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:border-emerald-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] group"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Paid Settled</span>
            <h3 className="text-lg font-bold text-gray-950 font-mono mt-0.5 tracking-tight group-hover:text-emerald-600 transition-colors">
              {formatINR(statusKPIs.paidSum)}
            </h3>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50/50 px-2 py-0.5 rounded-md inline-block mt-1">
              {statusKPIs.paidCount} processed
            </span>
          </div>
        </div>

        {/* Hold KPI */}
        <div 
          onClick={() => onStatusClick?.("Hold")}
          className="bg-white rounded-3xl border-l-4 border-l-amber-500 border-y border-r border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:border-amber-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] group"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Held Invoices</span>
            <h3 className="text-lg font-bold text-gray-950 font-mono mt-0.5 tracking-tight group-hover:text-amber-600 transition-colors">
              {formatINR(statusKPIs.holdSum)}
            </h3>
            <span className="text-xs text-amber-600 font-semibold bg-amber-50/50 px-2 py-0.5 rounded-md inline-block mt-1">
              {statusKPIs.holdCount} flagged
            </span>
          </div>
        </div>

        {/* Rejected KPI */}
        <div 
          onClick={() => onStatusClick?.("Rejected")}
          className="bg-white rounded-3xl border-l-4 border-l-rose-500 border-y border-r border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:border-rose-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] group"
        >
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
            <XCircle className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Rejected Logs</span>
            <h3 className="text-lg font-bold text-gray-950 font-mono mt-0.5 tracking-tight group-hover:text-rose-600 transition-colors">
              {formatINR(statusKPIs.rejectedSum)}
            </h3>
            <span className="text-xs text-rose-600 font-semibold bg-rose-50/50 px-2 py-0.5 rounded-md inline-block mt-1">
              {statusKPIs.rejectedCount} dynamic
            </span>
          </div>
        </div>

        {/* Pending KPI */}
        <div 
          onClick={() => onStatusClick?.("Pending")}
          className="bg-white rounded-3xl border-l-4 border-l-sky-500 border-y border-r border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:border-sky-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer select-none active:scale-[0.98] group"
        >
          <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
            <Clock className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Pending Queue</span>
            <h3 className="text-lg font-bold text-gray-950 font-mono mt-0.5 tracking-tight group-hover:text-sky-600 transition-colors">
              {formatINR(statusKPIs.pendingSum)}
            </h3>
            <span className="text-xs text-sky-600 font-semibold bg-sky-50/50 px-2 py-0.5 rounded-md inline-block mt-1">
              {statusKPIs.pendingCount} awaiting
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Trend Visualization Section */}
      <MonthlyBillingChart
        monthlyTrend={monthlyTrend}
        formatINR={formatINR}
        avgBillingPerMonth={avgBillingPerMonth}
        peakMonth={peakMonth}
        monthsWithInvoices={monthsWithInvoices}
      />

      {/* Category breakdown and Activity lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown visualizer */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <PieChart className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-base font-display font-bold text-gray-900">Billing by Account Type</h4>
            </div>
            <p className="text-xs text-gray-500 mb-6">Percentage distribution of expenditures across primary operations.</p>
            
            {stats.categories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <FolderKanban className="w-10 h-10 stroke-[1.5] mb-2 text-gray-300" />
                <p className="text-sm">No operational data recorded yet</p>
              </div>
            ) : (
              <div className="space-y-5">
                {stats.categories.map((cat) => {
                  const percentRatio = Math.round((cat.total / totalCategorySum) * 100);
                  const maxPercent = Math.round((cat.total / maxCategoryTotal) * 100);
                  const gradientClass = gradients[cat.name] || "from-gray-400 to-gray-500";
                  const textColorClass = textColors[cat.name] || "text-gray-500";
                  const bgColorLight = bgLightColors[cat.name] || "bg-slate-50 border-slate-100";

                  return (
                    <div key={cat.name} className="space-y-2 group">
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradientClass} shadow-sm group-hover:scale-110 transition-transform`}></span>
                          <span className="font-bold text-gray-800">{cat.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${bgColorLight} ${textColorClass}`}>
                            {cat.count} {cat.count === 1 ? 'inv' : 'invs'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-950 font-mono">{formatINR(cat.total)}</span>
                          <span className="text-[10px] font-bold text-gray-400 ml-1.5 font-mono">({percentRatio}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden p-[1px]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-700 shadow-sm relative`}
                          style={{ width: `${maxPercent}%` }}
                        >
                          <div className="absolute inset-y-0 right-0 w-2 bg-white/20 blur-[1px]"></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Vendor upload visibility progress list */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Users className="w-4.5 h-4.5" />
              </div>
              <h4 className="text-base font-display font-bold text-gray-900">Vibrant Vendor Activity</h4>
            </div>
            <p className="text-xs text-gray-500 mb-6">Summary of invoice volume and transaction value per registered partner.</p>

            {stats.vendors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users className="w-10 h-10 stroke-[1.5] mb-2 text-gray-300" />
                <p className="text-sm">No registered partners detected yet</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[310px] overflow-y-auto pr-1">
                {stats.vendors
                  .sort((a, b) => b.invoiceCount - a.invoiceCount)
                  .map((vendor) => {
                    const maxCount = Math.max(...stats.vendors.map(v => v.invoiceCount), 1);
                    const percent = Math.round((vendor.invoiceCount / maxCount) * 100);
                    const avatarStyle = getVendorColor(vendor.vendorName);

                    return (
                      <div key={vendor.vendorId} className="p-3.5 bg-gradient-to-r from-gray-50/50 to-white hover:from-indigo-50/20 hover:to-indigo-50/5 rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all duration-300 space-y-3 group">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Vendor Initials Avatar */}
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${avatarStyle} flex items-center justify-center font-bold text-xs shrink-0 shadow-sm`}>
                              {getVendorInitial(vendor.vendorName)}
                            </div>
                            <span className="font-semibold text-gray-900 truncate max-w-[180px]" title={vendor.vendorName}>
                              {vendor.vendorName}
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-gray-600 bg-gray-100/80 px-2 py-0.5 rounded-lg">
                            <strong className="text-slate-900 font-bold">{vendor.invoiceCount}</strong> {vendor.invoiceCount === 1 ? 'invoice' : 'invoices'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 pl-11">
                          <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-700"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-mono font-bold text-indigo-950 whitespace-nowrap bg-indigo-50/30 px-2 py-0.5 rounded-md">
                            {formatINR(vendor.totalAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
