# Step 7: Write the MCP Server (If Needed)

> Only create an MCP server if skills alone cannot fulfill the user's goal (e.g., runtime API calls, command execution, external system interaction).
>
> Constitution guardrails:
> - Servers: [constitution/mcp_servers.md](./constitution/mcp_servers.md)
> - Tools: [constitution/mcp_tools.md](./constitution/mcp_tools.md)
> - mcp.json: [constitution/mcp_json_and_layout.md](./constitution/mcp_json_and_layout.md)

## Required Import

**MUST use `AutobotsMCPStdioServer`** — do NOT use `FastMCP` directly.

```python
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer, Context
```

This is a drop-in replacement for FastMCP with added telemetry and agent tracking.

## Mandatory Rules (from Cth.ai Constitution)

### Server Naming
- Format: `cth_{domain}_{service}` (lowercase, underscores, ≤32 chars)
- Examples: `cth_sd_floorplan`, `cth_infra_netbatch`, `cth_fe_rtl_generation`
- Domain prefixes: DIAS → `infra`, CDS → `custom`, DDI → `sd`, FES → `fe`

### Startup Time
- Must not exceed **3 seconds** (aim for ≤1s)
- Import heavy libraries **inside tool handlers**, not at module level
- No network calls or file I/O during initialization
- Validate: `/p/hdk/pu_tu/prd/regression_agentic_ai_qa/latest/common/utils/check_mcp_ping_time.py -mcp_json $WORKAREA/.vscode/mcp.json -server <server_name>`

### Tool Naming
- Format: `{cheetah_tool}_{function}`, snake_case, ≤32 chars
- Examples: `hsd_create_issue`, `vcs_debug`

### Tool Inputs: Pydantic v2
- All inputs **must** use `BaseModel` with `Field(description=...)` on every parameter
- All return values **must** have type annotations

### Tool Docstrings
- Every tool **must** have a comprehensive docstring: Purpose, Args, Returns, Examples, Error Handling

### Async I/O
- Use `async`/`await` for all network and I/O operations
- Never use blocking libraries (e.g. `requests`) in tool handlers

### No Duplication
- Each capability must have a single canonical server — no duplicate tools across servers

### Domain Isolation
- Each server exposes tools only from its own domain

## Server Template

```python
#!/usr/bin/env python3
"""<Agent Name> MCP Server — <brief description>."""

from typing import Optional
from pydantic import BaseModel, Field
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer, Context

mcp = AutobotsMCPStdioServer(name="cth_<domain>_<service>")


class ToolInput(BaseModel):
    query: str = Field(..., description="The user's question or input")
    option: Optional[str] = Field(default=None, description="Optional parameter")


@mcp.tool(name="<tool_prefix>_<action>")
async def tool_name(params: ToolInput) -> str:
    """One-line description of what this tool does.

    This tool does X. It does NOT do Y.

    Args:
        params (ToolInput): Validated input parameters containing:
            - query (str): The user's question or input
            - option (Optional[str]): Optional parameter description

    Returns:
        str: Description of return format

    Examples:
        - Use when: "relevant user query"
        - Don't use when: "irrelevant query (use other_tool instead)"

    Error Handling:
        - "Error: ..." on failure condition
    """
    # Implementation here
    return "result"


if __name__ == "__main__":
    mcp.run()
```

## Migration from FastMCP

If converting existing code, change only the import lines:

```python
# BEFORE (FastMCP)
# from fastmcp import Context, FastMCP
# mcp = FastMCP(name="my_server")

# AFTER (AutobotsMCPStdioServer)
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer, Context
mcp = AutobotsMCPStdioServer(name="my_server")

# All @mcp.tool() decorators and function signatures remain the same
```

## mcp.json Entry

Each server.py needs a corresponding entry in `autobots/mcp.json`:

```json
{
  "servers": {
    "<agent_name>": {
      "type": "stdio",
      "command": "{TOOL_PATH}/.venv/bin/python3",
      "args": [
        "{TOOL_PATH}/autobots/<agent_name>/mcp/server.py"
      ],
      "env": {}
    }
  }
}
```

**Rules:**
- All paths MUST use `{TOOL_PATH}` placeholder — resolved by Cth.ai setup at runtime
- Use `$ENV{VAR_NAME}` for environment variable references
- If no venv needed, use `"command": "python"` (will use the SDK venv python)

## Multiple Servers

A single tool can have multiple MCP servers:

```json
{
  "servers": {
    "agent1": {
      "type": "stdio",
      "command": "{TOOL_PATH}/.venv/bin/python3",
      "args": ["{TOOL_PATH}/autobots/agent1/mcp/server.py"],
      "env": {}
    },
    "agent2": {
      "type": "stdio",
      "command": "{TOOL_PATH}/.venv/bin/python3",
      "args": ["{TOOL_PATH}/autobots/agent2/mcp/server.py"],
      "env": {}
    }
  }
}
```

## MCP Apps (Interactive UI)

For tools that return visual content (charts, tables, dashboards) in Cth.ai 2026.03+:

```python
@mcp.tool(app=True)
def my_visual_tool():
    """Returns an interactive UI rendered inside the chat."""
    # Return a PrefabApp for interactive rendering
    ...
```

Built on Prefab UI. Approaches: Prefab Apps (quickest), FastMCPApp (multi-tool), Generative UI (LLM-designed), Custom HTML (full control).

## Reference Links

- [Autobots SDK - Get Started](https://wiki.ith.intel.com/spaces/autobots/pages/4348054651/Get+Started)
- [MCP Design Patterns](https://wiki.ith.intel.com/spaces/autobots/pages/4386906662/MCP+Design+Patterns)
- [MCP.json correctness](https://wiki.ith.intel.com/pages/viewpage.action?pageId=4512251913#CheetahRequirements/Guidelines-Cheetahtoolversionhandlinginmcp.json)
