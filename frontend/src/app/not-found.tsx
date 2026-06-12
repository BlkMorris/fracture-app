"use client";

import Link from "next/link";
import { PulseFooter, pulseChromeStyles } from "@/components/pulse/PulseChrome";

export default function NotFound() {
  return (
    <main className="pulse-not-found">
      <style>{styles}</style>

      <header className="pulse-404-top">
        <Link className="pulse-logo" href="/" aria-label="Fracture home">FRACTURE</Link>
        <div className="pulse-live-badge"><span /> SIGNAL LOST</div>
      </header>

      <section className="pulse-404-body">
        <p><span /> 404 / Route not found</p>
        <h1>This signal did not resolve.</h1>
        <div>
          <Link href="/">Return Home</Link>
          <Link href="/stories">Browse Stories</Link>
        </div>
      </section>
      <PulseFooter />
    </main>
  );
}

const styles = `
.pulse-not-found{--chalk:#FCFCF8;--night:#101114;--orange:#FF5A1F;--cyan:#14B8C8;--warm:#D9D4CC;--line:rgba(16,17,20,.18);--muted:#6F706F;min-height:100vh;background:var(--chalk);color:var(--night);font-family:Inter,"Public Sans",Arial,sans-serif}.pulse-not-found *{box-sizing:border-box}.pulse-not-found a{color:inherit;text-decoration:none}
${pulseChromeStyles}
.pulse-logo{font-size:clamp(40px,4.6vw,68px);line-height:.82;font-weight:1000;letter-spacing:-.05em}.pulse-live-badge{display:inline-flex;align-items:center;gap:8px;height:31px;padding:0 14px;background:var(--orange);color:white;font-weight:900;text-transform:uppercase;white-space:nowrap}.pulse-live-badge span{width:10px;height:10px;border-radius:999px;background:currentColor;display:inline-block;animation:pulseBlink 1.65s ease-in-out infinite}@keyframes pulseBlink{0%,100%{opacity:1}50%{opacity:.36}}
.pulse-404-top{height:88px;display:grid;grid-template-columns:minmax(250px,1fr) auto;align-items:center;gap:28px;padding:0 24px;border-bottom:1px solid var(--line);background:rgba(252,252,248,.96)}.pulse-404-top .pulse-live-badge{justify-self:end}.pulse-404-body{min-height:calc(100vh - 88px);display:grid;place-content:center;gap:22px;padding:24px}.pulse-404-body p{display:inline-flex;align-items:center;gap:10px;margin:0;color:var(--orange);font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.pulse-404-body p span{width:10px;height:10px;border:2px solid var(--orange);border-radius:999px}.pulse-404-body h1{max-width:920px;margin:0;font-size:clamp(62px,11vw,148px);line-height:.84;font-weight:1000;letter-spacing:-.07em}.pulse-404-body div{display:flex;flex-wrap:wrap;gap:12px}.pulse-404-body a{height:44px;display:inline-flex;align-items:center;border:1px solid var(--night);padding:0 14px;font-weight:950}.pulse-404-body a:first-child{background:var(--night);color:white}.pulse-404-body a:hover{box-shadow:5px 5px 0 var(--orange)}
@media(max-width:760px){.pulse-404-top{height:auto;min-height:86px;grid-template-columns:1fr;align-items:start;padding:14px 16px}.pulse-404-body{place-content:start;padding-top:70px}.pulse-404-body h1{font-size:clamp(54px,19vw,88px)}}
@media(max-width:520px){.pulse-not-found{overflow-x:hidden}.pulse-404-top{padding:14px 12px}.pulse-404-top .pulse-live-badge{justify-self:start}.pulse-logo{font-size:clamp(34px,16vw,52px)}.pulse-404-body{gap:18px;padding:54px 12px 28px}.pulse-404-body h1{font-size:clamp(44px,16vw,72px);line-height:.9}.pulse-404-body div{display:grid;grid-template-columns:1fr;width:100%}.pulse-404-body a{justify-content:center;width:100%}}
`;
