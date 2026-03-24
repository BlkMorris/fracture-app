# Frontend Cleanup Report — 2026-03-18

## 1. AUDIT FINDINGS

| File | Category | Action Taken | Reason |
|------|----------|-------------|--------|
| `src/app/mockups/` | [MOCKUP] | Already deleted | Was removed in a previous cleanup pass |
| `src/components/ui/ArticlePlaceholder.tsx` | [DEAD] | Deleted | Only re-exported in barrel `index.ts`; zero consumer imports anywhere in `src/` |
| `src/components/ui/FadeImage.tsx` | [DEAD] | Deleted | Only re-exported in barrel `index.ts`; zero consumer imports anywhere in `src/` |
| `src/components/ui/Tooltip.tsx` | [DEAD] | Deleted | Only re-exported in barrel `index.ts`; zero consumer imports anywhere in `src/` |
| `src/components/narrative/index.ts` | [DEAD] | Deleted | Barrel file; no consumer imports from `@/components/narrative` — sole consumer (`compare/page.tsx`) uses direct import |
| `src/components/story/OutletArticleList.tsx` | [DEAD] | Deleted | Imported in `story/[clusterId]/page.tsx` but **never rendered in JSX** — zombie import |
| `src/app/story/[clusterId]/page.tsx` (line 19) | [COMMENTED] | Cleaned | Removed unused `OutletArticleList` import |
| `src/components/ui/index.ts` | [DUPLICATE] | Cleaned | Removed 3 dead re-exports (`ArticlePlaceholder`, `FadeImage`, `Tooltip`) |
| `StoryFractureGraph` | — | N/A | Not found — already removed in earlier pass |
| `TickerBar` | — | N/A | Not found — already removed in earlier pass |

## 2. FILES DELETED

| File | Lines |
|------|-------|
| `src/components/ui/ArticlePlaceholder.tsx` | 57 |
| `src/components/ui/FadeImage.tsx` | 32 |
| `src/components/ui/Tooltip.tsx` | 62 |
| `src/components/narrative/index.ts` | 1 |
| `src/components/story/OutletArticleList.tsx` | ~180 |

**Total: 5 files, ~332 lines removed**

## 3. CODE CLEANED

| File | Change |
|------|--------|
| `src/components/ui/index.ts` | Removed 3 barrel exports: `ArticlePlaceholder`, `FadeImage`, `Tooltip` |

## 4. IMPORTS REMOVED

| File | Import Removed |
|------|---------------|
| `src/app/story/[clusterId]/page.tsx` | `import { OutletArticleList } from "@/components/story/OutletArticleList"` |

## 5. FILES PRESERVED (with reason)

| File | Reason |
|------|--------|
| `src/app/journey/not-found.tsx` | Next.js special file — handles 404 for the `/journey` route which still has an active `[clusterId]` redirect |
| `src/app/journey/[clusterId]/page.tsx` | Active redirect for legacy bookmarks (`/journey/:id` → `/story/:id?view=guided`) |
| `src/components/ui/OnboardingTour.tsx` | Uses `framer-motion` — import is **actively used** (12 references to `motion.*` / `AnimatePresence`). `framer-motion` dependency in `package.json` is justified by this file alone |
| `src/components/checkout/MockPaymentForm.tsx` | Name includes "Mock" but it is actively imported and used by `src/app/checkout/page.tsx` — this is the test-mode payment form |

## 6. ROUTES REMOVED FROM BUILD

None. The `src/app/mockups/` directory had already been removed in a prior cleanup. No production routes were removed in this pass.

**Final route count: 33 routes (unchanged)**

## 7. BUILD VERIFICATION

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ 0 errors |
| `npm run build` | ✅ Clean build — all 33 routes compiled successfully |

## 8. RECOMMENDED FOLLOW-UP

| Item | Notes |
|------|-------|
| `framer-motion` dependency | Only used by `OnboardingTour.tsx`. If the tour is ever removed or rewritten without animation, `framer-motion` (112 KB gzipped) can be removed from `package.json` |
| `src/components/checkout/MockPaymentForm.tsx` | Named "Mock" — confirm whether this should be replaced with a real payment form before production launch |
| `yahoo-finance2` dependency | Used only by `src/app/api/stocks/route.ts` — verify this API route is still needed |
| Pre-existing lint warnings | 78 Tailwind class suggestions in `story/[clusterId]/page.tsx` (e.g. `text-[#1A1A2E]` → `text-text-primary`). These are style consistency improvements, not errors |
| `src/components/narrative/HighlightedText.tsx` | Now the sole file in `src/components/narrative/` (barrel deleted). Consider moving to `src/components/ui/` if the directory feels orphaned |
