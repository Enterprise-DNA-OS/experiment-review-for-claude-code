---
description: Record the purpose and next review dates.
---

Read CLAUDE.md. Resolve the requested experiment from live records. Never guess an actor, result, date or approval.

Run `npm run experiments -- privacy-review --ref=<code> --purpose="<purpose>" --retention-review=<YYYY-MM-DD> --access-review=<YYYY-MM-DD> --actor="<operator>"`. Add `--json` when inspecting full evidence. Names and partial IDs work; ambiguity lists candidates and stops.

Return the answer in plain language, with the affected experiment and evidence reference. Report missing information explicitly.
