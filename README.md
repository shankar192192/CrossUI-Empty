# PrepSeven CRM

A production-ready client tracking / CRM web application built for PrepSeven
(IB tutoring, expanding to other curriculums). Tracks leads through
conversion, runs a daily timezone-aware follow-up calling list, and tracks
revenue, profit, and payments once a client converts.

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
- **A daily follow-up calling list**, not per-record scheduling: every client
  who isn't Demo Scheduled, Converted, or Lost carries a single "next
  follow-up" slot, always 1:00 PM in *their own* local timezone. The list
  shows what that resolves to in the operator's own timezone (IST) — e.g. a
  New York client's 1PM shows as "Call at 10:30 PM IST" — and is sorted
  soonest-due first. Working a client marks it done (auto-rolls to
  tomorrow), sets a specific future date, or converts/loses it; untouched
  clients simply reappear the next day.
- **Demos scheduled directly in IST** by the operator (no client-timezone
  conversion needed there); marking a demo done automatically moves the
  client to Follow-up with a priority flag and a next-day follow-up.
- **Conversion + financial tracking**: revenue, cost, profit (auto),
  amount received, pending payment (auto), payment due date, and a full
  multi-payment ledger per client.
- **A manageable lead-source list** (not a fixed enum) — add or delete
  sources from Settings; seeded with SEO, Google Ads, and ChatGPT Ads.
- **A shared date-range filter** (Today / This week / This month / Custom)
  across Dashboard, Clients, Converted, Payments, and Reports.
- **Dashboard** with pipeline metrics, "Today's Follow-ups", "Recent Leads",
  and "Payments Requiring Attention", all live-data-backed.
- **Search, filtering, and sorting** across clients by name/phone/email/
  requirement, status, country, lead source, follow-up-due, and more.
- **Full activity timeline** per client, permanently attached, covering
  every lead/status/follow-up/demo/payment event, plus a dedicated
  follow-up history log.
- **Reports** with conversion rate, revenue/profit, and charts by month,
  lead source, and country.
- **Authentication** with hashed passwords, JWT session cookies, and
  Admin/Salesperson roles; all routes are protected by middleware.
- **Seed data**: 12 realistic clients across India, the US, UK, UAE,
  Australia, Singapore, Canada, and Germany, spanning every status,
  including converted clients with partial and overdue payments, and the
  ambiguous-timezone / needs-confirmation edge cases called out in the spec.
- **51 automated tests** covering phone parsing, timezone detection, manual
  override priority, DST transitions (US and Australia), multi-timezone
  UTC-instant separation, the IST call-time conversion, and financial
  calculations.

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

- **User** — admin/salesperson login accounts (`Role` enum), referenced as
  the actor on activity log entries.
- **LeadSource** — a manageable list (name only) rather than a fixed enum;
  clients reference it optionally, and deleting a source just clears the
  reference on any client that used it (never deletes the client).
- **Client** — the hub record: identity (name/phone/email), detected
  country/timezone + confidence/source, status, lead info, the single
  `nextFollowUpAt` slot + `followUpPriority` flag, demo info, and (once
  converted) financial fields. Indexed on `phone`, `email`, `status`,
  `country`, `timezone`, `leadSourceId`, `dateAdded`, `convertedAt`,
  `nextFollowUpAt` for fast search/filter.
- **FollowUpLog** — an append-only history row each time a client is worked
  from the daily follow-up list (followed up → tomorrow, followed up → a
  specific date, demo completed, converted, lost), so follow-up history
  stays permanently attached to the client even though only one "next
  follow-up" slot is ever active at a time. Indexed on `clientId`, `occurredAt`.
- **Payment** — one row per payment received; a client can have many.
  Indexed on `clientId`, `paidAt`.
- **Activity** — an append-only timeline row per event (lead created,
  status changed, demo scheduled/completed, follow-up logged, converted,
  payment recorded, ...). Indexed on `clientId`, `occurredAt`, `type`.

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
6. Even before a timezone is confirmed, the client still gets a follow-up
   slot — it falls back to IST (`lib/followups.ts::OPERATOR_TIMEZONE`) so a
   lead is never silently dropped from the calling list while its timezone
   is unresolved.

## How follow-up scheduling works

- Every client carries a single `nextFollowUpAt` slot: always **1:00 PM in
  that client's own local timezone** (IST fallback if unconfirmed), stored
  as the absolute UTC instant via `date-fns-tz`'s `fromZonedTime`, evaluated
  against **that specific calendar date's** DST rules.
- **New leads** get this slot automatically, set for tomorrow, the moment
  they're created.
- **Marking a demo done** moves the client to Follow-up, sets a priority
  flag, and schedules the slot for tomorrow again.
- **Working the daily list** (`/followups`) does one of three things per
  client: mark done (rolls the slot to tomorrow, same rule), set a specific
  future date (the client won't reappear until then), or convert/lose them.
  Take no action and the slot simply stays where it is, so the client
  reappears in tomorrow's list automatically.
- The list itself (`GET /api/followups`) filters to clients whose slot has
  arrived — today or earlier, in IST — and sorts soonest-due first, so the
  most overdue clients surface at the top.
- Because the slot is an absolute instant computed per client-timezone, two
  clients in different zones scheduled for "their own 1:00 PM" resolve to
  different UTC (and IST) moments automatically — verified explicitly for a
  New York vs. Dubai pair, and for DST transitions in both the US and
  Australia, in `lib/__tests__/followups.test.ts`.

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

Admins can see/manage everything and add new team members from **Settings**;
salespeople sign in with the same dashboard (row-level restriction to "my
clients only" is not wired in — see Limitations). There is no per-client
"assigned salesperson" field; every login sees the same shared pipeline and
daily follow-up list.

## Limitations

- **Next.js version**: pinned to 14.2.35 rather than the framework's current
  16.x line, for stability on a build this size. `npm audit` will show a
  long list of advisories against the 14.x range — most apply to
  configurations this app doesn't use (custom servers, i18n rewrites, AVIF
  image optimization). Recommended next step: upgrade to the latest stable
  Next.js major on a dedicated branch with its own test pass.
- **No per-salesperson assignment or row-level scoping**: by design (per
  current requirements) there's no "assign this client to a salesperson"
  field — everyone sees the same shared client list and daily follow-up
  list. If that's wanted later, it would mean re-adding an `assignedUserId`
  on `Client` and scoping the follow-up/client queries by session role.
- **Browser push notifications**: not implemented. The dashboard itself
  (follow-up counters, overdue highlighting, the daily follow-up list) is
  the primary, always-current source of truth.
- **Payment currency**: amounts are stored as plain decimals and displayed
  in INR formatting; there's no multi-currency support per client yet.

## Recommended next improvements

1. Per-salesperson assignment and row-level access control, if needed later.
2. Upgrade to the latest stable Next.js release.
3. Browser/desktop push notifications for due follow-ups.
4. CSV export for reports and client lists.
5. Email/WhatsApp integration for one-click outreach from a follow-up card.
6. Multi-currency support if PrepSeven expands billing beyond INR.
