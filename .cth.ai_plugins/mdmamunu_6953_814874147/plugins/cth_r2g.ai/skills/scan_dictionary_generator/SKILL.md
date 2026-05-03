---
name : scan_dictionary_generator
description: Generates scan dictionary CSV files from DFT reports for ATPG configuration. Extracts scan chain information and non-scan constraints from APR and DFT collateral. This skill also provide guidance how to modify the scan dictionary.
---

# Scan Dictionary Generator Guide

## Overview

This skill generates scan dictionary CSV files required for ATPG execution. It processes DFT reports (report_dft_signal, scan path reports) and generates properly formatted scan dictionaries for use in SAGE ATPG flows.

## How to Invoke

### For AI Agents
**Use the `run_in_terminal` tool to execute the commands below.**

The scan dictionary generator uses the `ipScanChainsExtraction.tcl` script from the SAGE installation.

### Command-line invocation

**To generate scan dictionary CSV:**
```bash
/p/hdk/pu_tu/prd/sage/1.17.0/scripts/ipScanChainsExtraction.tcl 
  -scanSignal <required path to *report_dft_signal*> 
  -scanPath <required path to scan path report> 
  -template </p/hdk/pu_tu/prd/sage/1.17.0/templates/ip.scanDictionary_template.csv> 
  -nonScan <optional switch to pass nonscan script>
  -csv <output csv file>
```

**To generate dofile by excluding ultrascan signals:**

```bash
/p/hdk/pu_tu/prd/sage/1.17.0/scripts/ipScanChainsExtraction.tcl 
  -scanSignal <required path to *report_dft_signal> 
  -extractNonUscConstrains 1 
  -outputDofile <output dofile path>
```

**Get help:**

```bash
/p/hdk/pu_tu/prd/sage/1.17.0/scripts/ipScanChainsExtraction.tcl -help
```

# Required Inputs
- **scanSignal**: Path to `report_dft_signal` file from APR flow completion (apr_fc)
- **scanPath**: Path to scan path report file from APR flow
- **template**: Path to SAGE scan dictionary template CSV (typically under SAGE installation)
- **nonScan** (optional): Path to non-scan constraints script (e.g., from SpyGlass DFT pre_compile_setup.tcl)

## Output
- Scan dictionary CSV file compatible with SAGE ATPG execution
- Optional: Dofile with non-ultrascan constraints

## Modifying the Scan Dictionary 
- To modify the generated scan dictionary, you can edit the output CSV file directly.
- To change constraint, modify C1 to C0 or C0 to C1 vise version in the generated csv file.

### Refer example below for changing the constraint. 
- Changing constraint value from C0 :
    signal A,SCAN_CTRL_SIGNALS,NA,C0,NA,NA,NA,NA,NA,NA,NA,NA 
  to C1 :
    signal A,SCAN_CTRL_SIGNALS,NA,C1,NA,NA,NA,NA,NA,NA,NA,NA
- Changing static constraint to dynamic constraint:
    signal B,SCAN_CTRL_SIGNALS,NA,C0,NA,NA,NA,NA,NA,NA,NA,NA 
  to 
    signal B,SCAN_CTRL_SIGNALS,NA,C1,NA,NA,NA,NA,NA,NA,NA,NA
# This alone could recover 205+ faults and improve controllability
## Support
For additional assistance, contact sage_supports.