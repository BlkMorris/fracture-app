"use client";

import Link from "next/link";
import { Check, Zap, BarChart3, Building2, Shield } from "lucide-react";


const PLANS = [
  {
    name: "Free", price: "$0", period: "forever",
    description: "Essential access to Fracture\u2019s editorial experience",
    features: ["AI-generated Fracture Briefs", "Headline comparison across outlets", "Source spectrum visualization", "Basic search & discovery", "Breaking news alerts"],
    cta: "Get Started", href: "/register", highlighted: false, icon: Zap,
  },
  {
    name: "Professional", price: "$49", period: "/month", annual: "$39/mo billed annually",
    description: "Full analytical suite for journalists and researchers",
    features: ["Everything in Free", "Full FDI divergence breakdowns", "Narrative frame analysis", "Guided analysis chapters", "Intelligence digest feed", "Historical divergence data", "API access \u2014 1,000 calls/day", "Priority support"],
    cta: "Start Free Trial", href: "/checkout?plan=pro-monthly", highlighted: true, icon: BarChart3, badge: "Most Popular",
  },
  {
    name: "Enterprise", price: "Custom", period: "",
    description: "Tailored intelligence for newsrooms and organizations",
    features: ["Everything in Professional", "Custom source configuration", "Shared research workflows", "Priority onboarding", "Dedicated account support", "Data retention planning", "Security review support", "Custom reporting cadence"],
    cta: "Email Sales", href: "mailto:hello@fracture.news", highlighted: false, icon: Building2,
  },
];

export default function PricingPage() {
  return (
    <div className="ns-page">
      {/* ── Hero ── */}
      <div className="ns-page-header" style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px 0", textAlign: "center" }}>
        <span className="ns-eyebrow">Pricing</span>
        <h1 className="ns-page-title">Understand the full picture</h1>
        <p className="ns-page-subtitle" style={{ margin: "0 auto 48px" }}>
          Choose the plan that fits how you consume news. Start free, upgrade when you need deeper analysis.
        </p>
      </div>

      {/* ── Pricing Cards ── */}
      <div style={{ maxWidth: 1020, margin: "0 auto", padding: "0 24px 64px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div key={plan.name} style={{
              border: "1px solid var(--color-border)",
              borderTop: plan.highlighted ? "3px solid var(--color-accent)" : "1px solid var(--color-border)",
              borderRadius: 3, padding: 32, position: "relative", display: "flex", flexDirection: "column", backgroundColor: "var(--color-surface)",
            }}>
              {plan.badge && (
                <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", backgroundColor: "var(--color-accent)", color: "var(--color-bg)", padding: "4px 16px", borderRadius: 2, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>{plan.badge}</div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Icon size={20} color={"var(--color-accent)"} />
                <h3 style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 700, margin: 0, color: "var(--color-text-strong)" }}>{plan.name}</h3>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 36, fontWeight: 800, color: "var(--color-text-strong)" }}>{plan.price}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--color-muted)", marginLeft: 4 }}>{plan.period}</span>
              </div>
              {plan.annual && (
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--color-accent)", fontWeight: 600, margin: "0 0 12px" }}>{plan.annual}</p>
              )}
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-secondary)", lineHeight: 1.5, marginBottom: 24 }}>{plan.description}</p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-primary)" }}>
                    <Check size={16} color={"var(--color-diverge-low)"} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.href.startsWith("mailto:") ? (
                <a href={plan.href} className={plan.highlighted ? "ns-btn ns-btn-primary" : "ns-btn ns-btn-outline"} style={{ display: "block", textAlign: "center", padding: "12px 24px", fontSize: 14 }}>
                  {plan.cta}
                </a>
              ) : (
                <Link href={plan.href} className={plan.highlighted ? "ns-btn ns-btn-primary" : "ns-btn ns-btn-outline"} style={{ display: "block", textAlign: "center", padding: "12px 24px", fontSize: 14 }}>
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Enterprise CTA ── */}
      <section style={{ backgroundColor: "var(--color-surface)", borderTop: "1px solid var(--color-border)", borderBottom: "1px solid var(--color-border)", padding: "48px 24px", textAlign: "center" }}>
        <h2 style={{ fontFamily: "var(--font-body)", fontSize: 24, fontWeight: 700, color: "var(--color-text-strong)", marginBottom: 12 }}>Need a custom solution?</h2>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--color-secondary)", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.6 }}>
          We work with newsrooms, research institutions, and intelligence teams to build tailored solutions.
        </p>
        <a href="mailto:hello@fracture.news" className="ns-btn ns-btn-primary" style={{ display: "inline-flex", padding: "12px 32px", fontSize: 14 }}>Email Sales</a>
      </section>

      {/* ── Security note ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Shield size={14} /> All plans include enterprise-grade security and AI content disclosure
        </p>
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
