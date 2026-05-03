# Constitution: Agents and Subagents

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)
> Load this file when creating or modifying agents or subagents.

---

## Mandatory

### Agent Naming

Agent and subagent names must use `snake_case` in both the filename and the `name` frontmatter field.

| Artifact | Filename | `name` field |
|---|---|---|
| Agent | `feature_builder.agent.md` | `feature_builder` |
| Subagent | `codebase_researcher.subagent.agent.md` | `codebase_researcher` |

### Tool Availability

Every MCP tool referenced in `.agent.md` must be configured and available in the Cheetah tool's MCP setup. If a tool is listed in the agent but not present in the running environment, the agent will fail silently or produce errors.

### Tool Completeness

If the system prompt instructs the LLM to call a tool (e.g. `retrieve_result`), that tool must appear in the agent's `tools` list. An instruction without a matching tool definition is a runtime failure.

### Description and System Prompt

| Field | Requirement |
|---|---|
| `description` | Single sentence shown in chat window. Directs user on how to use the agent. |
| `prompt` | Sufficient context, constraints, and tool-usage guidance for the LLM. |

Both fields are **required**. An agent without a description is invisible to the user; an agent without a sufficient prompt will behave unpredictably.

### Cross-Domain Tool Usage

To use tools from another domain's MCP server, enable them via `.agent.md`. Do **not** re-declare the other domain's server in your own `mcp.json`.

### Subagents

Subagents are specialized agents that are **not user-invokable**. They can only be called by a parent agent.

**Naming:** `<name>.subagent.agent.md`

**Frontmatter:** Subagents must set `user-invokable: false`.

**Parent agent must:**
- Include `agent` in its `tools` list
- List allowed subagents by name in its `agents` property

Example subagent — `codebase_researcher.subagent.agent.md`:
```yaml
---
name: codebase_researcher
description: Research codebase patterns and gather context
user-invokable: false
tools: ['codebase', 'fetch', 'usages']
---
Research thoroughly using read-only tools. Return a summary of findings
including file paths, relevant patterns, and any risks identified.
```

Example parent agent — `feature_builder.agent.md`:
```yaml
---
name: feature_builder
description: Build features by researching first, then implementing
tools: ['agent', 'editFiles', 'terminalLastCommand']
agents: ['codebase_researcher']
handoffs:
  - label: Start Research
    agent: codebase_researcher
    prompt: Research the codebase for relevant patterns before implementing.
    send: false
---
You are a feature builder. For each task:
1. Use the codebase_researcher subagent to gather context and find relevant patterns.
2. Review the research findings.
3. Implement the code changes based on those findings.
```

**Handoffs** enable guided transitions between agents:

| Field | Description |
|---|---|
| `label` | Button text shown to the user |
| `agent` | Target agent name to switch to |
| `prompt` | Prompt text sent to the target agent |
| `send` | If `true`, auto-submits. Default `false` (user reviews first) |
| `model` | Optional model override for the handoff step |

---

## Recommended

### Wiki Documentation

Maintain a Wiki page listing all agents with:
- Agent name and one-line description
- Available capabilities
- Link to the `.agent.md` source

---

## Mandatory Checklist (Agents)

| # | Rule |
|---|---|
| 12 | Agent and subagent names use snake_case |
| 13 | `.agent.md` tools match what is configured in the MCP environment |
| 14 | LLM-referenced tools exist in the agent's tools list |
| 15 | Agent has a `description` (1 sentence) and a sufficient `prompt` |
| 16 | Cross-domain tools consumed via `.agent.md`, not re-declared in `mcp.json` |
| 17 | Subagents use `*.subagent.agent.md` naming and `user-invokable: false` |
| 18 | Parent agents list subagents in `agents` and include `agent` in `tools` |
