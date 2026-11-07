# Experiment Review for Claude Code

This is an experiment review desk for an agency or an online business. The database holds hypotheses, frozen analysis plans, imported aggregate counts, guardrails and human decisions. Website traffic delivery remains in the business's agreed testing infrastructure.

Read live records before answering. Use the one CLI below. Drafts stay in drafts/ and never send. Never invent randomisation evidence, binary-outcome confirmation or a human decision. A pass is eligibility for a review, not permission to deploy. Do not change a locked plan to get a preferred result.

## One path per job

| Request | Recipe |
|---|---|
| List the supported jobs | /help |
| See the experiment portfolio | /portfolio |
| Read an experiment and its evidence | /show |
| Find overdue reviews and missing owners | /attention |
| Find decisions that still need evidence | /review-queue |
| Balance the weekly review workload | /workload |
| Trace imported report snapshots | /reports |
| Review conversion differences | /results |
| Check agreed harm thresholds | /guardrails |
| Check group allocation and sample readiness | /sample-check |
| Check purpose, retention and access review records | /compliance |
| Prepare Monday experiment decisions | /weekly-review |
| Read human decisions and their saved evidence | /decisions |
| Read the experiment change record | /activity |
| Register an experiment before it starts | /add |
| Set the analysis plan before seeing results | /plan |
| Set an outcome that must not worsen | /add-guardrail |
| Freeze the agreed plan and guardrails | /lock-plan |
| Give a review an owner | /assign |
| Record the purpose and next review dates | /privacy-review |
| Close the review without deleting history | /close |
| Bring in a Convert Aggregated Tabular report | /import |
| Record the human experiment decision | /decide |
| Record a review note | /log |
| Export all records and provenance | /export |
| Prepare a private decision readout | /draft-readout |
| Render branded paperwork | /docs |
| Render weekly dashboards | /view |
| Change fields or rules | /customise |
| Add a read-only report | /new-view |

Run `npm run experiments -- help` for the command names. Recipes carry the required flags. Every command accepts --json. Use exact code, case-insensitive name or a partial UUID. Ambiguous matches stop and list the candidates.

## Working data

Node 20 or later. DATABASE_URL selects PostgreSQL; otherwise PGlite persists under DATA_DIR or .data/db. Use a trusted operator database role. The schema enables row security without public policies; this is not a hosted multi-user application. Never seed a working or shared database. Tests use their own temporary database. TEST_DATABASE_URL is only for an empty disposable database.

Do not put private exports, working records, generated reports or credentials in git. The importer retains original columns, including any extra columns present in a file. Inspect the export before importing. No raw visitor tracking, cookies or personal identifiers are required for the analysis.

## Review rules

Read docs/statistics.md before interpreting a result. This is a two-arm, fixed-horizon, binary-outcome review. Counts from separate days, populations or snapshots are never added. Secondary metrics and segmented reports are exploratory. Retrospective plans cannot produce an adoption decision. Guardrails are observed tolerances, not proof of safety. Nothing sends or changes a live website.

Every mutation records the operator. Human decisions save the exact plan, report and analysis. Administrators can still change a database; the audit record is not tamper-proof. Keep backups and review access in the deployment environment. Record-reminder sources are in docs/compliance.md.

Omni by Enterprise DNA builds and runs a version for the business: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=convert-experiences&utm_medium=readme
