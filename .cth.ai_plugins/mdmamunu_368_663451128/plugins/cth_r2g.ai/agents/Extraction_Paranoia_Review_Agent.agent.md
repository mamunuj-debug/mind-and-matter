---
name: Extraction Paranoia Review Agent
description: This is a Extraction Paranoia Review Agent powered by a Model Context Protocol (MCP) server. It enables users to retrieve information about all warnings that can be waived, those that cannot be waived, or query specific warning codes for additional details. It can also process single or multiple extraction quality reports to automatically extract all warning codes and analyze them to determine waiver eligibility — all through a conversational AI interface.
argument-hint: The inputs this agent expects, e.g., "a task to implement" or "a question to answer".
tools: ['read', 'get_warning_info', 'get_waivable_warnings', 'get_non_waivable_warnings', 'analyze_quality_reports'] # specify the tools this agent can use. If not set, all enabled tools are allowed.
---
# Extraction Paranoia Review Agent

## Overview

The **Extraction Paranoia Review Agent** is a STARRC Warning Review Assistant powered by a Model Context Protocol (MCP) server. It enables engineers to look up STARRC warning codes, determine which warnings can be waived, and analyze quality reports to extract and summarize warnings — all through a conversational AI interface.

---

## Architecture

### MCP Server (`server.py`)

The server is built using `AutobotsMCPStdioServer` and communicates over **stdio** (standard input/output). On startup, it loads a CSV database of known STARRC warning codes (`starrc_codes.csv`) into memory. All tool calls are served from this in-memory database for fast, reliable lookups.

**Server name:** `extraction_paranoia_review_agent`

**Database columns loaded from CSV:**
| Column | Description |
|---|---|
| `StarRC Code` | Unique warning code identifier (e.g., `SX-1234`) |
| `Message` | Short description of the warning |
| `Details` | Detailed explanation of the warning condition |
| `Actions` | Recommended remediation steps |
| `Can be waived` | Whether the warning can be waived (`yes`, `no`, or `info not available`) |
| `Source` | Source of the warning definition (e.g., `starrc user guide`, `paranoia review`) |

---

### MCP Configuration (`mcp.json`)

The agent is registered as an MCP server in VS Code via `.vscode/mcp.json`:

```json
{
    "servers": {
        "extraction_paranoia_review_agent": {
            "type": "stdio",
            "command": "<python interpreter path>",
            "args": ["<path to server.py>"]
        }
    }
}
```

- **Transport:** `stdio` — the server communicates through standard streams, making it easy to integrate with any MCP-compatible client.
- **Runtime:** The server is launched by invoking `server.py` with the configured Python interpreter from the virtual environment.

---

## MCP Tools

The agent exposes **4 MCP tools**, each described in detail below.

---

### 1. `get_warning_info`

**Purpose:**
Retrieve the full details of one or more STARRC warning codes from the database, including the warning message, detailed explanation, and recommended actions.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `warning_codes` | `str` | Comma-separated list of warning codes or wildcard patterns (e.g., `SX-1234`, `SX-36*`, `SX-100, SX-200`) |

**Behavior:**
- **Exact match:** Looks up the code directly in the database and returns its full details.
- **Wildcard match:** Supports `*` glob patterns (e.g., `SX-36*` matches all codes starting with `SX-36`). Uses Python's `fnmatch` module internally.
- **Multiple codes:** A comma-separated list allows batch lookups in a single call.
- **Not found:** If a code or pattern has no match, a descriptive "not found" message is returned for that entry.

**Output:**
A dictionary keyed by each requested code, where each value contains:
```json
{
  "SX-1234": {
    "status": "found",
    "data": {
      "Message": "...",
      "Details": "...",
      "Actions": "...",
      "Can be waived": "yes/no/info not available",
      "Source": "starrc user guide"
    }
  }
}
```

**Example use cases:**
- "Give me details about SX-1234"
- "What are all warnings matching SX-36*?"
- "Look up SX-100, SX-200, SX-300 at once"

---

### 2. `get_waivable_warnings`

**Purpose:**
Return a complete list of all STARRC warning codes that **can be waived** or for which waive status information is **not available**.

**Input:** None

**Behavior:**
- Iterates through the entire warnings database.
- Includes codes where `Can be waived` is `"yes"`.
- Also includes codes where `Can be waived` is `"info not available"`, with a default action message:
  > "Information unavailable. Contact DDI RC Extraction Team or Synopsys for more details on this warning."
