---
name : run_sage_execution
description: Execute SAGE ATPG runs via full_flow.csh with BLOCK parameter. User must provide BLOCK name to execute SAGE runs.
---

# SAGE Execution Guide

## Overview

This skill executes SAGE ATPG runs in background mode.

### SAGE Execution Method

SAGE is executed via the standard flow script:
```bash
source global/mentor/sage_atpg/full_flow.csh BLOCK
```

**With additional SAGE options:**
```bash
source global/mentor/sage_atpg/full_flow.csh BLOCK "-<sage_option> <option_value> ..."
```

**CRITICAL:** The `BLOCK` value must be provided by the user before execution.

### Prerequisites
Before executing SAGE, you **MUST** obtain from the user:
1. **BLOCK name** (Required) - The design block/module name to run SAGE on
2. **SAGE options** (Optional) - Any additional SAGE command-line options 

### run_sage - Execute SAGE Job
Submits a SAGE ATPG job in background and returns immediately.

### Execution Command Format
### For parallel execution of multiple SAGE runs, user can specify different BLOCK names and options for each run. For example:
```bash
source $ward/global/mentor/sage_atpg/full_flow.csh BLOCK "-atpg_fault_mode stuckat ..."
source $ward/global/mentor/sage_atpg/full_flow.csh BLOCK "-atpg_fault_mode atspeed ..."
```
*Note that sage will automatically manage the runs based on the BLOCK name and options provided, allowing for concurrent execution of multiple SAGE runs without conflicts.*

### For single execution:
```bash
source $ward/global/mentor/sage_atpg/full_flow.csh BLOCK "-<sage_option> <option_value> ..."
```

### User running with specify netlist pointer:
```bash
source $ward/global/mentor/sage_atpg/full_flow.csh BLOCK "-netlist_full_path /Absolute/FULL/PATH/to/user/netlist.v ..."
```

### Output location
Generated output typically located in:
````
logfiles - ./runs/BLOCK/TECH/sage_atpg/sage/WORK/<RECIPE>/log/
reports - ./runs/BLOCK/TECH/sage_atpg/outputs/sage/WORK/<RECIPE>/reports/
GLS build log - ./runs/BLOCK/TECH/sage_atpg/outputs/sage/WORK/<RECIPE>/validation/*.build.log
GLS run log - ./runs/BLOCK/TECH/sage_atpg/outputs/sage/WORK/<RECIPE>/validation/*.run.log
dofiles for ATPG -  ./runs/BLOCK/TECH/sage_atpg/sage/WORK/<RECIPE>/do/
````

### Detail coverage, pattern count and fault count can be retrieved from coverage report file with the example of the path as below:
````
$ward/runs/BLOCK/TECH/sage_atpg/sage/WORK/${ATPG_FAULT_MODE}_${ATPG_EDT_MODE}${ATPG_RECIPE_TAG}/reports/*.detailed.coverage
````

### SAGE Run Monitoring and Status Checking
1. Look into output directories for logs and status files to monitor progress and check for completion or errors.
2. For run up with below criteria 
    (1) SAGE flow stage is end at PATTERN GEN and (2) SAGE run is completed, you can find the coverage report in the output directory. The coverage report file name typically contains "coverage_report" in its name. You can use `search/fileSearch` tool to search for the coverage report file in the report directory and read the content of the report to provide coverage analysis to the user.
