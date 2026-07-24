# Rizqhub v5.0 Blueprint

## 1. Executive direction

Rizqhub v5.0 diarahkan menjadi **multi-tenant Commerce, Fulfillment, Growth, and Trust Operating System** untuk merchant, penyedia jasa, kreator produk digital, komunitas, dan operator platform.

V5.0 bukan rewrite total. Fondasi v4.0.1 dipertahankan, kemudian dimigrasikan bertahap dengan pola **expand → backfill → verify → cutover → contract**.

### Sasaran utama

1. Stabilitas transaksi dan data finansial dapat dibuktikan melalui invariant dan rekonsiliasi.
2. Isolasi workspace berlaku di application layer, repository, dan PostgreSQL RLS.
3. Efek samping eksternal diproses melalui event/outbox, bukan langsung di request transaksi.
4. UI memiliki design system konsisten, cepat, responsif, dan mudah digunakan.
5. Automation mendukung delay, branch, retry, replay, dan audit.
6. AI bekerja sebagai copilot yang aman, terisolasi per workspace, dan tidak melakukan perubahan tanpa policy/confirmation.
7. Operasi produksi memiliki metrics, traces, logs, alert, backup, dan restore drill.

### Non-goals v5.0

- Tidak memecah sistem menjadi microservices.
- Tidak mengganti PostgreSQL.
- Tidak membangun ulang semua fitur sekaligus.
- Tidak memberikan AI akses SQL langsung.
- Tidak menjadikan aplikasi native mobile sebagai blocker rilis inti.

---

## 2. Diagnosis source v4.0.1

### Kekuatan

- Next.js App Router, React, TypeScript, PostgreSQL, dan Drizzle ORM.
- Struktur multi-merchant/workspace sudah mulai dibangun.
- Kontrol idempotensi tersedia pada beberapa alur kritis, termasuk payout affiliate dan reservasi stok.
- Tersedia audit log, webhook event, rate limit, migration validation, Docker, CI, backup/restore runbook, health, dan readiness endpoint.
- ADR sudah menetapkan modular monolith, workspace isolation, transactional outbox, RLS, entitlement, dan expand-migrate-contract.

### Gap prioritas

1. `src/lib/schema.ts` masih menjadi schema monolitik besar; ownership modul belum tegas.
2. Banyak use case berada pada `src/app/actions/*`; presentation dan application layer belum sepenuhnya terpisah.
3. Side effect automation/notifikasi masih dapat dipanggil langsung dan sinkron.
4. ADR transactional outbox belum terlihat sebagai runtime utama.
5. RLS belum aktif dan `workspace_id` belum langsung tersedia pada semua data tenant.
6. Order, payment, settlement, refund, ledger, dan payout masih terlalu berdekatan secara konseptual.
7. Balance masih dihitung dari penjumlahan entry sederhana; v5 memerlukan ledger yang lebih formal.
8. Observability belum memiliki korelasi end-to-end, metrik terpusat, tracing, dan alert berbasis SLI.
9. Test suite masih membutuhkan lebih banyak PostgreSQL integration test, browser E2E, race test, dan provider contract test.
10. CSS global dan komponen UI belum menjadi design system modular.

---

## 3. Product architecture

### Lima product pillars

| Pillar | Kapabilitas |
|---|---|
| Sell | catalog, offers, checkout, payments, coupons, affiliate |
| Deliver | entitlement, digital delivery, LMS, booking, service cases, membership |
| Grow | CRM, funnel, campaign, automation, segmentation, retention |
| Control | workspace, team, roles, trust, audit, finance, reconciliation |
| Intelligence | analytics, anomaly detection, AI copilot, forecasting |

### Persona utama

- Platform Operator / Admin
- Workspace Owner / Merchant
- Workspace Manager / Finance / Support / Content Editor
- Customer / Member
- Affiliate Partner

### Control plane dan workspace plane

**Control plane** menangani workspace lifecycle, platform configuration, global trust and safety, support access, platform finance, release controls, dan audit lintas tenant.

**Workspace plane** menangani data dan proses bisnis satu workspace: catalog, CRM, orders, fulfillment, team, automation, analytics, dan integrations.

---

## 4. Target technical architecture

