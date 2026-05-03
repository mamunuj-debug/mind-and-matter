---
name: cheetah_design_environment
description: Comprehensive Intel Design Environment called Cheetah Design System (also called Cth or Cth.ai or Cheetah.ai). This skill has the knowledge of the executables, scripts, environment variables available in the Cheetah System.
---

# LiteInfra Configuration Guide

## Overview

Cheetah Design System uses INI file format for project-related configurations, tool and flow configurations, with override capabilities for project admins and end users.

## Motivation

The below commands can help in figuring out the utilities in Cheetah.

### Project Setup
```bash
# Enter project setup
cth_psetup

# With batch mode
cth_psetup -cmd <command>

# With stay-in-shell mode
cth_psetup -x <command>
```

### Tool Setup
```bash
# Setup a tool
cth_tsetup <tool_name>

# Setup tool bundle
cth_tsetup <bundle_name>

# Setup in new shell
cth_tsetup -shell <tool_name>
```

### Query Configuration
```bash
# Display all configuration
cth_query

# Display specific section
cth_query <section_name>

# Display specific key
cth_query <section_name> <key_name>

# Display with resolved values
cth_query <section_name> -resolve

# Sections in cth_query
These are the sections available for cth_query. replace them in the above commands as needed.

DesignPackage
Envs
Params
Repository
ToolBundle
ToolVersion

```

### Netbatch in Cheetah

### Archival Locations in Cheetah
