# Constitution: MCP Tools

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)
> Load this file when creating or modifying MCP tools.

---

## Mandatory

### Tool Naming

| Attribute | Requirement |
|---|---|
| Format | `snake_case`, action-oriented |
| Pattern | `{cheetah_tool}_{function}` (e.g. `hsd_create_issue`, `vcs_debug`) |
| Max length | 32 characters |

Prefix with the service context to prevent naming collisions across servers.

### Tool Input and Output Typing

All tool inputs **must** use a Pydantic v2 `BaseModel` with `Field(description=...)` on every parameter. This is how MCP generates the tool's input schema for the LLM.

All tool return values **must** have a type annotation (`-> str`, `-> dict`, etc.).

Pydantic v1 → v2 migration:

| Deprecated (v1) | Required (v2) |
|---|---|
| Nested `Config` class | `model_config = ConfigDict(...)` |
| `@validator` | `@field_validator` with `@classmethod` |
| `.dict()` | `.model_dump()` |

Complete example:
```python
from typing import Optional
from pydantic import BaseModel, Field
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer

mcp = AutobotsMCPStdioServer("cth_example_service")

class UserSearchInput(BaseModel):
    query: str = Field(..., description="Search string (e.g. 'john', 'team:marketing')")
    limit: Optional[int] = Field(default=20, description="Max results to return")

@mcp.tool(name="example_search_users")
async def example_search_users(params: UserSearchInput) -> str:
    '''Search for users by name, email, or team.'''
    results = await do_search(params.query, params.limit)
    return format_results(results)
```

### Tool Docstrings

Every tool must have a **comprehensive docstring**. Include:
- **Purpose** — what the tool does and when to use it
- **Args** — each parameter with type, description, and example values
- **Returns** — the response shape and meaning
- **Examples** — "use when" and "do not use when" guidance
- **Error handling** — what error strings may be returned

```python
async def search_users(params: UserSearchInput) -> str:
    '''Search for users by name, email, or team.

    This tool searches across all user profiles. It does NOT create or
    modify users, only searches existing ones.

    Args:
        params (UserSearchInput): Validated input parameters containing:
            - query (str): Search string (e.g. "john", "team:marketing")
            - limit (Optional[int]): Max results, 1-100 (default: 20)
            - offset (Optional[int]): Pagination offset (default: 0)

    Returns:
        str: JSON with keys: total, count, offset, users[{id, name, email}]

    Examples:
        - Use when: "Find all marketing team members" -> query="team:marketing"
        - Don't use when: You have a user ID already (use get_user instead)

    Error Handling:
        - "Error: Rate limit exceeded" on 429
        - "Error: Invalid API authentication" on 401
    '''
```

### No Duplication Across Servers

Do not define the same logical tool in multiple MCP servers. Each capability must have a single canonical owner.

### Async for I/O

Use `async`/`await` for all network and I/O operations. Never use blocking libraries (e.g. `requests`) in a tool handler — it stalls the entire server event loop.

```python
# Correct
async def fetch_data(resource_id: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/resource/{resource_id}")
        response.raise_for_status()
        return response.json()

# Prohibited — blocks the event loop
def fetch_data(resource_id: str) -> dict:
    response = requests.get(f"{API_URL}/resource/{resource_id}")
    return response.json()
```

---

## Recommended

### Advanced Input Validation

Harden Pydantic input models with `ConfigDict`, field constraints, and custom validators:

```python
from pydantic import BaseModel, Field, ConfigDict, field_validator

class ServiceToolInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )
    param1: str = Field(..., description="First parameter", min_length=1, max_length=100)
    param2: Optional[int] = Field(default=None, description="Optional integer", ge=0, le=1000)

    @field_validator('param1')
    @classmethod
    def validate_param1(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("param1 cannot be empty or whitespace only")
        return v
```

### Structured Output Types

Use `TypedDict` (preferred — lightweight, no runtime overhead) or Pydantic models for complex returns:

```python
from typing import TypedDict

class UserData(TypedDict):
    id: str
    name: str
    email: str

@mcp.tool()
async def get_user(user_id: str) -> UserData:
    '''Returns structured user data.'''
    return {"id": user_id, "name": "John Doe", "email": "john@example.com"}
```

### Response Formats

Support both human and machine consumers where useful:
- **Markdown** — headers, lists, human-readable timestamps
- **JSON** — complete structured data, consistent field names

