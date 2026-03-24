# Fracture — Styling Guide

> **Last updated:** $(date)
> **Stack:** Next.js 16 · React 19 · Tailwind CSS v4 · Geist Sans / Mono · Lora Serif

---

## Architecture Overview

```
globals.css          ← Design tokens, base styles, @layer components classes
lib/style-utils.ts   ← Shared helper functions (data → Tailwind class mappings)
```

**Tailwind CSS v4** uses `@theme inline { }` in `globals.css` for all custom tokens.  
There is no `tailwind.config.js` — everything lives in CSS.

---

## 1. Design Tokens (CSS Custom Properties)

All tokens are defined in `@theme inline { }` inside `globals.css`.

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--color-bg` | `#FAF8F4` | Page background |
| `--color-surface` | `#FFFFFF` | Card / panel backgrounds |
| `--color-surface-raised` | `#FFFFFF` | Modals, elevated panels |
| `--color-border` | `#E5E0D5` | Default borders, dividers |
| `--color-border-subtle` | `#F0EBE1` | Lighter separator lines |
| `--color-text-primary` | `#1A1A1A` | Headlines, primary body text |
| `--color-text-secondary` | `#4A4A4A` | Body text, descriptions |
| `--color-text-tertiary` | `#8A8A8A` | Timestamps, placeholders |
| `--color-accent` | `#2563EB` | Primary brand accent (blue) |
| `--color-accent-hover` | `#1D4ED8` | Hover state for accent |
| `--color-accent-subtle` | `#DBEAFE` | Light tint for accent backgrounds |
| `--color-lean-left` | `#2563EB` | Left political lean |
| `--color-lean-right` | `#DC2626` | Right political lean |
| `--color-lean-center` | `#8B8B8B` | Center political lean |
| `--color-divergence-low` | `#22C55E` | Low divergence (green) |
| `--color-divergence-mid` | `#F59E0B` | Mid divergence (amber) |
| `--color-divergence-high` | `#EF4444` | High divergence (red) |
| `--color-bone` | `#F5F0E8` | Warm surface tint |
| `--color-bone-dark` | `#EBE5D9` | Darker surface tint |
| `--color-ink` | `#1A1A1A` | Alias for text-primary |
| `--color-ink-light` | `#4A4A4A` | Alias for text-secondary |
| `--color-ink-muted` | `#8A8A8A` | Alias for text-tertiary |

### Typography

| Token | Value | Notes |
|---|---|---|
| `--font-sans` | `var(--font-geist-sans)` | Loaded via `next/font/google` |
| `--font-mono` | `var(--font-geist-mono)` | Loaded via `next/font/google` |
| `--font-serif` | Lora | Loaded via `next/font/google` (set as CSS var `--font-serif`) |

### Spacing

| Token | Value | Usage |
|---|---|---|
| `--page-padding-x` | `2.5rem` (responsive) | Page container horizontal padding |
| `--section-gap` | `2rem` | Gap between sections |
| `--card-padding` | `1.25rem` | Card internal padding |
| `--card-gap` | `1.5rem` | Gap between cards in a grid |

### Radius

| Token | Value |
|---|---|
| `--radius-sm` | `0.25rem` |
| `--radius-md` | `0.5rem` |
| `--radius-lg` | `0.75rem` |
| `--radius-xl` | `1rem` |
| `--radius-full` | `9999px` |

