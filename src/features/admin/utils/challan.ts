import type { Invoice } from "@/src/types";

export function getChallanNumber(invoice: Invoice): string {
  const year = invoice.date ? invoice.date.split("-")[0] : "2026";
  const rawId = invoice.id.replace("inv-", "");
  const formattedId = rawId.length > 5 ? rawId.slice(-5) : rawId.padStart(5, "0");
  return `CH-${year}-${formattedId.toUpperCase()}`;
}

export function numberToWordsINR(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero Rupees Only";

  const formatHundreds = (n: number) => {
    let str = "";
    if (n >= 100) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      if (str !== "") str += "and ";
      if (n < 20) {
        str += a[n];
      } else {
        str += b[Math.floor(n / 10)];
        if (n % 10 > 0) str += "-" + a[n % 10];
      }
    }
    return str.trim();
  };

  let amount = Math.floor(Math.abs(num));
  let result = "";
  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  const thousand = Math.floor(amount / 1000);
  amount %= 1000;

  if (crore > 0) result += formatHundreds(crore) + " Crore ";
  if (lakh > 0) result += formatHundreds(lakh) + " Lakh ";
  if (thousand > 0) result += formatHundreds(thousand) + " Thousand ";
  if (amount > 0) result += formatHundreds(amount);

  return result.trim() + " Rupees Only";
}
