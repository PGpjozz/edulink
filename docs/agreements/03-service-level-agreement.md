# BrightCampus Service Level Agreement (SLA)

**Version 2026-01 — Annexure A to the School Service Agreement**

This SLA describes the availability and support commitments for the BrightCampus Platform. It forms
part of the School Service Agreement and applies to all Plans unless the Order Form states
otherwise.

---

## 1. Availability

1.1 **Target uptime:** 99.5% per calendar month, measured on Platform sign-in and dashboard
availability, excluding Excused Downtime.

1.2 **Excused Downtime:**

- Scheduled maintenance notified per clause 3
- Emergency maintenance to address security vulnerabilities
- Failures of third-party services outside the Provider's control (PayFast, email delivery,
  national connectivity or power failures)
- Issues caused by the School's own equipment, network or misuse

1.3 **Service credits.** If monthly uptime (excluding Excused Downtime) falls below target, the
School may request a credit against the next invoice:

| Monthly uptime | Credit (% of that month's fee) |
|----------------|-------------------------------|
| 99.0% – 99.49% | 5% |
| 97.0% – 98.99% | 10% |
| Below 97.0% | 25% |

Credit requests must be submitted within 30 days of month-end. Credits are the School's sole remedy
for downtime, per the Agreement.

## 2. Support

2.1 **Support hours:** Monday–Friday, 08:00–17:00 (SAST), excluding South African public holidays.

2.2 **Support channels:** email `____________________` and/or WhatsApp/phone `____________________`.

2.3 **Severity levels and response targets:**

| Severity | Definition | First response | Update frequency |
|----------|------------|----------------|------------------|
| **P1 — Critical** | Platform unavailable for all School users, or data breach suspected | 2 business hours | Every 4 hours |
| **P2 — High** | Core function unusable (sign-in, attendance, marks capture, billing) with no workaround | 4 business hours | Daily |
| **P3 — Medium** | Feature impaired but workaround exists | 1 business day | Every 3 business days |
| **P4 — Low** | Questions, cosmetic issues, feature requests | 3 business days | As resolved |

2.4 Response targets are for first meaningful response; resolution times depend on the issue.
P1 issues are worked continuously during business hours until resolved or downgraded.

## 3. Maintenance

3.1 Scheduled maintenance is performed outside school hours where possible (evenings/weekends) with
at least **48 hours** notice for anything expected to cause downtime.

3.2 Emergency security maintenance may occur without notice; the Provider will inform the School as
soon as practicable.

## 4. Backups and recovery

| Item | Commitment |
|------|-----------|
| Backup method | Managed database provider backups / point-in-time recovery |
| Recovery Point Objective (RPO) | ≤ 24 hours |
| Recovery Time Objective (RTO) | ≤ 24 hours for full platform restoration |

## 5. Onboarding support (first school setup)

For new schools, the Provider will provide at no extra cost:

- Tenant creation and configuration of the school on the Platform
- One remote training session (up to 2 hours) for principal/admin staff
- Assistance with initial data import (learners, classes, subjects) supplied in the Provider's
  template format
- Go-live support during the first week of use

## 6. Exclusions

This SLA does not cover:

- The School's local networks, devices, or internet connectivity
- Data errors introduced by the School's users
- Third-party payment processing performance (PayFast)
- Beta or preview features expressly labelled as such
