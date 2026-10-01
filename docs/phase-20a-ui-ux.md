# Phase 20A — ADTRAXIO UI/UX (in progress)

Production deployment remains **Phase 20B** (`docs/phase-20-production-launch.md`).

## Homepage pass (first delivery)

### Problems found (before)
- Generic AI SaaS pattern: shiny/blur hero text, aurora background, floating dashboard beside vague headline
- Scattered narrative (problem + many similar feature sections) without CREATE → LEARN story
- Inconsistent CTAs (`Start free` vs `Start for free`)
- Fake-adjacent social proof styling (stock imagery + logo-wall feel)
- Heavy `glow-accent` on pricing and AI blocks
- Marketing anchors (`#product`, `#ai-studio`) not aligned with product language

### New information architecture
1. Hero — editorial headline + real `HeroDashboard` UI
2. Platform intro — what ADTRAXIO is
3. Growth loop navigator — Create / Analyze / Plan / Act / Learn
4. Audience — who it’s for (no fake logos)
5. Create → Analyze → Plan → Act → Learn → Workspace → Growth Copilot → Teams → Pricing → FAQ → CTA

### Design system seeds
- `src/lib/design/marketing.ts` — CTAs + growth loop
- `src/components/marketing/section-heading.tsx`
- `src/components/layout/page-header.tsx` — shared with app
- `.marketing-container` utility in `globals.css`

### Dashboard (first app alignment)
- `PageHeader` on overview
- Softer metric surface on `DashboardSurface`

### Homepage product visual differentiation (20A.1 refinement)
- **Operate:** `HomeWorkspaceMockup` in `ProductOverview` — sidebar + content/campaigns/approvals/accounts (workflow state, no KPI chart).
- **Analyze:** `AnalyticsSection` unchanged — metrics, trend, insight/recommendation.
- **Act:** `HomeCopilotMockup` in `AiSection` — numbered strategic actions + “Create growth plan” (no chat bubbles, sparkles, or duplicate dashboards).
- Hero `HeroDashboard` unchanged.

## Phase 20A.2 — App shell / sidebar (complete)

### Shell audit (before)
- Sidebar duplicated workspace nav filtering inline; generic section labels (“Main”, “More”).
- No collapse/expand; desktop notifications only in mobile `AppHeader`.
- Mobile “More” sheet used unfiltered `MAIN_NAV` / `SECONDARY_NAV` (agency client filtering inconsistent).
- Workspace switcher hidden for non-agency; little context when only one workspace.
- No shared nav link styling; template-like borders/spacing.
- No global command UI (none in codebase); assistant entry not surfaced in shell.

### Navigation changes
- `useShellNavigation` — single source for workspace-aware nav + sections: **Overview**, **Grow**, **Workspace** / **Client workspace**, **Account**.
- AI nav label **Growth Copilot** (`/assistant`); active state includes `/assistant/*` and `/ai/*`.
- `is-nav-active.ts` — nested routes; dashboard exact match only.

### Sidebar changes
- `app-sidebar.tsx` — near-black `bg-sidebar`, grouped `ShellNavSection`, lime active bar, logo + collapse (localStorage `adtraxio_sidebar_collapsed`).
- `sidebar-nav.tsx` — `ShellNavLink` / `ShellNavSection`; reduced-motion safe.
- `app-command-entry.tsx` — visual entry to Growth Copilot (no new search backend).
- `app-account-area.tsx` — user card, settings, sign out; collapsed avatar mode.
- Desktop `NotificationsBell` in sidebar header.

### Workspace changes
- `workspace-switcher.tsx` — context line (Agency home / client name / Your workspace); styled select for multi-client agencies; collapsed initial badge.

### Mobile changes
- Bottom bar: Overview, Create, Analytics, Publishing + **More** sheet with full filtered `useShellNavigation` sections, workspace switcher, copilot entry.

### Accessibility / motion
- Focus rings on notification link; `aria-label` with unread count; `sr-only` label on workspace select; semantic `nav` / `aside`; spring active indicator respects `prefers-reduced-motion`.