```text
Browser / Mobile Web
        |
CDN + WAF
        |
Next.js Web/API Layer
        |
Application Use Cases + Policy Engine
        |
Domain Modules
        |
PostgreSQL + Transactional Outbox
        |                 |
Read Models          Background Worker
                          |
          Payment / Email / WhatsApp / Storage / AI Providers
```

### Prinsip

- Modular monolith sebagai deployment utama.
- Worker dapat dijalankan sebagai proses terpisah dari web.
- PostgreSQL menjadi source of truth transaksi.
- Outbox menjadi source of truth event lintas modul.
- Redis bersifat opsional untuk cache, ephemeral lock, dan rate limit; tidak menjadi source of truth finansial.
- Provider eksternal hanya diakses melalui adapter infrastructure.
- Dashboard berat membaca projection/read model, bukan query agregasi lintas puluhan tabel pada setiap request.

### Target folder structure

```text
src/
  app/
    (public)/
    (auth)/
    admin/
    w/[workspaceSlug]/
    api/
  modules/
    identity/
      domain/
      application/
      infrastructure/
      presentation/
    workspace/
    crm/
    catalog/
    commerce/
    payment/
    finance/
    entitlement/
    lms/
    service/
    booking/
    membership/
    affiliate/
    community/
    messaging/
    automation/
    notification/
    site-funnel/
    analytics/
    trust-safety/
  platform/
    database/
    events/
    jobs/
    policy/
    security/
    storage/
    observability/
    integrations/
  ui/
    components/
    patterns/
    tokens/
```

### Dependency rules

1. `app` hanya memanggil application use case.
2. Application layer menentukan transaction boundary dan policy check.
3. Domain tidak bergantung pada Next.js, Drizzle, atau provider.
4. Infrastructure mengimplementasikan repository dan provider ports.
5. Automation mengonsumsi event; tidak menulis tabel internal modul lain secara langsung.
6. Analytics mengonsumsi event/projection; tidak menjadi sumber kebenaran transaksi.
7. Semua tenant-scoped repository memerlukan `WorkspaceContext`.

---

## 5. Module ownership

| Module | Ownership utama |
|---|---|
| Identity | person, user, credential, session, verification |
| Workspace | workspace, membership, role, permission, branding, domain |
| CRM | contact, channel, consent, tag, activity, note |
| Catalog | product, variant, offer, price, fulfillment rule |
| Commerce | cart, order, order item, coupon, checkout snapshot |
| Payment | payment, payment attempt, webhook, provider reference |
| Finance | ledger, settlement, receivable, payout, reconciliation |
| Entitlement | grant, revoke, expiry, fulfillment status |
| LMS | course, module, lesson, progress, certificate |
| Service | service case, intake, document, assignment, SLA |
| Booking | resource, slot, appointment, reschedule, cancellation |
| Membership | plan, subscription, renewal, grace period |
| Affiliate | program, partner, attribution, commission, payout request |
| Community | space, membership, post, comment, moderation |
| Messaging | conversation, participant, message, read state |
| Automation | workflow, trigger, condition, action, run, step run |
| Notification | template, delivery request, attempt, provider result |
| Site & Funnel | site, page, version, block, funnel, domain publishing |
| Analytics | event, projection, KPI, report, experiment |
| Trust & Safety | verification, review, report, moderation, prohibited item |
| Operations | audit, support access, incident, health, feature release |

---

## 6. Database blueprint

### Tenant isolation

- Semua tabel operasional tenant memiliki `workspace_id NOT NULL`.
- Foreign key dan unique index menyertakan `workspace_id` ketika relevan.
- Repository selalu melakukan scope berdasarkan workspace.
- PostgreSQL RLS menjadi defense-in-depth setelah query path stabil.
- Test negatif wajib membuktikan workspace A tidak dapat read/write data workspace B.

### Identity and CRM separation

Tambahkan model:

- `persons`
- `person_channels`
- `workspace_contacts`
- `contact_consents`
- `contact_tags`
- `contact_activities`

`users` hanya untuk autentikasi. Customer yang belum membuat akun tetap dapat menjadi `person/contact` tanpa dipaksa menjadi user.

### Catalog and offers

Pisahkan:

- `products`: produk konseptual
- `offers`: konfigurasi penawaran yang dijual
- `offer_prices`: harga/currency/period
- `offer_items`: bundle atau order bump
- `fulfillment_rules`: jenis entitlement/delivery

