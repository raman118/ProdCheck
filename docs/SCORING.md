# Scoring

`scoreVersion` is `1`. Start at 100 and subtract 15 per critical, 8 per high, 4 per medium, and 1 per low finding. Info findings do not reduce the score.

For findings from the same check, apply multipliers `1, 0.5, 0.25, 0.125, ...` in severity-first order. Cap category deductions at Security 40, Data 35, Reliability 30, Observability 20, and Quality 20. Add the capped category deductions, subtract from 100, round to the nearest integer, and clamp to 0–100. Category score is 100 minus that category's capped deduction. Every report includes each category's cap, deduction, finding count, and severity counts.

Findings are ordered by severity (critical first), check id, evidence path, line, and finding id before score/report output. The scorer is pure and deterministic: LLM output, repository popularity, network status, and scan timing cannot affect it.

Bands: Critical (0–39), At risk (40–69), Good (70–89), Production ready (90–100).
