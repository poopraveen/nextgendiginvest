import { STAGES } from "@/lib/workflow";

const REPO = "https://github.com/poopraveen/nextgendiginvest/blob/main/docs";

const flow = [
  { who: "Partners", what: "pay capital into the project LLP's bank account" },
  { who: "LLP", what: "buys approved land in its own name and builds" },
  { who: "Tenants", what: "pay rent into the same account" },
  { who: "App", what: "takes out expenses, the repair reserve and the operator fee" },
  { who: "Partners", what: "get the rest every quarter, split by capital paid in" },
];

const rules = [
  ["Repair up to ₹25,000", "Operator approves"],
  ["Repair above ₹25,000 or anything unbudgeted", "Partners, more than 50% of ownership"],
  ["Contractor, rent policy, budget", "Partners, more than 50%"],
  ["Sell the building, take a loan, new partner, change operator", "Partners, at least 75%"],
  ["Bank payment above ₹1,00,000", "Operator and an elected partner both sign"],
];

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">How it works</h1>
        <p className="mt-2 max-w-2xl text-granite">
          A small group of people who know each other pool money into one company per building. The company buys land, builds, and rents it out. This app is the shared record everyone can check.
        </p>
      </header>

      <section className="rounded-lg border border-line bg-panel p-5">
        <h2 className="text-lg font-bold">Where the money goes</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-5">
          {flow.map((f, i) => (
            <li key={i} className="relative rounded-md bg-paper p-3 text-sm">
              <div className="font-bold text-survey">{f.who}</div>
              <div>{f.what}</div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-bold">The 12 stages</h2>
        <p className="mt-1 text-sm text-granite">A stage can only be closed when its gate is met. Every close is written to the ledger with who did it.</p>
        <ol className="mt-5 divide-y divide-line rounded-lg border border-line bg-panel">
          {STAGES.map((s) => (
            <li key={s.n} className="grid gap-1 px-5 py-4 sm:grid-cols-[40px_1fr_1fr] sm:gap-4">
              <span className="tabular text-lg font-bold text-survey">{s.n}</span>
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-granite">{s.summary}</div>
                <div className="text-xs text-granite">{s.owner}</div>
              </div>
              <div className="text-sm"><span className="text-granite">Gate: </span>{s.gate}</div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-xl font-bold">Who decides</h2>
        <table className="mt-4 w-full overflow-hidden rounded-lg border border-line bg-panel text-sm">
          <tbody>
            {rules.map(([a, b]) => (
              <tr key={a} className="border-b border-line last:border-0">
                <td className="px-5 py-3">{a}</td>
                <td className="px-5 py-3 font-semibold">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        {[
          ["Tamper-evident ledger", "Each entry includes a SHA-256 fingerprint of the one before. Change one old number and every partner's Verify button shows exactly where."],
          ["Evidence before money", "Construction stages are paid only after site photos, an engineer's sign-off and the bill are in."],
          ["Document fingerprints", "Deeds, agreements and statements are fingerprinted when added. Anyone can check a copy they were sent."],
        ].map(([t, d]) => (
          <div key={t}>
            <h3 className="font-bold">{t}</h3>
            <p className="mt-1 text-sm text-granite">{d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-amber/40 bg-amber-soft p-5 text-sm">
        <h2 className="font-bold text-amber">Before you take anyone&apos;s money</h2>
        <p className="mt-1">
          Keep it to people you know and invite them privately. Never promise a fixed return. Pooling money from the public for real estate with promised returns can be treated as a collective investment scheme under SEBI rules. Have a CA and a property lawyer review the structure and the agreement.
        </p>
      </section>

      <section className="text-sm">
        <h2 className="text-lg font-bold">Read the full documents</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><a className="text-survey underline" href={`${REPO}/BUSINESS_PLAN.md`} target="_blank" rel="noreferrer">Business plan</a> — model, sample numbers, fees, risks</li>
          <li><a className="text-survey underline" href={`${REPO}/WORKFLOW.md`} target="_blank" rel="noreferrer">Workflow</a> — every stage, monthly cycle, approval rules</li>
          <li><a className="text-survey underline" href={`${REPO}/AGREEMENT_TEMPLATE.md`} target="_blank" rel="noreferrer">Partnership agreement template</a></li>
        </ul>
      </section>
    </div>
  );
}
