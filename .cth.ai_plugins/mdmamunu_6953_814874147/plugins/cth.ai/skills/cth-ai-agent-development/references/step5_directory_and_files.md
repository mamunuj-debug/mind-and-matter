# Step 5: Directory Structure and File Templates

## Full Directory Tree to Create

```
<sandbox_root>/
├── .gitignore
├── crt.pre.install
├── requirements.txt
├── tool.cth
└── autobots/
    ├── plugin.json                          # Agent plugin manifest (always required)
    ├── .mcp.json                            # VS Code MCP config (only if MCP server exists)
    ├── mcp.json                             # Cth.ai MCP config (only if MCP server created — Step 7)
    ├── prompts/
    │   ├── <agent_name>.instructions.md
    │   └── <agent_name>.agent.md              # Optional but recommended
    ├── skills/                              # Preferred — create skills first (Step 6)
    │   └── <skill_name>/
    │       ├── SKILL.md
    │       └── references/                  # Optional deep reference files
    └── <agent_name>/                        # Only if MCP server needed (Step 7)
        └── mcp/
            └── server.py
```

---

## File Templates

### .gitignore (Always Required)

Create at the sandbox root. This prevents `git add -A` from staging the virtual environment, bytecode caches, and other generated files during release.

```gitignore
# Virtual environment
.venv/

# Python bytecode
__pycache__/
*.py[cod]
*$py.class

# Distribution / packaging
*.egg-info/
*.egg
dist/
build/

# OS files
.DS_Store
Thumbs.db
```

Add any additional patterns as needed (e.g., project-specific build outputs, data files).

> **⚠️ `crt.pre.install` must NOT be listed in `.gitignore`.** It is a committed file required by `crt install`.

---

### crt.pre.install (Always Required)

This tcsh script automates virtual environment creation, SDK attachment, and shebang updates. It is:
- **Created in Step 4** with the Autobots SDK version hardcoded
- **Run by the agent** (`tcsh crt.pre.install`) to set up the local venv before the user tests
- **Called automatically** by `crt install` during release (receives the tool version as `$argv[1]`)

After creating the file, set its permission to executable:

```tcsh
chmod 755 crt.pre.install
```

Replace `<AUTOBOTS_SDK_VERSION>` with the output of `cth_query toolversion autobots_sdk`, and `<tool_name>` with the CRT tool name.

```tcsh
#!/usr/intel/bin/tcsh

set AUTOBOTS_SDK_VERSION = "<AUTOBOTS_SDK_VERSION>"
unsetenv PYTHONPATH
setenv PATH ${PATH}:/usr/lib/mit/bin/

setenv https_proxy proxy-chain.intel.com:912
setenv http_proxy proxy-chain.intel.com:912
/usr/intel/pkgs/python3/3.13.2/bin/python3 -m venv .venv
source .venv/bin/activate.csh
python3 -m pip install --upgrade pip --proxy proxy-chain.intel.com:912

# Install project dependencies if requirements.txt exists
if (-f requirements.txt) then
    python3 -m pip install -r requirements.txt --proxy proxy-chain.intel.com:912
endif

deactivate

if ($#argv >= 1) then
    echo "crt.pre.install: version argument = $argv[1]"
    setenv NEW_VIRTUAL_ENV_PATH "/p/hdk/pu_tu/prd/<tool_name>/$argv[1]/.venv"

    set activate_file = ".venv/bin/activate.csh"
    if (-f $activate_file) then
        set sed_expr = "s|setenv VIRTUAL_ENV .*|setenv VIRTUAL_ENV '$NEW_VIRTUAL_ENV_PATH'|"
        sed -i "$sed_expr" $activate_file
        echo "Updated VIRTUAL_ENV in $activate_file"
    endif
    set TOOL_INSTALL_PATH = "/p/hdk/pu_tu/prd/<tool_name>/$argv[1]"
else
    echo "No version argument — using local paths (sandbox testing)."
    set TOOL_INSTALL_PATH = `pwd`
endif

set AUTOBOTS_SDK_TOOL_PATH = "/p/hdk/pu_tu/prd/autobots_sdk/$AUTOBOTS_SDK_VERSION"
set AUTOBOTS_SDK_VENV_PATH = "$AUTOBOTS_SDK_TOOL_PATH/venv_autobots/lib/python3.13/site-packages"
echo "$AUTOBOTS_SDK_VENV_PATH" > .venv/lib/python3.13/site-packages/autobots_sdk.pth
echo "$AUTOBOTS_SDK_TOOL_PATH/" >> .venv/lib/python3.13/site-packages/autobots_sdk.pth
echo "autobots_sdk paths added successfully."

echo "Updating shebangs in .venv/bin..."
set histchars = ""
set VENV_PYTHON_PATH = "$TOOL_INSTALL_PATH/.venv/bin/python3"
foreach file (.venv/bin/*)
    if (-f $file && ! -l $file) then
        set first_line = `head -n 1 $file`
        if ("$first_line" =~ '#!'*) then
            sed -i "1s|^#!.*|#!$VENV_PYTHON_PATH|" $file
        endif
    endif
end
set histchars = "!^"
echo "Shebang updates completed."

echo "Virtual environment setup complete."
```

---

### requirements.txt (Always Required)

List any additional Python packages the agent needs beyond the Autobots SDK. `crt.pre.install` installs from this file automatically if it exists. Create the file even if no extra packages are needed — leave it empty or with a comment so the file is present for future use.

```txt
# Add project-specific Python dependencies here, one per line.
# Example:
# requests>=2.31.0
# pydantic>=2.0
```

