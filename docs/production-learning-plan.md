# Production learning plan (post-launch)

Do **not** treat this as fabricated metrics. After launch, observe and record real values from analytics, database queries, support tickets, and logs.

## Experimentation & evidence

| Signal | Why it matters | How to observe |
|--------|----------------|----------------|
| Experiment start rate vs drafts | Are teams finishing setup? | Count `ai_experiments` by status over time |
| Observation window completion | Is measure cron completing? | `completed` vs stuck `running` past `minimum_observation_days` |
| Measurement completeness | Data quality gates | `evidence_quality`, `dataQualityStatus` on snapshots |
| Incomplete / inconclusive rate | UX or data gaps? | Evaluation `lifecycle` distribution |
| Cross-experiment conflict frequency | Trust in evidence graph | `get_evidence_conflicts` usage + stored patterns |

## Optimization (controlled)

| Signal | Why it matters | How to observe |
|--------|----------------|----------------|
| Proposal → approve rate | Is readiness gate too strict or unclear? | `ai_optimization_proposals.status` transitions |
| Approve → execute rate | Human friction vs value | `executed_at` vs `approved_at` |
| Rollback frequency | Bad executions or manual overrides? | `rolled_back` + audit `rollback_*` events |
| Outcome pending duration | Window/cron health | `outcome_json.status` = `pending` age |
| Outcome `insufficient_data` / `inconclusive` | Real-world data sparsity | Outcome status + limitations arrays |
| Post-outcome learning updates | Closed loop working? | Learning measure after `syncOptimizationOutcome` |

## AI surfaces

| Signal | Why it matters | How to observe |
|--------|----------------|----------------|
| Assistant sessions / tool calls | Adoption | `ai_assistant` conversation tables |
| Confirmation accept vs cancel | Trust in risky actions | Pending action resolution |
| OpenAI error rate | Reliability | Safe logs `category=server` on AI routes; OpenAI dashboard |
| AI generation billing events | Cost vs value | `ai_generation` usage events |
| Strategist plan prepare → execution plan | End-to-end strategy flow | Plan status transitions |

## Providers & infrastructure

| Signal | Why it matters | How to observe |
|--------|----------------|----------------|
| Meta API error categories | Publishing/analytics reliability | Publishing job failures, analytics sync logs |
| Stripe webhook failures | Billing drift | `billing_events` errors, Stripe dashboard |
| Cron job duration / failures | Background health | Vercel cron logs + `logOperation` for optimization-readiness |
| p95 API latency | Performance | Vercel analytics / APM if enabled |

## Business & workspace usage

| Signal | Why it matters | How to observe |
|--------|----------------|----------------|
| Active workspaces / orgs | Retention | `organizations`, `client_workspaces` activity |
| Campaign + publish volume | Core product use | `campaigns`, publishing posts by status |
| Billing conversion | Monetization | Stripe subscriptions vs signups |
| Churn / cancellation reasons | Product gaps | Portal cancellations + support notes |

## Review cadence

- **Weekly (first 8 weeks):** cron health, optimization outcomes, experiment completions, top API errors.
- **Monthly:** evidence/optimization funnel, AI failure rate, performance hotspots from logs.
- **Quarterly:** decide if new capabilities are justified by **measured** gaps—not roadmap speculation.

No Phase 20 feature work until blockers in `production-blockers.md` are closed and at least one review cycle of real usage data is collected.
