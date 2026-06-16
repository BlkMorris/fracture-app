"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, BarChart3, Radio } from "lucide-react";
import { useStats } from "@/hooks/useStories";
import { pulseChromeStyles, PulseFooter } from "@/components/pulse/PulseChrome";

type PulseAuthShellProps = {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
};

export function PulseAuthShell({ children, eyebrow, title, subtitle }: PulseAuthShellProps) {
  const { data: stats, isLoading } = useStats();

  return (
    <main className="pulse-auth">
      <style jsx global>{styles}</style>

      <section className="pulse-auth-panel">
        <Link href="/" className="pulse-auth-logo" aria-label="Fracture home">
          FRACTURE
        </Link>
        <div className="pulse-live-badge"><span /> LIVE NOW</div>

        <motion.div className="pulse-auth-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}>
          <p>{eyebrow}</p>
          <h1>Live context for people who read past headlines.</h1>
        </motion.div>

        <div className="pulse-auth-stats" aria-label="Fracture platform stats">
          <article><Activity size={20} /><strong className={isLoading ? "is-loading" : ""}>{isLoading ? "" : stats?.activeStories ?? 0}</strong><span>Active stories</span></article>
          <article><BarChart3 size={20} /><strong className={isLoading ? "is-loading" : ""}>{isLoading ? "" : Math.round(stats?.avgDivergence ?? 0)}</strong><span>Avg FDI</span></article>
          <article><Radio size={20} /><strong className={isLoading ? "is-loading" : ""}>{isLoading ? "" : stats?.sourcesTracked ?? 0}</strong><span>Sources</span></article>
        </div>
      </section>

      <section className="pulse-auth-form-wrap">
        <motion.div className="pulse-auth-form" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.34 }}>
          <div className="pulse-auth-heading">
            <p>{eyebrow}</p>
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          {children}
        </motion.div>
      </section>

      <PulseFooter />

    </main>
  );
}

export const pulseAuthFormStyles = `
.pulse-field{display:grid;gap:8px}.pulse-field label{font-size:12px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}.pulse-field input{height:48px;border:1px solid var(--line);background:white;color:var(--night);padding:0 13px;font-size:16px;font-weight:800;outline:0}.pulse-field input:focus{border-color:var(--night);box-shadow:5px 5px 0 var(--cyan)}.pulse-password-shell{position:relative}.pulse-password-shell input{padding-right:46px}.pulse-password-shell button{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer}.pulse-password-shell button:hover{color:var(--orange)}.pulse-submit{height:48px;border:0;background:var(--night);color:white;font-size:15px;font-weight:950;cursor:pointer;transition:transform 160ms ease,box-shadow 160ms ease}.pulse-submit:hover:not(:disabled){transform:translateY(-1px);box-shadow:6px 6px 0 var(--orange)}.pulse-submit:disabled{opacity:.52;cursor:not-allowed}.pulse-auth-error{margin:0 0 16px;border:1px solid var(--orange);background:rgba(255,90,31,.08);color:var(--night);padding:10px 12px;font-size:13px;font-weight:850}.pulse-auth-switch{margin:22px 0 0;text-align:center;color:var(--muted);font-size:14px}.pulse-auth-switch a{color:var(--orange);font-weight:950}.pulse-password-rules{display:grid;gap:6px;margin-top:10px}.pulse-password-rules span{display:flex;align-items:center;gap:7px;border:1px solid var(--line);background:white;padding:7px 9px;color:var(--muted);font-size:12px;font-weight:850}.pulse-password-rules span.is-pass{color:var(--cyan);border-color:rgba(20,184,200,.45)}.pulse-form-divider{height:1px;background:var(--line);margin:-2px 0}
`;

