"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authClient, useSession } from "@/lib/auth-client";

type AppRole = "admin" | "user";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  createdAt: Date;
};

const ROLE_OPTIONS: { value: AppRole; label: string; description: string }[] = [
  {
    value: "user",
    label: "User",
    description: "Profile and sign-in only — no vendor or billing console access.",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access to vendors, invoices, KYC, hubs, and workspace settings.",
  },
];

function normalizeRole(role?: string | null): AppRole {
  return role === "admin" ? "admin" : "user";
}

function countAdmins(users: AdminUser[]): number {
  return users.filter((user) => normalizeRole(user.role) === "admin").length;
}

const selectClassName =
  "h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 disabled:opacity-60 disabled:cursor-not-allowed";

export default function UsersPanel() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [listError, setListError] = useState("");
  const [roleFeedback, setRoleFeedback] = useState("");
  const [roleError, setRoleError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createRole, setCreateRole] = useState<AppRole>("user");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const adminCount = useMemo(() => countAdmins(users), [users]);
  const createRoleHelp = ROLE_OPTIONS.find((option) => option.value === createRole)?.description;

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setListError("");

    try {
      const result = await authClient.admin.listUsers({
        query: { limit: 100 },
      });

      if (result.error) {
        setListError(result.error.message || "Failed to load users.");
        return;
      }

      setUsers((result.data?.users as AdminUser[]) || []);
    } catch {
      setListError("Failed to load users.");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setRoleError("");
    setRoleFeedback("");
    setIsCreating(true);

    try {
      const result = await authClient.admin.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: createRole,
      });

      if (result.error) {
        setCreateError(result.error.message || "Failed to create user.");
        return;
      }

      setCreateSuccess(
        `User ${email.trim()} created as ${createRole === "admin" ? "Admin" : "User"}.`
      );
      setName("");
      setEmail("");
      setPassword("");
      setCreateRole("user");
      setShowCreateForm(false);
      await loadUsers();
    } catch {
      setCreateError("Failed to create user.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleRoleChange = async (user: AdminUser, nextRole: AppRole) => {
    const currentRole = normalizeRole(user.role);
    if (currentRole === nextRole) return;

    setRoleError("");
    setRoleFeedback("");

    if (currentRole === "admin" && nextRole === "user" && adminCount <= 1) {
      setRoleError("Cannot remove the last admin account.");
      return;
    }

    if (user.id === currentUserId && nextRole === "user") {
      const ok = window.confirm(
        "You are removing your own admin access. You will lose access to admin settings after your session ends. Continue?"
      );
      if (!ok) return;
    } else if (nextRole === "admin") {
      const ok = window.confirm(`Grant full admin access to ${user.email}?`);
      if (!ok) return;
    }

    setUpdatingUserId(user.id);

    try {
      const result = await authClient.admin.setRole({
        userId: user.id,
        role: nextRole,
      });

      if (result.error) {
        setRoleError(result.error.message || "Failed to update role.");
        return;
      }

      setRoleFeedback(`${user.email} is now ${nextRole === "admin" ? "an Admin" : "a User"}.`);
      await loadUsers();
    } catch {
      setRoleError("Failed to update role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-display font-bold text-gray-950 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            User Management
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create users and assign Admin or User roles
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((value) => !value);
            setCreateError("");
            setCreateSuccess("");
            setRoleError("");
            setRoleFeedback("");
          }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold"
        >
          <Plus className="w-4 h-4" />
          Add user
        </button>
      </div>

      {createSuccess && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{createSuccess}</span>
        </div>
      )}

      {roleFeedback && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{roleFeedback}</span>
        </div>
      )}

      {roleError && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{roleError}</span>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide mb-4">
            Create new user
          </h3>

          <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Name
              </label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Role
              </label>
              <select
                value={createRole}
                onChange={(event) => setCreateRole(event.target.value as AppRole)}
                className={selectClassName}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {createRoleHelp ? (
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{createRoleHelp}</p>
              ) : null}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">
                Temporary password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            {createError && (
              <div className="sm:col-span-2 flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold disabled:opacity-60"
              >
                {isCreating ? "Creating..." : "Create user"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="h-10 px-4 rounded-xl border border-gray-200 text-sm font-bold text-slate-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoadingUsers ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
          </div>
        ) : listError ? (
          <div className="p-6 flex items-start gap-2 text-sm text-rose-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{listError}</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-extrabold text-slate-500 uppercase tracking-wide">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = normalizeRole(user.role);
                  const isSelf = user.id === currentUserId;
                  const isLastAdmin = role === "admin" && adminCount <= 1;
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {user.name}
                        {isSelf ? (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            You
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[10rem]">
                          <select
                            value={role}
                            disabled={isUpdating || isLastAdmin}
                            title={
                              isLastAdmin
                                ? "At least one admin account is required."
                                : undefined
                            }
                            onChange={(event) =>
                              void handleRoleChange(user, event.target.value as AppRole)
                            }
                            className={`${selectClassName} max-w-[11rem]`}
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-orange-600 shrink-0" />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
