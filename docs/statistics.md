# What the result means

This tool reviews one pre-specified binary conversion goal in a two-arm experiment. It does not collect outcomes or assign visitors. The operator must verify independent random assignment, one binary outcome per person, no overlap between groups, and a consistent population across goals. Those assumptions cannot be verified from aggregate counts alone.

The difference is the variant conversion rate minus the control rate, in percentage points. The 95% interval uses the Agresti-Caffo adjusted Wald method: add one success and one failure to each arm, then use the normal difference interval with z = 1.959963984540054. This method is described by [NIST](https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/diffprop.htm), checked 7 November 2026. It is an approximation, not a guarantee of coverage for every population.

An adoption decision requires a locked prospective plan, the complete planned period, the planned minimum users per arm, at least ten successes and ten failures per arm, and a primary lower confidence limit above zero. The minimum sample is an operator input from their own design; this base does not calculate statistical power. No multiple comparisons, sequential peeking adjustments, revenue inference, clustered sampling, multivariate testing or adaptive allocation are implemented. A two-sided 95% interval is used once at the planned horizon. Repeated tests require a broader error-control plan.

A sample-ratio check compares observed group sizes with the planned control share. Pearson's chi-square statistic above 10.827566 (one degree of freedom, 0.001 upper-tail threshold) blocks adoption. It signals a mismatch, not its cause. [NIST critical values](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3674.htm).

Guardrails compare observed rate changes with pre-specified percentage-point tolerances. They are operational review checks, not statistical evidence that an outcome is safe. Missing guardrail data blocks adoption. Secondary goals have descriptive intervals only. Segmented reports are exploratory and cannot support adoption here.

Plans configured after a report was imported, or after their start date, are retrospective. They remain useful for investigation but cannot support an adoption decision. Lock the plan before collecting data. A new hypothesis needs a new experiment. Human decisions preserve the exact report and analysis; an adoption record never deploys a website change.

Reports are complete snapshots. The latest imported snapshot for a population is used, even if its date range is older. Dates are displayed and the period checks still apply. The operator must choose the intended full report; the software never merges overlapping counts. Conversions greater than users are retained for provenance but fail binary analysis.
