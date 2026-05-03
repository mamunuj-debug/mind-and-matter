---
name: cth-ai-agent-development
description: Complete guide for building, auditing, migrating, and updating agents and skills in the Cth.ai (Cheetah AI) platform. Covers directory structure, sandbox creation, MCP servers, virtual environments, prompt/instruction/agent files, skill authoring, plugin.json, and the release process. Use when user wants to create a new agent, build an MCP server, audit/improve an existing agent, migrate an agent to Cheetah standards, or update specific agent files.
---

# Building and Releasing Agents in Cth.ai

This skill supports multiple workflows for Cth.ai agents. **Read this routing section first** to determine which workflow to follow.

> **⚠️ SHELL: All commands in this skill are `tcsh`, NOT `bash`.**
>
> The Cth.ai environment uses `tcsh` as the default shell. Every shell command shown in this skill — `cd`, `source`, `set`, `setenv`, `ls`, etc. — must be executed as `tcsh` syntax. **Do NOT translate commands to `bash` syntax** (e.g., do NOT use `export`, `$()`, `source .venv/bin/activate` without `.csh` suffix, etc.).
>
> If you need help with `tcsh` syntax or shell commands, refer to the `linux-shell-environment` skill.

> **⚠️ CRITICAL: `tcsh` does NOT support multi-line commands.**
>
> **NEVER use backslash (`\`) line continuations in `tcsh`.** They will silently fail or produce incorrect results.
>
> **Rules:**
> - **Always write commands on a single line**, no matter how long.
> - If a command is too complex for a single line, **write it to a `.sh` file and execute/source it** instead.
> - This applies to ALL commands: `crt`, `cth_psetup`, `git`, `python`, etc.
>
> **Bad (WILL FAIL):**
> ```
> crt mkSbox \
>   -tool my_tool \
>   -type cheetah_unlocked
> ```
>
> **Good:**
> ```tcsh
> crt mkSbox -tool my_tool -type cheetah_unlocked -name $USER -target my_tool --force
> ```
>
> **Also good (for complex commands):**
> ```tcsh
> echo '#!/bin/sh' > /tmp/run_cmd.sh
> echo 'crt mkSbox -tool my_tool -type cheetah_unlocked -name $USER -target my_tool --force' >> /tmp/run_cmd.sh
> sh /tmp/run_cmd.sh
> ```

---

## Workflow Routing — Determine the Entry Point

Based on the user's request, choose **one** of the following workflows:

### Mode A: Create New Agent

**Trigger:** User says "create an agent", "build a new tool", "set up a Cth.ai agent", or has no existing agent directory.

→ Go to [Required User Input (New Agent)](#required-user-input-new-agent), then follow Steps 1–10 in order.

### Mode B: Audit / Migrate Existing Agent

**Trigger:** User says "audit my agent", "improve my agent", "migrate to Cheetah standards", "check my agent", or provides a path to an existing agent and wants it brought up to standard.

**Required from user:** The path to the existing agent directory.

**Workflow:**

1. **Run inspect** — `cth.ai inspect --toolpath <agent_path>` to get a full report of what passes, what fails, and what's missing.
2. **Review the report** — Present the findings to the user. Categorize as:
   - **Errors** — must fix (e.g., missing `plugin.json`, malformed JSON, missing mandatory keys)
   - **Warnings** — optional files not found (e.g., no `mcp.json`, no `prompts/`, no `skills/`)
   - **Passed** — already compliant
3. **Present a remediation plan** — List exactly what will be created or fixed, mapped to the step references below:

   | Gap Found | Action | Reference Step |
   |---|---|---|
   | No `plugin.json` | Create it | [Create plugin.json](#after-steps-6-7-create-pluginjson) |
   | `plugin.json` missing keys | Add mandatory keys (`name`, `description`, `category`) | [Create plugin.json](#after-steps-6-7-create-pluginjson) |
   | No `.gitignore` | Create it | [Step 5](#step-5-create-directory-structure-and-files) |
   | No `crt.pre.install` | Create it + run it | [Step 4](#step-4-set-up-virtual-environment) |
   | No `requirements.txt` | Create it (empty or with deps) | [Step 5](#step-5-create-directory-structure-and-files) |
   | No `mcp.json` / bad structure | Create or fix it | [Step 7](#step-7-rationalize-and-write-mcp-server) |
   | MCP server naming violations | Rename servers/tools | [Step 7](#step-7-rationalize-and-write-mcp-server) |
   | No `prompts/` or bad prompts | Create or fix prompt files | [Step 5](#step-5-create-directory-structure-and-files) |
   | No `skills/` or bad skills | Create or fix skills | [Step 6](#step-6-create-skills) |
   | No `.venv` | Create `crt.pre.install` and run it | [Step 4](#step-4-set-up-virtual-environment) |
   | No `tool.cth` | Create it (empty file) | [Step 5](#step-5-create-directory-structure-and-files) |

4. **Wait for user confirmation**, then execute the fixes using the referenced steps.
5. **Re-run inspect** to verify all issues are resolved.
6. **Tell user how to test** — [Step 9](#step-9-tell-user-how-to-test).

### Mode C: Update Specific Component

**Trigger:** User says "update my MCP server", "add a skill", "fix my plugin.json", "add a new tool to my agent", or any request targeting a specific file/component.

**Required from user:** The path to the existing agent directory and what they want changed.

**Workflow:**

1. **Read the relevant existing files** to understand current state.
2. **Apply the change** using the appropriate step reference:

   | User Request | Reference |
   |---|---|
   | Update/add MCP server or tools | [Step 7](#step-7-rationalize-and-write-mcp-server) + constitution docs |
   | Add/update a skill | [Step 6](#step-6-create-skills) |
   | Fix/create plugin.json | [Create plugin.json](#after-steps-6-7-create-pluginjson) |
   | Update prompts/instructions | [Step 5](#step-5-create-directory-structure-and-files) |
   | Fix venv / crt.pre.install | [Step 4](#step-4-set-up-virtual-environment) |
   | Release the agent | [Step 10](#step-10-release) |

3. **Run inspect** — [Step 8](#step-8-inspect-with-cthai) to validate.
4. **Inform the user** of what changed and how to test.

> **For Mode B and C:** Steps 1–3 (CRT registration, directory creation, sandbox creation) are **skipped** — the agent already exists.

---

## Required User Input (New Agent)

Before starting a **new agent** (Mode A), gather from the user:
1. **Goal/Objective** — What the agent should do (e.g., "query Synopsys tool KBs", "manage design flows")
2. **Tool name** — CRT tool name. If the user doesn't have one, we create it.
3. **Tool type** *(optional)* — CRT tool type. Defaults to `cheetah_unlocked`. If the user explicitly says `cheetah_cad`, use `cheetah_cad` instead. Do NOT ask — assume `cheetah_unlocked` unless told otherwise.
4. **Sandbox path** *(optional)* — Where to create the tool directory. Defaults to `$WORKAREA`.

---

## Present Plan to User (New Agent — Mode A)

After gathering all required input, **present the user with a complete plan** before executing any steps. Show them a numbered list of everything that will happen:

> **Here's the plan for building your agent `<tool_name>` (type: `<tool_type>`):**
>
> 1. **Check if CRT tool exists** — run `crt getToolInfo` to see if `<tool_name>` is registered
> 2. **Register tool** *(if needed)* — register `<tool_name>` as `<tool_type>` with `-repo <url>` or `-createrepo`
> 3. **Create tool directory** — create `<tool_name>/` at `<sandbox_path>` (or `$WORKAREA`)
> 4. **Create sandbox** — run `crt mkSbox` to create a development sandbox
> 5. **Set up virtual environment** — create Python venv with Autobots SDK
> 6. **Create directory structure** — set up `autobots/` tree with prompts, `.mcp.json`, and config files
> 7. **Create skills** — build SKILL.md files for the agent's domain knowledge
> 8. **Write MCP server** *(only if runtime actions are needed)* — create `server.py` with tool definitions
> 9. **Create plugin.json** — build the agent plugin manifest with description, category, keywords, and component paths
> 10. **Inspect** — validate plugin.json and the structure with `cth.ai inspect`
> 11. **Test instructions** — show you how to load and test the agent in VS Code
> 12. **Release** *(optional, not for sandbox)* — confirm with user, then git branch/commit/push and `crt install`

**Wait for the user to confirm the plan before proceeding to Step 1.**

---

## Step Index

| Step | Name | Required |
|---|---|---|
| 1 | [Check if CRT Tool Exists](#step-1-check-if-crt-tool-exists) | Yes |
| 2 | [Create Tool Directory](#step-2-create-tool-directory) | Yes |
| 3 | [Create Sandbox](#step-3-create-sandbox) | Yes |
| 4 | [Set Up Virtual Environment](#step-4-set-up-virtual-environment) | Yes |
| 5 | [Create Directory Structure and Files](#step-5-create-directory-structure-and-files) | Yes |
| 6 | [Create Skills](#step-6-create-skills) | Preferred — do this first |
| 7 | [Rationalize and Write MCP Server](#step-7-rationalize-and-write-mcp-server) | Only if skills alone are insufficient |
| — | [Create plugin.json](#after-steps-6-7-create-pluginjson) | Yes (after Steps 6–7) |
| 8 | [Inspect with cth.ai](#step-8-inspect-with-cthai) | Yes |
| 9 | [Tell User How to Test](#step-9-tell-user-how-to-test) | Yes |
| 10 | [Release](#step-10-release) | Only when user is ready to release (not for sandbox) |

> **Prefer skills over MCP servers.** If the user's goal can be achieved with skills (knowledge, workflows, procedures), create skills only. Add an MCP server only when the agent needs to execute code, call APIs, or interact with external systems at runtime.

---

## Workflow — Execute Steps In Order (Mode A: New Agent)

### Step 1: Check if CRT Tool Exists

Run from `$WORKAREA`:

```tcsh
cd $WORKAREA
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt getToolInfo -tool <tool_name>
```

**If tool exists**, output looks like:
```
-I- crt: Result = 
        Tool                                    <tool_name>
        Description                             ...
        Type                                    hdk_cad
        Classification                          confidential
        ...
```
→ Proceed to Step 2.

**If tool does NOT exist**, output looks like:
```
------Fatal Error------
-F- crt: Tool <tool_name> is not a known tool. Please ensure the tool is registered with appropriate type
```
→ Register it. See [references/step1_crt_registration.md](./references/step1_crt_registration.md)

> **⚠️ CRITICAL: Before running `crt register`:**
>
> 1. **Ask the user if they already have an existing GitHub repository** for this tool.
>    - **If yes:** collect the repo URL (e.g., `https://github.intel.com/org/repo`). The `-repo <url>` flag will be used instead of `-createrepo`. There is **no wait time** — proceed immediately to Step 2 after registration.
>    - **If no:** the `-createrepo` flag will be used to auto-create a repo. This takes **~30 minutes to up to 1 day** (see post-registration warnings below).
> 2. **Ask the user for explicit confirmation (yes/no).** Show them a summary of exactly what will happen:
>    - A CRT tool named `<tool_name>` of type `<tool_type>` (default: `cheetah_unlocked`) will be registered
>    - **If `-createrepo`:** A GitHub repository will be created (this takes **~30 minutes to up to 1 day**)
>    - **If `-repo <url>`:** The existing repository will be linked (no wait time)
>    - An HSD-ES ticket will be created automatically
>    - **Manager approval is required** before the first release (first or second level manager must run `crt approve` or visit `goto/crt_approval_page`). Sandbox development can proceed without approval.
> 3. **Do NOT run `crt register` until the user explicitly says yes.**
> 4. After registration succeeds:
>    - **If `-repo <url>` was used:** Proceed immediately to Step 2. No wait time needed.
>    - **If `-createrepo` was used:** **Warn the user:**
>      - The GitHub repository is NOT ready immediately. It takes **~30 minutes to up to 1 day** depending on the GitHub server.
>      - Repo owners will receive an email with subject like: **"Repository https://github.com/intel-innersource/.../<tool_name>.repo was successfully created for <tool_name> of type <tool_type>"** — tell the user to watch for this email.
>      - Until the repo is ready, `crt mkSbox` **will fail**. This is expected — **wait and retry later**.
>      - **To check repo status**, run:
>        ```
>        crt getToolInfo -tool <tool_name> | grep Repository
>        ```
>        - `Repository    IN_PROGRESS` → repo is still being created. **Do NOT proceed.** Wait for the email.
>        - `Repository    https://github.com/...` → repo is ready. Proceed to Step 2.

---

### Step 2: Create Tool Directory

Navigate to the target location, then create the tool directory:

**If user provided a path:**
```tcsh
cd <user_provided_path>
mkdir <tool_name>
```

**If user did NOT provide a path (default):**
```tcsh
cd $WORKAREA
mkdir <tool_name>
```

This directory will be the target for the sandbox in the next step.

---

### Step 3: Create Sandbox

Run from `$WORKAREA` (or the parent directory containing `<tool_name>/`):

```tcsh
cd $WORKAREA
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt mkSbox -tool <tool_name> -type <tool_type> -name $USER -target <tool_name> --force
```

> **Note:** `<tool_type>` defaults to `cheetah_unlocked`. Use `cheetah_cad` only if the user explicitly requested it.

This creates a `${USER}_sbox` sandbox inside `<tool_name>/`. The sandbox path becomes the working directory for all subsequent steps.

> **⚠️ Sandbox population takes ~10 minutes.** After `crt mkSbox` succeeds, the system creates a symlink at `/p/cth/pu_tu/prd/<tool_name>/${USER}_sbox` that points to `$WORKAREA/<tool_name>`. This symlink is **required** — Cth.ai setup (`cth_psetup`) will fail without it.
>
> **Before proceeding to Step 4 or telling the user to test**, verify the symlink exists:
>
> ```tcsh
> ls -l /p/cth/pu_tu/prd/<tool_name>/${USER}_sbox
> ```
>
> - **If the symlink exists** (output shows `-> $WORKAREA/<tool_name>`): proceed to the next step.
> - **If the symlink does NOT exist yet**: either poll every 60 seconds until it appears, or alert the user:
>   > The sandbox symlink at `/p/cth/pu_tu/prd/<tool_name>/${USER}_sbox` is not ready yet. This typically takes ~10 minutes after `crt mkSbox`. Cth.ai setup will fail until this symlink is created. Please wait and retry.

> **⚠️ CRITICAL: If `crt mkSbox` fails, do NOT proceed to create the tool directory, agent files, or any subsequent steps. You MUST have a successful `crt mkSbox` before continuing.**
>
> **Error pattern 1 — repo not found:**
> ```
> ------Fatal Error------
> -F- crt: Failed to find clone url for tool <tool_name> with type <tool_type>.
>     Seems like your tool doesn't have registered repo.
>     Please, use 'crt updateToolInfo -tool <> -type <> -createrepo' if you need
>     to register a repository for the tool
> ```
> **Before re-registering**, check whether a repo creation is already in progress:
> ```
> crt getToolInfo -tool <tool_name> | grep Repository
> ```
> - If it shows `Repository    IN_PROGRESS` — the repo **is already registered** but still being created. **Do NOT re-register.** Wait for the confirmation email and retry `crt mkSbox` later.
> - If it shows **no Repository line at all** or the tool is not found — the tool truly has no repository. Go back to Step 1 and register the tool with `-createrepo` or `-repo <url>`.
>
> **Do NOT proceed to subsequent steps in either case.**
>
> **Error pattern 2 — repo creation in progress:**
> ```
> -E- crt: Failed to parse repository URL, make sure it's a Github repository
>     and please be patient if the repo creation is in progress.
> ```
> This means the GitHub repository from Step 1 registration **is not ready yet**. This only applies if `-createrepo` was used during registration. If `-repo <url>` was used, this error should not occur — debug the repo URL instead.
>
> **Action for both errors:** **STOP. Do NOT proceed to Step 4 or any subsequent steps.** Alert the user:
>
> > The GitHub repository for `<tool_name>` is not available yet. Sandbox creation cannot proceed without it.
> >
> > **To check the current status**, run:
> > ```
> > crt getToolInfo -tool <tool_name> | grep Repository
> > ```
> > - If it shows `IN_PROGRESS` — the repo is still being created. **Wait for the confirmation email.**
> > - If it shows a GitHub URL (e.g., `https://github.com/intel-innersource/...`) — the repo is ready. Re-run `crt mkSbox`.
> >
> > You will receive an email with subject like: **"Repository https://github.com/intel-innersource/.../<tool_name>.repo was successfully created for <tool_name> of type <tool_type>"** once the repo is ready.
> >
> > Please retry `crt mkSbox` after you receive that email.

---

### Step 4: Set Up Virtual Environment

The venv setup is automated via `crt.pre.install` — a tcsh script that creates `.venv`, installs dependencies, and attaches the Autobots SDK. This script is also called automatically by `crt install` during release. See [references/step4_venv_setup.md](./references/step4_venv_setup.md) for details.

**4a. Discover the current Autobots SDK version:**

```tcsh
cth_query toolversion autobots_sdk
```

Note the version string (e.g., `3.1.0`). This will be hardcoded into `crt.pre.install`.

**4b. Create `crt.pre.install`** at the sandbox root (`<tool_name>/crt.pre.install`).

Use the template from [references/step5_directory_and_files.md](./references/step5_directory_and_files.md), replacing `<AUTOBOTS_SDK_VERSION>` with the version from 4a and `<tool_name>` with the CRT tool name. Then set the file permission:

```tcsh
chmod 755 <tool_name>/crt.pre.install
```

**4c. Run it to create the local venv:**

Run the script yourself — do NOT ask the user to run it. This ensures the venv is ready before testing.

```tcsh
cd <tool_name>
tcsh crt.pre.install
```

**4d. Validate:**

```tcsh
source .venv/bin/activate.csh
python -c "import autobots_sdk; print('SDK import OK')"
```

---

### Step 5: Create Directory Structure and Files

Create the required autobots directory tree and all mandatory files inside the sandbox. See [references/step5_directory_and_files.md](./references/step5_directory_and_files.md) for the complete structure, templates, and file contents.

Summary of what to create:

```
<tool_name>/
├── .gitignore                         # Git ignore rules (venv, pycache, etc.)
├── crt.pre.install                    # Venv setup script (created in Step 4)
├── requirements.txt                   # Python dependencies (may be empty)
├── autobots/
│   ├── plugin.json                    # Agent plugin manifest (always required)
│   ├── .mcp.json                      # VS Code MCP config (only if MCP server exists)
│   ├── mcp.json                       # Cth.ai MCP server config (only if Step 7 applies)
│   ├── prompts/                       # Prompt/instruction/agent files
│   │   └── <agent_name>.instructions.md
│   ├── skills/                        # Agent skills
│   │   └── <skill_name>/
│   │       └── SKILL.md
│   └── <agent_name>/                  # Only if MCP server needed (Step 7)
│       └── mcp/
│           └── server.py
└── tool.cth                           # Empty file (required for Cheetah registration)
```

**IMPORTANT:** If `tool.cth` already exists, do NOT modify or overwrite it. Only create it if missing.

#### .gitignore (Always Required)

Create `.gitignore` at the sandbox root to prevent committing generated/temporary files (venv, bytecode, etc.) when `git add -A` runs during release. See [references/step5_directory_and_files.md](./references/step5_directory_and_files.md) for the full template.

> **⚠️ `crt.pre.install` must NOT be in `.gitignore`.** It is a committed file that `crt install` calls during release.

#### plugin.json — Deferred to After Step 7

**Do NOT create `plugin.json` here.** It requires knowledge of which skills were created (Step 6) and whether an MCP server exists (Step 7). It will be created after Step 7 — see [Create plugin.json](#after-steps-6-7-create-pluginjson).

#### .mcp.json (Required When MCP Server Exists)

Create `autobots/.mcp.json` — this is the VS Code-compatible MCP configuration. It is identical to `mcp.json` except the top-level key is `mcpServers` instead of `servers`.

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

**Relationship between `mcp.json` and `.mcp.json`:**
- `mcp.json` uses `"servers"` as the top-level key (Cth.ai platform format)
- `.mcp.json` uses `"mcpServers"` as the top-level key (VS Code format)
- All other content (server entries, paths, env) is identical
- Both files must be kept in sync — when you create or update one, create/update the other

---

### Step 6: Create Skills

**Do this step BEFORE considering an MCP server.** Skills are the preferred way to add capabilities.

Create skills when the agent needs to:
- Teach domain-specific knowledge or workflows
- Provide step-by-step procedures the LLM can follow
- Bundle reference material with progressive disclosure

See [references/step6_skills_creation.md](./references/step6_skills_creation.md) for the full guide.
Constitution guardrails: [references/constitution/skills.md](./references/constitution/skills.md)

Quick summary:

```tcsh
mkdir -p autobots/skills/<skill_name>
```

Create `autobots/skills/<skill_name>/SKILL.md`:
```markdown
---
name: <skill_name>
description: <What the skill does and when to use it. Max 1024 chars.>
---

# <Skill Title>

## When to use this skill
- <Trigger condition>

## Process
1. <Step instruction>
```

**Skills must be hierarchical:**
- SKILL.md contains the workflow/decision tree — not all details
- `references/*.md` contains deep knowledge, loaded only when SKILL.md points to them
- Keep `description` concise and keyword-rich (this triggers skill loading)

Key rules:
- `name` must be kebab-case and match the directory name (≤32 chars)
- Add `references/*.md` for deep reference material (loaded on demand)
- Update `instructions.md` to route relevant queries to the skill

---

### Step 7: Rationalize and Write MCP Server

**Before writing an MCP server, ask:** Can the user's goal be achieved with skills alone?

| User Goal | Approach |
|---|---|
| Teach knowledge, workflows, procedures | **Skills only** — no MCP server needed |
| Query/search existing data at runtime | MCP server needed |
| Execute commands or call APIs | MCP server needed |
| Interact with external systems (netbatch, HSD, etc.) | MCP server needed |
| Combination of knowledge + runtime actions | Skills + MCP server |

**If MCP server IS needed**, create `autobots/<agent_name>/mcp/server.py` using `AutobotsMCPStdioServer`.

See [references/step7_mcp_server.md](./references/step7_mcp_server.md) for the full template, patterns, and examples.
Constitution guardrails: [references/constitution/mcp_servers.md](./references/constitution/mcp_servers.md) and [references/constitution/mcp_tools.md](./references/constitution/mcp_tools.md)

Key rules:
- **MUST** use `AutobotsMCPStdioServer`, NOT `FastMCP`
- Server name format: `cth_{domain}_{service}` (≤32 chars)
- Tool name format: `{cheetah_tool}_{function}`, snake_case (≤32 chars)
- Use Pydantic v2 `BaseModel` with `Field(description=...)` for all tool inputs
- Comprehensive docstrings on every tool (Purpose, Args, Returns, Examples, Error Handling)
- `async`/`await` for all I/O — never use blocking libraries
- Use `{TOOL_PATH}` in `mcp.json` paths — never hardcode absolute paths

**If MCP server is NOT needed**, skip this step — do not create `mcp.json` or `server.py`.

---

### After Steps 6–7: Create plugin.json

Now that skills and MCP server (if any) are created, build `autobots/plugin.json`. This is the agent plugin manifest — see [GitHub Copilot CLI plugin reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference#pluginjson) and [references/step5_directory_and_files.md](./references/step5_directory_and_files.md) for the full template.

**Mandatory fields:** `name`, `description`, `category`

```json
{
    "name": "<tool_name>",
    "description": "<ONE-LINE SUMMARY — see description rules below>",
    "author": {
        "name": "<$USER>"
    },
    "repository": "<git_repo_url>",
    "keywords": ["<keyword1>", "<keyword2>"],
    "category": "<front_end|back_end|infrastructure|miscellaneous>",
    "tags": ["<tag1>", "<tag2>"],
    "skills": "skills/",
    "agents": "prompts/",
    "mcpServers": ".mcp.json"
}
```

**Do NOT include:** `version`, `license`, `homepage`.

**Field rules:**

- `name`: Must match the CRT tool name.
- `description`: One information-dense sentence covering what the agent does, its capabilities (skills, MCP tools, instructions), and when to use it. This is the only text used to decide when to surface the plugin.
- `author.name`: Use the value of `$USER` at the time of creation. Skip `email` and `url`.
- `repository`: The GitHub repository URL for this tool (from CRT registration or user-provided).
- `keywords`: 3–6 domain keywords extracted from the agent's description (e.g., `["soc", "design", "drc", "synopsys"]`).
- `tags`: 2–4 descriptive tags (e.g., `["eda", "debug-workflow", "knowledge-base"]`).
- `skills`: Always `"skills/"`.
- `agents`: Include `"prompts/"` if `.agent.md` files exist in `autobots/prompts/`.
- `mcpServers`: Include `".mcp.json"` only if an MCP server was created in Step 7. **Omit this key entirely if no MCP server exists.**

**Category assignment:**

| Category | Use when the agent deals with… |
|---|---|
| `front_end` | Front-end SOC design flows (RTL, logic design, synthesis, linting) |
| `back_end` | Back-end SOC design flows (place & route, timing, physical design, DRC/LVS) |
| `infrastructure` | Database queries, file/data management, running EDA tools, CI/CD, build systems |
| `miscellaneous` | Anything that does not fit the above categories |

Use your best judgment based on the agent's description and skills.

**Validate the JSON after creation:**

```tcsh
python3 -c "import json, sys; json.load(open('autobots/plugin.json')); print('plugin.json is valid JSON')"
```

If validation fails, fix the syntax error and re-validate.

> **⚠️ `description` is CRITICAL.** This single line is the only text VS Code / Cth.ai uses to decide when to surface the plugin.
>
> **Bad:** `"A plugin for design data."` (too vague, no capabilities listed)
>
> **Good:** `"Agent for querying Synopsys design data with MCP tools for KB search and flow analysis, skills for debug workflows and DRC procedures, and instructions for design rule interpretation."` (specific, lists MCP tools + skills + instructions, mentions domain keywords)

---

### Step 8: Inspect with cth.ai

After creating everything, validate the structure:

```tcsh
cth.ai inspect --toolpath <sandbox_root_path>
```

The inspector checks in this order:
1. `autobots/` directory exists (mandatory)
2. `plugin.json` — valid JSON with mandatory keys `name`, `description`, `category` (mandatory)
3. `mcp.json` — valid JSON with `servers` key, naming conventions, paths (optional — warns if missing)
4. MCP tools — connects to servers, checks tool names and boot time (optional)
5. `prompts/` — file extensions, naming, frontmatter (optional — warns if missing)
6. `skills/` — directory names, `SKILL.md` presence, frontmatter (optional — warns if missing)

Expected output on success:

```
[1/6] Checking autobots directory...
[2/6] Checking plugin.json...
[3/6] Checking mcp.json...
[4/6] Checking mcp.json paths & MCP tools...
[5/6] Checking prompts...
[6/6] Checking skills...

✓ Tool structure is valid - no issues found!
```

If errors are reported, fix them and re-run inspect until clean. Warnings (⚠) are informational and do not block — they indicate optional files that were not found.

---

### Step 9: Tell User How to Test

After all files are created and inspection passes, instruct the user:

**9a. Exit current Cth.ai session** (if any).

**9b. Create a `cfg_ov.txt`** in their work area.

> **⚠️ The `cfg_ov.txt` syntax must be EXACTLY as shown below. Do NOT invent, modify, or reformat this syntax.** Incorrect syntax will cause `cth_psetup` to silently ignore the override.

```ini
[toolversion]
<tool_name> = ${USER}_sbox
```

The file must have:
- The header `[toolversion]` on its own line (literal text, square brackets included)
- One entry per line: `<tool_name> = ${USER}_sbox` (spaces around `=` are required)
- No quotes, no extra whitespace, no comments

**9c. Re-enter setup with the tool:**

First, check if the user's original setup command is available:

```tcsh
echo $CTH_SETUP_CMD
```

- **If `$CTH_SETUP_CMD` is set**, extract the `-p` value from it and use it in the command below.
- **If `$CTH_SETUP_CMD` is not set**, ask the user for their `-p <project>` value (e.g., `-p pesg/2026.03`).

Then run:

```tcsh
/p/hdk/bin/cth_psetup -p <user_project> -cfg <their_cfg>.cth -tool <tool_name> -cfg_ov <path_to>/cfg_ov.txt
```

> Replace `<user_project>` with the value from `$CTH_SETUP_CMD` or the user's input. Do NOT hardcode `pesg/2026.03`.

**9d. Verify in VS Code:**
- Check the agent appears in the Copilot Chat agent picker
- Test the MCP tools respond to queries (if MCP server was created)
- Skills are discoverable via `/` menu

**9e. Re-open VS Code without re-setup** (if GUI closes):
Type `code` or `vscode` in the original terminal.

---

### Step 10: Release

> **This step is NOT required for sandbox creation or testing.** Only proceed here when the user is ready to release the agent.

**10a. Confirm with the user before proceeding.**

Ask:
> Are you ready to release? This will create a new git branch, commit your changes, push, and run `crt install`. Proceed? (yes/no)

**Do NOT proceed until the user explicitly says yes.**

**10b. `cd` into the sandbox repo directory.**

All git and `crt install` commands must run from inside the sandbox repository, NOT from `$WORKAREA`.

```tcsh
cd <sandbox_root_path>
```

> Where `<sandbox_root_path>` is the sandbox created in Step 3 (e.g., `$WORKAREA/<tool_name>/${USER}_sbox`).

**10c. Create a new git branch.**

The branch name must follow the pattern `<username>/feat/<agent_name>`:

```tcsh
git checkout -b $USER/feat/<agent_name>
```

**10d. Stage, commit, and push.**

```tcsh
git add -A
git commit -m "feat(<agent_name>): add agent with skills and MCP config"
git push -u origin $USER/feat/<agent_name>
```

**10e. Check release approval status.**

Before running `crt install`, verify the tool is approved for release:

```tcsh
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt getToolInfo -tool <tool_name> | grep "Approved"
```

- **If output shows `Approved to release    Yes`** → proceed to 10f.
- **If output shows `Approved to release    No`** → **STOP. Do NOT run `crt install`.** Alert the user:

> **⚠️ Release blocked: Manager approval is required.**
>
> Your tool `<tool_name>` has not been approved for release yet. Your first or second level manager must approve it before `crt install` can proceed.
>
> **To get approval**, ask your manager to visit: **goto/crt_approval_page**
>
> Once approved, re-run this check and then proceed with `crt install`.

**Do NOT proceed to `crt install` until the approval status is `Yes`.**

**10f. Run `crt install`.**

After a successful push and confirmed approval, still from inside the sandbox repo directory:

```tcsh
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt install -tool <tool_name> -type <tool_type>
```

> **Note:** `<tool_type>` defaults to `cheetah_unlocked`. Use `cheetah_cad` only if the user explicitly requested it.

---

## Step Index (End)

| Completed | Step | Next |
|---|---|---|
| ✓ Step 1 | Check CRT Tool | → Step 2 |
| ✓ Step 2 | Create Tool Directory | → Step 3 |
| ✓ Step 3 | Create Sandbox | → Step 4 |
| ✓ Step 4 | Set Up Virtual Environment | → Step 5 |
| ✓ Step 5 | Create Directory Structure & Files | → Step 6 |
| ✓ Step 6 | Create Skills | → Step 7 (if MCP needed) or plugin.json |
| ✓ Step 7 | Write MCP Server (if needed) | → plugin.json |
| ✓ — | Create plugin.json | → Step 8 |
| ✓ Step 8 | Inspect with cth.ai | → Step 9 |
| ✓ Step 9 | Tell User How to Test | → Step 10 (if releasing) or Done |
| ✓ Step 10 | Release (optional) | Done |

---

## Reference Documents

| Step | Document | Contents |
|---|---|---|
| Step 1 | [references/step1_crt_registration.md](./references/step1_crt_registration.md) | CRT register command, required params, $EC_ZONE site |
| Step 4 | [references/step4_venv_setup.md](./references/step4_venv_setup.md) | Virtual environment creation, SDK .pth attachment, package management |
| Step 5 | [references/step5_directory_and_files.md](./references/step5_directory_and_files.md) | Full directory structure, mcp.json template, tool.cth, prompts, instructions.md guide |
| Step 6 | [references/step6_skills_creation.md](./references/step6_skills_creation.md) | Skill directory structure, SKILL.md template, naming rules, progressive disclosure |
| Step 7 | [references/step7_mcp_server.md](./references/step7_mcp_server.md) | AutobotsMCPStdioServer template, mandatory rules, patterns, examples |


### Constitution (topic-specific — load only what you need)

| Topic | File | Load when... |
|---|---|---|
| MCP Servers | [references/constitution/mcp_servers.md](./references/constitution/mcp_servers.md) | Creating/modifying server.py |
| MCP Tools | [references/constitution/mcp_tools.md](./references/constitution/mcp_tools.md) | Creating/modifying @mcp.tool() functions |
| Skills | [references/constitution/skills.md](./references/constitution/skills.md) | Creating/modifying SKILL.md |
| Agents | [references/constitution/agents.md](./references/constitution/agents.md) | Creating/modifying .agent.md files |
| Prompts & Instructions | [references/constitution/prompts_and_instructions.md](./references/constitution/prompts_and_instructions.md) | Creating instructions.md, agent.md |
| mcp.json & Layout | [references/constitution/mcp_json_and_layout.md](./references/constitution/mcp_json_and_layout.md) | Creating mcp.json or directory structure |
| Full Index | [references/constitution_index.md](./references/constitution_index.md) | Quick lookup of all rules and checklist |
