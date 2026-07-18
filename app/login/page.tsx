"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { SmileLogo } from "@/src/components/Logo";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Invalid email or password.");
        return;
      }

      router.push(next);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <SmileLogo />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider">
              Admin Sign In
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Sign in to access the vendor billing console
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-xl border-gray-200 focus-visible:border-orange-300 focus-visible:ring-orange-100"
                placeholder="admin@shreemaruti.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 rounded-xl border-gray-200 focus-visible:border-orange-300 focus-visible:ring-orange-100"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Shree Maruti Integrated Logistics Limited
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
