# Step 4: Virtual Environment Setup

> **⚠️ All commands in this step use `tcsh` syntax.** Do NOT use `bash` equivalents. If you need help with `tcsh`, refer to the `linux-shell-environment` skill.

Every Cth.ai agent needs a virtual environment that includes the Autobots SDK. The venv is created inside the sandbox root (`<tool_name>/`) and the MCP server runs from it.

The entire venv setup is automated by `crt.pre.install` — a tcsh script committed to the repo. This script is run manually for local sandbox testing and called automatically by `crt install` during release.

## Why a Venv is Needed

- The released Autobots SDK ships with its own `venv_autobots` — do NOT modify it.
- Create your own `.venv` for your project and attach the SDK via a `.pth` file.
- This gives you isolation for additional packages while inheriting SDK dependencies.

## Step-by-Step

### 4a. Discover the current Autobots SDK version

Run inside the cth.ai environment:

```tcsh
cth_query toolversion autobots_sdk
```

This returns the SDK version currently available in the environment (e.g., `3.1.0`). This version will be hardcoded into `crt.pre.install`.

### 4b. Create `crt.pre.install`

Create the file at the sandbox root (`<tool_name>/crt.pre.install`) using the template from [step5_directory_and_files.md](./step5_directory_and_files.md). Replace:
- `<AUTOBOTS_SDK_VERSION>` → the version from step 4a
- `<tool_name>` → the CRT tool name

Then set the file permission:

```tcsh
chmod 755 <tool_name>/crt.pre.install
```

### 4c. Run it to create the local venv

Run the script yourself — do NOT ask the user to run it. This ensures the venv is ready before testing.

```tcsh
cd <tool_name>
tcsh crt.pre.install
```

When run without arguments (local sandbox), the script:
1. Creates `.venv` using Python 3.13.2
2. Upgrades pip (with Intel proxy)
3. Installs packages from `requirements.txt` if present
4. Attaches the Autobots SDK via `.pth` file
5. Updates shebangs to use local paths

### 4d. Validate

```tcsh
source .venv/bin/activate.csh
python -c "import autobots_sdk; print('SDK import OK')"
```

If you installed extra packages, also verify:

```tcsh
python -c "import <your_module>; print('extra import OK')"
```

## What `crt.pre.install` Does

The script handles everything that was previously done manually:

| Task | What the script does |
|---|---|
| Create venv | `/usr/intel/pkgs/python3/3.13.2/bin/python3 -m venv .venv` |
| Upgrade pip | `pip install --upgrade pip` with Intel proxy |
| Install deps | `pip install -r requirements.txt` if the file exists |
| Attach SDK | Writes `.pth` file pointing to the released SDK venv and root |
| Fix shebangs | Updates `#!` lines in `.venv/bin/*` to use the production install path |
| Path resolution | Uses `$argv[1]` (version) for production paths, or `pwd` for local sandbox |

## How `crt install` Uses It

During release (Step 10), `crt install` calls `crt.pre.install` with the version number:

```tcsh
tcsh crt.pre.install <version>
```

When a version argument is provided, the script:
1. Sets `VIRTUAL_ENV` in `activate.csh` to the production path (`/p/hdk/pu_tu/prd/<tool_name>/<version>/.venv`)
2. Updates shebangs to point to the production venv python

## How This Connects to mcp.json

After the venv exists, your `mcp.json` must point to the venv python:

```json
{
  "servers": {
    "<agent_name>": {
      "type": "stdio",
      "command": "{TOOL_PATH}/.venv/bin/python3",
      "args": ["{TOOL_PATH}/autobots/<agent_name>/mcp/server.py"],
      "env": {}
    }
  }
}
```

## Checking if a Library Exists in the SDK

Before installing a package, check if it's already in the SDK venv:

```tcsh
/p/hdk/pu_tu/prd/autobots_sdk/<SDK_VER>/venv_autobots/bin/python3 -m pip show <package_name>
```

If it prints metadata, it's already available via the `.pth` file — no need to install.

## Adding Packages Later

Add packages to `requirements.txt` and re-run `crt.pre.install`, or install directly:

```tcsh
source .venv/bin/activate.csh
python -m pip install <package> --proxy proxy-chain.intel.com:912
```

Always keep extra libraries in your own `.venv` — never modify the released SDK venv.