Order menyimpan immutable snapshot nama, harga, pajak, diskon, dan aturan fulfillment.

### Commerce and payment

Tambahkan:

- `carts`
- `cart_items`
- `orders`
- `order_items`
- `payments`
- `payment_attempts`
- `payment_webhook_events`
- `refunds`
- `disputes`

Order status dan payment status dipisahkan. Satu order dapat memiliki lebih dari satu payment attempt. Refund tidak mengubah histori payment; refund menjadi aggregate tersendiri.

### Finance ledger

Gunakan double-entry ledger:

- `ledger_accounts`
- `ledger_transactions`
- `ledger_postings`
- `settlements`
- `payouts`
- `reconciliations`
- `reconciliation_items`

Contoh akun:

- Cash at Provider
- Merchant Payable
- Platform Revenue
- Affiliate Payable
- Refund Liability
- Gateway Fee Expense
- Platform Receivable

Invariant:

```text
SUM(debit) = SUM(credit) untuk setiap ledger transaction
```

Nominal disimpan sebagai `bigint` minor unit dengan `currency_code`, bukan floating point.

### Entitlement

Tambahkan:

- `entitlements`
- `entitlement_grants`
- `entitlement_revocations`
- `fulfillment_runs`

Setelah `order.paid`, fulfillment menghasilkan entitlement. LMS, download, community, membership, dan service memeriksa entitlement, bukan status order secara langsung.

### Events and jobs

Tambahkan:

- `outbox_events`
- `event_consumptions`
- `job_runs`
- `job_attempts`
- `dead_letter_events`

Field minimum event:

```text
event_id, event_name, event_version, occurred_at,
workspace_id, actor_id, subject_type, subject_id,
correlation_id, causation_id, payload, status, available_at
```

### Automation

Tambahkan:

- `automation_workflows`
- `automation_versions`
- `automation_nodes`
- `automation_edges`
- `automation_runs`
- `automation_step_runs`

Workflow version yang sudah dipublikasikan immutable. Edit membuat draft version baru.

### Integration configuration

Tambahkan:

- `integration_connections`
- `integration_capabilities`
- `integration_webhooks`
- `secret_references`

Secret tidak disimpan di audit log atau payload biasa.

---

## 7. Financial integrity design

### State machines

**Order**

```text
DRAFT → PENDING_PAYMENT → PAID → FULFILLED
                     ↘ EXPIRED / CANCELLED
PAID → PARTIALLY_REFUNDED → REFUNDED
```

**Payment attempt**

```text
CREATED → REQUIRES_ACTION → PROCESSING → SUCCEEDED
                                 ↘ FAILED / EXPIRED
```

**Payout**

```text
REQUESTED → RESERVED → APPROVED → PROCESSING → PAID
                     ↘ REJECTED / CANCELLED
```

### Mandatory controls

- Idempotency key pada checkout, webhook, refund, fulfillment, payout, dan notification.
- Database unique constraints menjadi lapisan terakhir idempotensi.
- Webhook hanya memvalidasi, menyimpan event, dan merespons cepat; processing dilakukan worker.
- Provider status tidak langsung dianggap benar tanpa mapping state yang eksplisit.
- Settlement dan reconciliation berjalan terjadwal.
- Manual adjustment selalu membutuhkan reason, actor, evidence, dan audit trail.
- Balance UI membaca finance projection yang berasal dari ledger tervalidasi.

### Critical invariant tests

- Webhook duplicate tidak menggandakan payment atau entitlement.
- Race `completed` vs `expired` menghasilkan satu state final yang valid.
- Refund tidak melebihi nilai yang dapat dikembalikan.
- Payout tidak dapat menggunakan komisi yang sudah reserved/paid.
- Inventory tidak menjadi negatif.
- Ledger transaction selalu seimbang.
- Cross-workspace payment/payout mutation ditolak.

---

## 8. Event-driven automation

### Trigger awal

- `contact.created.v1`
- `checkout.started.v1`
- `order.placed.v1`
- `payment.succeeded.v1`
- `order.paid.v1`
- `order.refunded.v1`
- `entitlement.granted.v1`
- `course.completed.v1`
- `booking.upcoming.v1`
- `membership.expiring.v1`
- `service.case_status_changed.v1`

### Node workflow

