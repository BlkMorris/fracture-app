"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PulseAuthShell } from "@/components/pulse/PulseAuthShell";

function safeReturnUrl(url: string | null): string {
  if (!url) return "/";
  if (!url.startsWith("/") || url.startsWith("//")) return "/";
  return url;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push(returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PulseAuthShell eyebrow="Account Access" title="Welcome back" subtitle="Sign in to your Fracture account.">
      {error ? <p className="pulse-auth-error">{error}</p> : null}

      <form onSubmit={handleSubmit}>
        <div className="pulse-field">
          <label htmlFor="login-email">Email</label>
          <input id="login-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </div>

        <div className="pulse-field">
          <label htmlFor="login-password">Password</label>
          <div className="pulse-password-shell">
            <input id="login-password" type={showPw ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
            <button type="button" onClick={() => setShowPw((value) => !value)} aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="pulse-submit">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="pulse-auth-switch">
        Don&apos;t have an account?{" "}
        <Link href={`/register${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}>Create one</Link>
      </p>
    </PulseAuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
