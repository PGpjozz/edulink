# BrightCampus Data Processing Agreement (POPIA)

**Version 2026-01 — Annexure C to the School Service Agreement**

This Data Processing Agreement ("**DPA**") is concluded under section 21 of the Protection of
Personal Information Act 4 of 2013 ("**POPIA**") between:

1. **The School** identified on the Onboarding Order Form — the "**Responsible Party**"; and
2. **BrightCampus** — the "**Operator**".

It forms part of the School Service Agreement (the "**Agreement**").

---

## 1. Roles

1.1 The School determines the purpose and means of processing personal information of its learners,
parents/guardians and staff, and is the **Responsible Party** under POPIA.

1.2 BrightCampus processes personal information **only on behalf of and on the instructions of the
School**, and is the **Operator** under POPIA. The Agreement, this DPA, and the School's use of the
Platform's features constitute the School's documented instructions.

## 2. Scope of processing

| Item | Description |
|------|-------------|
| **Data subjects** | Learners, parents/guardians, staff (teachers, HODs, admins, principals, school owners) |
| **Personal information** | Names, email addresses, phone numbers, roles; learner SA ID numbers (sign-in); academic records (grades, attendance, homework, behaviour, assessments); parent–staff messages; billing and payment references |
| **Special personal information** | Information concerning children (learners under 18). No biometric, health or religious data is required by the Platform |
| **Purpose** | School administration: enrolment, teaching, assessment, reporting, communication, fee management |
| **Duration** | The Term of the Agreement plus the 30-day export window |
| **Location** | Data is hosted on cloud infrastructure (PostgreSQL — Neon); email via Resend; payments via PayFast. Current hosting regions are listed in Schedule 1 |

## 3. Children's information

3.1 Most learners are children under POPIA (under 18). The School warrants that it processes
children's information lawfully — in particular that a **competent person (parent/guardian) has
consented**, or another ground under POPIA s35 applies — before loading learner data onto the
Platform. The Parent & Learner Consent Notice template may be used for this purpose.

3.2 The Operator will not use children's information for marketing, profiling for commercial
purposes, or any purpose other than delivering the service.

## 4. Operator obligations

The Operator shall:

(a) process personal information only for the purposes in clause 2 and per the School's
instructions, unless required otherwise by law (in which case it will notify the School unless
prohibited);

(b) treat all personal information as confidential and ensure that its personnel are bound by
confidentiality obligations;

(c) implement the security measures in **Schedule 2** (POPIA s19–s21), including access control,
password hashing, per-school tenant isolation, encryption in transit, and audit logging;

(d) notify the School **without undue delay, and in any event within 72 hours**, of any security
compromise affecting the School's personal information (POPIA s22), providing sufficient detail
for the School to notify the Information Regulator and data subjects where required;

(e) assist the School, at reasonable cost, in responding to data subject requests (access,
correction, deletion — POPIA s23–s25) and in demonstrating compliance;

(f) not engage a further operator (sub-operator) without the authorisations in clause 5;

(g) on termination of the Agreement, make School Data available for export for 30 days and then
delete or anonymise it, except where retention is required by law;

(h) maintain records of processing performed on behalf of the School.

## 5. Sub-operators

5.1 The School authorises the sub-operators listed in **Schedule 1**. The Operator shall impose
data protection obligations on sub-operators no less protective than this DPA and remains liable
for their performance.

5.2 The Operator shall give the School at least **30 days** notice of any new sub-operator. If the
School reasonably objects on data protection grounds and no resolution is found, the School may
terminate the Agreement in respect of the affected service without penalty.

## 6. Cross-border transfers

Where any sub-operator stores or processes personal information outside South Africa, the Operator
shall ensure the transfer complies with **POPIA s72** (e.g. the recipient is subject to a law,
binding corporate rules or a binding agreement providing an adequate level of protection).

## 7. Data subject requests

7.1 Signed-in users may export their own account data via the Platform's self-service data export.

7.2 If the Operator receives a request directly from a data subject, it will refer the request to
the School within 5 business days and will not respond substantively unless the School instructs it
to or the law requires it.

## 8. Audits

Once per 12-month period, on at least 14 days notice, the School may request written evidence of
the Operator's compliance with this DPA (security summaries, policy extracts, sub-operator list).
On-site or technical audits may be agreed where a security compromise has occurred or a regulator
requires it, at the School's cost.

## 9. Liability

Liability under this DPA is subject to the limitations in the Agreement, except that nothing limits
liability that cannot be limited under POPIA.

## 10. Duration

This DPA applies for as long as the Operator processes personal information on behalf of the
School, including the post-termination export window.

---

## Schedule 1 — Authorised sub-operators

| Sub-operator | Service | Data involved | Location/Region |
|--------------|---------|---------------|-----------------|
| Neon (PostgreSQL) | Database hosting | All School Data | `____________________` |
| Vercel / hosting provider | Application hosting | All School Data in transit/processing | `____________________` |
| Resend | Transactional email | Names, email addresses, invite links | `____________________` |
| PayFast | Payment processing | Payer name, amount, payment reference | South Africa |

*(Complete regions before signature. Update this schedule per clause 5 when infrastructure changes.)*

## Schedule 2 — Security measures

- **Tenant isolation:** every API route is scoped by `schoolId`; users of one school cannot access
  another school's data.
- **Access control:** role-based access (Provider → School Owner → Principal / School Admin / HOD /
  Teacher → Learner / Parent); least-privilege dashboards per role.
- **Authentication:** credential sign-in with hashed passwords (no plaintext storage); password
  policy enforced; email-verified password reset.
- **Encryption in transit:** TLS for all Platform traffic.
- **Audit logging:** sensitive actions are recorded in audit logs.
- **Payment security:** card/bank details are handled by PayFast; the Platform stores payment
  references only.
- **Secrets management:** production secrets (session signing, database, payment gateway) are
  stored as environment variables, not in source code; development/demo routes are disabled in
  production.
- **Backups:** database provider point-in-time recovery/backups as per hosting provider.
- **Personnel:** access to production data restricted to authorised Operator personnel bound by
  confidentiality.

---

## Signatures

**For the School (Responsible Party)**

| | |
|---|---|
| School name | ____________________ |
| Name | ____________________ |
| Title | ____________________ |
| Signature | ____________________ |
| Date | ____________________ |

**For BrightCampus (Operator)**

| | |
|---|---|
| Name | ____________________ |
| Title | ____________________ |
| Signature | ____________________ |
| Date | ____________________ |

**Information Officer contacts**

| | School | BrightCampus |
|---|--------|--------------|
| Information Officer name | ____________ | ____________ |
| Email | ____________ | ____________ |
| Phone | ____________ | ____________ |
