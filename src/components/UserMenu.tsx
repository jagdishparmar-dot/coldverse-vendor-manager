"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  LogOut,
  Settings,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { signOut } from "@/lib/auth-client";
import { settingsHref } from "@/src/constants/settingsRoutes";

type UserMenuProps = {
  name: string;
  email: string;
  role?: string | null;
};

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MenuLink({ href, label, description, icon: Icon }: MenuItem) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-slate-500 transition-colors group-hover:border-orange-100 group-hover:bg-orange-50 group-hover:text-orange-600">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[13px] font-semibold text-slate-800 font-display tracking-tight group-hover:text-orange-700">
          {label}
        </span>
        <span className="block text-[11px] text-slate-400 leading-snug">
          {description}
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-orange-400" />
    </Link>
  );
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const initials = getInitials(name) || "U";
  const isAdmin = role === "admin";
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  const accountItems: MenuItem[] = [
    {
      href: settingsHref("profile"),
      label: "Profile",
      description: "Name and password",
      icon: User,
    },
  ];

  const adminItems: MenuItem[] = isAdmin
    ? [
        {
          href: settingsHref("users"),
          label: "Users",
          description: "Console access",
          icon: Users,
        },
        {
          href: settingsHref("workspace"),
          label: "Workspace",
          description: "Company & email prefs",
          icon: Settings,
        },
      ]
    : [];

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white pl-1 pr-2 shadow-sm transition-colors hover:border-orange-200 hover:bg-slate-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-200 data-popup-open:border-orange-200 data-popup-open:bg-slate-50"
        aria-label="Open user menu"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-600 text-[11px] font-bold text-white">
          {initials}
        </span>
        <span className="hidden md:block text-left leading-tight min-w-0">
          <span className="block text-xs font-semibold text-slate-800 truncate max-w-[120px] font-display tracking-tight">
            {name}
          </span>
          <span className="block text-[10px] text-slate-400 truncate max-w-[120px]">
            {email}
          </span>
        </span>
        <ChevronDown
          className={`hidden md:block w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            open ? "rotate-180 text-slate-600" : ""
          }`}
        />
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[280px] gap-0 overflow-hidden rounded-2xl border border-gray-100 bg-white p-0 shadow-lg ring-1 ring-black/5"
      >
        <div className="bg-linear-to-b from-orange-50/80 to-white px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-sm font-bold text-white shadow-sm shadow-orange-600/20">
              {initials}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-bold text-slate-900 truncate font-display tracking-tight">
                {name}
              </p>
              <p className="text-[11px] text-slate-500 truncate mt-0.5">{email}</p>
              {roleLabel && (
                <span
                  className={`mt-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isAdmin
                      ? "bg-orange-100/80 text-orange-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {roleLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-2">
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Account
          </p>
          <div className="space-y-0.5">
            {accountItems.map((item) => (
              <MenuLink key={item.href} {...item} />
            ))}
          </div>

          {adminItems.length > 0 && (
            <>
              <p className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administration
              </p>
              <div className="space-y-0.5">
                {adminItems.map((item) => (
                  <MenuLink key={item.href} {...item} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-100 bg-slate-50/60 p-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-rose-50 cursor-pointer group"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 transition-colors group-hover:bg-rose-100">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-rose-600 font-display tracking-tight">
                Sign out
              </span>
              <span className="block text-[11px] text-rose-400/80">
                End this console session
              </span>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
