export function formatCurrency(val: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function getCategoryBadgeClass(category: string): string {
  const map: Record<string, string> = {
    Rent: "bg-blue-50 text-blue-700 border-blue-100",
    Manpower: "bg-violet-50 text-violet-700 border-violet-100",
    "Vehicle rent": "bg-amber-50 text-amber-700 border-amber-100",
    "Repairs & maintenance": "bg-emerald-50 text-emerald-700 border-emerald-100",
    Electricity: "bg-rose-50 text-rose-700 border-rose-100",
    Others: "bg-gray-50 text-gray-700 border-gray-100",
  };
  return map[category] || "bg-gray-50 text-gray-700 border-gray-100";
}
