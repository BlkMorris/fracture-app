"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff } from "lucide-react";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import AuthFormWrapper from "@/components/auth/AuthFormWrapper";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="ns-auth-layout">
      <AuthLeftPanel />

      <AuthFormWrapper
        title="Welcome back"
        subtitle="Sign in to your Fracture account"
      >
        {error && <p className="ns-form-error" style={{ marginBottom: 16 }}>{error}</p>}

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
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
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="ns-btn ns-btn-primary ns-btn-full"
            style={{ height: 44, fontSize: 14, opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Signing in\u2026" : "Sign In"}
          </button>
        </form>

        {/* Register link */}
        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: "var(--color-secondary)",
            marginTop: 24,
          }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href={`/register${returnUrl !== "/" ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ""}`}
            style={{
              color: "var(--color-accent)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Create one
          </Link>
        </p>
      </AuthFormWrapper>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
