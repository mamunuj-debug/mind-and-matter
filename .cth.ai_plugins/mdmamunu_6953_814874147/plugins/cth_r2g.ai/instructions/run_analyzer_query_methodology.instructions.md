---
applyTo: run_analyzer_agent
---

# Query, Multi-Log, and Report Methodology — VLSI Run Analyzer

This file is loaded on demand. Read it when the user's request maps to the **Query Path**, **Multi-Log Comparison**, or any **Report-Context** path in the Path Selection Guide. Also read it when any Special Case applies (Timing Degradation, Flow-Orchestration Log, Large Reports, Report-Only Queries).

---

## Stage 2b: Query Path — Full Workflow

### Step 1 — Classify intent and build a rich keyword set

Before calling any tool, determine what the user is really asking. Classify their query into one or more of the categories below, then assemble a comprehensive keyword list by combining:
- Auto-extracted tokens from the query text
- Domain-specific expansions from the matching category below
- Any signal names, numeric values, or design objects the user mentioned explicitly

**VLSI Query Intent → Keyword Expansion Map**

| Intent | Primary Keywords | Expand With |
|---|---|---|
| **Timing — setup/hold** | WNS, TNS, slack | setup, hold, violation, critical path, endpoint, startpoint, path group, CPPR, uncertainty, clock skew, transition, arrival, required |
| **Timing — clock** | CTS, clock tree | skew, latency, insertion delay, clock period, frequency, jitter, uncertainty, propagated, ideal, sink, source, buffer, gating |
| **Timing — multi-cycle/false path** | multicycle, false path | exception, path, set_multicycle_path, set_false_path, timing ignore |
| **Placement** | placement, utilization, density | congestion, overflow, legalizer, displacement, cell, instance, site row, blockage, macro, filler, decap, tap |
| **Routing** | routing, DRC, violation | shorts, opens, spacing, width, antenna, metal, layer, via, wire, net, congestion, overflow, ECO |
| **Power** | power, leakage | dynamic, switching, internal, net, cell, toggle rate, activity, UPF, CPF, voltage, rail, IR drop, EM |
| **Congestion** | congestion, overflow | GR, routing demand, capacity, hotspot, H/V overflow, layer assignment |
| **Physical verification** | DRC, LVS, ERC, antenna | rule, check, marker, Calibre, ICV, Pegasus, clean, violation count |
| **Physical QoR / LVS** | opens, shorts, utilization, area | open net, frozen, short violation, bm2, PG net, core utilization, capacity, blockage, macro exclusion, density, site row |
| **Optimization** | optimization, QoR | area, timing, power, recover, improve, ECO, insert, resize, buffer, remap, restructure, opto |
| **Synthesis** | synthesis, RTL | elaboration, compile, area, timing, mapping, generic, unresolved, module, hierarchy |
| **Formal verification** | formal, equivalence | LEC, Formality, proven, assume, assert, property, cone, failing point |
| **Simulation** | simulation, UVM | testbench, pass, fail, timeout, assertion, coverage |
| **Flow / stage execution** | (any flow stage name) | start, end, elapsed, wall time, CPU, memory, peak, runtime, iteration |
| **Regression / comparison** | (cross-run queries) | delta, change, worse, better, previous, current, regression, improvement |
| **Variable / ivar** | ivar | value, history, change, set, override, default |

### Step 2 — Validate keyword quality before calling the tool

- Minimum 3 keywords, ideally 5–8 for good recall
- Include at least 1 numeric or symbol token if the user mentioned a value (e.g. `"-0.15"`, `"0.78"`, `"400ps"`)
- Include the tool-specific error/message ID if visible (e.g. `"IMPSP-172"`, `"ROUTE-045"`)
- Avoid overly generic tokens alone (`"error"`, `"fail"`, `"report"`) — always pair them with domain-specific terms

### Step 3 — Call `search_log_for_query` and present results

