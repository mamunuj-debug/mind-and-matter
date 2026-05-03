# Step 1: CRT Tool Registration

If `crt getToolInfo -tool <tool_name>` returns a fatal error (`-F- crt: Tool <tool_name> is not a known tool`), the tool needs to be registered.

## Required Information

Before registering, gather from the user:

| Parameter | Required | Description |
|---|---|---|
| `-tool` | Yes | Tool name (lowercase, underscores) |
| `-type` | Yes | Defaults to `cheetah_unlocked`. Use `cheetah_cad` if the user explicitly requests it. |
| `-class` | Yes | `confidential` or `topsecret` |
| `-sites` | Auto | Defaults to `$EC_ZONE,zsc11,pdx`. If the user provides a custom list, use their sites but always append `zsc11,pdx` (deduplicated). |
| `-desc` | No | Short description of the tool |
| `-repo` | No | URL of an existing GitHub repo to link (use this OR `-createrepo`, not both) |
| `-createrepo` | No | Add flag to auto-create a GitHub repo (use this OR `-repo`, not both) |
| `-maintainer` | No | Comma-separated user IDs |

## Register Command

**Ask the user:** Do you already have an existing GitHub repository for this tool?

**If the user has an existing repo** (use `-repo <url>`):
```tcsh
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt register \
  -tool <tool_name> \
  -type <tool_type> \
  -class confidential \
  -sites $EC_ZONE,zsc11,pdx \
  -desc "<description of the agent>" \
  -repo <repo_url>
```

**If the user does NOT have a repo** (use `-createrepo`):
```tcsh
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt register \
  -tool <tool_name> \
  -type <tool_type> \
  -class confidential \
  -sites $EC_ZONE,zsc11,pdx \
  -desc "<description of the agent>" \
  -createrepo
```

> **Note:** `<tool_type>` defaults to `cheetah_unlocked`. Use `cheetah_cad` only if the user explicitly requested it.

**Sites rules:**
- Default: `$EC_ZONE,zsc11,pdx` — the user's current site (from `$EC_ZONE` env var) plus `zsc11` and `pdx`
- If the user provides a custom sites list, use their sites **but always include `zsc11,pdx`** (deduplicate if already present). Example: user says `idc5,fm6` → use `-sites idc5,fm6,zsc11,pdx`
- Use `-repo` or `-createrepo`, never both.

## Post-Registration Verification

```tcsh
/nfs/site/disks/crt_linktree_1/crt/latest/client/crt getToolInfo -tool <tool_name>
```

Should show output like:
```
-I- crt: Result = 
        Tool                                    <tool_name>
        Description                             ...
        Type                                    <tool_type>
        Classification                          confidential
        Release sites                           <site>
        ...
```

## Pre-Registration: Confirmation Required

> **Registration is a mutating, irreversible operation.** Before running `crt register`, you **MUST**:
>
> 1. Ask the user if they have an existing GitHub repo or want one auto-created.
> 2. Show the user a clear summary of what will happen:
>    - Tool `<tool_name>` will be registered as type `<tool_type>` (default: `cheetah_unlocked`), class `confidential`
>    - **If `-createrepo`:** A GitHub repository will be auto-created (takes **~30 minutes to up to 1 day**)
>    - **If `-repo <url>`:** The existing repository will be linked (no wait time)
>    - An HSD-ES ticket will be created automatically
>    - **Manager approval required for first release** (first or second level manager must run `crt approve -tool <tool_name> -type cheetah_unlocked` or visit `goto/crt_approval_page`). Sandbox development is allowed without approval.
> 3. **Wait for explicit user confirmation (yes/no) before executing.**

## Post-Registration: Expected Behavior

After `crt register` succeeds, the output will include warnings like:

```
-W- crt: Please pay attention that repository isn't ready yet!

The creation takes at least ~30 minutes or can be up to 1 day which depends on
GITHUB server. Repo owners will receive an email after the repo had been created

-W- crt: Please be aware that approval from one of your direct first or second
level managers is required before you can proceed with the first release.
```

**Post-registration behavior depends on which flag was used:**

**If `-repo <url>` was used:**
1. The existing repo is linked immediately. **No wait time.**
2. Proceed directly to Step 2 (Create Tool Directory) and Step 3 (Create Sandbox).
3. **Manager approval** is needed before the first release (but sandbox development can proceed immediately).

**If `-createrepo` was used, relay these warnings to the user:**
1. **GitHub repo is NOT ready immediately.** It takes ~30 minutes to up to 1 day. Repo owners will receive an email when it is ready.
2. **`crt mkSbox` will fail until the repo is ready** with:
   ```
   -E- crt: Failed to parse repository URL, make sure it's a Github repository
       and please be patient if the repo creation is in progress.
   ```
   This is expected. Tell the user to **wait and retry later**. Do NOT proceed to subsequent steps.
3. **Manager approval** is needed before the first release (but sandbox development can proceed immediately).

## Important Notes

- Default sites: `$EC_ZONE,zsc11,pdx`. Always include `zsc11,pdx` even if the user provides a custom list.
- If using the CRT skill, route through `confirm_and_execute_crt_command` with `--user-approval true` only after explicit user approval.