### Shared components
- `app-shell.tsx` — `app-page-container`, max width `1480px`, consistent gutters.
- Minor `PageHeader` eyebrow contrast tweak.

### Validation (20A.2)
- `npm run typecheck` — pass
- `npm run build` — pass
- Automated shell tests — none in repo; manual QA recommended on major routes + agency/client switch.

## Phase 20A.3 — Analytics (complete)

### Audit findings (before)
- Custom header (“Performance”) instead of shared `PageHeader`.
- Filters scattered below header; four equal KPI cards; chart coerced null → 0 in SVG.
- No chart tooltips; weak skeletons; generic empty states; platform `hasData` ignored.
- Intelligence panel tacked on without Analytics → Intelligence → Copilot bridge.

### Hierarchy
1. `PageHeader` + period/context strip + date/platform controls + refresh  
2. Unified metric strip (engagement emphasized)  
3. Primary trend chart  
4. Platform breakdown + compact intelligence panel  
5. Content table  
6. Insight bridge links  

### KPI / chart / table
- `metric-summary.tsx` — single panel, tabular nums, unavailable copy  
- `performance-chart.tsx` — gap-aware lines, axis labels, hover/touch tooltip, no null-as-zero  
- `platform-performance.tsx` — `hasData` messaging  
- `content-performance-table.tsx` — sort nulls last, hover rows, responsive scroll  

### States
- `analytics-skeleton.tsx`, `analytics-empty-state.tsx` (+ refresh on no data), `analytics-error-banner.tsx`, `analytics-partial-notice.tsx`  
- `lib/analytics/display.ts` — shared formatting  

### Validation
- `npm run typecheck` — pass  
- `npm run build` — pass  

## Phase 20A.4 — Growth Copilot (complete)

### Audit (before)
- Home felt like generic “ADTRAXIO AI” chat landing; heavy rounded cards; sparkle icon nav.
- Chat bubbles; amber warning-style pending actions; “AI is thinking” loading.
- Evidence blocks visually same as prose; execution steps as stacked cards only.

### Home
- Context-first home: **What matters now**, real `/api/assistant/home` data only.
- **COPILOT_LOOP_ACTIONS** — Create / Analyze / Plan / Act / Learn workflows.
- Quick links to briefs, Brand Brain, experiments, analytics.

### Conversation
- `CopilotResponseFrame` — left border workspace tone, timestamps, no orb bubbles.
- User messages — editorial “You” column, not rounded chat pills.
- Composer — compact, contextual hint, “Message Growth Copilot…”.

### Evidence / actions
- `EvidenceBlock` on analytics + report tool results.
- `PendingActionCard` — approval queue layout, `ActionStatusBadge`, neutral borders.
- `StrategyPlanCard` — objective / direction / pillars / measurement structure.

### Strategy / execution / briefs / brand
- `ExecutionStepTimeline` on execution plan view.
- Growth brief detail — editorial sections via `CopilotSection`.
- Brand Brain header + confirmed-vs-inferred copy.

### Shared (`src/components/copilot/`)
- `copilot-section`, `copilot-loop-actions`, `copilot-empty-state`, `copilot-response-frame`, `evidence-block`, `action-status-badge`, `execution-step-timeline`.

### Validation
- `npm run typecheck` — pass  
- `npm run build` — pass  

## Phase 20A.5 — Content Studio (complete)

### Audit (before)
- Custom header; flat form field list; equal-weight output fields; spinner-only loading.
- No preview; weak empty state; version tabs as generic pills.

### Layout
- `PageHeader` + workflow strip (Brief → Generate → Review → Edit → Save).
- Sticky brief column + output column; preview as visual centerpiece.

### Brief / output
- Grouped brief sections (`StudioFormSection`); compact option selectors.
- `ContentPreview` (text-only, no fake screenshots).
- `GenerationSkeleton`; `VariationSelector` (Original / Variation N).
- Review badges: Generated / Edited / Saved draft.
- Grouped refine fields: Lead creative / Platform copy / Direction.
- `ContentStudioError` — friendly errors + retry.

### Shared components
- `content-workflow-strip`, `content-preview`, `generation-skeleton`, `variation-selector`, `studio-form-section`, `content-studio-error`.

