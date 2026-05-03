---
name: linux-shell-environment
description: Linux environment and tcsh/csh shell rules. Use when executing terminal commands, creating or editing files, writing scripts, or interacting with the filesystem. The host OS is Linux with tcsh as the default shell. VS Code connects remotely -- built-in file tools produce Windows-format paths that fail on this system.
---

# Linux Shell Environment -- Strict Rules

This system is a **remote Linux host** accessed via VS Code Remote. The default shell is **tcsh** (C shell). Two critical constraints apply to every action:

1. **Linux filesystem** -- forward slashes `/` only, case-sensitive paths, NFS-mounted storage
2. **tcsh shell** -- not bash; all commands must use tcsh-compatible syntax

---

## Part 1: Linux Environment

### File Paths

- All paths use forward slashes: `/nfs/site/disks/...`
- **Never** use backslashes `\\`. The VS Code UI may display `\\nfs\\site\\...` but the actual filesystem path is `/nfs/site/...`
- Paths are case-sensitive: `SKILL.md` and `skill.md` are different files

### Creating and Editing Files -- NEVER Use Built-in Tools

The VS Code built-in tools (`create_file`, `replace_string_in_file`, `multi_replace_string_in_file`) translate paths to Windows format (`\\nfs\\site\\...`) and produce files that **silently fail** to appear on the Linux filesystem.

**ALWAYS** use Linux terminal commands instead:

| Task | Recommended Method |
|------|-------------------|
| Create a new file | **base64 decode** (preferred) or Python REPL |
| Edit an existing file | `sed -i 's/old/new/g' /path/to/file` |
| Append to a file | `echo 'line' >> /path/to/file` (single-line only) |
| Create a directory | `mkdir -p /path/to/dir` |
| Copy/move files | `cp`, `mv` |
| Delete files | `rm /path/to/file` (ask user first) |

### Primary Method: base64 Decode for File Creation

The most efficient way to create files on this system. Encode the file content as base64 and decode it in a single command -- no quoting issues, no newline problems, no interactive sessions.

**Steps:**

1. Compose the desired file content
2. Base64-encode it (the entire content, including newlines)
3. Run a single command in the terminal:

```
printf '%s' '<BASE64_STRING>' | base64 -d > /path/to/file
```

**Why this works:**
- Base64 output contains only `A-Za-z0-9+/=` -- no special characters
- Single-line command -- no heredocs, no multi-line issues
- Works directly in tcsh with both `run_in_terminal` and `send_to_terminal`
- No interactive REPL session needed (one round-trip vs 4-5 for Python REPL)

**For large files**, concatenate the base64 string in one `printf`:

```
printf '%s' '<PART1><PART2>' | base64 -d > /path/to/file
```

**To encode content** for this method, use:

```
base64 < /path/to/source/file
```

### Fallback Method: Python REPL for File Creation

When base64 is impractical (e.g., content is being composed interactively), use the Python REPL:

```
python3
>>> f = open('/path/to/file.md', 'w')
>>> f.write('line 1\nline 2\nline 3\n')
>>> f.close()
>>> exit()
```

This requires multiple `send_to_terminal` round-trips but handles any content.

### Recommended: sed for File Editing

For targeted edits in existing files, use `sed -i`:

```
sed -i 's/old_text/new_text/g' /path/to/file
```

For multi-line replacements or complex edits, use a Python script under `/tmp/`.

---

## Part 2: tcsh Shell Syntax

The default shell is **tcsh**. All commands run in tcsh. Use these rules for every terminal operation.

### Redirection

| Need | WRONG (bash) | CORRECT (tcsh) |
|------|-------------|----------------|
| stdout only | `cmd > file` | `cmd > file` |
| stderr only | `cmd 2> file` | *(not directly possible -- capture both)* |
| stdout + stderr | `cmd > file 2>&1` | `cmd >& file` |
| append stdout | `cmd >> file` | `cmd >> file` |
| append stdout+stderr | `cmd >> file 2>&1` | `cmd >>& file` |
| discard all output | `cmd > /dev/null 2>&1` | `cmd >& /dev/null` |

### Heredocs -- FORBIDDEN

`cat << 'EOF' ... EOF` does **not work** in tcsh. Never use it.

**Instead:** use base64 decode or the Python REPL to write the file.

### Inline Code Execution -- FORBIDDEN

- `python -c "..."` and `python3 -c "..."` -- the terminal flattens newlines, breaking multi-line code

**Instead:** write the code to a `.py` file (via base64 decode or Python REPL), then run it:

```
python3 /tmp/script.py
```

### Variable and Environment Syntax

| Operation | WRONG (bash) | CORRECT (tcsh) |
|-----------|-------------|----------------|
| Set variable | `myvar=value` | `set myvar = value` |
| Set env var | `export MY_VAR=value` | `setenv MY_VAR value` |
| Reference | `$myvar` or `${myvar}` | `$myvar` or `${myvar}` |

### Command Substitution

Use backticks: `` `cmd` ``

Do **not** use `$(cmd)` -- it does not work in tcsh.

### Conditionals

```
if ( condition ) then
    ...
endif
```

Do **not** use `if [[ ... ]]` -- that is bash-only.

### Loops

```
foreach item ( list )
    ...
end
```

Do **not** use `for item in list; do ... done` -- that is bash-only.

### Logical Operators

| Need | WRONG (bash) | CORRECT (tcsh) |
|------|-------------|----------------|
| AND | `cmd1 && cmd2` | `cmd1 && cmd2` |
| OR  | `cmd1 || cmd2` | `cmd1 || cmd2` |
| NOT | `! cmd` | `! cmd` |

---

## Summary Checklist

Before every file or terminal operation, verify:

### Environment
1. All paths use forward slashes `/` -- never backslashes
2. File creation uses **base64 decode** (preferred) or Python REPL -- **not** built-in VS Code tools
3. File editing uses `sed -i` -- **not** `replace_string_in_file`
4. Temporary scripts go under `/tmp/`

### Shell Syntax
5. No bash-only syntax (`export`, `$(...)`, `[[ ]]`, `2>&1`, heredocs)
6. No inline Python (`python3 -c "..."`)
7. Variables set with `set` or `setenv`
8. Command substitution uses backticks only
9. Conditionals use `if ( ) then` / `endif`
10. Loops use `foreach` / `end`
