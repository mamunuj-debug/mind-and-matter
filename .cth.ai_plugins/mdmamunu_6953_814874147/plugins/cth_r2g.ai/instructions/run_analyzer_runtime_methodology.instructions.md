---
applyTo: run_analyzer_agent
---

# Runtime Profiling Methodology — VLSI Run Analyzer

This file is loaded on demand. Read it when the user's request maps to the **Runtime Profiling Path** (Full or Quick) in the Path Selection Guide.

---

## Stage 2e: Runtime Profiling Path Input

### Entry A — Full flow (stage summary file available)

- User provides path to `*RUNTIME_MEM_summary.txt` or its parent `reports/` / `apr_fc/` directory
- Call `get_stage_runtime_summary` → returns ranked stage list; identify the slowest stage name and runtime
- Call `find_stage_log_file` → resolves the log file path for that stage (default `log_pattern="fc.{stage_name}.log"`)
- Call `parse_log_to_csv` on the resolved stage log (required for `build_context_rich_query` downstream)
- Call `get_script_runtime_breakdown(log_file)` → ranked list of scripts by wall-clock time
- Pass `top_script` name to `select_script` / `build_context_rich_query` to begin RCA

### Entry B — Stage log already known (skip summary lookup)

- User provides the stage log path directly
- Call `get_script_runtime_breakdown(log_file)` directly — **no `parse_log_to_csv` needed** (parses raw log)
- Then: `select_script → build_context_rich_query`

### Entry C — Quick scan (no dedicated runtime intent, any parsed log)

- After `parse_log_to_csv`, call `get_execution_timeline` and inspect the `runtime_ranked` field
- `runtime_ranked` is sorted by `execution_time_seconds` descending — instant bottleneck view
- Pass the top script name as the `error` parameter to `select_script` / `build_context_rich_query`

### Bad vs Good Comparison (single tool call)

- Call `get_script_runtime_breakdown(bad_log, log_file2=good_log)` — single call returns a diff table sorted by max runtime
- `top_regression_script` in the response identifies the script with the largest absolute slowdown
- Call `extract_diagnostic_patterns` on the bad-run stage log (FC defaults: FLW-800, FLW-9000 Runtime Summary, QoR Summary)
- Drill into `select_script → build_context_rich_query` on the bad log for that script
- Pass custom `patterns` list for non-FC flows

---

## Runtime Profiling Workflow (Steps 1–7)

Follow the appropriate entry (A/B/C) from Stage 2e above. The steps are:

**Step 1 — Identify the slowest stage** (Entry A only):
Call `get_stage_runtime_summary` with the summary file or its parent directory.
Note the stage name and runtime. Ask user to confirm rank (default: 1 = slowest) or whether they want a different rank.

**Step 2 — Resolve the stage log** (Entry A only):
Call `find_stage_log_file` with `logs_dir` (sibling of `reports/`) and the stage name.
Default `log_pattern="fc.{stage_name}.log"` covers FC. Override for other tools.

**Step 3 — Parse the stage log**:
Call `parse_log_to_csv` on the stage log file.
Required for `build_context_rich_query` downstream; not required for `get_script_runtime_breakdown` itself.

**Step 4 — Rank scripts by runtime**:
Call `get_script_runtime_breakdown(log_file)`. Parses SCRIPT_START/STOP markers directly — no CSV dependency.
Response includes `top_script`, `top_script_runtime`, `top_script_pct`, and full `ranked_scripts` list. Present this to the user.

For bad vs good comparison: Call `get_script_runtime_breakdown(bad_log, log_file2=good_log)` — single call returns a diff table. Use `top_regression_script` as the focus for RCA.

**Step 5 — Optionally extract diagnostics**:
Call `extract_diagnostic_patterns` on the stage log to capture FLW-800 warnings, FLW-9000 Runtime Summary blocks, and QoR Summary — save as evidence for RCA.
Pass custom `patterns` for non-FC flows.

**Step 6 — Script selection**:
Pass `top_script` (or `top_regression_script` for comparison) as the `error` parameter to `select_script`.
If the user wants a different script from the ranked list, use its name instead.

**Step 7 — Continue on standard path**:
`build_context_rich_query` → `extract_file_paths` → `search_log_context` → `get_execution_timeline` → RCA.

---

## Stage 6 Output Template — Runtime Profiling Path

```
## Runtime Analysis: <stage name> — <bad ward> [vs <good ward>]

### Runtime Summary:
[Total stage runtime, top script name, its runtime and % share]
[For comparison: bad=Xh Ym  good=Xh Ym  delta=+Zh Wm (+N%)]

### Script Breakdown (Top N):
[Ranked list from get_script_runtime_breakdown — script | runtime | invocations | % of total]
[Highlight scripts with >15% share or >2× delta vs good run]

### Diagnostic Evidence:
[FLW-800 warnings from extract_diagnostic_patterns — missing files, env issues]
[Runtime Summary (FLW-9000) block — per-mega-command breakdown]
[Any anomalous repetition counts in ranked scripts]

### Log-Level Analysis (Top Script):
[Key log lines from build_context_rich_query — what is the script doing that takes so long?]
[Iteration counts, convergence loops, external tool calls, file I/O patterns]

### Code / ivar Factors:
[Script settings, ivar values that control iteration limits, convergence criteria, or enable extra work]

### Root Cause:
[Specific cause: e.g. "script X iterated N times due to ivar(max_iter)=N; expected ≤M"]
[Quantify: "accounts for Xh of the Yh delta"]

### Recommended Fix:
[One actionable change per root cause — ivar override, constraint fix, flow config]
```
