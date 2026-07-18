"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ColdverseSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type ColdverseSelectVariant = "default" | "filter" | "compact" | "inline";

const triggerVariants: Record<ColdverseSelectVariant, string> = {
  default:
    "w-full text-sm font-medium px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/30 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20",
  filter:
    "w-full text-xs font-medium bg-gray-50/50 border border-gray-200 rounded-xl px-3 py-2.5 focus-visible:border-orange-500 focus-visible:ring-2 focus-visible:ring-orange-500/20",
  compact:
    "w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus-visible:border-violet-500 focus-visible:ring-2 focus-visible:ring-violet-500/20",
  inline:
    "h-9 w-auto min-w-[140px] text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3 shadow-sm hover:border-orange-200 hover:bg-slate-50 focus-visible:border-orange-300 focus-visible:ring-2 focus-visible:ring-orange-200",
};

const SEARCH_THRESHOLD = 8;

type ColdverseSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ColdverseSelectOption[];
  placeholder?: string;
  selectedLabel?: string;
  disabled?: boolean;
  variant?: ColdverseSelectVariant;
  className?: string;
  /** Force search box even for short option lists */
  searchable?: boolean;
};

export function ColdverseSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  selectedLabel,
  disabled,
  variant = "default",
  className,
  searchable,
}: ColdverseSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [menuWidth, setMenuWidth] = React.useState<number | undefined>(undefined);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedLabel ?? selectedOption?.label;
  const hasValue = Boolean(displayLabel);
  const showSearch = searchable ?? options.length >= SEARCH_THRESHOLD;

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const width = triggerRef.current?.getBoundingClientRect().width;
    if (width) setMenuWidth(Math.max(width, variant === "inline" ? 176 : 192));
    if (showSearch) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 10);
      return () => window.clearTimeout(id);
    }
  }, [open, showSearch, variant]);

  const handleSelect = (option: ColdverseSelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
      }}
    >
      <PopoverTrigger
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className={cn(
          "flex items-center justify-between gap-2 text-left transition-colors outline-none cursor-pointer",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "hover:border-gray-300",
          open &&
            (variant === "filter"
              ? "border-orange-500 ring-2 ring-orange-500/20"
              : variant === "inline"
                ? "border-orange-300 ring-2 ring-orange-200"
                : "border-violet-500 ring-2 ring-violet-500/20"),
          triggerVariants[variant],
          !hasValue && "text-gray-400",
          hasValue && "text-gray-800",
          className
        )}
        aria-expanded={open}
      >
        <span className="truncate min-w-0">{displayLabel || placeholder}</span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-150",
            open && "rotate-180 text-gray-600"
          )}
        />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        style={menuWidth ? { width: menuWidth } : undefined}
        className={cn(
          "z-70 flex max-h-72 min-w-48 flex-col gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-0 text-gray-800 shadow-lg ring-0"
        )}
      >
        {showSearch && (
          <div className="sticky top-0 z-1 border-b border-gray-100 bg-white p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search options…"
                className="w-full rounded-lg border border-gray-200 bg-gray-50/50 py-2 pl-8 pr-3 text-xs text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>
        )}

        <div className="overflow-y-auto p-1.5" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              No matching options
            </div>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === value && value !== "";
              return (
                <button
                  key={`${option.value}-${option.label}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  onClick={() => handleSelect(option)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-40",
                    selected
                      ? "bg-violet-50 font-semibold text-violet-900"
                      : "text-gray-700 hover:bg-gray-50",
                    variant === "filter" &&
                      selected &&
                      "bg-orange-50 text-orange-900"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {selected && (
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        variant === "filter" ? "text-orange-600" : "text-violet-600"
                      )}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ColdverseSelect;
