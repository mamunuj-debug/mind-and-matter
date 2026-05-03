# Step 6: Create Skills

Skills are the **preferred approach** — create skills before considering an MCP server. Skills teach the LLM specialized capabilities and workflows, loaded on-demand when relevant.

> Full rules: see [constitution/skills.md](./constitution/skills.md)

---

## When to Create a Skill

Create a skill when the agent needs to:
- Teach domain-specific knowledge or workflows
- Provide step-by-step procedures the LLM can follow
- Bundle reference material that should load progressively (not all at once)

> **Prefer skills over MCP servers.** If the goal can be achieved with skills alone (knowledge, workflows, procedures), do NOT create an MCP server.

---

## Skill Directory Structure

```
<sandbox_root>/autobots/skills/<skill_name>/
├── SKILL.md                    # Required — skill definition
├── references/                 # Optional — deep reference files
│   ├── topic_a.md
│   └── topic_b.md
└── templates/                  # Optional — templates, scripts, resources
    └── template.yaml
```

---

## Naming Rules (Mandatory)

| Attribute | Requirement |
|---|---|
| Format | `kebab-case` (lowercase, numbers, hyphens; must not start or end with hyphens) |
| Directory name | **Must match** the `name` field in SKILL.md |
| Max length | 32 characters |
| Examples | `webapp-testing`, `netbatch-job-management`, `design-flow-debugging` |

---

## SKILL.md Template

```markdown
---
name: <skill_name>
description: <What the skill does and when to use it. Max 1024 chars.>
---

# <Skill Title>

## When to use this skill
- <Trigger condition 1>
- <Trigger condition 2>

## Process
1. <Step 1 instruction>
2. <Step 2 instruction>
3. <Step 3 instruction>

## Common issues
- **Issue A**: Explanation and fix
- **Issue B**: Explanation and fix
```

### Frontmatter Fields

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique identifier, kebab-case, must match parent directory name |
| `description` | Yes | What the skill does and when to invoke it. Max 1024 characters |
| `user-invokable` | No | If `false`, hides from `/` menu but still auto-loaded by the LLM |
| `disable-model-invocation` | No | If `true`, requires manual invocation via `/` slash command only |

---

## Loading Behaviour (Progressive Disclosure)

Skills use three layers to keep LLM context efficient:

```
1. Discovery    — LLM reads name + description from all skills (lightweight)
2. Instructions — when a request matches, the SKILL.md body loads into context
3. Resources    — additional files in the skill dir load only when referenced
```

This means:
- Keep `description` concise and keyword-rich (this is what triggers skill loading)
- Put detailed instructions in the SKILL.md body
- Put deep reference material in `references/*.md` files, linked from SKILL.md

---

## Skill System Layers

Skills fit into a three-layer architecture:

```
Layer 1 — *.instructions.md     (router / persona)
  │  Auto-loaded when active file matches applyTo glob
  │
  └── Layer 2 — SKILL.md        (knowledge / guardrails)
        │  Loaded on demand by trigger phrase
        │
        └── Layer 3 — reference/*.md  (deep reference)
              Loaded on demand when SKILL.md points to them
```

### How instructions.md routes to skills

The `instructions.md` file answers three questions:
1. **Who am I?** — What domain expertise do I have?
2. **What words activate me?** — Which user phrases belong to this domain?
3. **Where should I look?** — Which SKILL.md handles each intent?

Instructions do **not** contain step-by-step procedures — those live in SKILL.md.

---

## Example: Complete Skill

Directory: `autobots/skills/netbatch-job-debugging/`

**SKILL.md:**
```markdown
---
name: netbatch-job-debugging
description: Guide for debugging failing Netbatch jobs. Use when asked to investigate why a Netbatch job failed or is stuck.
---
# Netbatch Job Debugging

## When to use this skill
- A job has failed and the user wants to understand why.
- A job is stuck in PENDING and needs investigation.
- The user wants to check job logs for errors.

## Process
1. Use the `nb_get_job_status` tool to check the current job state.
2. Use the `nb_get_job_logs` tool to retrieve failure logs.
3. Look for common issues: missing environment variables, permission errors, resource limits.
4. Suggest a fix or resubmission command.

## Common issues
- **PENDING too long**: Check queue capacity and resource requests.
- **FAILED immediately**: Check environment setup and script path.
- **Timeout**: Consider splitting into smaller jobs or increasing the time limit.
```

Additional resources (scripts, templates, examples) can be placed alongside SKILL.md in the same directory and referenced via relative paths.

---

## Creating the Skill in This Workflow

After creating the directory structure (Step 5) and MCP server (Step 6):

1. **Create the skill directory:**
   ```tcsh
   mkdir -p autobots/skills/<skill_name>
   ```

2. **Create SKILL.md** with proper frontmatter and body content

3. **Optionally add reference files** in `references/` or `templates/` subdirectories

4. **Update `instructions.md`** (in `autobots/prompts/`) to route relevant queries to the skill

5. **Validate** — `cth.ai inspect` will check the skill directory structure
