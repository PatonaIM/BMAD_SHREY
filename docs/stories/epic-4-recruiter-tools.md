# Epic 4: Advanced Application Management & Recruiter Tools – User Stories

Source: `docs/prd.md` Epic 4. IDs EP4-S#.

## EP4-S1 Advanced Application Workflow Management

As a recruiter,
I want bulk workflow control & status automation,
So that I process candidates efficiently.

Acceptance Criteria:

- Filtering by status, score range, interview completion
- Bulk status/actions
- Workflow templates
- Rule-based auto updates

DoD:

- [ ] Workflow engine module
- [ ] Bulk action endpoint tests
- [ ] Rule evaluation tests

## EP4-S2 Recruiter Analytics Dashboard

As a hiring manager,
I want analytics on candidate quality & funnel,
So that I optimize strategy.

Acceptance Criteria:

- Score distribution, time-to-hire, source effectiveness
- Conversion funnel visualization
- Recruiter performance metrics

DoD:

- [ ] Analytics aggregation queries
- [ ] Dashboard components
- [ ] KPI definitions doc

## EP4-S3 Advanced Candidate Search & Discovery

As a recruiter,
I want semantic search & advanced filters,
So that I proactively source talent.

Acceptance Criteria:

- Natural language queries
- Saved searches + alerts
- Geographic & availability filters
- Diversity/inclusion filter set

DoD:

- [ ] Search service (embedding + filters)
- [ ] Saved search persistence
- [ ] Alert dispatcher stub

## EP4-S4 Collaborative Hiring Team Tools

As a hiring team member,
I want shared evaluations & discussions,
So that decisions are well-informed.

Acceptance Criteria:

- Scorecards
- Shared feedback threads
- Candidate comparison view
- Audit trail for decisions

DoD:

- [ ] Scorecard model
- [ ] Threaded comments store
- [ ] Comparison component

## EP4-S5 Enterprise Integration & API Access

As an enterprise client,
I want ATS/API integration,
So that data flows into existing systems.

Acceptance Criteria:

- REST API with auth
- Webhooks for status changes
- SSO (placeholder)
- Field mapping configuration

DoD:

- [ ] OpenAPI spec draft
- [ ] Webhook registration endpoint
- [ ] Field mapping schema

## EP4-S6 Communication & Messaging

As a recruiter,
I want templated & automated messaging,
So that candidate communication is consistent.

Acceptance Criteria:

- Template library
- Automation triggers
- Bulk messaging
- History tracking

DoD:

- [ ] Template engine
- [ ] Trigger rule tests
- [ ] Message history model

## EP4-S7 Reporting & Compliance

As an HR administrator,
I want compliance & diversity reporting,
So that we meet regulatory requirements.

Acceptance Criteria:

- EEOC report set
- Diversity funnel metrics
- Pay equity analysis stub
- Data retention policies enforcement

DoD:

- [ ] Report generation module
- [ ] Diversity metrics queries
- [ ] Retention cleanup job stub

## EP4-S8 Premium Features & Monetization

As a platform administrator,
I want tiered subscriptions & billing,
So that we generate revenue.

Acceptance Criteria:

- Tier gating (Basic, Professional, Enterprise)
- Subscription lifecycle (trial, active, cancel)
- Usage analytics
- Upgrade prompts

DoD:

- [ ] Subscription model
- [ ] Billing provider integration stub
- [ ] Usage tracking hooks

---

Epic 4 ready when monetization flows and compliance reports validated.
