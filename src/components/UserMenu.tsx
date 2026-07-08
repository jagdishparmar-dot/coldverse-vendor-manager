"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, Users } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { signOut } from "@/lib/auth-client";

type UserMenuProps = {
  name: string;
  email: string;
  role?: string | null;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({ name, email, role }: UserMenuProps) {
  const router = useRouter();
  const initials = getInitials(name) || "U";
  const isAdmin = role === "admin";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Popover>
      <PopoverTrigger
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-sm transition-all hover:border-orange-200 hover:bg-slate-50 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
        aria-label="Open user menu"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 text-xs font-extrabold text-white">
          {initials}
        </span>
        <span className="hidden md:block text-left leading-tight min-w-0">
          <span className="block text-xs font-bold text-slate-800 truncate max-w-[120px]">
            {name}
          </span>
          <span className="block text-[10px] text-slate-400 truncate max-w-[120px]">
            {email}
          </span>
        </span>
        <ChevronDown className="hidden md:block w-3.5 h-3.5 text-slate-400 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-56 p-1.5">
        <div className="px-2.5 py-2 border-b border-gray-100 mb-1">
          <p className="text-sm font-bold text-slate-800 truncate">{name}</p>
          <p className="text-xs text-slate-500 truncate">{email}</p>
          {role && (
            <span
              className={`mt-1.5 inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                isAdmin
                  ? "bg-orange-50 text-orange-700 border border-orange-100"
                  : "bg-slate-50 text-slate-600 border border-slate-100"
              }`}
            >
              {role}
            </span>
          )}
        </div>

        <Link
          href="/profile"
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors"
        >
          <User className="w-4 h-4" />
          Profile
        </Link>

        {isAdmin && (
          <Link
            href="/users"
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-orange-600 transition-colors"
          >
            <Users className="w-4 h-4" />
            Users
          </Link>
        )}

        <div className="my-1 border-t border-gray-100" />

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
