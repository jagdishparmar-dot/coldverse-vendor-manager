"use client";

import * as React from "react";
import { CalendarIcon, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type ColdverseDateFieldVariant = "default" | "filter";

const triggerVariants: Record<ColdverseDateFieldVariant, string> = {
  default:
    "w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20",
  filter:
    "w-full text-xs bg-gray-50/50 border border-gray-200 rounded-xl pl-3 pr-8 py-2.5 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20",
};

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const parsed = parseDate(value);
  if (!parsed) return "";
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type ColdverseDateFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  variant?: ColdverseDateFieldVariant;
  clearable?: boolean;
  className?: string;
};

export function ColdverseDateField({
  value,
  onValueChange,
  placeholder = "Pick a date",
  disabled,
  variant = "default",
  clearable = false,
  className,
}: ColdverseDateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const selectedDate = parseDate(value);

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center justify-between gap-2 text-left transition-colors outline-none disabled:cursor-not-allowed disabled:opacity-55",
            triggerVariants[variant],
            !value && "text-gray-400"
          )}
        >
          <span className="truncate">
            {value ? formatDisplayDate(value) : placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 shrink-0 text-gray-400" />
        </PopoverTrigger>
        <PopoverContent
          className="w-auto rounded-xl border border-gray-200 p-0 shadow-lg"
          align="start"
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                onValueChange(formatDateValue(date));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>

      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-gray-600"
          title="Clear date"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
