"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { changePassword, updateUser, useSession } from "@/lib/auth-client";

export default function ProfilePanel() {
  const { data: session } = useSession();

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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-display font-bold text-gray-950">My Profile</h2>
        <p className="text-xs text-gray-500 mt-1">{session?.user?.email}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
          Profile details
        </h3>

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="settings-profile-name"
              className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
            >
              Name
            </label>
            <Input
              id="settings-profile-name"
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
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
          Change password
        </h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="settings-current-password"
              className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
            >
              Current password
            </label>
            <Input
              id="settings-current-password"
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
              htmlFor="settings-new-password"
              className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
            >
              New password
            </label>
            <Input
              id="settings-new-password"
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
              htmlFor="settings-confirm-password"
              className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
            >
              Confirm new password
            </label>
            <Input
              id="settings-confirm-password"
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
  );
}
