---
description: Set the analysis plan before seeing results.
---

Read CLAUDE.md. Resolve the requested experiment from live records. Never guess an actor, result, date or approval.

Run `npm run experiments -- plan --ref=<code> --hypothesis="<hypothesis>" --goal=<goal-id> --control=<variation-id> --start=<YYYY-MM-DD> --end=<YYYY-MM-DD> --min-users=<per-arm> --control-share=0.5 --binary=confirmed --randomisation="<evidence>" --actor="<operator>"`. Add `--json` when inspecting full evidence. Names and partial IDs work; ambiguity lists candidates and stops.

Read docs/statistics.md. A retrospective plan cannot authorise adoption. Set the primary binary goal, control, sample size and period before locking. Locked rules cannot be edited. A new hypothesis requires a new experiment.