### Validation
- `npm run typecheck` — pass  
- `npm run build` — pass  

### Remaining
- **20A.11** breakpoint QA on create flow.

## Phase 20A.6 — Campaigns + Publishing (complete)

### Audit (before)
- Campaign list: table with engagement column (no per-row data), generic cards on mobile.
- Campaign create: flat form; weak objective hierarchy.
- Campaign detail: card-grid overview; raw publishing status strings in content table.
- Publishing queue: undifferentiated list; platform post IDs visible; spinner-only loading.
- Schedule modal (`PublishPanel`): no review step; raw API errors possible.
- Calendar route: placeholder only (unchanged).

### Campaign list
- `PageHeader`, link to publishing queue, editorial `CampaignRow` / mobile cards.
- `CampaignFilters` segmented controls + `aria-pressed`.
- `CampaignStatusBadge` restrained bordered labels.
- Removed fake engagement column; `CampaignListSkeleton`; empty + error retry.

### Campaign create
- `PageHeader`; `CampaignFormSection` (identity, objective chips, timing, accounts).
- Platform vs account labels on account picker.

### Campaign detail
- Overview snapshot strip + link to `/publishing`.
- Section eyebrows (Results, Publishing, Channels).
- `PublishStatusBadge` on associated content; layout-matched loading skeleton; error retry.
- `CampaignApprovalPanel` unchanged (authoritative approval workflow).

### Publishing queue
- `PageHeader`; status filter chips; sections (Upcoming / Published / Needs attention / Cancelled).
- `ScheduledPostRow`, cancel confirmation, `PublishingEmptyState`, `PublishingSkeleton`.
- `friendlyPublishError` for failed posts and queue errors.

### Schedule flow (`PublishPanel`)
- Account → content → media → timing; timezone visible; review summary before submit.
- Friendly publish errors on failure.

### Shared components
- `publish-status-badge`, `scheduled-post-row`, `publishing-empty-state`, `publishing-skeleton`
- `campaign-list-skeleton`, `campaign-form-section`
- Updated: `campaign-status`, `campaigns-view`, `campaign-row`, `campaign-filters`, `campaign-create-view`, `campaign-detail-view`, `publishing-queue-view`, `publish-panel`

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass
- No campaign/publishing-specific unit suite in repo; phase API e2e scripts unchanged (not re-run this slice).

### Remaining
- **Calendar** — still `PlaceholderPage`; no new calendar backend (by design).
- Campaign list does not show per-campaign performance metrics (not in list API).
- **20A.11** responsive/a11y QA on campaigns + publishing flows.

## Phase 20A.7 — Social Connections (complete)

### Audit (before)
- Custom header; single flat account list; `window.confirm` disconnect; env var name in encryption warning.
- Platform list as divided rows; coming-soon platforms mixed with connect actions.
- Select flow: basic header; spinner-only loading; raw errors possible.
- No capability or reconnect UX; status as colored text only.

### Page hierarchy
- `PageHeader` + **Connect account** (anchor to available platforms when configured).
- **Connected → Your accounts** grouped by platform (Instagram, Facebook, …).
- **Add connection → Available platforms** with pre-OAuth copy (Meta only).

### Connected accounts
- `SocialConnectionCard`: strong @handle identity, status badge, Manage (capabilities + links), Reconnect when `expired`/`error`, Disconnect → `DisconnectDialog`.
- No tokens, IDs, or raw scopes.

### Connection flow
- `CONNECT_PLATFORM_COPY` on Facebook/Instagram connect rows.
- Pending multi-account: `/social/select` with in-progress banner + `PageHeader`.
- OAuth URLs unchanged (`/api/social/meta/connect`).

### Status & capabilities
- `SocialConnectionStatus` — connected, reconnect required, connection error (backend statuses only).
- `CapabilityList` — Publishing, Analytics, Content Studio for connected Meta accounts only; coming-soon platforms show no fake capabilities.

### Empty / loading / error
- `ConnectionEmptyState`, `ConnectionSkeleton`, `ConnectionError` + `friendlyConnectionMessage`.

