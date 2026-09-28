# PrepSeven CRM

A production-ready client tracking / CRM web application built for PrepSeven
(IB tutoring, expanding to other curriculums). Tracks leads through
conversion, schedules timezone-aware follow-ups, and tracks revenue,
profit, and payments once a client converts.

## What was built

A fully functional, database-backed CRM — not a mockup. Every flow described
below is wired end-to-end and has been exercised in a real browser session:

- **Client CRUD** with phone/email identity, duplicate detection with an
  override path, and full edit support.
- **Automatic country + timezone detection** from phone numbers via
  `libphonenumber-js` + the IANA timezone database, with mandatory manual
  confirmation for countries that span multiple timezones (never guesses).
- **Live local-time display** everywhere a client's timezone appears —
  recomputed client-side every 15s, no page refresh needed.
- **Five-stage lead status pipeline** (New Lead → Demo Scheduled → Follow-up
  → Converted / Lost) with quick inline status changes and color-coded badges.
- **Timezone-aware follow-up scheduling**: a follow-up entered as "12:00 PM"
  for a client is stored as an absolute UTC instant computed from *that
  client's* IANA timezone on *that* calendar date, so DST is handled
  correctly and two clients in different zones never collide.
- **Conversion + financial tracking**: revenue, cost, profit (auto),
  amount received, pending payment (auto), payment due date, and a full
  multi-payment ledger per client.
- **Dashboard** with the metrics, "Today's Follow-ups", "Recent Leads", and
  "Payments Requiring Attention" sections specified, all live-data-backed.
- **Search, filtering, and sorting** across clients by name/phone/email/
  requirement, status, country, lead source, follow-up-due, and more.
- **Full activity timeline** per client, permanently attached, covering
  every lead/status/follow-up/payment event.
- **Reports** with conversion rate, revenue/profit, and charts by month,
  lead source, and country.
- **Authentication** with hashed passwords, JWT session cookies, and
  Admin/Salesperson roles; all routes are protected by middleware.
- **Seed data**: 12 realistic clients across India, the US, UK, UAE,
  Australia, Singapore, Canada, and Germany, spanning every status,
  including converted clients with partial and overdue payments, and the
  ambiguous-timezone / needs-confirmation edge cases called out in the spec.
- **45 automated tests** covering phone parsing, timezone detection, manual
  override priority, DST transitions (US and Australia), multi-timezone
  UTC-instant separation, and financial calculations.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3 |
| Database | PostgreSQL |
| ORM | Prisma |
| Phone parsing | `libphonenumber-js` |
| Timezone data | `countries-and-timezones` (IANA) + `date-fns-tz` |
| Auth | `jose` (JWT) + `bcryptjs`, HTTP-only cookie sessions |
| Validation | `zod` |
| Charts | `recharts` |
| Tests | `vitest` |

Next.js was deliberately pinned to the 14.2.x line (not the newly-released
16.x default from the scaffolding tool) for stability and predictable
behavior on a build this size — see **Limitations** below for the upgrade
recommendation.

## Database structure

Proper relational schema (`prisma/schema.prisma`), not a JSON blob:

- **User** — admin/salesperson accounts (`Role` enum), referenced by
  assigned clients, follow-ups, and activities.
- **Client** — the hub record: identity (name/phone/email), detected
  country/timezone + confidence/source, status, lead info, and (once
  converted) financial fields. Indexed on `phone`, `email`, `status`,
  `country`, `timezone`, `leadSource`, `dateAdded`, `convertedAt`,
  `assignedUserId` for fast search/filter.
- **FollowUp** — one row per follow-up. Stores the human-entered
  `localDate`/`localTime`/`timezone` *and* the computed absolute
  `scheduledAt` (UTC) that all due/overdue logic runs against. Indexed on
  `clientId`, `scheduledAt`, `status`.
- **Payment** — one row per payment received; a client can have many.
  Indexed on `clientId`, `paidAt`.
- **Activity** — an append-only timeline row per event (lead created,
  status changed, follow-up scheduled/completed, converted, payment
  recorded, ...). Indexed on `clientId`, `occurredAt`, `type`.

## How timezone detection works

