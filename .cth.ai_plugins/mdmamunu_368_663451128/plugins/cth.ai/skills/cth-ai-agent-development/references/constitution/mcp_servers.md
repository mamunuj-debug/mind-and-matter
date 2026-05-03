# Constitution: MCP Servers

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)
> Load this file when creating or modifying MCP servers.

---

## Mandatory

### Server Naming

| Attribute | Requirement |
|---|---|
| Format | `cth_{domain}_{service}` (lowercase, underscores) |
| Max length | 32 characters |
| Examples | `cth_sd_floorplan`, `cth_infra_netbatch`, `cth_fe_rtl_generation` |

The name must be:
- General — not tied to a specific feature or version
- Descriptive of the tool/API being integrated
- Easy to infer from a task description
- Free of version numbers, dates, or abbreviations unknown to the LLM

Domain prefixes: DIAS → `infra`, CDS → `custom`, `dteg`, `dmt`, etc. DDI → `sd`, FES → `fe`.

### Startup Time

Server startup must not exceed **3 seconds**.
- Import heavy libraries inside the tool handler, not at module level
- Do not perform network calls or file I/O during server initialization

### No Python Warnings

Server code must produce **zero** `SyntaxWarning` or `DeprecationWarning` at runtime.

| Warning | Fix |
|---|---|
| Invalid escape sequence | Use raw strings (`r'\+'`) or double-escape (`'\\+'`) |
| `is not` with a literal | Use `!=` for value comparisons |

### Domain Isolation

- Each server exposes tools only from its own domain
- Vendor-specific tools must not appear in `autobots_common_agents`
- Netbatch tools must not appear in a CDS server, and vice versa

### Server Transport: stdio Only

All Cheetah MCP servers must use stdio transport via `AutobotsMCPStdioServer`. No other transport (SSE, WebSocket, etc.) is supported.

```python
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer

server = AutobotsMCPStdioServer(name="cth_infra_netbatch")

# ... define tools with @server.tool() ...

if __name__ == "__main__":
    server.run()
```

### Validation

```tcsh
cth.ai inspect --toolpath <toolpath>
```

---

## Recommended

### Startup Target: 1 Second

While 3 seconds is the hard maximum, aim for ≤1 second startup. Lazy-load all optional dependencies and defer initialization not needed for the server handshake.

### Lifespan Management

Use `asynccontextmanager` for resources that persist across requests:

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def app_lifespan():
    db = await connect_to_database()
    config = load_configuration()
    yield {"db": db, "config": config}
    await db.close()

mcp = AutobotsMCPStdioServer("cth_example_service", lifespan=app_lifespan)

@mcp.tool()
async def query_data(query: str, ctx: Context) -> str:
    '''Access lifespan resources through context.'''
    db = ctx.request_context.lifespan_state["db"]
    results = await db.query(query)
    return format_results(results)
```

---

## Mandatory Checklist (Servers)

| # | Rule |
|---|---|
| 1 | Server name follows `cth_{domain}_{service}`, ≤32 chars |
| 2 | Server startup does not exceed 3 s |
| 3 | Zero `SyntaxWarning` / `DeprecationWarning` in server code |
| 4 | Servers expose only their own domain's tools |
| 5 | stdio transport only via `AutobotsMCPStdioServer` |