### Shadows

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` |
| `--shadow-lg` | `0 8px 24px rgba(0,0,0,0.08)` |

### Transitions

| Token | Value |
|---|---|
| `--transition-fast` | `150ms` |
| `--transition-base` | `200ms` |
| `--transition-slow` | `300ms` |
| `--ease-default` | `cubic-bezier(0.25, 0.1, 0.25, 1)` |

---

## 2. Global Component Classes

Defined inside `@layer components { }` in `globals.css`. Use these in JSX with `className`.

### Typography

| Class | Purpose |
|---|---|
| `.font-editorial-mono` | Mono labels, scores, metadata |
| `.font-editorial-serif` | Headlines, pull quotes |
| `.heading-display` | Page title — `clamp(2rem, 5vw, 3rem)` serif bold |
| `.heading-1` | Section title — `2rem` serif bold |
| `.heading-2` | Card title — `1.25rem` serif bold |
| `.heading-3` | Sub-heading — `1rem` serif bold |
| `.heading-4` | Small heading — `0.9375rem` serif semibold |
| `.body-lg` | Large body text — `1.125rem` |
| `.body-md` | Default body — `0.875rem` |
| `.body-sm` | Small body — `0.8125rem` |
| `.label` | Uppercase mono label — `0.5625rem` |
| `.caption` | Small mono caption — `0.625rem` |
| `.mono` | Tabular-nums mono utility |
| `.pull-quote` | Italic serif pull quote |

### Layout

| Class | Purpose |
|---|---|
| `.page-container` | Max-width responsive wrapper (mirrors `.content-container`) |
| `.content-container` | Original responsive container (kept for compatibility) |
| `.page-header` | Flex column with gap for page header areas |
| `.section` | Flex column with section gap + padding |
| `.section-label` | Section label row: icon + text + rule + meta |
| `.section-label-text` | The label text (mono uppercase accent) |
| `.section-label-rule` | The horizontal rule in section labels |
| `.section-label-meta` | Right-side metadata text |

### Cards

| Class | Purpose |
|---|---|
| `.card` | Base card: surface bg, border, radius-md, padding |
| `.card-hover` | Interactive card with hover shadow/border transition |
| `.card-header` | Card title text style (serif, 0.9375rem, bold) |
| `.card-body` | Card content area with flex-col + gap + padding |

### Buttons

| Class | Purpose |
|---|---|
| `.btn` | Base button reset + flex + mono + transition |
| `.btn-primary` | Dark bg, light text |
| `.btn-secondary` | Transparent with border |
| `.btn-ghost` | No border, transparent |
| `.btn-sm` / `.btn-md` / `.btn-lg` | Size variants |

### Badges

| Class | Purpose |
|---|---|
| `.badge` | Base badge: mono, uppercase, small, pill |
| `.badge-status-breaking` | Red breaking badge |
| `.badge-status-active` | Green active badge |
| `.badge-status-archived` | Muted archived badge |
| `.badge-fractured` | Red fractured badge |
| `.badge-lean-left/right/center` | Political lean badges |
| `.badge-framing` | Base framing badge |
| `.badge-framing-conflict` | Red framing |
| `.badge-framing-human-interest` | Purple framing |
| `.badge-framing-economic` | Amber framing |
| `.badge-framing-moral` | Green framing |
| `.badge-framing-responsibility` | Blue framing |

### Inputs

| Class | Purpose |
|---|---|
| `.input` | Base text input |
| `.input-search` | Large serif search input |

### Dividers

| Class | Purpose |
|---|---|
| `.divider` | 1px default border line |
| `.divider-subtle` | 1px subtle border line |
| `.divider-vertical` | 1px vertical divider |
| `.divider-bold` | 1px darker divider |

### Navigation

| Class | Purpose |
|---|---|
| `.nav-link` | Default nav link style |
| `.nav-link-active` | Active nav link (dark bg, light text) |

### Data Components

| Class | Purpose |
|---|---|
| `.spectrum-track` | Background track for source spectrum |
| `.spectrum-marker` | Individual source dot |
| `.fdi-score` | Large mono score number |
| `.fdi-label` | "FDI" / "Divergence" label |
| `.sub-metric-bar` | Background bar for sub-metrics |
| `.sub-metric-bar-fill` | Animated fill for sub-metrics |

---

## 3. Shared Style Utilities (`lib/style-utils.ts`)

Import these instead of defining helpers locally in pages:

```tsx
import {
  fdiColor,        // (score) → "text-divergence-high" etc.
  fdiBarColor,     // (score) → "bg-divergence-high" etc.
  fdiStroke,       // (score) → hex string for SVG
  leanLabel,       // (lean) → "Far Left" | "Left" | "Center" | "Right" | "Far Right"
  leanLabelShort,  // (lean) → "Left" | "Center" | "Right"
  leanTextColor,   // (lean) → "text-left" | "text-right" | "text-ink-muted"
  leanDotColor,    // (lean) → "bg-left" | "bg-right" | "bg-center"
  leanBorderColor, // (lean) → "border-left" | "border-right" | "border-center"
  leanBg,          // (lean) → "bg-left-light text-left" etc.
  sentimentEmoji,  // (score) → emoji string
  sentimentLabel,  // (score) → "Very Positive" etc.
  sentimentColor,  // (score) → Tailwind text color class
  framingLabel,    // (type) → "Human Interest" etc.
  framingBadgeClass, // (type) → global badge class names
  framingColorClass, // (type) → "bg-red-50 text-red-700" etc.
  timeAgo,         // (dateStr) → "5m ago", "3h ago", "2d ago"
  formatTime,      // (dateStr) → "3:45 PM"
  formatDate,      // (dateStr) → "Jan 15"
  statusBadge,     // (updatedAt) → { text, className }
  fmtSigned,       // (number) → "+0.42" / "-0.18"
} from "@/lib/style-utils";
```

---

## 4. Naming Conventions

| Category | Pattern | Example |
|---|---|---|
| Color tokens | `--color-{semantic}` | `--color-text-primary` |
| Lean tokens | `--color-lean-{direction}` | `--color-lean-left` |
| Component classes | `.{component}` or `.{component}-{variant}` | `.card-hover`, `.btn-primary` |
| Badge variants | `.badge-{category}-{value}` | `.badge-framing-conflict` |
| Size variants | `.{component}-{size}` | `.btn-sm`, `.btn-lg` |
| Typography classes | `.heading-{level}` or `.body-{size}` | `.heading-display`, `.body-sm` |

---

## 5. Tailwind Class Usage Rules

1. **Use design tokens** for colors — prefer `text-ink`, `bg-surface`, `border-border` over `text-gray-900`, `bg-white`, `border-gray-200`.

2. **Use global classes** for repeated patterns — prefer `className="card-hover"` over `className="bg-surface border border-border-subtle rounded-lg shadow-sm transition-all hover:shadow-md"`.

3. **Avoid arbitrary values** — prefer `text-xs`, `text-sm`, `text-base` over `text-[11px]`, `text-[13px]`.

4. **Import helpers from `style-utils.ts`** — never copy-paste `fdiColor`, `leanLabel`, etc. into a component file.

5. **Dynamic inline `style={{ }}`** is acceptable only for:
   - Truly dynamic values: bar widths (`width: ${value}%`), spectrum positions (`left: ${pct}%`)
   - Stagger delays (`animationDelay: ${i * 60}ms`)
   - Dynamic max-heights from refs

6. **Fonts**: Use `.font-editorial-serif` for headlines, `.font-editorial-mono` for labels/metrics. Body text uses the default sans (Geist).

---

## 6. Responsive Breakpoints

The `content-container` / `page-container` adjusts automatically:

| Breakpoint | Max Width | Padding |
|---|---|---|
| `≥1440px` | `1480px` | `2.5rem` |
| `1024–1439px` | `1200px` | `2rem` |
| `640–1023px` | `960px` | `1.25rem` |
| `<640px` | `100%` | `1rem` |

Standard Tailwind breakpoints remain: `sm:640px`, `md:768px`, `lg:1024px`, `xl:1280px`.

---

## 7. Animation Classes

| Class | Description |
|---|---|
| `.animate-ticker` | Horizontal scroll for ticker bar |
| `.animate-fade-in-up` | Fade in + slide up |
| `.animate-stagger > *` | Staggered children fade-in (up to 9 children) |
| `.img-fade-in` / `.img-fade-in.loaded` | Image reveal on load |
| `.skeleton-shimmer` | Loading skeleton shimmer effect |

---

## 8. File Map

```
src/app/globals.css           — All design tokens + global component classes
src/lib/style-utils.ts        — Shared data→class mapping functions
src/app/layout.tsx             — Root layout (fonts, Navbar, Footer, container)
src/components/layout/         — Navbar, Footer, TickerBar
src/components/ui/             — Skeleton, FadeIn, CardHover, StoryTabs, etc.
src/components/narrative/      — BiasMeter, DivergenceBadge, etc.
src/components/visualizations/ — SourceSpectrum, NarrativeSpectrum, etc.
src/components/articles/       — ArticleCard, FracturedStoryCard, StoryClusterCard
src/components/story/          — HeadlineComparison, NarrativeTimeline, etc.
```