- Call `search_log_for_query` with the query and the enriched keyword list
- Display ranked script list to user (INFORMATIONAL — shows hit counts and snippets)
- After presenting, IMMEDIATELY call `select_script` with `script_list=ranked_scripts`:

  > **⛔ WRONG:** `select_script(log_file=..., error="routing")` — no `script_list` = error mode = wrong CSV column
  >
  > **✅ CORRECT:** `select_script(log_file=..., error="<primary_keyword>", script_list=<ranked_scripts>, csv_dir=...)`

  The `ranked_scripts` value is the **exact list returned in the `ranked_scripts` field** of `search_log_for_query`'s response — pass it as-is.

- Ask: "Found matches in {N} scripts (shown above with hit counts). Which would you like to investigate? Choose a number (1-N), or pick 0 to analyze ALL matched scripts."
- Wait for explicit user selection

### Step 4 — Determine the `error` parameter for downstream tools

- Pick the single most discriminating keyword from your expanded set
- Prefer: specific metric names (`"WNS"`), error codes (`"IMPSP-172"`), or stage names (`"route_opt"`) over generic words
- This keyword anchors the log context window in `build_context_rich_query`

---

## Stage 2c: Multi-Log Comparison (Agent-Driven, Scales to N Logs)

- Call `parse_log_to_csv` for each log file (N calls)
- Call `search_log_for_query` with the same keywords on each log (N calls)
- Aggregate and compare the ranked_scripts results yourself:
  - Scripts appearing in some logs but not others
  - Hit count differences for the same script across logs
  - New or disappearing keywords per log
- Explain differences to user with log labels ("In run A...", "In run B...")
- Optionally drill into specific differing scripts with `build_context_rich_query` on the relevant log

