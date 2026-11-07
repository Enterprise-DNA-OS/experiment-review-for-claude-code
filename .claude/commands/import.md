---
description: Bring in a Convert Aggregated Tabular report.
---

Read CLAUDE.md. Resolve the requested experiment from live records. Never guess an actor, result, date or approval.

Run `npm run experiments -- import convert-experiences --file=<path.csv> --start=<YYYY-MM-DD> --end=<YYYY-MM-DD> --segment=all --actor="<operator>" --dry-run`. Add `--json` when inspecting full evidence. Names and partial IDs work; ambiguity lists candidates and stops.

Read docs/replace-convert-experiences.md first. The date range and segment must match the export. Review the test run, then repeat without --dry-run within the requested import. Never sum daily unique users. Repeated identical reports are unchanged; changed reports become separate snapshots.