1. A phone number is parsed with `libphonenumber-js` → ISO country code.
2. `countries-and-timezones` looks up that country's IANA timezone(s).
3. **If the country has exactly one timezone** (e.g. UK, UAE, India), it's
   auto-detected with `timezoneConfident = true`.
4. **If the country spans multiple timezones** (US, Canada, Australia,
   Russia, Brazil, ...), the system does **not** guess — `timezone` stays
   `null`, `timezoneSource = "UNDETERMINED"`, and the UI shows
   **"Needs confirmation"** with a dropdown of that country's candidate
   zones for manual selection.
5. **A manually selected timezone always wins**, whether or not
   auto-detection was confident — this is enforced in
   `lib/clientResolution.ts::resolveClientIdentity`, which both the API
   routes and the seed script call, so there is exactly one code path for
   this rule.

## How follow-up scheduling works

- A follow-up is entered as a local date + local time (e.g. "12:00 PM") for
  a specific client. `lib/followups.ts::computeScheduledAt` converts that
  wall-clock value into an absolute UTC instant using `date-fns-tz`'s
  `fromZonedTime`, evaluated against **that calendar date's** DST rules —
  so a New York client's noon follow-up resolves to a different UTC hour in
  January (EST) than in July (EDT), automatically.
- When a client's status is set to **Follow-up**, the system auto-creates a
  follow-up for 12:00 PM in the client's local timezone (rolling to the
  next day if local noon has already passed).
- "Due today", "due now", "due soon", and "overdue" are all computed by
  comparing the stored UTC `scheduledAt` against the current instant — never
  by running logic at a fixed server-local time. Two clients in different
  timezones scheduled for "their own 12:00 PM" fire at different UTC
  moments, as verified in `lib/__tests__/followups.test.ts`.

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL and create the database/user (adjust for your setup)
sudo -u postgres psql -c "CREATE USER crm WITH PASSWORD 'crm_dev_password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE crm_db OWNER crm;"

# 3. Copy the env file and adjust if needed
cp .env.example .env

# 4. Run migrations
npm run db:migrate

# 5. Seed realistic demo data
npm run db:seed

# 6. Start the dev server
npm run dev
# → http://localhost:3000
```

Run the test suite with `npm test`. Run a production build with
`npm run build && npm start`.

## Required environment variables

See `.env.example`:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — random secret used to sign session JWTs (`openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` — base URL of the app

No API keys are required — phone parsing and timezone lookup are fully
offline (no external service calls).

## Test credentials (seeded)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@prepseven.com` | `admin123` |
| Salesperson | `sarah@prepseven.com` | `sales123` |
| Salesperson | `raj@prepseven.com` | `sales123` |

Admins can see/manage every client and add new team members from
**Settings**; salespeople sign in with the same dashboard (role-based
row-level restriction to "my clients only" is not yet wired in the UI —
see Limitations).

## Limitations

- **Next.js version**: pinned to 14.2.35 rather than the framework's current
  16.x line, for stability on a build this size. `npm audit` will show a
  long list of advisories against the 14.x range — most apply to
  configurations this app doesn't use (custom servers, i18n rewrites, AVIF
  image optimization). Recommended next step: upgrade to the latest stable
  Next.js major on a dedicated branch with its own test pass.
- **Salesperson row-level scoping**: the `Role` model and `assignedUserId`
  field exist and are used for reporting/filtering, but the dashboard does
  not yet *restrict* a salesperson's view to only their assigned clients —
  today all authenticated users see all clients. Straightforward to add as
  a `where` clause keyed off the session role.
- **Browser push notifications**: not implemented. The dashboard itself
  (follow-up counters, overdue highlighting, the "Today's Follow-ups"
  section) is the primary, always-current source of truth, as specified;
  native browser notifications would be a reasonable follow-up.
- **Payment currency**: amounts are stored as plain decimals and displayed
  in INR formatting; there's no multi-currency support per client yet.

## Recommended next improvements

1. Row-level access control for salespeople (see above).
2. Upgrade to the latest stable Next.js release.
3. Browser/desktop push notifications for due follow-ups.
4. CSV export for reports and client lists.
5. Email/WhatsApp integration for one-click outreach from a follow-up card.
6. Multi-currency support if PrepSeven expands billing beyond INR.
