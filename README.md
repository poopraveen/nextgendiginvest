# NextGen DigInvest

Buy land, build and rent it out **together** — with every rupee, vote, repair and document on a record every partner can check.

A small group of known partners pool money into one LLP per building. The LLP buys approved land, constructs a rental building (shops, co-living, warehouse), and shares the rent. This app is the shared, tamper-evident record for the whole life of the project: from site shortlist to final exit.

## Business documents

| Document | What's inside |
| --- | --- |
| [Business plan](docs/BUSINESS_PLAN.md) | Model, sample project numbers, operator fees, legal guard-rails, risks, roadmap |
| [Workflow](docs/WORKFLOW.md) | 12 stages with gates, monthly/quarterly cycle, approval rules |
| [Agreement template](docs/AGREEMENT_TEMPLATE.md) | Co-investment & LLP partnership agreement (draft for a lawyer to finalise) |

## What the app does

- **Portfolio** — every building, its stage, capital, occupancy and your own stake; a "waiting on you" list.
- **12-stage workflow** — each stage has a gate (e.g. clean title report, 100% capital received, every milestone paid). The next stage can't open until the gate is met.
- **Hash-chained ledger** — every transaction stores `SHA-256(previous hash + entry)`. Any partner can press *Verify ledger* to recompute the whole chain in their own browser. Try *Secretly edit an old payment* in the Money tab to see tampering caught.
- **Construction milestones** — money is released only after site photos, engineer sign-off and the contractor bill. Budget vs actual for every stage.
- **Rent & payouts** — rent roll, collections, and a quarterly payout split to the paisa by capital paid in (reserve and operator fee shown line by line).
- **Maintenance** — tickets with photos and bills; the operator approves small repairs, anything above the limit automatically opens a partner vote.
- **Weighted voting** — ordinary (> 50%) and special (≥ 75%) decisions measured against total ownership, so nothing passes on low turnout.
- **Document vault** — deeds, agreements and statements fingerprinted on upload; the *Check a document* page tells anyone if a copy they were sent is the recorded version.
- **Roles** — switch between Operator, any Partner, or a read-only CA auditor from the sidebar.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # ledger, money, voting and workflow rules
npm run build
```

Demo data (3 projects in Hoskote, Devanahalli and Kanakapura Road) is stored in your browser. Use **Reset demo data** in the sidebar to start over.

## How the code is organised

```
lib/            pure, tested business rules (no UI)
  ledger.ts     hash chain: append, verify
  finance.ts    cap table, paisa-exact splits, distributions, INR formatting
  governance.ts weighted vote tally
  workflow.ts   12 stages and their gates
  actions.ts    every state change (each one writes to the ledger)
  seed.ts       demo projects
components/     UI (store, shell, project tabs)
app/            Next.js App Router pages
docs/           business plan, workflow, agreement
```

All money is stored as integer paise; splits use BigInt so totals always match to the paisa.

## Path to production

This is a working prototype that runs fully in the browser. To take real money:

1. **Backend & auth** — Postgres (e.g. Supabase) with row-level security per project; phone/email OTP login; partners invited by the operator only.
2. **Append-only ledger table** — insert-only permissions, hash computed server-side, and the daily head hash emailed to all partners (or anchored to a public timestamping service) so even the database admin can't rewrite history.
3. **Bank integration** — LLP current account with virtual accounts per partner for contributions; rent collection via UPI/Razorpay; two-signatory approval for large payouts.
4. **Document storage** — encrypted object storage (S3/Supabase Storage) with the SHA-256 kept in the ledger.
5. **KYC** — PAN and Aadhaar/DigiLocker verification for partners and tenants.
6. **Notifications** — WhatsApp/email for votes, due rent, milestone evidence and payouts.
7. **Compliance** — keep it a private co-ownership among known partners; no public solicitation, no promised returns. CA and lawyer review before launch.
