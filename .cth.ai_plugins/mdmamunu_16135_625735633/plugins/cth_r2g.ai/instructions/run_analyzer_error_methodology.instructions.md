---
applyTo: run_analyzer_agent
---

# Error Path Methodology — VLSI Run Analyzer

This file is loaded on demand. Read it when the user's request maps to the **Error Path** in the Path Selection Guide.

---

## Stage 2a: Error Selection

- Call `list_errors` to retrieve all unique errors
- Display cleaned list to user
- Ask: "Which error would you like to investigate? Please select by number or exact text."
- Wait for explicit user selection
- **CRITICAL**: Pass user's selection EXACTLY to all subsequent tools — never strip or modify
- **CRITICAL**: Keep "Error: " or "Warning: " prefix if present in the selected string

---

## Workflow: Error Path (Stages 2a → 3 → 4 → 5 → 6)

1. **`list_errors`** — display numbered list, wait for user selection
2. **`select_script(error=<exact_string>)`** — error path: searches `errors` column; exact then fuzzy
3. **Handle selection result:**
   - If `selection_needed=False`: one script found, proceed automatically
   - If `selection_needed=True`: present ALL options including index=0 (ALL), wait for explicit selection
4. **`build_context_rich_query`** with the exact error string (unmodified) and `script_selection=N`
   - Pass `script_selection=0` when user chose ALL
5. **Stage 5 helpers** (MANDATORY — no user prompt, automatic):
   - `extract_file_paths` → read each accessible collateral file with VS Code `read_file`
   - `search_log_context` → keywords: error code, key variable names, numeric values, design object names visible in context
   - `get_execution_timeline` → especially critical for orphan errors
6. **Stage 6 output** — deliver structured analysis using the template below

---

## Stage 6 Output Template — Error Path

```
## Analysis

### Summary:
[Lead with the key finding — what the log reveals about the error]

### Log-Level Analysis:
[Key log lines, what they indicate, script hierarchy context]

### Code-Level Analysis:
[Script-by-script code analysis, parent-child hierarchy, ivar changes]

### Collateral File Analysis:
[Findings from discovered constraint/config files — often the root cause]

### Correlation Analysis:
[Connections between log, code, ivars, and collateral files]

### Root Cause:
[Direct root cause of the error]

### Resolution / Recommendations:
[Specific actionable steps — file changes, variable corrections, etc.]
```

---

## Special Case: Orphan Errors

Errors marked `(orphan)` occur OUTSIDE any script execution. Handle by:

1. Call `build_context_rich_query` with the orphan error string
2. **Immediately** call `get_execution_timeline` (most critical for orphans — call it first among the helpers)
3. The timeline shows: `script_a ended at 12:34:27 → ORPHAN ERROR at 12:34:27 → script_b started at 12:34:27`
4. Investigate the transition logic between the bounding scripts
5. Note any ivar changes visible in the log around the transition window
6. Check discovered collateral files for the constraint or config that triggers the orphan condition

---

## Special Case: Fail / Skip Files (`.fail`, `.skipped_fail`)

When the user provides a `.fail` or `.skipped_fail` file instead of a log:

1. **Read the file** with VS Code `read_file` — its lines are the error/check list for this stage run
2. **Derive the stage log automatically** — strip all suffixes from the filename stem:
   - `cts.skipped_fail` → stage `cts` → log file `fc.cts.log` in the same directory
   - `route_opt.fail` → stage `route_opt` → log file `fc.route_opt.log`
   - Never ask the user for the log path; derive it and confirm in your response
3. **Treat each line of the fail file as a candidate error string** — run `list_errors` on the derived log to get the actual error list, then match fail-file entries to logged errors
4. **If a fail-file entry doesn't appear in `list_errors`**: it may be a check name rather than a verbatim error string — use it as the keyword for `search_log_for_query` to find the relevant log context
5. Continue the standard Error Path from Stage 2a onwards using the derived log
