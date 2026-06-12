"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PulseAuthShell } from "@/components/pulse/PulseAuthShell";

function safeReturnUrl(url: string | null): string {
  if (!url) return "/";
  if (!url.startsWith("/") || url.startsWith("//")) return "/";
  return url;
}

const PW_RULES = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "Contains uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Contains lowercase letter", test: (pw: string) => /[a-z]/.test(pw) },
  { label: "Contains a number", test: (pw: string) => /\d/.test(pw) },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = safeReturnUrl(searchParams.get("returnUrl"));
  const { register } = useAuth();

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const allPassed = PW_RULES.every((rule) => rule.test(password));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!allPassed) return;
    setError("");
    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
      router.push(returnUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PulseAuthShell eyebrow="Create Signal" title="Create your account" subtitle="Start with access to Fracture's live story intelligence.">
      {error ? <p className="pulse-auth-error">{error}</p> : null}

      <form onSubmit={handleSubmit}>
        <div className="pulse-field">
          <label htmlFor="register-name">Display Name <span>(optional)</span></label>
          <input id="register-name" type="text" value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="How you appear on Fracture" />
        </div>

        <div className="pulse-form-divider" />

        <div className="pulse-field">
          <label htmlFor="register-email">Email</label>
          <input id="register-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
        </div>

        <div className="pulse-field">
          <label htmlFor="register-password">Password</label>
          <div className="pulse-password-shell">
            <input id="register-password" type={showPw ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" required />
            <button type="button" onClick={() => setShowPw((value) => !value)} aria-label={showPw ? "Hide password" : "Show password"}>
              {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>

          {password.length > 0 ? (
            <div className="pulse-password-rules">
              {PW_RULES.map((rule) => {
                const pass = rule.test(password);
                return (
                  <span className={pass ? "is-pass" : ""} key={rule.label}>
                    {pass ? <Check size={13} /> : <X size={13} />} {rule.label}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <button type="submit" className="pulse-submit" disabled={loading || !allPassed}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="pulse-auth-switch">
        Already have an account?{" "}
        <Link href={`/login${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}>Sign in</Link>
      </p>
    </PulseAuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
