# BrightCampus School Onboarding — Agreement Pack

This folder contains the legal and operational documents needed to onboard a school onto
BrightCampus ("Brighter Schools. Smarter Management.").

> **Disclaimer:** These are working templates prepared for BrightCampus. They are **not legal
> advice**. Before signing your first school, have them reviewed by a South African attorney,
> particularly for POPIA compliance and the limitation-of-liability clauses.

## Documents in this pack

| # | Document | Signed by | Purpose |
|---|----------|-----------|---------|
| 1 | [School Service Agreement](./01-school-service-agreement.md) | Provider + School | Master subscription contract: services, fees, term, liability |
| 2 | [Data Processing Agreement (POPIA)](./02-data-processing-agreement-popia.md) | Provider + School | POPIA operator agreement: roles, security, breach handling |
| 3 | [Service Level Agreement](./03-service-level-agreement.md) | Annexure to #1 | Uptime, support hours, response times, maintenance |
| 4 | [Acceptable Use Policy](./04-acceptable-use-policy.md) | Annexure to #1 | Rules for all school users of the platform |
| 5 | [Onboarding Order Form](./05-onboarding-order-form.md) | Provider + School | School details, plan selection, pricing, go-live checklist |
| 6 | [Parent & Learner Consent Notice](./06-parent-learner-consent-notice.md) | School → Parents | Template the school sends to parents/guardians |
| 7 | [Staff Access & Confidentiality Acknowledgement](./07-staff-confidentiality-acknowledgement.md) | School staff | Per-user acknowledgement before account activation |

## Recommended signing order

1. **Onboarding Order Form (#5)** — capture school details, chosen plan (Small / Medium / Large),
   billing contact, and signatories.
2. **School Service Agreement (#1)** — the master contract. The SLA (#3) and AUP (#4) are annexures
   and are incorporated by reference; they do not need separate signatures.
3. **Data Processing Agreement (#2)** — required under POPIA s21 before any learner data is loaded.
4. **Parent & Learner Consent Notice (#6)** — the school distributes this to parents before learner
   accounts are created. Keep proof of distribution.
5. **Staff Acknowledgement (#7)** — each staff member accepts on first sign-in (the platform already
   requires privacy acceptance on invite; this document is the paper equivalent for the school file).

## Pricing reference (from the platform)

| Plan | Monthly fee | Learner limit | Overage per learner | Features |
|------|-------------|---------------|---------------------|----------|
| Small | R2,500 | 200 | R15 | Online admissions |
| Medium | R5,500 | 500 | R12 | + Finance, SMS alerts, advanced analytics |
| Large | R12,000 | Unlimited | — | + AI assistant, API access |

Fees are billed monthly in advance via PayFast. A custom fee can be agreed per school and recorded
on the Order Form; it overrides the tier default.

## Before go-live (operational checklist)

- [ ] All documents above signed and filed
- [ ] Production environment checklist in the repo `README.md` completed
- [ ] School created via the Provider Dashboard (`/dashboard/provider`)
- [ ] Principal / school owner accounts issued and passwords set
- [ ] PayFast live credentials configured (`PAYFAST_SANDBOX=false`)
- [ ] Parent consent notices distributed and acknowledged
- [ ] Data import (learners, classes, subjects) verified by the school
