# Cth.ai Constitution — Index

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)

The constitution is split by topic for efficient loading. Load only the files relevant to your task.

## Validation (all topics)

```tcsh
cth.ai inspect --toolpath <toolpath>
```

## Topic Files

| Topic | File | Load when... |
|---|---|---|
| MCP Servers | [constitution/mcp_servers.md](./constitution/mcp_servers.md) | Creating/modifying MCP server.py |
| MCP Tools | [constitution/mcp_tools.md](./constitution/mcp_tools.md) | Creating/modifying @mcp.tool() functions |
| Skills | [constitution/skills.md](./constitution/skills.md) | Creating/modifying SKILL.md or skill directories |
| Agents & Subagents | [constitution/agents.md](./constitution/agents.md) | Creating/modifying .agent.md files |
| Prompts & Instructions | [constitution/prompts_and_instructions.md](./constitution/prompts_and_instructions.md) | Creating instructions.md, agent.md, or prompt files |
| mcp.json & File Layout | [constitution/mcp_json_and_layout.md](./constitution/mcp_json_and_layout.md) | Creating mcp.json or setting up directory structure |

## Full Mandatory Checklist

| # | Rule | Topic |
|---|---|---|
| 1 | Server name follows `cth_{domain}_{service}`, ≤32 chars | Servers |
| 2 | Server startup does not exceed 3 s | Servers |
| 3 | Zero `SyntaxWarning` / `DeprecationWarning` in server code | Servers |
| 4 | Servers expose only their own domain's tools | Servers |
| 5 | stdio transport only via `AutobotsMCPStdioServer` | Servers |
| 6 | Tool name follows `{cheetah_tool}_{function}`, snake_case, ≤32 chars | Tools |
| 7 | Pydantic v2 `BaseModel` for inputs with `Field(description=...)` | Tools |
| 8 | Type-annotated return values on every tool | Tools |
| 9 | Comprehensive docstring on every tool | Tools |
| 10 | No tool duplication across servers | Tools |
| 11 | `async`/`await` for all I/O in tool handlers | Tools |
| 12 | Agent and subagent names use snake_case | Agents |
| 13 | `.agent.md` tools match what is configured in the MCP environment | Agents |
| 14 | LLM-referenced tools exist in the agent's tools list | Agents |
| 15 | Agent has a `description` (1 sentence) and a sufficient `prompt` | Agents |
| 16 | Cross-domain tools consumed via `.agent.md`, not re-declared in `mcp.json` | Agents |
| 17 | Subagents use `*.subagent.agent.md` naming and `user-invokable: false` | Agents |
| 18 | Parent agents list subagents in `agents` and include `agent` in `tools` | Agents |
| 19 | Skill names use kebab-case, directory name matches `name` field | Skills |
| 20 | Every skill has a `SKILL.md` with `name` and `description` frontmatter | Skills |
| 21 | `mcp.json` uses env vars / `{TOOL_PATH}` — no hardcoded versions | Layout |
| 22 | Domain `mcp.json` only declares its own servers | Layout |
| 23 | Files follow the standard layout under `{TOOL_PATH}/autobots/` | Layout |

> Exceptions to mandatory rules require team agreement and must be documented.
