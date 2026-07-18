"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  createdAt: Date;
};

export default function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [listError, setListError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
    setIsCreating(true);

    try {
      const result = await authClient.admin.createUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role: "user",
      });

      if (result.error) {
        setCreateError(result.error.message || "Failed to create user.");
        return;
      }

      setCreateSuccess(`User ${email.trim()} created successfully.`);
      setName("");
      setEmail("");
      setPassword("");
      setShowCreateForm(false);
      await loadUsers();
    } catch {
      setCreateError("Failed to create user.");
    } finally {
      setIsCreating(false);
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
            Create and manage admin console users
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateForm((value) => !value);
            setCreateError("");
            setCreateSuccess("");
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

            <div className="sm:col-span-2">
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
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                          user.role === "admin"
                            ? "bg-orange-50 text-orange-700 border border-orange-100"
                            : "bg-slate-50 text-slate-600 border border-slate-100"
                        }`}
                      >
                        {user.role || "user"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
