# Constitution: Skills

> Source: [Cth.ai Constitution](https://wiki.ith.intel.com/spaces/Cthai/pages/4615867951/Cth.ai+Constitution.md)
> Load this file when creating or modifying skills.

---

## Mandatory

### Skill Naming

| Attribute | Requirement |
|---|---|
| Format | `kebab-case` (lowercase, numbers, hyphens; must not start or end with hyphens) |
| Directory | Must match the `name` field in SKILL.md |
| Max length | 32 characters |
| Examples | `webapp-testing`, `github-actions-debugging`, `netbatch-job-management` |

### SKILL.md Structure

Each skill lives in its own directory under `{TOOL_PATH}/autobots/skills/` and must contain a `SKILL.md` with YAML frontmatter:

| Field | Required | Description |
|---|---|---|
| `name` | Yes | Unique identifier, kebab-case, must match parent directory name |
| `description` | Yes | What the skill does and when to use it. Max 1024 characters |
| `user-invokable` | No | If `false`, hides from `/` menu but still auto-loaded by the LLM |
| `disable-model-invocation` | No | If `true`, requires manual invocation via `/` slash command only |

Example:
```markdown
---
name: netbatch-job-debugging
description: Guide for debugging failing Netbatch jobs. Use when asked to investigate why a Netbatch job failed or is stuck.
---
# Netbatch Job Debugging

## When to use this skill
- A job has failed and the user wants to understand why.
- A job is stuck in PENDING and needs investigation.

## Process
1. Use the `nb_get_job_status` tool to check the current job state.
2. Use the `nb_get_job_logs` tool to retrieve failure logs.
3. Look for common issues: missing environment variables, permission errors, resource limits.
4. Suggest a fix or resubmission command.
```

### Loading Behaviour

Skills use **progressive disclosure** to keep context efficient:
1. **Discovery** — the LLM reads `name` and `description` from all skills (lightweight)
2. **Instructions** — when a request matches, the SKILL.md body loads into context
3. **Resources** — additional files in the skill directory load only when referenced

### Hierarchical Skill Structure

Skills should be hierarchical with progressive disclosure:

```
<skill_name>/
├── SKILL.md                    # Main entry — workflow steps, decision logic
├── references/                 # Deep reference loaded on demand
│   ├── topic_a.md
│   └── topic_b.md
└── templates/                  # Templates, scripts, resources
    └── template.yaml
```

**Design principles:**
- SKILL.md contains the workflow/decision tree — not all details
- Reference files contain deep knowledge, loaded only when SKILL.md points to them
- Keep `description` concise and keyword-rich (this triggers skill loading)
- Put step-by-step procedures in the SKILL.md body
- Put lengthy reference material in `references/*.md`, linked from SKILL.md

### Skill System Layers

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

---

## Validation

```tcsh
cth.ai inspect --toolpath <toolpath>
```

---

## Mandatory Checklist (Skills)

| # | Rule |
|---|---|
| 19 | Skill names use kebab-case, directory name matches `name` field |
| 20 | Every skill has a `SKILL.md` with `name` and `description` frontmatter |