### Shared components
- `connection-display.ts`, `social-connection-status`, `capability-list`, `connection-empty-state`, `connection-skeleton`, `connection-error`, `disconnect-dialog`, `social-connection-card`
- Updated: `social-connections-view`, `social-platform-list`, `social-account-select-view`, `social/page.tsx`
- Removed unused `social-account-row.tsx`

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass

### Remaining
- No Page ↔ Instagram hierarchy in API (`SafeSocialAccount` has no parent Page field).
- TikTok/LinkedIn/YouTube listed as coming soon only.
- **20A.11** mobile/a11y QA on connect + disconnect dialogs.
- **Next: 20A.11 Final QA** (after 20A.10).

## Phase 20A.9 — Approvals + Client Reporting (complete)

### Audit (before)
- Approvals only embedded in Content Studio + campaign detail; no hub; loud status pills; `window.confirm` on reject; chat-style comments; raw activity action strings.
- No dedicated `/approvals` route; notifications list generic.
- Reports: custom header; AskAdtraxio prominent on list; Sparkles on generate; `window.confirm` archive; executive summary in generic card; weak Analytics vs Reporting distinction.

### Approvals
- New `/approvals` hub: PageHeader, **Needs your review** (unread approval notifications), **Recent review activity** (activity log; honest about limits).
- Nav: **Approvals** in secondary nav (shell addition only).
- Shared `ApprovalWorkflowSection` for content + campaign panels: status, metadata, actions, `ApprovalRejectDialog`, editorial comments, activity timeline.
- `ApprovalStatusBadge` restrained borders; friendly errors via `collaboration/display.ts`.
- Decisions still on `/create` and `/campaigns/[id]` (APIs unchanged).

### Reporting
- `PageHeader` library; link to Analytics clarifying snapshot vs live data.
- `ReportRow` mobile; editorial table desktop; empty/skeleton/error states.
- `ReportSnapshotHeader` + `ReportExecutiveSummary` (briefing, not chat bubble).
- Builder: section eyebrows, “Generate snapshot”, `ReportArchiveDialog`, no Sparkles.
- `reporting/display.ts` human status labels; `formatReportMetric` semantics preserved in display.

### Shared components
- Approvals: `approval-workflow-section`, `approval-comment-list`, `approval-activity-timeline`, `approval-reject-dialog`, `approval-row`, `approvals-view`, updated panels/badges.
- Reports: `report-row`, `report-empty-state`, `report-skeleton`, `report-error`, `report-executive-summary`, `report-snapshot-header`, `report-archive-dialog`, updated `reports-view`, `report-display`, `report-builder-view`, `report-status-badge`.

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass

### Remaining limitations
- No workspace-wide approval list API — hub uses notifications + activity (documented in UI).
- Content deep-link from activity metadata not supported (`/create` only).
- `CommentsPanel` / `ActivityPanel` legacy files unused (superseded by approval components).
- **20A.11** full responsive/a11y QA on approvals + reports + print view.

## Phase 20A.10 — Billing + Settings (complete)

### Audit (before)
- Billing: custom header (not `PageHeader`), basic pulse skeleton, raw API errors, message exposing Stripe env configuration, plan cards with heavy Pro highlight, success page mentioned Stripe and raw `status` string.
- Settings: workspace-only stub; title “Workspace settings”; no account directory, no connections link, billing as button-only block.
- Checkout/portal flows and APIs unchanged; entitlements from `getPublicPlans()` / usage API only.

### Billing hierarchy
- `PageHeader` — eyebrow **Billing**, title **Plans & billing**.
- Sections: **Current plan** (dominant card + status badge + hints), **Usage & entitlements** (when metrics exist), **Plan options** (comparison table desktop + cards all breakpoints), **Billing management** (portal panel when `hasStripeSubscription` + billing available).
- `lib/billing/display.ts`: human status labels, state hints, sanitized `friendlyBillingError`, no provider IDs in copy.

### Plan comparison & pricing
- `BillingPlanComparison` table from API `features` (sourced from `PLAN_FEATURES` / KES `PLAN_PRICING` — not hard-coded in UI).
- `PlanCard` restrained borders; current plan emphasis; checkout loading copy “Redirecting to checkout…”.