- Trigger
- Filter/condition
- Delay/until date
- Branch
- Send email
- Send WhatsApp
- Create in-app notification
- Add/remove tag
- Create task
- Call webhook
- Grant/revoke entitlement melalui command resmi

### Reliability

- Exponential backoff
- Max attempt per action
- Dead-letter queue
- Manual replay
- Pause workflow
- Per-workspace execution quota
- Idempotent consumer key
- Full run timeline dan error detail

---

## 9. AI layer

### AI Copilot modules

1. **Business Analyst**: menjelaskan perubahan omzet, conversion, repeat purchase, churn, dan funnel.
2. **CRM Assistant**: membuat segmentasi dan follow-up recommendation.
3. **Campaign Assistant**: menyusun email/WhatsApp copy berdasarkan offer dan segment.
4. **Service Assistant**: merangkum intake, timeline, dokumen, dan next action.
5. **Trust Assistant**: membantu triage review/report tanpa mengambil keputusan final otomatis.
6. **Operations Assistant**: merangkum failed jobs, webhook anomalies, dan incident context.

### Guardrails

- Workspace isolation diterapkan sebelum data masuk prompt.
- AI tidak memiliki koneksi database mentah.
- AI memakai application tools dengan policy check.
- Read-only sebagai default.
- Mutasi berisiko memerlukan preview dan explicit confirmation.
- Semua tool call dicatat dengan actor, workspace, input summary, output summary, dan result.
- PII minimization dan redaction sebelum provider call.
- Prompt/version/model dicatat agar output dapat dievaluasi.
- AI output tidak menjadi source of truth finansial.

### AI data flow

```text
User question
  → Policy check
  → Approved semantic tools/read models
  → Context minimization
  → Model
  → Cited explanation + recommended action
  → Optional confirmed command
```

---

## 10. UI/UX blueprint

### Visual direction

- Modern enterprise SaaS, clean, high information density, tidak berlebihan memakai glassmorphism.
- Neutral surface, strong hierarchy, accessible contrast.
- Light/dark mode.
- Design tokens untuk color, spacing, typography, radius, elevation, motion, dan chart.
- WCAG 2.2 AA sebagai target.

### Information architecture

```text
Overview
Sales
  Orders
  Payments
  Refunds
  Payouts
Catalog
  Products
  Offers
  Landing Pages
Customers
  Contacts
  Segments
  Conversations
Delivery
  Courses
  Digital Products
  Services
  Bookings
  Memberships
Growth
  Affiliate
  Campaigns
  Automation
  Analytics
Workspace
  Team
  Roles
  Integrations
  Domains
  Billing
  Settings
```

### Core experience

- Workspace switcher konsisten pada header.
- Command palette dan global search.
- Notification center dan activity drawer.
- KPI cards dengan definisi dan period comparison.
- Saved filters, column settings, bulk actions, export jobs.
- Skeleton, empty, loading, retry, error, and permission states yang eksplisit.
- Mobile responsive dengan bottom action untuk task penting; bukan sekadar desktop yang diperkecil.
- Dashboard widget dapat dikonfigurasi setelah read model stabil.

### Design system components

- App shell
- Sidebar/nav group
- Page header
- Metric card
- Data table
- Filter bar
- Status badge
- Timeline
- Audit event viewer
- Money amount
- Confirmation dialog
- Stepper
- Empty state
- Error boundary
- Form field wrapper
- Permission gate
- Workspace selector
- AI answer panel

---

## 11. Security blueprint

### Authentication

- Session rotation setelah login dan privilege change.
- Device/session management dan revoke.
- Password reset token one-time dan short-lived.
- 2FA TOTP; passkey dapat menjadi fase lanjutan.
- Login risk signals dan brute-force protection.

### Authorization

- RBAC untuk role standar.
- Permission/capability untuk aksi granular.
- Resource ownership dan workspace policy.
- Support impersonation membutuhkan reason, expiry, banner, dan audit.
- RLS sebagai defense-in-depth.

### Application security

- Origin validation untuk mutation endpoint/server action sensitif.
- CSP ketat dan nonce bila dibutuhkan.
- Secure cookies, HSTS, content-type protection, frame restrictions.
- Rate limit terpisah untuk login, checkout, upload, webhook, invitation, dan AI.
- Dependency scanning, secret scanning, SAST, dan image scanning di CI.

