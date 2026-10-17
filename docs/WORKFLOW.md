# End-to-End Workflow

Every project moves through 12 stages. A stage closes only when its **gate** is met; the app blocks the next stage until then and records who approved it in the ledger.

| # | Stage | Who | Key actions | Gate to move on | Recorded in app |
| --- | --- | --- | --- | --- | --- |
| 1 | Site sourcing | Operator | Shortlist 3 plots, rent survey, feasibility (cost, yield) | Feasibility report shared | Feasibility doc + hash |
| 2 | Partner onboarding | Operator, Partners | Invite known people, KYC (PAN, ID, bank), sign commitment letter | Commitments ≥ 100% of target | Partner list, KYC status |
| 3 | Legal due diligence | Lawyer | Title chain 30 yrs, EC, RTC, DC conversion, layout approval, Khata, acquisition check | Clean title report | Title report + all docs hashed |
| 4 | LLP formation | CA, Partners | Incorporate LLP, sign LLP / co-investment agreement, open current account (2 signatories) | Agreement signed by all | Signed agreement hash, vote record |
| 5 | Capital call | Partners | Transfer contribution to LLP account only | 100% funds received | Ledger: one entry per contribution |
| 6 | Land purchase | Operator, Lawyer | Agreement for sale, stamp duty, register sale deed in LLP name, Khata transfer | Registered sale deed + E-Khata | Ledger payments + deed hash |
| 7 | Design & sanction | Architect | Building plan, structural design, plan sanction, contractor tender (3 quotes) | Plan sanctioned + contractor approved by vote (≥ 51%) | Plan docs, quotes, vote |
| 8 | Construction | Contractor, Engineer | Build per milestone: foundation → plinth → slabs → brickwork → finishing | Each milestone: photos + engineer certificate + bill before payment | Milestone budget vs actual, evidence |
| 9 | Completion | Operator | Occupancy / completion certificate, utility connections, snag list | OC received | OC hash |
| 10 | Leasing | Operator | List units, tenant KYC, rental agreements, deposits | Target occupancy reached | Units, tenants, lease docs |
| 11 | Operations (recurring) | Operator, Partners | Collect rent, pay expenses, maintenance tickets, quarterly distribution, annual audit | — runs monthly / quarterly | Rent ledger, tickets, payouts, statements |
| 12 | Exit | All partners | Share transfer (ROFR), or sale of building (≥ 75% vote) | Sale deed / transfer deed | Valuation, vote, final distribution |

## Recurring monthly cycle (stage 11)

```
Day 1–5    Rent due → tenants pay into LLP account → operator records receipt (ledger)
Day 1–30   Maintenance tickets raised → approve (≤ limit: operator, > limit: partner vote) → fix → upload bill + photos → pay
Month end  Expenses booked; app updates net income
Quarter    App computes distribution:
             Gross rent
           − Expenses (tax, insurance, utilities, repairs)
           − Maintenance reserve (10%)
           − Operator fee (8% of rent)
           = Distributable → split by ownership % → payout → statement for each partner
Year end   CA audit with read-only access; LLP files ITR-5 and Form 8/11
```

## Approval rules (default — editable in agreement)

| Decision | Approver |
| --- | --- |
| Repair / expense ≤ Rs 25,000 | Operator |
| Expense > Rs 25,000 or any unbudgeted item | Partners, ≥ 51% ownership |
| Contractor selection, rent policy, new tenant category | Partners, ≥ 51% |
| New loan, sale of property, change of operator, new partner | Partners, ≥ 75% |
| Bank payments > Rs 1,00,000 | Two signatories (operator + elected partner) |

## Trust mechanics in the app

1. **Hash-chained ledger:** `hash(n) = SHA-256(hash(n-1) + entry(n))`. Editing any old entry breaks every hash after it; the "Verify ledger" button re-computes the chain in the partner's own browser.
2. **Document fingerprints:** a file's SHA-256 is stored at upload. Anyone can drop the same file in later to prove it is unchanged.
3. **Evidence before money:** a milestone payment cannot be recorded until photos, engineer sign-off and bill are attached.
4. **Activity trail:** every approval, vote and payment shows who did it and when.
