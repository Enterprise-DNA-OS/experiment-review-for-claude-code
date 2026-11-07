# Bring Convert Experiences reports into your review database

In the experience's Report tab, open the More menu, choose Export & Download, and select CSV Aggregated Tabular. Select the goals needed for the review, the full date range and the intended population. The export follows the report's filters. [Convert's export guide](https://support.convert.com/hc/en-us/articles/export-download-in-convert-understanding-the-different-export-types), checked 7 November 2026.

Use the documented headers experience_id, experience_name, variation_id, variation_name, goal_id, goal_name, users and conversions. Extra fields, including revenue, remain in source_data but are not used for inference. The checked fixture is synthetic and follows those documented columns; it is not represented as a real account export.

```bash
npm run experiments -- import convert-experiences --file=imports/report.csv --start=2026-10-01 --end=2026-10-31 --segment=all --actor="Your name" --dry-run
```

Supply the actual inclusive dates and segment from the export settings. Use --segment=mobile, for example, for a filtered population. Use all only for the unfiltered population. The file itself does not prove those settings. Review the proposed counts, then repeat without --dry-run to load it in one command. --code= lets you choose an internal code on first import. --ref= explicitly targets an existing experiment and requires the vendor ID to match.

The import is transactional. It rejects malformed CSV, missing columns, mixed experiences, duplicate variation/goal pairs, inconsistent populations, negative counts and daily exports. Identical source bytes with the same scope are unchanged. Changed files create separate complete snapshots; they never add to an earlier snapshot. A failed import leaves no partial report.

Compare experience and variation IDs, every goal's users and conversions, dates and filters against Convert. Set the primary goal and control explicitly. Historical reports are retrospective. Imported result summaries do not recreate the original hypothesis, approval history, website variations, targeting, visitor identities, recordings or raw events. Keep those in the original archive until an agreed migration handles them.

The free base is ready for a report review on the day the export arrives. Website experiment delivery is a separate integration. Keep Convert running until the business has tested its replacement delivery path, data collection and analysis with its own traffic. Enterprise DNA maps the agreed history and builds those connections as part of a custom version.
