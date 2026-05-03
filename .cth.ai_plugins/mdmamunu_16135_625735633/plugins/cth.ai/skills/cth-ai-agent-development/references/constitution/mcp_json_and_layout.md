# Constitution: mcp.json and File Layout

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)
> Load this file when creating or modifying mcp.json or the tool's directory structure.

---

## mcp.json Rules (Mandatory)

### No Hardcoded Versions

Do not hardcode versions or absolute paths. Use environment variables or `{TOOL_PATH}` placeholders.

Correct:
```json
{
  "servers": {
    "demo": {
      "type": "stdio",
      "command": "$ENV{AUTOBOTS_SDK_VENV_PATH}/bin/python",
      "args": ["{TOOL_PATH}/release/ade_utils/mcp/demo/server.py"]
    }
  }
}
```

Prohibited:
```json
{
  "servers": {
    "hello": {
      "type": "stdio",
      "command": "/p/hdk/pu_tu/prd/hello/0.4.2/.venv/bin/python",
      "args": ["/p/hdk/pu_tu/prd/hello/0.4.2/autobots/csv_analyzer/mcp/server.py"]
    }
  }
}
```

### Domain Boundary

A domain's `mcp.json` must only declare servers that belong to that domain. To consume tools from another domain, use the `.agent.md` mechanism (see [agents.md](./agents.md) → Cross-Domain Tool Usage).

### Matching mcp.json entry for a server

```json
{
  "servers": {
    "cth_infra_netbatch": {
      "type": "stdio",
      "command": "$ENV{AUTOBOTS_SDK_VENV_PATH}/bin/python",
      "args": ["{TOOL_PATH}/release/ade_utils/mcp/netbatch/server.py"]
    }
  }
}
```

---

## File Layout (Mandatory)

All artifacts must follow this directory structure:

```
{TOOL_PATH}/
  autobots/
    mcp.json                                            # MCP server declarations
    prompts/
      feature_builder.agent.md                          # User-facing agent
      feature_builder.instructions.md                   # Instructions
      codebase_researcher.subagent.agent.md             # Subagent (user-invokable: false)
    skills/
      netbatch_job_debugging/                           # Skill directory
        SKILL.md                                        # Skill definition
        references/                                     # Deep reference files
      workflow_automation/                              # Another skill
        SKILL.md
        templates/                                      # Skill resources
          pipeline_template.yaml
```

| Artifact | Path |
|---|---|
| MCP server config | `{TOOL_PATH}/autobots/mcp.json` |
| Agents (user-facing) | `{TOOL_PATH}/autobots/prompts/*.agent.md` |
| Instructions | `{TOOL_PATH}/autobots/prompts/*.instructions.md` |
| Subagents | `{TOOL_PATH}/autobots/prompts/*.subagent.agent.md` |
| Skills | `{TOOL_PATH}/autobots/skills/<skill_name>/SKILL.md` |

---

## Validation

```tcsh
cth.ai inspect --toolpath <toolpath>
```

---

## Mandatory Checklist (mcp.json & Layout)

| # | Rule |
|---|---|
| 21 | `mcp.json` uses env vars / `{TOOL_PATH}` — no hardcoded versions |
| 22 | Domain `mcp.json` only declares its own servers |
| 23 | Files follow the standard layout under `{TOOL_PATH}/autobots/` |
