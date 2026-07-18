"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { changePassword, signOut, updateUser, useSession } from "@/lib/auth-client";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session?.user?.name]);

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    setIsSavingProfile(true);

    try {
      const result = await updateUser({ name: name.trim() });
      if (result.error) {
        setProfileError(result.error.message || "Failed to update profile.");
        return;
      }
      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileError("Failed to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    setIsSavingPassword(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setPasswordError(result.error.message || "Failed to change password.");
        return;
      }

      setPasswordSuccess("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Failed to change password.");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-2xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to console
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-wider">
            My Profile
          </h1>
          <p className="text-sm text-slate-500 mt-1">{session?.user?.email}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Profile details
          </h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            {profileError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingProfile}
              className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold disabled:opacity-60"
            >
              {isSavingProfile ? "Saving..." : "Save profile"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
            Change password
          </h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Current password
              </label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                New password
              </label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Confirm new password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                className="h-10 rounded-xl border-gray-200"
              />
            </div>

            {passwordError && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingPassword}
              className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-sm font-extrabold disabled:opacity-60"
            >
              {isSavingPassword ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