### Billing states & flows
- `BillingStatusBadge` + `subscriptionStatusHint` for active, trial, past due, canceled, incomplete, free — only statuses in `SubscriptionInfo`.
- Checkout + Billing Portal still POST to existing routes; no in-app portal recreation.
- Success/cancel pages use `PageHeader`; success shows entitlement + badge after subscription fetch (no payment-success claim beyond API state).

### Loading / error
- `BillingSkeleton`, `BillingError` with retry; `aria-live` on billing errors; portal/checkout loading on buttons.

### Settings hierarchy
- `PageHeader` — **Settings** / “Manage your account, workspace, and connected services.”
- Sections: **Account** (read-only Supabase auth name/email when available; no fake profile form), **Workspace** (20A.8 context + agency/client copy), **Clients & team** (agency only → `/clients`), **Connections** → `/social`, **Billing** → `/billing` via `SettingsLinkRow`.
- No new settings routes or notification/security pages (not implemented).

### Shared components
- Billing: `billing-section`, `billing-status-badge`, `billing-plan-comparison`, `billing-action-panel`, `billing-skeleton`, `billing-error`; updated `billing-view`, `current-plan`, `billing-status`, `usage-summary`, `plan-card`.
- Settings: `settings-link-row`, `settings-skeleton`; updated `settings-view`.

### Shell / responsive / a11y / motion
- No Phase 20A.2 shell redesign; footer Settings + Billing unchanged.
- Comparison table scrolls on small desktop widths; cards stack on mobile; forms/rows single-column friendly.
- Semantic sections, `role="alert"` / `aria-live`, sr-only table caption, focus rings on retry; `motion-reduce` on plan card transitions.

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass
- No dedicated billing/settings unit tests in repo

### Remaining limitations
- No in-app profile edit API (account is display-only from auth metadata).
- No annual billing UI (API plans are monthly KES only).
- Downgrade to Free via portal only (no dedicated in-app downgrade flow).
- Plan comparison rows are feature-line based (not a separate entitlement matrix API).
- **20A.11** full product-wide QA — see below.

## Phase 20A.11 — Final product-wide UI/UX QA + hardening (complete)

### Scope
Audit-first pass across 20A.1–20A.10 surfaces. No redesigns, no new features, no backend/API/RLS/Stripe/Meta changes.

### Routes / surfaces audited (45 app pages + marketing sections)
Marketing `/`, pricing/FAQ/CTA sections; auth login/signup/onboarding; core `/dashboard`, `/create`, `/analytics`, `/campaigns/*`, `/publishing`, `/social/*`, `/approvals`, `/clients/*`, `/reports/*`, `/assistant/*`, `/settings`, `/billing/*`; placeholders `/calendar`, `/messages`, `/notifications`, `/ai` documented as intentional.

### Fixes made
| Severity | Issue | Fix |
|----------|--------|-----|
| **High** | `window.confirm` on publish queue cancel | `PublishCancelDialog` (20A.7–20A.9 dialog pattern) |
| **High** | `window.confirm` on Brand Brain product delete | `BrandProductDeleteDialog` + sanitized delete errors |
| **Medium** | Duplicate dashboard client fetches (prior session) | `/api/dashboard/overview` + `DashboardDataProvider` cache (verified in QA) |

### QA results (code + build audit)
- **Visual consistency:** PageHeader, editorial sections, restrained badges/skeletons aligned across 20A phases; homepage OPERATE/ANALYZE/ACT visuals unchanged.
- **Responsive:** `overflow-x-hidden` on body/shell; billing plan table scroll; mobile nav sheet; report print CSS (`no-print`, `report-document`) present.
- **Navigation:** Footer Settings/Billing; `is-nav-active` nested routes; workspace switcher invalidates dashboard cache on switch.
- **Workspace context:** `WorkspaceContextBar` + switcher; hidden on `/settings`, `/billing`, `/clients` where designed.
- **Loading/empty/error:** Friendly helpers on billing, publishing, collaboration, reports, workspace; dashboard timeout when API unreachable.
- **Accessibility:** Dialogs use `role="dialog"`, `aria-modal`, titles; billing `aria-live`; status badges include text; new dialogs support Escape on overlay.
- **Security/trust UI:** No Stripe/env/UUID exposure in billing components; grep clean on app components.