### File security

- S3-compatible object storage.
- Signed upload dan signed download URL.
- MIME/signature/size validation.
- Antivirus scanning dan quarantine state.
- Encryption at rest.
- File access selalu melalui entitlement/policy.

### Privacy

- Consent per workspace, purpose, and channel.
- Export, retention, deletion, and legal hold workflow.
- PII redaction pada logs.
- Audit akses sensitif.

---

## 12. Observability and operations

### Telemetry

- OpenTelemetry traces untuk web request, DB query group, worker, provider call, dan AI tool call.
- Structured logs dengan `request_id`, `trace_id`, `workspace_id`, `actor_id`, `order_id`, `event_id`, dan `job_id`.
- Metrics minimum:
  - request rate, latency, error rate
  - checkout start/success
  - payment success/failure
  - webhook lag and failure
  - outbox backlog age
  - job retry/dead-letter
  - fulfillment lag
  - notification delivery rate
  - reconciliation variance
  - database pool saturation

### Initial service objectives

Nilai final dikunci setelah baseline staging/production. Target awal yang dapat diuji:

- Tidak ada kehilangan event domain yang telah commit.
- Checkout/payment command idempotent 100% pada duplicate test.
- Cross-workspace negative tests lulus 100%.
- Restore drill berhasil dan terdokumentasi.
- Outbox backlog dan failed payment alert tersedia.

### Operations center

- System health
- Queue/outbox backlog
- Failed webhooks
- Failed jobs
- Reconciliation exceptions
- Storage status
- Recent deployments
- Feature flag status
- Incident timeline

---

## 13. Testing strategy

### Test pyramid

1. Domain unit tests untuk invariant dan state transition.
2. Application tests untuk policy, orchestration, dan transaction boundary.
3. PostgreSQL integration tests untuk constraints, concurrency, RLS, dan migration.
4. Provider contract tests menggunakan sandbox/mocks terkontrol.
5. Browser E2E untuk alur utama.
6. Accessibility test pada alur publik dan dashboard.
7. Performance test pada checkout, dashboard, marketplace, and worker.
8. Backup/restore and disaster-recovery drill.

### Mandatory E2E flows

- Register/login/logout/reset password.
- Create workspace dan invite team.
- Create/publish offer.
- Checkout Xendit success/failed/expired.
- Manual payment submit/review.
- Duplicate and race webhook.
- Entitlement grant/revoke.
- Digital download/course access.
- Booking/service fulfillment.
- Affiliate attribution/payout.
- Refund and ledger reconciliation.
- Automation delay/branch/retry.
- Cross-workspace access denial.

### Release gate

Rilis ditolak ketika:

- migration test gagal;
- ledger invariant gagal;
- cross-workspace test gagal;
- critical E2E gagal;
- unresolved high severity vulnerability;
- backup atau restore drill tidak memiliki bukti;
- provider webhook signature verification gagal.

---

## 14. Migration strategy from v4.0.1

### Phase 0 — Baseline gate

- Freeze baseline source and migration checksums.
- Jalankan CI, PostgreSQL integration test, provider sandbox, E2E smoke, backup, dan restore drill.
- Rekam performance baseline.
- Tidak menambah fitur besar sebelum gate kritis lulus.

### Phase 1 — Platform kernel

- Perkenalkan `ActorContext` dan `WorkspaceContext`.
- Pindahkan workspace/identity ke module boundary.
- Tambahkan workspace_id pada tabel prioritas melalui migration aditif.
- Tambahkan policy engine.
- Tambahkan outbox, worker, event consumption, retry, dan dead-letter.
- Propagasi correlation/request ID.

### Phase 2 — Commerce and finance core

- Pisahkan order, order item, payment, payment attempt, refund, settlement, dan payout.
- Introduce double-entry ledger.
- Backfill transaksi lama ke ledger melalui reconciliation report.
- Migrasikan webhook ke fast-ingest + worker.
- Tambahkan invariant/concurrency tests.

### Phase 3 — Entitlement and fulfillment

- Introduce entitlement contract.
- Migrasikan course, download, service, booking, membership, dan community access.
- Hapus dependency langsung pada `order.status` dari modul fulfillment setelah parity terbukti.

### Phase 4 — UI and workspace experience