**Report comparison (required for metric-driven queries — WNS, area, power, DRC, utilization):**
- Infer the ward path for each log (parse `::ward`, `::ivar(build_name)`, `::tech`, `::flow` from log header)
- Call `search_report_context` on the matching report in each run (e.g., `report_qor*.rpt`, `report_timing*.rpt`, `report_power*.rpt` from the same stage subdirectory in each run's `reports/`)
- Diff the metric values across runs: WNS/TNS deltas, area changes, DRC count changes — these are often the most direct answer to "why did X get worse"
- Look at reports like app_options, ivar, etc all that again sit under `reports/` to explain *why* the numbers changed — did a setting flip? Did a new constraint kick in? Did a new optimization run? Did a crucial tool/flow setting change?
- Treat log comparison as explaining *why* the numbers changed; treat report comparison as measuring *how much* they changed


---

## Stage 2d: Report Context Input

Report files live alongside logs and contain QoR metrics, ivar snapshots, and stage summaries that are NOT captured in the log's error/warning structure. They are flat files — no CSV hierarchy needed.

**Ward path formula** (derivable from any log file header):
```
$ward/runs/$block/$tech/$flow/reports/<stage>/<report_file>
```
Where:
- `INTEL_INFO : Initializing ::ward = '...'`                  → `$ward`
- `INTEL_INFO : Initializing ::ivar(build_name) = '...'`      → `$block`
- `INTEL_INFO : Initializing ::tech = '...'`                  → `$tech`
- `INTEL_INFO : Initializing ::flow = '...'`                  → `$flow`
- Reports dir = `$ward/runs/$block/$tech/$flow/reports/`
- Logs dir    = `$ward/runs/$block/$tech/$flow/logs/`  (sibling of reports/)

Alternatively: derive reports dir as `<log_dir>/../reports/` (one level up from `logs/`, then into `reports/`).

**Key report files by type:**

| Report File | Stage Subdir | Contains |
|---|---|---|
| `*.error_summary.txt` | top-level | Summary of all errors+warnings per stage |
| `*.RUNTIME_MEM_summary.txt` | top-level | Runtime and memory per stage |
| `report_timing*.rpt` | `<stage>/` | WNS, TNS, slack, critical paths |
| `report_qor*.rpt` | `<stage>/` | QoR summary (timing, area, power) |
| `report_clock_qor*.rpt` | `<stage>/` | Clock tree quality, skew, latency |
| `report_clock_tree*.rpt` | `<stage>/` | Per-clock tree details |
| `report_congestion*.rpt` | `<stage>/` | GR congestion, overflow stats |
| `report_utilization*.rpt` | `<stage>/` | Area, density, utilization |
| `report_power*.rpt` | `<stage>/` | Leakage, dynamic, switching power |
| `report_design*.rpt` | `<stage>/` | Design rule, hierarchy, area |
| `fc.ivar.rpt` | `<stage>/` | Full ivar snapshot (60k+ lines — use keyword scan) |
| `fc.app_options.csv` | `<stage>/` | All app options as CSV (readable) |
| `report_script_runtime.txt` | `<stage>/` | Per-command runtime breakdown |
| `fc.clock_qor.rpt` | `<stage>/` | Per-clock tree: sink count, latency, skew, DCD — often >50MB; use terminal `head`/`grep` |
| `fc.opens_shorts.rpt` | `<stage>/` | LVS opens and shorts list — use `grep -c` for counts, `head -50` for summary |
| `fc.report_utilization.gz` | `<stage>/` | Core utilization, capacity, macro/blockage exclusion breakdown — `zcat \| head -100` |
| `fc.std_cell_summary` | `<stage>/` | Std cell instance count, area breakdown by cell type |
| `*.qor_summary` | top-level | Machine-readable QoR JSON/text summary: WNS, TNS, area, power totals per scenario |

---

## Stage 5b/b2 Guidance for Query Path

### 5b — `search_log_context` Keyword Guidance

Use your full expanded keyword set from Step 2 of the Query Path above. Always include:
- Any ivar names seen in the code context
- Any numeric thresholds or values mentioned
- Any file/net/cell names visible in log lines

Domain-specific keyword sets:
- Timing: `["WNS", "TNS", "slack", "setup", "hold", "critical path", "endpoint", <net/cell names>]`
- Routing: `["DRC", "spacing", "overflow", "congestion", <layer names>, <net names>]`
- Power: `["leakage", "IR drop", "EM", "toggle", <rail names>]`
- Placement: `["density", "utilization", "displacement", "overflow", <cell names>]`

### 5b2 — `search_report_context` (Conditional — When Reports Are Relevant)

Call this when the user's query is better answered by report files than by the log:

1. Parse `::ward`, `::ivar(build_name)`, `::tech`, `::flow` from the top of the log file
2. Construct: `$ward/runs/$block/$tech/$flow/reports/`
3. List the reports directory with VS Code `listDirectory` to find available stages and files
4. Match the query intent to the relevant report type (see Stage 2d table above)
5. Call `search_report_context(report_paths=[...], keywords=[...])`

If ward path is not parseable from the log: note this and skip — do not fail.

**Large report handling — probe before reading:**
Before calling `read_file` or `search_report_context` on ANY report, assess its size and structure:
1. Run `ls -lh <path>` or `wc -l <path>` first
2. Apply the tier that matches:

| Tier | Condition | Strategy |
|---|---|---|
| **Compressed** | File ends in `.gz`, `.bz2`, `.xz` | `zcat/bzcat/xzcat <path> \| head -N` in terminal — NEVER `read_file` on compressed |
| **Very large** | >10 MB or >100k lines | `head -N` for top summary; `tail -N` if totals are at end; `grep -n <pattern> <path> \| head -M` |
| **Large** | 1–10 MB or 10k–100k lines | Prefer `search_report_context` with tight keywords; fall back to `head`/`tail`/`grep` |
| **Normal** | <1 MB / <10k lines | `read_file` or `search_report_context` as usual |

**Four universal access rules:**

- **Rule 1 — Compressed files:** Always decompress in terminal (`zcat | head`). `read_file` cannot open `.gz`. Applies to `fc.report_utilization.gz`, `report_timing*.gz`, `report_congestion*.gz`, and any compressed report.
- **Rule 2 — Exact counts needed:** `grep -c <pattern> <path>` in terminal first for exact counts. `search_report_context` undercounts repeated violation lines. Applies to `fc.opens_shorts.rpt`, `fc.report_drc_errors.rpt`, any DRC/LVS report.
- **Rule 3 — Summary at end:** Multi-scenario reports write totals last. Use `tail -80 <path>` or `read_file` from `(total_lines - 80)`. Applies to `fc.report_power`, `fc.report_qor` design summary section.
- **Rule 4 — Keyword scan only:** 60k+ line flat dumps must never be read in full. Use `grep -n <name> <path> | head -20`. Applies to `fc.ivar.rpt`, `fc.app_options.rpt`.

**When in doubt:** run `wc -l <path>` first, then decide which rule applies.

For timing reports: search for `WNS`, `TNS`, `slack`, `violation`, path group names  
For congestion reports: search for `overflow`, `GR`, `congestion`, layer names  
For QoR reports: search for `area`, `timing`, `power`, stage name  
For scenario corners: grep for `SS`, `FF`, `PRCS`, `PCSS`, `TTTT` near scenario names

---

## Stage 6 Output Templates

### Query Path Template

```
## Analysis: <restate the user's question>

### Direct Answer:
[Answer the user's question immediately and concisely up front]

### Supporting Evidence from Log:
[Key log lines organized by script/stage — include actual values]

### Report Evidence (if reports were searched):
[Findings from report files: exact values, table rows, metric snapshots]
[Cite report file name and section: e.g. "report_qor.route_opt.rpt line 42: WNS=-0.12ns"]

### Stage-by-Stage Breakdown:
[Walk through relevant flow stages; use execution timeline to order correctly]

### Code / Config Factors:
[Script settings, ivar values, or collateral file contents that explain the observation]

### Root Cause / Explanation:
[Why is this happening — trace back to root setting, constraint, or event]

### Recommendations:
[Actionable next steps, what to change or investigate further]
```

### Multi-Log Comparison Addition (append after Root Cause)

```
### Cross-Run Comparison:
[What changed across runs — scripts, hit counts, patterns per log]

### Key Differences:
[Scripts that appear/disappear, biggest hit-count deltas across logs]

### Likely Cause of Regression/Improvement:
[What in the logs explains the observed change]
```

---

## Special Cases

### Special Case: Timing Degradation Queries

For queries like "why is WNS worse" or "what changed in timing":

1. Classify as **Timing — setup/hold** or **Timing — clock** (see Intent Map above)
2. Build rich keyword set: `["WNS", "TNS", "slack", "setup", "hold", "critical path", "endpoint", "path group", "uncertainty", "skew", "arrival", "required", "violation"]`
3. Add specific values the user mentioned: clock names, path group names, numeric targets
4. **Single run**: `search_log_for_query` with the full keyword set — look for stage where timing first degraded
5. **Also**: infer ward path and call `search_report_context` on `report_timing*.rpt` and `report_qor*.rpt` for the relevant stage — reports contain the authoritative WNS/TNS table
6. **Multiple runs**: `parse_log_to_csv` + `search_log_for_query` on each log with the same keywords, diff ranked results — focus on scripts where hit counts or WNS values differ
7. `get_execution_timeline` is critical to identify which flow stage timing changed in

---

### Special Case: Flow-Orchestration Log (No Embedded QoR — Fast-Path to Reports)

Some log files are **flow-orchestration logs** (e.g., `fc.finish.log`, `fc.init.log`, `fc.eco.log`). These logs contain only SCRIPT_START/STOP markers, ivar overrides, and tool-level messages. They do NOT contain embedded QoR tables.

**How to detect:**
- `build_context_rich_query` returns "No script found matching: <keyword>" for a QoR keyword
- OR: log consists primarily of `INTEL_INFO`, `SCRIPT_START`, `SCRIPT_STOP`, and ivar override lines
- OR: log filename matches `fc.finish.log`, `fc.init.log`, `fc.eco_implementation.log`

**Action when detected (immediately, no retries):**

0. **Read the log tail first — BEFORE going to reports:**
   Run `tail -500 <log_file>` in terminal. Flow-orchestration logs frequently have post-stage output appended at the end from manually executed reporting scripts. Check for:
   - Clock tree summaries: sink counts, latency/skew values, per-clock frequency tables
   - Manually invoked `report_clock_qor`, `report_timing`, `report_qor` output blocks
   - Lines containing `WNS`, `TNS`, `NVP` table rows  
   - Any tabular data formatted with `---` separators or column headers
   Capture and include any such data in the final analysis — it is often the richest per-clock detail available.

1. Derive reports directory: `<log_dir>/../reports/`
2. List it with VS Code `listDirectory` — enumerate stage subdirectories and top-level summary files
3. **Always read first** (small, human-readable):
   - `*.error_summary.txt` — errors/warnings across ALL sub-logs in one place
   - `*.RUNTIME_MEM_summary.txt` — runtime and peak memory per stage
   - `*.qor_summary` — machine-readable QoR totals if present
4. **Then read for timing/DRC/power/area** (use the large file handling rules above):
   - `fc.report_qor` — timing WNS/TNS/NVE per scenario, area, DRC net count
   - `fc.report_drc_errors.rpt` — DRC matrix by type and layer
   - `fc.report_power` — power totals (read last 80 lines for totals)
   - `fc.report_utilization.gz` — utilization breakdown
   - `fc.clock_qor.rpt` — clock tree quality (use `head -200` in terminal)
   - `fc.opens_shorts.rpt` — LVS opens/shorts (use `grep -c` for counts)
   - `fc.std_cell_summary` — std cell counts and area
5. Do NOT retry `build_context_rich_query` for QoR metric keywords — they will never match a script. But **DO use the log toolchain for everything else:**
   - `parse_log_to_csv` + `list_errors` — errors in the log may explain bad QoR. If relevant errors exist, run the full error path.
   - `search_log_for_query` with keywords tied to the user's question (e.g., `"hold fixing"`, `"ECO iteration"`, `"overflow"`, `"optimization"`, `"WARNING"`, `"effort"`, `"ivar"`) — surfaces flow context from log sections that explains *why* the numbers look the way they do
6. **Log and reports serve different roles — both are required:**
   - **Reports = what the numbers are** (WNS, TNS, area, power, DRC counts)
   - **Log = why the numbers are what they are** (ivar overrides, tool warnings, ECO change counts, iteration messages, optimization diagnostics)

---

### Special Case: Report-Only Queries (No Error or Log Path Required)

For queries like "what is the QoR?", "show me the ivar snapshot", "what app options were used":
1. The user may provide only a ward path, a reports directory, or individual report files
2. No log parsing is needed — skip directly to `search_report_context`
3. Infer the correct report type from the query using the Stage 2d table above
4. For large reports (fc.ivar.rpt, fc.app_options.rpt): ALWAYS use keyword search, never attempt full read
5. For fc.ivar.rpt specifically: search for the exact ivar name(s) mentioned by the user
6. For fc.app_options.csv: small and structured — read in full with VS Code `read_file`
7. For error_summary.txt: read in full (typically <100 lines)

---

### Special Case: Large or Structured Reports (Any Stage)

Any report can be large. Apply the four universal access rules (above) before attempting to read. Common patterns:

**Compressed reports (any `*.gz`, `*.bz2`) — Rule 1:**
- `zcat <path> | head -100` for summary at top; `| tail -80` if totals are at end; `| grep -n "<keyword>" | head -40` for targeted search
- Extract from utilization: total block area, capacity area, core utilization %, macro/blockage exclusion

**Count-based LVS/DRC reports — Rule 2:**
- `grep -c <violation_pattern> <path>` for exact count first, then `grep -n ... | head -30` for context
- High short counts (>1000) almost always indicate a macro boundary / PG layer conflict

**Multi-scenario reports with totals at end — Rule 3:**
- `wc -l <path>` first, then `tail -80` for design-level totals — don't stop at first scenario table

**Very large tabular reports — Rule 4:**
- `head -N` for summary table at top; `grep -n "<column_header>" | head -80` for specific rows
- Never silently omit a large report — terminal-based partial extraction is better than skipping

**Scenario Corner Translation (any report with scenario names):**
- Scenario names use short codes (e.g., `func_highvcc`, `scan_lowvccslow_min`)
- Grep for `SS`, `FF`, `PRCS`, `PCSS`, `TTTT` near scenario definitions to translate corner conditions

---

### Special Case: User Provides Ward Path

If the user provides a ward-like path:
1. Use pattern `$ward/runs/$block/$tech/$flow/` to browse available blocks, tech versions, and flows
2. Use VS Code `listDirectory` on `$ward/runs/` to enumerate blocks
3. For the target block/tech/flow: list `reports/` to see which stage subdirectories exist
4. Match available stage report directories to the user's query