### Tool Annotations

Use `@mcp.tool` decorator with annotations to declare behavioural hints:

| Annotation | Meaning |
|---|---|
| `readOnlyHint` | Tool does not modify the environment |
| `destructiveHint` | Tool performs destructive/irreversible operations |
| `idempotentHint` | Repeated calls have no additional effect |
| `openWorldHint` | Tool interacts with external entities |

### Pagination

For list-style tools, support `limit` and `offset` and return a consistent pagination envelope:

```json
{
  "total": 142,
  "count": 20,
  "offset": 0,
  "items": [],
  "has_more": true,
  "next_offset": 20
}
```

### Shared Error Handling

Use a shared helper for consistent, actionable error messages:

```python
def _handle_api_error(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        if e.response.status_code == 404:
            return "Error: Resource not found."
        if e.response.status_code == 403:
            return "Error: Permission denied."
        if e.response.status_code == 429:
            return "Error: Rate limit exceeded."
        return f"Error: API request failed with status {e.response.status_code}"
    if isinstance(e, httpx.TimeoutException):
        return "Error: Request timed out."
    return f"Error: Unexpected error: {type(e).__name__}"
```

### Complete Recommended Example

Full tool combining advanced validation, structured output, annotations, docstrings, and error handling:

```python
import asyncio
import os
from typing import Optional, TypedDict, List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer

server = AutobotsMCPStdioServer(name="cth_infra_disk_utils")

class DiskEntry(TypedDict):
    filesystem: str
    size: str
    used: str
    available: str
    use_percent: str
    mount: str

class DiskUsageResult(TypedDict):
    count: int
    entries: List[DiskEntry]

class DiskUsageInput(BaseModel):
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )
    path: str = Field(
        ...,
        description="Filesystem path to check (e.g. '/nfs/site/disks/my_disk')",
        min_length=1, max_length=4096
    )
    human_readable: Optional[bool] = Field(
        default=True,
        description="Show sizes in human-readable format (KB, MB, GB)"
    )

    @field_validator('path')
    @classmethod
    def validate_path(cls, v: str) -> str:
        if not os.path.isabs(v):
            raise ValueError("Path must be absolute")
        return v

def _handle_error(e: Exception) -> str:
    if isinstance(e, FileNotFoundError):
        return "Error: Path not found."
    if isinstance(e, PermissionError):
        return "Error: Permission denied."
    return f"Error: Unexpected error: {type(e).__name__}: {e}"

@server.tool(
    name="infra_check_disk_usage",
    annotations={
        "title": "Check Disk Usage",
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
        "openWorldHint": False
    }
)
async def infra_check_disk_usage(params: DiskUsageInput) -> DiskUsageResult:
    '''Check disk usage for a given filesystem path using df.

    Args:
        params (DiskUsageInput): Validated input parameters containing:
            - path (str): Absolute filesystem path
            - human_readable (Optional[bool]): Human-readable sizes (default: True)

    Returns:
        DiskUsageResult: Dict with keys: count, entries[{filesystem, size, used, available, use_percent, mount}]

    Examples:
        - Use when: "How much disk space is left on /nfs/site/disks/my_disk"
        - Don't use when: You need to find files (use infra_search_files instead)
    '''
    try:
        cmd = ["df"]
        if params.human_readable:
            cmd.append("-h")
        cmd.append(params.path)
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            return _handle_error(RuntimeError(stderr.decode().strip()))
        lines = stdout.decode().strip().split("\n")
        entries: List[DiskEntry] = []
        for line in lines[1:]:
            parts = line.split()
            if len(parts) >= 6:
                entries.append({
                    "filesystem": parts[0], "size": parts[1], "used": parts[2],
                    "available": parts[3], "use_percent": parts[4], "mount": parts[5]
                })
        return {"count": len(entries), "entries": entries}
    except Exception as e:
        return _handle_error(e)

if __name__ == "__main__":
    server.run()
```

---

## Mandatory Checklist (Tools)

| # | Rule |
|---|---|
| 6 | Tool name follows `{cheetah_tool}_{function}`, snake_case, ≤32 chars |
| 7 | Pydantic v2 `BaseModel` for inputs with `Field(description=...)` |
| 8 | Type-annotated return values on every tool |
| 9 | Comprehensive docstring on every tool |
| 10 | No tool duplication across servers |
| 11 | `async`/`await` for all I/O in tool handlers |