const styles = `
.pulse-auth{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;min-height:100vh;display:grid;grid-template-columns:minmax(0,1fr) minmax(420px,.72fr);background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif;letter-spacing:0}.pulse-auth *,.pulse-auth *::before,.pulse-auth *::after{box-sizing:border-box}.pulse-auth a{color:inherit;text-decoration:none}.pulse-auth button,.pulse-auth input{font:inherit}.pulse-auth .pulse-site-footer{grid-column:1/-1}
${pulseChromeStyles}
.pulse-auth-panel{position:relative;min-height:100vh;padding:28px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr auto;gap:22px;background:var(--night);color:white;overflow:hidden}.pulse-auth-panel::after{content:"";position:absolute;inset:auto -8% -20% 18%;height:52%;background-image:radial-gradient(circle,rgba(252,252,248,.24) 1.15px,transparent 1.3px);background-size:8px 8px;clip-path:polygon(2% 41%,15% 25%,32% 29%,44% 18%,54% 34%,68% 25%,86% 33%,98% 48%,88% 70%,68% 62%,56% 77%,40% 67%,28% 79%,14% 65%);opacity:.42}.pulse-auth-logo{font-size:clamp(46px,6.6vw,96px);line-height:.82;font-weight:1000;letter-spacing:-.055em;z-index:1}.pulse-auth-panel .pulse-live-badge{justify-self:end;z-index:1}.pulse-auth-copy{grid-column:1/-1;align-self:center;max-width:780px;z-index:1}.pulse-auth-copy p,.pulse-auth-heading p{margin:0 0 14px;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-auth-copy h1{margin:0;max-width:820px;color:white;font-size:clamp(54px,7vw,104px);line-height:.88;font-weight:1000;letter-spacing:-.065em}.pulse-auth-stats{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:rgba(252,252,248,.2);z-index:1}.pulse-auth-stats article{min-height:120px;background:var(--night);padding:16px;display:grid;align-content:center;gap:6px}.pulse-auth-stats svg{color:var(--cyan)}.pulse-auth-stats strong{font-size:34px;line-height:1;font-weight:1000}.pulse-auth-stats strong.is-loading{width:64px;height:34px;color:transparent;background:linear-gradient(90deg,rgba(252,252,248,.1),rgba(217,212,204,.5),rgba(252,252,248,.1));background-size:200% 100%;animation:authSkeleton 1.35s ease-in-out infinite}.pulse-auth-stats span{color:rgba(252,252,248,.68);font-size:12px;font-weight:850;text-transform:uppercase}.pulse-auth-form-wrap{min-height:100vh;display:grid;place-items:center;padding:32px}.pulse-auth-form{width:min(100%,440px);border:1px solid var(--line);background:rgba(255,255,255,.74);padding:28px;box-shadow:10px 10px 0 var(--orange)}.pulse-auth-heading{margin-bottom:24px}.pulse-auth-heading h2{margin:0;color:var(--night);font-size:clamp(36px,4vw,56px);line-height:.94;font-weight:1000;letter-spacing:-.055em}.pulse-auth-heading span{display:block;margin-top:10px;color:var(--muted);font-size:16px;line-height:1.35}.pulse-auth-form form{display:grid;gap:18px}@keyframes authSkeleton{to{background-position:-200% 0}}
${pulseAuthFormStyles}
@media(max-width:980px){.pulse-auth{grid-template-columns:1fr}.pulse-auth-panel{min-height:auto}.pulse-auth-copy h1{font-size:clamp(44px,10vw,72px)}.pulse-auth-form-wrap{min-height:auto}.pulse-auth-stats{grid-template-columns:1fr}}
@media(max-width:620px){.pulse-auth-panel,.pulse-auth-form-wrap{padding:18px}.pulse-auth-panel{grid-template-columns:1fr}.pulse-auth-panel .pulse-live-badge{justify-self:start}.pulse-auth-form{padding:20px;box-shadow:6px 6px 0 var(--orange)}}
@media(max-width:520px){.pulse-auth{overflow-x:hidden}.pulse-auth-panel{gap:18px;padding:16px}.pulse-auth-logo{font-size:clamp(40px,15vw,58px)}.pulse-auth-copy h1{font-size:clamp(36px,12vw,54px);line-height:.96}.pulse-auth-stats article{min-height:92px;padding:14px}.pulse-auth-stats strong{font-size:28px}.pulse-auth-form-wrap{padding:16px 12px 28px}.pulse-auth-form{width:100%;padding:18px;box-shadow:5px 5px 0 var(--orange)}.pulse-auth-heading h2{font-size:clamp(32px,10vw,46px)}.pulse-field input,.pulse-submit{height:46px}.pulse-password-rules span{align-items:flex-start;font-size:11px;line-height:1.25}}
`;