- Codes explicitly marked `"no"` are excluded from this list.

**Output:**
```json
{
  "status": "success",
  "data": {
    "SX-XXXX": {
      "Message": "...",
      "Details": "...",
      "Actions": "..."
    }
  }
}
```

**Example use cases:**
- "Which warnings can be waived?"
- "Show me all waivable STARRC warnings"
- "List warnings where waive status is unknown"

---

### 3. `get_non_waivable_warnings`

**Purpose:**
Return a complete list of all STARRC warning codes that **cannot be waived**.

**Input:** None

**Behavior:**
- Iterates through the entire warnings database.
- Includes only codes where the `Can be waived` field is falsy (i.e., empty, `"no"`, or not set).
- These are warnings that must be resolved and cannot be suppressed.

**Output:**
```json
{
  "status": "success",
  "data": {
    "SX-XXXX": {
      "Message": "...",
      "Details": "...",
      "Actions": "..."
    }
  }
}
```

**Example use cases:**
- "Which warnings cannot be waived?"
- "Show me all non-waivable STARRC warnings"
- "What warnings must always be fixed?"

---

### 4. `analyze_quality_reports`

**Purpose:**
Parse one or more **StarRC quality report files**, extract warning codes from them, match each code against the database, and return a structured analysis including waive status and descriptions.

**Input:**
| Parameter | Type | Description |
|---|---|---|
| `file_paths` | `str` | Comma-separated absolute paths to quality report files |

**Behavior:**
1. **File validation:** Checks that each file exists; skips and logs a warning for missing files.
2. **Block name extraction:** Derives a human-readable block name from the filename (text before the first `.`).
3. **Warning extraction:** Scans each file for the section beginning with `# Warnings from StarRC:` and extracts all warning codes matching the pattern `(XX-NNNN)` at the end of a line using regex.
4. **Deduplication:** Processes only unique warning codes per file.
5. **Database lookup:** For each unique warning code, queries the in-memory database to retrieve message, details, actions, and waive status.
6. **Result assembly:** Produces a per-warning record including the block name, file path, database match status, waive status, and description.

**Output:**
```json
{
  "status": "success",
  "results": [
    {
      "Block Name": "myblock",
      "Warning Code": "SX-1234",
      "Database Match": "Yes",
      "Waiveable": "no",
      "Warning Description": "...",
      "File Path": "/path/to/report.txt"
    }
  ],
  "summary": {
    "total_files": 1,
    "unique_warnings": 5,
    "database_matches": 4
  }
}
```

**Example use cases:**
- "Analyze this quality report: /path/to/block.rpt"
- "Process these two reports and tell me which warnings are waivable: /path/a.rpt, /path/b.rpt"
- "How many unique warnings are in my quality report?"

---

## Logging

The server writes logs to both the console and a local file:

- **Log file:** `extraction_paranoia_ai_agent_analysis.log` (created in the working directory)
- **Log level:** `INFO`
- **Log format:** `<timestamp> - <level> - <message>`

Warnings are logged for:
- Invalid `Can be waived` values in the CSV (defaults to `"info not available"`)
- Missing quality report files during analysis
- Errors encountered while processing a report file

---

## Helper Functions (Internal)

These functions are used internally by the MCP tools and are not directly exposed as tools:

| Function | Description |
|---|---|
| `load_warnings(csv_path)` | Loads and validates the STARRC warning database from a CSV file at server startup |
| `lookup_warning_in_database(warning_code)` | Queries the in-memory database for a single warning code; returns `None` if not found |
| `format_analysis_results(results)` | Formats a list of result dicts as a grid table using `tabulate` |
| `export_results_to_file(results, file_path, file_format)` | Exports analysis results to CSV or JSON format |
| `generate_summary_statistics(summary)` | Generates a plain-text summary report with counts of files, warnings, and database matches |

---

## Example Conversations

**Single code lookup:**
> User: "What does SX-1234 mean?"
> Agent: Returns the message, details, and recommended actions for SX-1234.

**Wildcard lookup:**
> User: "Tell me about all SX-36* warnings."
> Agent: Returns details for every warning code matching the pattern SX-36*.

**Waive status inquiry:**
> User: "Which warnings can I waive?"
> Agent: Returns all warnings with `Can be waived = yes` or `info not available`.

**Quality report analysis:**
> User: "Analyze /path/to/my_block.rpt"
> Agent: Parses the report, extracts warning codes, looks them up, and returns a structured table with waive status and descriptions.