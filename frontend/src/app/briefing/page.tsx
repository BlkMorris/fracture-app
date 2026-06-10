import { Metadata } from "next";
import { Brain, Clock, Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Briefing \u2014 Fracture",
  description: "AI-generated synthesis of news coverage across the political spectrum",
};

export const revalidate = 1800;


async function fetchBriefing() {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:4000/api/v1";
    const res = await fetch(`${backendUrl}/narrative/homepage`, { next: { revalidate: 1800 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function BriefingPage() {
  const data = await fetchBriefing();

  return (
    <div className="ns-page">
      <div className="ns-page-narrow">
      {/* Header */}
      <div className="ns-page-header" style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", backgroundColor: "var(--color-accent-dim)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--color-accent)" }}>
            <Brain size={24} color={"var(--color-accent)"} />
          </div>
        </div>
        <span className="ns-eyebrow">Fracture Briefing</span>
        <h1 className="ns-page-title">Today&apos;s coverage, synthesized</h1>
        <p className="ns-page-subtitle" style={{ margin: "0 auto" }}>AI-generated synthesis of the strongest narrative signals across the current news cycle.</p>
        <div className="ns-meta-row" style={{ justifyContent: "center", marginTop: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> Updated every 30 minutes</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Zap size={14} /> Powered by Llama 3.1</span>
        </div>
      </div>

      {/* Top Story Brief */}
      {data?.hero && (
        <div className="ns-panel" style={{ borderLeft: "4px solid var(--color-accent)", padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-accent)", backgroundColor: "var(--color-accent-dim)", padding: "3px 10px", borderRadius: 2 }}>Top Story</span>
          </div>
          <h2 style={{ fontFamily: "var(--font-condensed)", fontSize: 24, fontWeight: 600, color: "var(--color-text-strong)", marginBottom: 12, lineHeight: 1.25 }}>{data.hero.topic}</h2>
          {data.hero.summary && (
            <p style={{ fontSize: 14, color: "var(--color-secondary)", lineHeight: 1.7, marginBottom: 16 }}>{data.hero.summary}</p>
          )}
          <Link href={`/story/${data.hero.id}`} className="ns-muted-link" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--color-accent)", textDecoration: "none" }}>
            Read full analysis <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Trending stories */}
      {data?.trending?.map((story: { id: string; topic: string; summary: string | null; sourceCount: number; articleCount: number }) => (
        <div key={story.id} className="ns-panel" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--font-condensed)", fontSize: 18, fontWeight: 600, color: "var(--color-text-strong)", marginBottom: 6, lineHeight: 1.35 }}>{story.topic}</h3>
          {story.summary && (
            <p style={{ fontSize: 13, color: "var(--color-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>{story.summary}</p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
            <span>{story.sourceCount} sources</span>
            <span>{story.articleCount} articles</span>
            <Link href={`/story/${story.id}`} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "var(--color-accent)", fontWeight: 600, textDecoration: "none", fontSize: 12 }}>
              View <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      ))}

      {!data && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-strong)", marginBottom: 8 }}>Briefing unavailable</p>
          <p style={{ color: "var(--color-secondary)" }}>Make sure the backend is running to generate today&apos;s briefing.</p>
        </div>
      )}

      <p className="ns-panel" style={{ textAlign: "center", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted)", marginTop: 32, padding: "12px 16px" }}>
        Generated by AI based on coverage data across multiple outlets. Not editorial content.
      </p>
      </div>
    </div>
  );
}