- Implement design tokens dan component library.
- Konsolidasikan route workspace ke `/w/[workspaceSlug]/...`.
- Bangun app shell, navigation, command palette, tables, forms, status, empty/error states.
- Migrasikan halaman per domain, bukan sekaligus.

### Phase 5 — Automation and CRM

- Workflow versioning, delay, branch, retry, replay.
- Contact/consent/activity model.
- Campaign segmentation dan delivery projection.

### Phase 6 — Analytics and AI

- Build event projections dan KPI read models.
- Tambahkan AI copilot read-only.
- Tambahkan confirmed actions setelah audit dan policy matang.

### Phase 7 — Scale and ecosystem

- Full-text search, object storage, AV scanning, signed delivery.
- API clients/webhooks per workspace.
- Advanced reconciliation, dispute, recurring payment, dan automated disbursement.
- PWA enhancements; native mobile dinilai berdasarkan usage data.

---

## 15. Priority backlog

### P0 — wajib sebelum v5 production

- Baseline runtime verification
- Transactional outbox + worker
- Workspace context + policy enforcement
- Direct workspace_id on critical tenant tables
- RLS pilot and negative tests
- Payment/order/refund separation
- Double-entry ledger foundation
- Fast webhook ingest and idempotent processing
- Integration/E2E/concurrency tests
- Centralized observability and alerts
- Backup/restore evidence

### P1 — product modernization

- Design system and new app shell
- Entitlement service
- CRM contact/consent/activity
- Automation workflow v2
- Object storage and signed files
- Search and database pagination
- Reconciliation operations center
- 2FA and session management

### P2 — intelligence and scale

- AI business copilot
- AI campaign/service assistants
- Forecasting and anomaly detection
- Advanced marketplace search/ranking
- Recurring payment and automated payout
- Advanced API/integration marketplace
- Native mobile only if usage justifies it

---

## 16. Definition of Done for Rizqhub v5.0

V5.0 dianggap siap ketika:

1. Semua data tenant kritis scoped langsung dengan workspace.
2. Negative test read/write lintas workspace lulus.
3. Provider external calls berjalan melalui jobs/outbox.
4. Order, payment, refund, settlement, payout, dan ledger memiliki ownership terpisah.
5. Duplicate/race webhook tidak menggandakan nilai finansial atau fulfillment.
6. Ledger transaction selalu balance.
7. Entitlement menjadi kontrak akses produk/layanan.
8. Critical E2E dan PostgreSQL integration tests lulus di CI.
9. Restore drill, migration rollback procedure, dan incident trace tersedia.
10. UI baru memenuhi responsive, accessibility, loading, error, permission, dan empty-state standards.
11. AI hanya menggunakan workspace-scoped tools dan setiap aksi tercatat.
12. Tidak ada unresolved critical/high security issue yang relevan terhadap production path.

---

## 17. Lovable implementation method

Jangan meminta Lovable mengubah seluruh ZIP sekaligus. Gunakan urutan:

1. Masukkan repository sebagai baseline read-only untuk analisis.
2. Gunakan plan mode untuk satu phase.
3. Implementasikan satu bounded module atau vertical slice.
4. Jalankan lint, typecheck, unit, integration, migration, dan E2E gate.
5. Review diff dan database migration.
6. Merge hanya ketika acceptance criteria phase lulus.

Urutan prompt implementasi:

- Prompt A: Baseline audit and architecture map, no code changes.
- Prompt B: ActorContext, WorkspaceContext, policy engine.
- Prompt C: Transactional outbox and worker runtime.
- Prompt D: Commerce/payment/ledger migration slice.
- Prompt E: Entitlement fulfillment slice.
- Prompt F: Design system and workspace app shell.
- Prompt G: Automation workflow v2.
- Prompt H: Analytics projections and AI copilot.

Setiap prompt harus menyebutkan file yang boleh diubah, migration policy, test gate, dan larangan menghapus legacy data sebelum cutover tervalidasi.

---

## 18. Audit limitation

Blueprint ini dibuat dari static inspection source, schema, tests, release notes, dan architecture documentation pada paket v4.0.1. Runtime production, provider sandbox, database staging, CI run, load test, dan restore drill belum diverifikasi langsung dalam lingkungan audit ini. Karena itu Phase 0 tetap wajib sebelum klaim production-ready.
