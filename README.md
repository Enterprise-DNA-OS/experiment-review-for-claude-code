# Experiment Review for Claude Code

Your experiment plans, conversion counts, review checks and decisions in a database you own. See why an apparent improvement is ready for review, or why it needs more evidence.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and run the demo. | Your goals, rules, Convert exports and review documents. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=convert-experiences) · [Instead of Convert Experiences](https://enterprisedna.co/omni/instead-of/convert-experiences?utm_source=github&utm_medium=readme&utm_campaign=convert-experiences)

## Run a working review

Node 20 or later.

```bash
git clone https://github.com/Enterprise-DNA-OS/experiment-review-for-claude-code.git
cd experiment-review-for-claude-code
npm install
npm run demo
npm run experiments -- results --ref=CHECKOUT
npm run experiments -- weekly-review
npm run docs
npm run view
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md and CLAUDE.md route every runtime to the same command recipes. PGlite runs locally without a database service. DATABASE_URL selects PostgreSQL with a trusted operator role. Never seed a shared database.

The fictional demo contains a checkout improvement ready for human review, an uneven delivery test with a breached support threshold, an incomplete signup report, and an unowned search experiment. Dates are relative to the day the demo is first seeded. Seeding twice preserves existing records.

## The weekly rituals

Monday: /weekly-review combines the portfolio, attention list, review queue and privacy reminders. Before a test: /add, /plan, /add-guardrail and /lock-plan record the hypothesis and agreed rules. When a report arrives: /import, /sample-check and /guardrails check the evidence. At the review: /decide records the operator's decision. /draft-readout and /docs prepare private material for the meeting. Nothing sends or deploys.

26 CLI commands and 30 slash-command recipes. Every CLI command accepts --json. Exact codes, partial UUIDs and case-insensitive names work. Ambiguous matches list candidates and exit with failure. Read the matching recipe for required flags.

## Evidence that stays attached to the decision

Reports are complete snapshots for an explicit date range and population. A second import never adds those users to an earlier snapshot. Identical bytes and scope are unchanged; changed counts create a new report. Decisions retain the plan, report ID and calculated evidence used at the meeting.

The review uses a two-arm binary outcome model, a fixed period, a minimum sample per arm, a sample-ratio check and a 95% adjusted Wald interval. An adoption decision is blocked by missing evidence, insufficient data, observed guardrail breaches or a plan written after results were available. Secondary goals and segments are exploratory. This does not reproduce Convert's statistical engine. [Methods and limits](docs/statistics.md).

## Ten questions this build answers

These are tested questions, not claims that Convert cannot answer them.

1. Which experiments need a decision this week? Run `review-queue`.
2. Which apparent improvement has uneven test groups? Run `sample-check --ref=DELIVERY`.
3. Which result covers less than the planned period? Run `results --ref=SIGNUP`.
4. Did support requests worsen beyond our agreed limit? Run `guardrails --ref=DELIVERY`.
5. Which experiment still has no owner? Run `attention`.
6. Which old reports are being used for an active review? Run `attention`.
7. What evidence supported the last human decision? Run `decisions --ref=CHECKOUT`.
8. Who changed the owner or recorded a review note? Run `activity --ref=SEARCH`.
9. Which privacy record reviews are due? Run `compliance`.
10. What is the difference between the two conversion rates? Run `results --ref=CHECKOUT`.

## Bring your report history

Choose Convert's CSV Aggregated Tabular export. Use one experience and one population per file. Take the date range and segment from the report settings.

```bash
npm run experiments -- import convert-experiences --file=imports/report.csv --start=2026-10-01 --end=2026-10-31 --segment=all --actor="Your name" --dry-run
npm run experiments -- import convert-experiences --file=imports/report.csv --start=2026-10-01 --end=2026-10-31 --segment=all --actor="Your name"
```

This creates the experiment if needed and retains the source columns. Daily reports are rejected because summing daily unique users can count people twice. Historical reports remain useful, but cannot become a prospective test by writing a plan afterwards. [Export, import and reconciliation](docs/replace-convert-experiences.md).

## Documents and views

Change brand.json once. npm run docs produces an experiment brief and decision readout for each experiment. npm run view produces weekly, workload and provenance dashboards. All are read-only HTML, kept private. Print to PDF after checking the result. /new-view adds another view.

The free base reviews exported results. It does not deliver website variations, assign visitors, set cookies, record sessions or replace a visual editor. Enterprise DNA scopes the website connections and any front end separately before a business cancels its existing service. [What a screen adds](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our name and colours on the readout.
2. Import one report without saving it.
3. Show which experiments have missing owners.
4. Set our primary conversion goal.
5. Add a support-request threshold.
6. Explain the uneven delivery test.
7. Show decisions against older report snapshots.
8. Add a client reference to the experiment.
9. Group review work by owner.
10. Prepare the next experiment brief.

/customise writes and tests a migration before applying an agreed change. Locked analysis plans stay intact; a different hypothesis becomes a new experiment.

## Price context

Convert publishes Pro at US$23,520 annually for nine million tested users per year. This is a published plan configuration, not an observed customer invoice. Lower-volume plans cost less and Enterprise is quoted privately. [Vendor pricing](https://www.convert.com/pricing/), checked 7 November 2026. [Selection evidence](docs/research.md).

## Verification and operating limits

npm test exercises every CLI command, imports, duplicates, failed writes, locked rules, decision snapshots, statistical checks, HTML escaping and generated documents in a temporary database. CI defines Node 20 and 22 on Linux and Windows, plus PostgreSQL 17. Read actual CI results before claiming a platform passed.

This trusted-operator base has no application authentication. Configure database access, backups, restore checks and retention for the deployment. /compliance flags missing purpose and overdue review records; it does not certify legal compliance or inspect your infrastructure. [Rules and sources](docs/compliance.md).

MIT. Not affiliated with Convert or Anthropic. Hosting and agent usage have their own costs.
