# Constitution: Prompts and Instructions

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md) and [VS Code Custom Instructions](https://code.visualstudio.com/docs/copilot/customization/custom-instructions)
> Load this file when creating instructions.md, agent.md, or prompt files.

---

## instructions.md

### Two Categories

| Category | File | Applied | Use For |
|---|---|---|---|
| Always-on | `.github/copilot-instructions.md` or `AGENTS.md` | Every chat request | Project-wide standards |
| File-scoped | `*.instructions.md` | When active file matches `applyTo` glob | Language/domain rules |

### What Instructions Do

Answer three questions for the AI:
1. **Who am I?** — What domain expertise do I have?
2. **What words activate me?** — Which user phrases belong to this domain?
3. **Where should I look?** — Which SKILL.md handles each intent?

Instructions do **not** contain step-by-step procedures — those live in SKILL.md.

### Template

```markdown
---
applyTo: '**'
---
You are an expert in <DOMAIN>.

When the user asks about <KEYWORDS>, use the <agent_name> MCP tools.

Available MCP tools:
- `tool_name_1`: Description of what it does
- `tool_name_2`: Description of what it does
```

### Format Rules

- `applyTo` uses glob patterns relative to workspace root
- Use `'**'` to match all files (always-on)
- Use `'**/*.py'` to match only Python files
- Multiple patterns: `'**/*.yml,**/*.yaml'`

### Splitting Instructions

Split by file type, domain, folder, or operation type. All matching files are combined in context. Each file should be self-contained and non-contradictory.

---

## chatmode.md (Deprecated — use .agent.md instead)

Chat modes define specialized conversation contexts with specific tools and models.

### Template

```markdown
---
description: <One-line description of what this mode does>
tools: ['<agent_name>']
model: Claude Sonnet 4
---
# <Agent Name> Mode

You are a specialized assistant for <DOMAIN>.
Use the <agent_name> MCP tools to answer queries.
```

### Rules

- `description` is shown in the Copilot dropdown — keep it concise
- `tools` lists the MCP server names this mode can access
- `model` is optional — defaults to the user's current model

---

## agent.md

Agent files define personas with tools, subagents, and handoffs. See [constitution/agents.md](./agents.md) for full rules.

### Template

```yaml
---
name: <agent_name>
description: <One sentence — shown in chat agent picker>
tools: ['<mcp_server_name>', 'editFiles', 'terminalLastCommand']
agents: ['<subagent_name>']  # Optional
---
You are a <ROLE>. <System prompt with context, constraints, and tool-usage guidance.>
```

---

## File Layout

| Artifact | Path | Naming |
|---|---|---|
| Instructions | `{TOOL_PATH}/autobots/prompts/*.instructions.md` | `<agent_name>.instructions.md` |
| Agents | `{TOOL_PATH}/autobots/prompts/*.agent.md` | `<agent_name>.agent.md` |
| Subagents | `{TOOL_PATH}/autobots/prompts/*.subagent.agent.md` | `<name>.subagent.agent.md` |
