#!/usr/bin/env python3
"""Rewrite globals.css with MaxQ dark theme."""

GLOBALS_CSS = r'''@import "tailwindcss";

/* ═══════════════════════════════════════════════════════
   FRACTURE — MaxQ Design System
   Dark flight-deck theme with monospace-first typography
   ═══════════════════════════════════════════════════════ */

@theme {
  --color-bg:          #0a0e17;
  --color-surface:     #0d1219;
  --color-surface-alt: #111820;
  --color-card:        #0d1219;
  --color-border:      #172033;
  --color-border-hover:#1e3a5e;
  --color-divider:     #172033;
  --color-accent:      #38bdf8;
  --color-accent-dim:  rgba(56,189,248,0.10);
  --color-green:       #22c55e;
  --color-green-dim:   rgba(34,197,94,0.12);
  --color-amber:       #f59e0b;
  --color-amber-dim:   rgba(245,158,11,0.12);
  --color-red:         #ef4444;
  --color-red-dim:     rgba(239,68,68,0.12);
  --color-white:       #e4e8f0;
  --color-text-primary:#c8cdd8;
  --color-text-secondary:#6a7a94;
  --color-text-muted:  #3a4a60;

  --color-left:        #3b82f6;
  --color-right:       #ef4444;
  --color-center:      #6a7a94;

  --color-diverge-low: #22c55e;
  --color-diverge-mod: #f59e0b;
  --color-diverge-high:#ef4444;
  --color-diverge-ext: #dc2626;

  --font-family-mono:  'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
  --font-family-sans:  'Inter', system-ui, -apple-system, sans-serif;

  --radius-sm: 3px;
  --radius-md: 3px;
  --max-width: 1200px;
  --navbar-height: 54px;
}

:root {
  --bg:           #0a0e17;
  --surface:      #0d1219;
  --surface-alt:  #111820;
  --border:       #172033;
  --border-hover: #1e3a5e;
  --accent:       #38bdf8;
  --accent-dim:   rgba(56,189,248,0.10);
  --green:        #22c55e;
  --green-dim:    rgba(34,197,94,0.12);
  --amber:        #f59e0b;
  --amber-dim:    rgba(245,158,11,0.12);
  --red:          #ef4444;
  --red-dim:      rgba(239,68,68,0.12);
  --white:        #e4e8f0;
  --text-primary: #c8cdd8;
  --text-secondary:#6a7a94;
  --text-muted:   #3a4a60;
  --left:         #3b82f6;
  --right:        #ef4444;
  --mono:         'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace;
  --sans:         'Inter', system-ui, -apple-system, sans-serif;
  --navbar-height: 54px;
}

*, *::before, *::after { box-sizing: border-box; }

html {
  background-color: var(--bg);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

body {
  min-height: 100vh;
  background-color: var(--bg);
  font-family: var(--sans);
  margin: 0;
  line-height: 1.6;
  color: var(--text-primary);
}

a { color: inherit; text-decoration: none; }

/* ── Layout ── */
.ns-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ── Typography ── */
.ns-section-label,
.ns-section-header {
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--text-secondary);
  margin-bottom: 14px;
}

.ns-mono {
  font-family: var(--mono);
  font-variant-numeric: tabular-nums;
}

/* ── Cards ── */
.ns-card {
  background-color: var(--surface);
  border-radius: 3px;
  padding: 1.5rem;
}

.ns-card-bordered {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 1.5rem;
  transition: border-color 0.2s ease;
}
.ns-card-bordered:hover { border-color: var(--border-hover); }

/* ── Buttons ── */
.ns-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--mono);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 3px;
  padding: 10px 20px;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  outline: none;
  text-decoration: none;
  line-height: 1.25;
}
.ns-btn:disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
.ns-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.ns-btn-primary {
  background-color: var(--accent);
  color: var(--bg);
}
.ns-btn-primary:hover:not(:disabled) { opacity: 0.85; }

.ns-btn-outline {
  background-color: transparent;
  color: var(--accent);
  border: 1px solid var(--border);
}
.ns-btn-outline:hover:not(:disabled) { border-color: var(--accent); }

.ns-btn-outline-dark {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border);
}
.ns-btn-outline-dark:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }

.ns-btn-sm { font-size: 11px; padding: 7px 14px; }
.ns-btn-lg { font-size: 13px; padding: 12px 24px; }
.ns-btn-full { width: 100%; justify-content: center; }

/* ── Inputs ── */
.ns-input {
  width: 100%;
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: 3px;
  padding: 10px 14px;
  font-size: 14px;
  font-family: var(--sans);
  color: var(--white);
  outline: none;
  transition: border-color 0.2s ease;
}
.ns-input:focus { border-color: var(--accent); }
.ns-input::placeholder { color: var(--text-muted); }

/* ── Badges ── */
.ns-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: var(--mono);
  font-size: 9px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 3px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.ns-badge-breaking {
  background-color: var(--red-dim);
  color: var(--red);
  border: 1px solid rgba(239,68,68,0.3);
}

.ns-badge-fractured {
  background-color: var(--red-dim);
  color: var(--red);
  border: 1px solid rgba(239,68,68,0.3);
}

.ns-badge-category {
  background-color: transparent;
  color: var(--accent);
  font-size: 10px;
  letter-spacing: 0.14em;
}

/* ── Divergence Indicators ── */
.ns-div-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ns-div-dot-low      { background-color: var(--green); }
.ns-div-dot-moderate  { background-color: var(--amber); }
.ns-div-dot-high      { background-color: var(--red); }
.ns-div-dot-extreme   { background-color: #dc2626; }

.ns-div-text-low      { color: var(--green); }
.ns-div-text-moderate  { color: var(--amber); }
.ns-div-text-high      { color: var(--red); }
.ns-div-text-extreme   { color: #dc2626; }

/* ── Lean Indicators ── */
.ns-lean-left   { color: var(--left); }
.ns-lean-right  { color: var(--right); }
.ns-lean-center { color: var(--text-secondary); }
.ns-lean-dot-left   { background-color: var(--left); }
.ns-lean-dot-right  { background-color: var(--right); }
.ns-lean-dot-center { background-color: var(--text-secondary); }

/* ── Feed Rows ── */
.ns-feed-row {
  padding: 14px 0;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s ease;
  cursor: pointer;
}
.ns-feed-row:last-child { border-bottom: none; }
.ns-feed-row:hover { background-color: var(--surface-alt); }

/* ── Trending Pills ── */
.ns-trend-pill {
  display: inline-flex;
  align-items: center;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 3px;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  background-color: transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.04em;
}
.ns-trend-pill:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* ── Navbar ── */
.ns-navbar {
  height: 54px;
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.ns-navbar-inner {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ── Nav Links ── */
.ns-nav-link {
  font-family: var(--mono);
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.15s ease;
  padding: 4px 0;
}
.ns-nav-link:hover { color: var(--accent); }
.ns-nav-link.active { color: var(--accent); font-weight: 600; }

/* ── Skeleton ── */
.ns-skeleton {
  background: linear-gradient(90deg, var(--border) 25%, var(--surface-alt) 50%, var(--border) 75%);
  background-size: 200% 100%;
  border-radius: 3px;
  animation: ns-shimmer 1.5s infinite;
}
@keyframes ns-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Auth Layout ── */
.ns-auth-layout {
  display: grid;
  grid-template-columns: 45fr 55fr;
  min-height: 100vh;
}
.ns-auth-left {
  background-color: var(--surface);
  border-right: 1px solid var(--border);
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: var(--white);
}
.ns-auth-right {
  background-color: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
}
.ns-auth-form {
  width: 100%;
  max-width: 400px;
}
@media (max-width: 767px) {
  .ns-auth-layout { grid-template-columns: 1fr; }
  .ns-auth-left { display: none; }
}

/* ── Score Bars ── */
.ns-score-bar-track {
  height: 4px;
  background-color: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.ns-score-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 300ms ease;
}

/* ── Footer ── */
.ns-footer {
  background-color: var(--surface);
  border-top: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 32px 0 0;
  margin-top: 0;
}
.ns-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 12px;
  transition: color 0.15s ease;
}
.ns-footer a:hover { color: var(--accent); }

/* ── Marquee ── */
@keyframes mq-scroll {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.mq-marquee { animation: mq-scroll 40s linear infinite; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .footer-grid { grid-template-columns: 1fr 1fr !important; }
}
@media (max-width: 768px) {
  .footer-grid { grid-template-columns: 1fr !important; }
  .footer-bottom {
    flex-direction: column !important;
    align-items: center !important;
    gap: 16px;
    text-align: center;
  }
}
'''

with open('src/app/globals.css', 'w') as f:
    f.write(GLOBALS_CSS.lstrip('\n'))

print('globals.css written:', len(GLOBALS_CSS), 'chars')
