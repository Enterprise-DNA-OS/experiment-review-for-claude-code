---
description: Record the human experiment decision.
---

Read CLAUDE.md. Resolve the requested experiment from live records. Never guess an actor, result, date or approval.

Run `npm run experiments -- decide --ref=<code> --outcome=hold --rationale="<reason>" --actor="<operator>"`. Add `--json` when inspecting full evidence. Names and partial IDs work; ambiguity lists candidates and stops.

Read results, guardrails and prior decisions first. Record the operator's exact choice: adopt, reject or hold. Adoption requires every configured check to pass. Never manufacture approval or deploy a change.
