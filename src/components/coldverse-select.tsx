"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ColdverseSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type ColdverseSelectVariant = "default" | "filter" | "compact" | "inline";

const triggerVariants: Record<ColdverseSelectVariant, string> = {
  default:
    "w-full h-auto min-h-[42px] text-sm px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20 data-[size=default]:h-auto",
  filter:
    "w-full h-auto min-h-[38px] text-xs bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20 data-[size=default]:h-auto",
  compact:
    "w-full h-auto min-h-[36px] text-xs px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20 data-[size=default]:h-auto",
  inline:
    "w-auto min-w-[140px] h-auto min-h-[34px] text-xs bg-white border border-gray-200 rounded-xl px-3 py-2 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20 data-[size=default]:h-auto",
};

type ColdverseSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ColdverseSelectOption[];
  placeholder?: string;
  selectedLabel?: string;
  disabled?: boolean;
  variant?: ColdverseSelectVariant;
  className?: string;
};

export function ColdverseSelect({
  value,
  onValueChange,
  options,
  placeholder,
  selectedLabel,
  disabled,
  variant = "default",
  className,
}: ColdverseSelectProps) {
  const displayLabel =
    selectedLabel ??
    options.find((option) => option.value === value)?.label ??
    placeholder;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(triggerVariants[variant], className)}
        size="default"
      >
        <SelectValue placeholder={placeholder}>{displayLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-200 shadow-lg">
        {options.map((option) => (
          <SelectItem
            key={`${option.value}-${option.label}`}
            value={option.value}
            disabled={option.disabled}
            className="rounded-lg text-sm focus:bg-violet-50 focus:text-violet-900"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
