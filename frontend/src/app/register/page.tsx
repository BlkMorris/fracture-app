"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, Check, X } from "lucide-react";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import AuthFormWrapper from "@/components/auth/AuthFormWrapper";

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

  const allPassed = PW_RULES.every((r) => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="ns-auth-layout">
      <AuthLeftPanel />

      <AuthFormWrapper
        title="Create your account"
        subtitle="Start with free access to the Fracture platform"
      >
        {error && <p className="ns-form-error" style={{ marginBottom: 16 }}>{error}</p>}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Display Name */}
          <div>
            <label className="ns-form-label">
              Display Name{" "}
              <span style={{ fontWeight: 400, color: "var(--color-muted)", letterSpacing: 0 }}>
                (optional)
              </span>
            </label>
            <input
              type="text"
              className="ns-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear on Fracture"
              style={{ height: 44 }}
            />
          </div>

          <div className="ns-form-divider" />

          {/* Email */}
          <div>
            <label className="ns-form-label">Email</label>
            <input
              type="email"
              className="ns-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={{ height: 44 }}
            />
          </div>

          {/* Password */}
          <div>
            <label className="ns-form-label">Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPw ? "text" : "password"}
                className="ns-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ height: 44, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                aria-label={showPw ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-muted)",
                  padding: 0,
                  display: "flex",
                }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Live password checklist */}
            {password.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {PW_RULES.map((rule, i) => {
                  const pass = rule.test(password);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: pass ? "var(--color-green)" : "var(--color-muted)",
                        transition: "color 0.15s ease",
                      }}
                    >
                      {pass ? <Check size={12} /> : <X size={12} />} {rule.label}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="ns-btn ns-btn-primary ns-btn-full"
            style={{
              height: 44,
              fontSize: 14,
              opacity: loading || !allPassed ? 0.6 : 1,
            }}
            disabled={loading || !allPassed}
          >
            {loading ? "Creating account\u2026" : "Create Account"}
          </button>
        </form>

        {/* Login link */}
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--color-secondary)",
            marginTop: 24,
          }}
        >
          Already have an account?{" "}
          <Link
            href={`/login${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            style={{
              color: "var(--color-accent)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </p>

        {/* Trust footnote */}
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-muted)",
            textAlign: "center",
            marginTop: 16,
            lineHeight: 1.5,
          }}
        >
          Fracture uses your account to preserve access, preferences, and reading context across the platform.
        </p>
      </AuthFormWrapper>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
