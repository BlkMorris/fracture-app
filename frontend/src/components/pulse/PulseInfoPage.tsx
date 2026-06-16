"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Mail, Radio, ShieldCheck } from "lucide-react";
import { useStats } from "@/hooks/useStories";
import { PulseFooter, pulseChromeStyles, PulseTopbar } from "@/components/pulse/PulseChrome";

export type PulseInfoSection = {
  title: string;
  body: string;
  eyebrow?: string;
};

export type PulseInfoCard = {
  label: string;
  value: string;
  body: string;
};

export type PulseInfoAction = {
  label: string;
  href: string;
};

export function PulseInfoPage({
  eyebrow,
  title,
  deck,
  sections,
  cards = [],
  actions = [{ label: "Browse Stories", href: "/stories" }],
  contact = false,
  children,
}: {
  eyebrow: string;
  title: string;
  deck: string;
  sections: PulseInfoSection[];
  cards?: PulseInfoCard[];
  actions?: PulseInfoAction[];
  contact?: boolean;
  children?: ReactNode;
}) {
  const { data: stats } = useStats();

  return (
    <main className="pulse-info" aria-label={`Fracture ${eyebrow}`}>
      <style jsx global>{styles}</style>

      <PulseTopbar stats={stats} />

      <section className="pulse-info-hero">
        <div>
          <p className="pulse-info-kicker"><span /> {eyebrow}</p>
          <h1>{title}</h1>
        </div>
        <aside>
          <Radio size={22} />
          <strong>{stats?.sourcesTracked ?? 0}</strong>
          <span>tracked sources</span>
        </aside>
      </section>

      <section className="pulse-info-deck">
        <p>{deck}</p>
        <nav aria-label={`${eyebrow} actions`}>
          {actions.map((action, index) => (
            <Link className={index === 0 ? "is-primary" : ""} href={action.href} key={action.label}>
              {action.label}
              {action.href.startsWith("mailto:") ? <Mail size={17} /> : <ChevronRight size={18} />}
            </Link>
          ))}
        </nav>
      </section>

      {cards.length ? (
        <section className="pulse-info-cards" aria-label={`${eyebrow} highlights`}>
          {cards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.body}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="pulse-info-grid" aria-label={`${eyebrow} details`}>
        {sections.map((section, index) => (
          <article key={section.title}>
            <span>{section.eyebrow ?? String(index + 1).padStart(2, "0")}</span>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </section>

      {children}

      {contact ? (
        <section className="pulse-contact-panel" aria-label="Contact Fracture">
          <div>
            <p className="pulse-info-kicker"><span /> Contact Desk</p>
            <h2>Send a note to the Fracture team.</h2>
          </div>
          <a href="mailto:hello@fracture.media">
            hello@fracture.media
            <ArrowUpRight size={19} />
          </a>
        </section>
      ) : (
        <section className="pulse-info-signal" aria-label="Fracture operating standard">
          <ShieldCheck size={22} />
          <p>Fracture keeps the product focused on source comparison, framing distance, and readable context instead of performative certainty.</p>
        </section>
      )}

      <PulseFooter />
    </main>
  );
}

const styles = `
.pulse-info{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;--ink-2:#2d2e31;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif}.pulse-info *{box-sizing:border-box}.pulse-info a{color:inherit;text-decoration:none}
${pulseChromeStyles}
.pulse-info-hero{display:grid;grid-template-columns:minmax(0,1fr) 210px;gap:28px;align-items:end;padding:64px 24px 32px;border-bottom:1px solid var(--line)}.pulse-info-kicker{display:inline-flex;align-items:center;gap:9px;margin:0 0 18px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-info-kicker span{width:10px;height:10px;border-radius:999px;background:var(--orange);animation:pulseBlink 1.65s ease-in-out infinite}.pulse-info-hero h1{max-width:1180px;margin:0;font-size:clamp(58px,10vw,156px);line-height:.82;font-weight:1000;letter-spacing:-.07em}.pulse-info-hero aside{min-height:170px;border:1px solid var(--night);background:var(--night);color:white;padding:18px;display:grid;align-content:end;gap:8px;box-shadow:8px 8px 0 var(--orange)}.pulse-info-hero aside svg{color:var(--cyan)}.pulse-info-hero aside strong{font-size:52px;line-height:.9;font-weight:1000;letter-spacing:-.05em}.pulse-info-hero aside span{color:rgba(255,255,255,.72);font-size:12px;font-weight:950;text-transform:uppercase}.pulse-info-deck{display:grid;grid-template-columns:minmax(0,760px) auto;gap:28px;align-items:start;padding:28px 24px 36px;border-bottom:1px solid var(--line)}.pulse-info-deck p{margin:0;color:var(--ink-2);font-size:clamp(22px,3vw,38px);line-height:1.06;font-weight:900;letter-spacing:-.035em}.pulse-info-deck nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}.pulse-info-deck a{height:42px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--night);background:white;padding:0 13px;font-size:12px;font-weight:950;text-transform:uppercase}.pulse-info-deck a.is-primary{background:var(--night);color:white}.pulse-info-deck a:hover{box-shadow:4px 4px 0 var(--orange);transform:translateY(-1px)}.pulse-info-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line);margin:0 24px 32px}.pulse-info-cards article{min-height:210px;background:var(--chalk);padding:18px;display:grid;align-content:space-between}.pulse-info-cards span,.pulse-info-grid article>span{color:var(--orange);font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-info-cards strong{display:block;margin:20px 0 12px;font-size:clamp(34px,5vw,64px);line-height:.88;font-weight:1000;letter-spacing:-.055em}.pulse-info-cards p{margin:0;color:var(--muted);font-size:15px;line-height:1.35;font-weight:780}.pulse-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:var(--line);margin:0 24px 34px;border:1px solid var(--line)}.pulse-info-grid article{min-height:280px;background:white;padding:24px;display:grid;align-content:start;gap:14px}.pulse-info-grid h2{max-width:560px;margin:0;font-size:clamp(30px,4vw,56px);line-height:.94;font-weight:1000;letter-spacing:-.055em}.pulse-info-grid p{max-width:620px;margin:0;color:var(--ink-2);font-size:17px;line-height:1.45;font-weight:760}.pulse-source-directory{margin:0 24px 34px;border:1px solid var(--night);background:white}.pulse-source-directory-head{display:flex;align-items:end;justify-content:space-between;gap:18px;padding:18px 18px 16px;border-bottom:1px solid var(--line)}.pulse-source-directory-head h2{margin:0;font-size:clamp(34px,5vw,68px);line-height:.88;font-weight:1000;letter-spacing:-.06em}.pulse-source-directory-head p{max-width:480px;margin:0;color:var(--muted);font-size:15px;line-height:1.35;font-weight:800}.pulse-source-list-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line)}.pulse-source-item{min-height:178px;background:var(--chalk);padding:16px;display:grid;align-content:space-between;gap:14px}.pulse-source-item strong{display:block;color:var(--night);font-size:24px;line-height:.98;font-weight:1000;letter-spacing:-.045em}.pulse-source-item span{display:inline-flex;width:max-content;max-width:100%;border:1px solid var(--line);background:white;padding:6px 8px;color:var(--orange);font-size:11px;font-weight:950;text-transform:uppercase}.pulse-source-item dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}.pulse-source-item dt{color:var(--muted);font-size:10px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}.pulse-source-item dd{margin:3px 0 0;color:var(--night);font-size:13px;font-weight:900;overflow-wrap:anywhere}.pulse-source-empty{padding:24px;color:var(--muted);font-size:16px;font-weight:850}.pulse-source-skeleton{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1px;background:var(--line)}.pulse-source-skeleton article{min-height:178px;background:linear-gradient(90deg,#fff,var(--warm),#fff);background-size:200% 100%;animation:skeleton 1.35s ease-in-out infinite}.pulse-info-signal,.pulse-contact-panel{margin:0 24px 46px;border:1px solid var(--night);background:var(--night);color:white;padding:22px;display:flex;align-items:center;justify-content:space-between;gap:22px;box-shadow:8px 8px 0 var(--cyan)}.pulse-info-signal svg{flex:0 0 auto;color:var(--orange)}.pulse-info-signal p{max-width:880px;margin:0;color:rgba(255,255,255,.82);font-size:18px;line-height:1.35;font-weight:820}.pulse-contact-panel h2{max-width:720px;margin:0;font-size:clamp(36px,6vw,78px);line-height:.88;font-weight:1000;letter-spacing:-.06em}.pulse-contact-panel a{height:46px;display:inline-flex;align-items:center;gap:9px;border:1px solid white;padding:0 14px;font-size:13px;font-weight:950;text-transform:uppercase}.pulse-contact-panel a:hover{background:white;color:var(--night)}
@media(max-width:1100px){.pulse-source-list-grid,.pulse-source-skeleton{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:900px){.pulse-info-hero,.pulse-info-deck{grid-template-columns:1fr}.pulse-info-hero aside{width:min(260px,100%)}.pulse-info-deck nav{justify-content:flex-start}.pulse-info-cards,.pulse-info-grid{grid-template-columns:1fr}.pulse-info-grid article{min-height:auto}.pulse-info-signal,.pulse-contact-panel,.pulse-source-directory-head{align-items:flex-start;flex-direction:column}.pulse-source-directory-head{display:flex}}
@media(max-width:520px){.pulse-info{overflow-x:hidden}.pulse-info-hero{gap:22px;padding:38px 12px 24px}.pulse-info-hero h1{font-size:clamp(46px,16vw,76px);line-height:.88}.pulse-info-hero aside{min-height:132px;box-shadow:5px 5px 0 var(--orange)}.pulse-info-deck{padding:22px 12px 28px}.pulse-info-deck p{font-size:23px}.pulse-info-deck nav{display:grid;grid-template-columns:1fr;width:100%}.pulse-info-deck a{justify-content:center}.pulse-info-cards,.pulse-info-grid,.pulse-info-signal,.pulse-contact-panel,.pulse-source-directory{margin-left:12px;margin-right:12px}.pulse-info-cards article{min-height:172px}.pulse-info-grid article{padding:18px}.pulse-info-grid h2{font-size:32px}.pulse-info-grid p{font-size:16px}.pulse-info-signal,.pulse-contact-panel{padding:18px;box-shadow:5px 5px 0 var(--cyan)}.pulse-source-list-grid,.pulse-source-skeleton{grid-template-columns:1fr}.pulse-source-directory-head{padding:16px}.pulse-source-item{min-height:154px}.pulse-source-item strong{font-size:22px}}
`;