---

### tool.cth

Create as an **empty file**. Do not add any content.

```tcsh
touch tool.cth
```

**IMPORTANT:** If `tool.cth` already exists in the sandbox, do NOT modify or overwrite it. Only create it if missing. Cth.ai setup uses its presence to register the tool.

### plugin.json (Always Required — Created After Steps 6–7)

The agent plugin manifest. Registers the agent with VS Code / Cth.ai. See [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#pluginjson).

**Create this file AFTER skills (Step 6) and MCP server (Step 7) are done**, so all component paths and metadata are known.

```json
{
    "name": "<tool_name>",
    "description": "<ONE-LINE SUMMARY — see description rules below>",
    "author": {
        "name": "<$USER>"
    },
    "repository": "<git_repo_url>",
    "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
    "category": "<front_end|back_end|infrastructure|miscellaneous>",
    "tags": ["<tag1>", "<tag2>"],
    "skills": "skills/",
    "agents": "prompts/",
    "mcpServers": ".mcp.json"
}
```

**Do NOT include:** `version`, `license`, `homepage`. These fields are intentionally omitted.

**Field rules:**

| Field | Rule |
|---|---|
| `name` | Must match the CRT tool name |
| `description` | One information-dense sentence — what it does, its capabilities, when to use it (max 1024 chars) |
| `author.name` | Value of `$USER` at creation time. Skip `email` and `url` |
| `repository` | GitHub repository URL for this tool (from CRT registration or user-provided) |
| `keywords` | 3–6 domain keywords from the agent's description (e.g., `["soc", "design", "drc", "synopsys"]`) |
| `category` | One of: `front_end`, `back_end`, `infrastructure`, `miscellaneous` (see table below) |
| `tags` | 2–4 descriptive tags (e.g., `["eda", "debug-workflow", "knowledge-base"]`) |
| `skills` | Always `"skills/"` |
| `agents` | `"prompts/"` — include if `.agent.md` files exist in `autobots/prompts/` |
| `mcpServers` | `".mcp.json"` — include **only** if an MCP server was created in Step 7. Omit entirely otherwise |

**Category assignment:**

| Category | Use when the agent deals with… |
|---|---|
| `front_end` | Front-end SOC design flows (RTL, logic design, synthesis, linting) |
| `back_end` | Back-end SOC design flows (place & route, timing, physical design, DRC/LVS) |
| `infrastructure` | Database queries, file/data management, running EDA tools, CI/CD, build systems |
| `miscellaneous` | Anything that does not fit the above categories |

> **⚠️ `description` is CRITICAL.** This single line is the only text VS Code / Cth.ai uses to decide when to surface the plugin.
>
> **Bad:** `"A plugin for design data."` (too vague, no capabilities listed)
>
> **Good:** `"Agent for querying Synopsys design data with MCP tools for KB search and flow analysis, skills for debug workflows and DRC procedures, and instructions for design rule interpretation."` (specific, lists MCP tools + skills + instructions, mentions domain keywords)

**Validate after creation:**

```tcsh
python3 -c "import json, sys; json.load(open('autobots/plugin.json')); print('plugin.json is valid JSON')"
```

### .mcp.json (Required When MCP Server Exists)

VS Code-compatible MCP configuration. Uses `mcpServers` as the top-level key (vs `servers` in `mcp.json`).

```json
{
    "mcpServers": {
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

**Relationship to `mcp.json`:**
- `.mcp.json` uses `"mcpServers"` (VS Code format); `mcp.json` uses `"servers"` (Cth.ai format)
- All server entries, paths, and env values are identical between both files
- When creating or updating one, always keep the other in sync

### mcp.json (Required When MCP Server Exists)

Cth.ai platform MCP configuration.

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
- All paths MUST use `{TOOL_PATH}` — never hardcode absolute paths
- Use `$ENV{VAR_NAME}` for environment variable references
- One server entry per agent/MCP server
- If using a venv, point `command` to venv python: `{TOOL_PATH}/.venv/bin/python3`

### instructions.md

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

**Format rules:**
- `applyTo` uses glob patterns relative to workspace root
- Use `'**'` to match all files (always-on)
- Use `'**/*.py'` to match only Python files
- Multiple patterns: `'**/*.yml,**/*.yaml'`

### agent.md

```yaml
---
name: <agent_name>
description: <One sentence — shown in the Copilot Chat agent picker>
tools: ['<mcp_server_name>', 'editFiles', 'terminalLastCommand']
agents: ['<subagent_name>']  # Optional
---
You are a <ROLE>. <System prompt with context, constraints, and tool-usage guidance.>
```

### SKILL.md (Optional, for skills)

```markdown
---
name: <skill_name>
description: <Clear description under 200 chars>
---

# <Skill Name>

## Overview
<What this skill does>

## Usage
<How to use it>
```

**Frontmatter rules:**
- `name`: lowercase with underscores
- `description`: focus on capabilities, under 200 characters

---

## Instructions.md Deep Dive

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

### Skill System Layers

```
Layer 1 — *.instructions.md     (router / persona)
  │  Auto-loaded when file matches applyTo glob
  │
  └── Layer 2 — SKILL.md        (knowledge / guardrails)
        │  Loaded on demand by trigger phrase
        │
        └── Layer 3 — reference/*.md  (deep reference)
              Loaded on demand when SKILL.md points to them
```

### Splitting Instructions

Split by file type, domain, folder, or operation type. All matching files are combined in context. Each file should be self-contained and non-contradictory.