### Not fixed (documented limitations)
- **CRITICAL (infra):** Adly Supabase project paused / DNS unresolved blocks login and all authenticated surfaces — not a UI defect; restore project before production.
- **LOW:** `/calendar`, `/messages`, `/notifications` remain placeholders.
- **LOW:** ESLint scans `.next` dev artifacts (pre-existing config); use `eslint` on `src` only for meaningful lint signal.
- **LOW:** Some marketing sections retain `glow-accent-sm` / Sparkles by prior approved homepage design; hero unchanged.
- **LOW:** Archive/disconnect dialogs without Escape on older components (new QA dialogs include Escape).

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass
- `npm run lint` — not gate-ready (includes `.next` noise); no new `src` lint regressions introduced in fixes
- Automated UI/E2E suite — not run (requires live Supabase)

### Production status
**FIXES REQUIRED** for go-live: activate/restore hosted Supabase (and Stripe env for paid billing). **UI/UX Phase 20A is complete** pending that infrastructure.

## Phase 20A.8 — Agency / Client Workspace (complete)

### Audit (before)
- Clients list: custom header, spinner loading, dashed empty state, generic error styling.
- Client detail: slug in hero, `window.confirm` archive, card-grid metrics.
- Members: exposed `userId`, dev-only invite URL copy, `confirm` for remove.
- Workspace switcher: flat select, weak agency vs client grouping, no type label.
- Settings: billing-only stub; no workspace context.
- No cross-page workspace context bar for agency users.

### Hierarchy & context
- `WorkspaceContextBar` in app shell (agency home vs client workspace + role); hidden on `/clients`, `/settings`, `/billing` to avoid duplication.
- `/clients` as agency hub: `PageHeader` (Agency workspace / Your agency), editorial client list, quick actions.
- Client detail: overview strip, archive dialog, no slug in hero.

### Workspace switcher
- `optgroup` Agency vs Client workspaces; `WorkspaceTypeLabel`; empty-client hint; skeleton while loading; preserved switch API.

### Members & invitations
- Role descriptions from `permissions.ts`; no user IDs in UI.
- Invitation link with copy + honest “email not automatic” copy.
- `RemoveMemberDialog`, `ArchiveClientDialog` (no `window.confirm`).

### Settings
- `SettingsView`: workspace type, name, role, links to clients/billing.

### Shared components
- `lib/workspaces/display.ts`, `workspace-type-label`, `workspace-role`, `workspace-context-bar`, `workspace-settings-section`, `workspace-skeleton`, `workspace-error`, `workspace-empty-state`, `archive-client-dialog`, `remove-member-dialog`, `settings-view`

### Validation
- `npm run typecheck` — pass
- `npm run build` — pass

### Remaining limitations
- No pending-invitation list API (invites only on create response).
- No workspace activity feed API.
- Org-level team separate from client members (unchanged).
- **20A.11** full responsive/a11y QA on workspace flows.
- Dashboard not restructured (context via shell bar only).

### Remaining (copilot)
- Experiments / optimization detail pages — lighter pass than main console (functional unchanged).
- Dedicated right context panel deferred (conversation-first layout kept).
- **20A.11** mobile/a11y QA.

### Remaining (analytics)
- `no_published` empty variant unused (no logic change this phase).  
- Per-route `PageHeader` elsewhere; **20A.11** responsive/a11y QA.

### Remaining issues / next (shell)
- Per-route `PageHeader` adoption outside dashboard (ongoing in later 20A slices).
- Full responsive/a11y pass reserved for **20A.11**.
- **Do not** rework homepage unless shared tokens require a tiny fix.

### Remaining (20A after shell)
- Analytics, copilot UI, content studio, campaigns, billing, agency views, 20A.11 QA

### Validation (homepage)
- `npm run build` — pass (after clearing corrupted `.next/dev` cache)
