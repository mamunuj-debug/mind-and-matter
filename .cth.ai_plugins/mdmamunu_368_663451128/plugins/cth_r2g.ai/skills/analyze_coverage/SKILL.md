---
name : analyze_coverage
description: Analyzes SAGE ATPG coverage reports to provide insights on test coverage, faults detected, and potential gaps in testing. This skill helps users understand the effectiveness of their ATPG runs and identify areas for improvement.
--- 

# SKILL: Analyze ATPG Coverage

## Description

This skill analyzes ATPG (Automatic Test Pattern Generation) coverage data from Tessent to identify and categorize coverage loss. It helps engineers understand why faults are not being detected and pinpoints areas in the design with low testability.

## Agent Usage

### Quick Start for Agents

To analyze coverage as an agent, you can invoke this skill using the command-line interface:

```bash
# Basic usage - shows summary only (no huge hierarchical output)
python3 -m analyze_coverage.src.main <fault_list_path> --summary-only

# Save detailed analysis to file (recommended for large datasets)
python3 -m analyze_coverage.src.main <fault_list_path> \
  --output-file coverage_report.txt \
  --hierarchy-depth 3

# JSON output saved to file (for programmatic parsing)
python3 -m analyze_coverage.src.main <fault_list_path> \
  --output-file coverage_data.json \
  --output-format json \
  --hierarchy-depth 3
```

**💡 Tip**: Always use `--output-file` for hierarchical data to avoid flooding the terminal. Use `--summary-only` for quick terminal views.

### Agent Interface Functions

The skill provides high-level Python functions in `agent_interface.py`:

```python
from autobots.skills.analyze_coverage.src.agent_interface import (
    analyze_coverage,
    identify_top_loss_categories,
    identify_problematic_modules,
    generate_coverage_report
)

# Basic analysis
result = analyze_coverage(
    fault_list_path="/path/to/faults.gz",
    coverage_report_path="/path/to/coverage.rpt"
)

# Get top coverage loss categories
top_losses = identify_top_loss_categories(
    fault_list_path="/path/to/faults.gz",
    top_n=5
)

# Find modules with specific issues (e.g., sequential depth)
problem_modules = identify_problematic_modules(
    fault_list_path="/path/to/faults.gz",
    status_filter="AU.SEQ",
    depth=4,
    top_n=10
)

# Generate comprehensive report
report = generate_coverage_report(
    fault_list_path="/path/to/faults.gz",
    output_file="coverage_analysis.txt"
)
```

### Expected Inputs

1. **Fault List File** (Required):
   - Path to Tessent fault list file
   - Supports `.faults` or `.faults.gz` format
   - Example: `/path/to/design.faults.gz`

2. **Coverage Report File** (Optional):
   - Path to detailed coverage report
   - Example: `/path/to/design.detailed.coverage`

3. **Parameters**:
   - `--output-format`: `text` (default) or `json`
   - `--output-file`: Save results to file instead of printing to stdout (recommended for large hierarchical data)
   - `--summary-only`: Show only summary statistics, skip hierarchical breakdown (fast terminal output)
   - `--hierarchy-depth`: Module depth for hierarchical analysis (default: 2, max recommended: 4)
   - `--coverage-report`: Optional path to detailed coverage report file (Phase 2 feature)

### Output Format (JSON)

When using `--output-format json`, the output structure is:

```json
{
  "summary": {
    "total_faults": 7387014,
    "categories": [
      {
        "name": "DS",
        "count": 5346425,
        "percentage": 72.38
      },
      {
        "name": "AU.SEQ",
        "count": 267507,
        "percentage": 3.62
      }
    ]
  },
  "hierarchical": {
    "/module/submodule": {
      "AU.SEQ": 1000,
      "UO": 500,
      "total": 1500
    }
  }
}
```

## Best Practices

### Avoiding Terminal Overflow

⚠️ **Important**: Hierarchical analysis can generate huge output (2+ MB for large designs). Follow these practices:

1. **Always use `--output-file` for detailed analysis**:
   ```bash
   python3 src/main.py fault_list.faults.gz -f detailed_report.txt -d 3
   ```

2. **Use `--summary-only` for quick terminal views**:
   ```bash
   python3 src/main.py fault_list.faults.gz --summary-only
   ```

3. **Use the high-level wrapper script** (saves to timestamped file automatically):
   ```bash
   python3 run_analysis.py  # Auto-saves with summary on terminal
   ```

4. **For JSON processing**:
   ```bash
   python3 src/main.py fault_list.faults.gz -f data.json -o json -d 4
   ```

### Recommended Workflow

1. **Quick Check**: Run with `--summary-only` to see overall coverage
2. **Detailed Analysis**: Run with `--output-file` to save full hierarchical data
3. **Specific Investigation**: Use `identify_problematic_modules()` to focus on specific fault types
4. **Reporting**: Use `generate_coverage_report()` for formatted reports

## Core Functionality

### 1. Parse Tessent Reports
- Ingests and parses Tessent fault lists (`.faults`, `.faults.gz`)
- Extracts fault information: type, status, and design location
- Handles large fault lists (tested with 7M+ faults)

### 2. Categorize Coverage Loss
Classifies faults into meaningful categories:
- **DS**: Detected via Simulation
- **DI**: Detected via Implication (CLK, SCAN, SEN, DIN)
- **AU**: ATPG Untestable (SEQ, TC, PC, MPO, etc.)
- **UO**: Unobserved
- **UC**: Uncontrolled
- **UU**: Unused
- **TI**: Tied
- Others

### 3. Hierarchical Analysis
- Maps faults to design hierarchy
- Identifies modules with high coverage loss
- Configurable depth for analysis

### 4. Identify Problem Areas
- **Sequential Depth Issues** (AU.SEQ): Deep logic ATPG cannot reach
- **Observability Issues** (UO): Controllable but not observable faults
- **Constraint Issues** (AU.PC, AU.TC): Design constraints blocking test

## Use Cases

### Use Case 1: Initial Coverage Analysis
**Scenario**: User runs ATPG and wants to understand overall coverage.

**Agent Actions**:
1. Parse fault list to get category breakdown
2. Report total coverage and main loss categories
3. Identify top 3-5 areas needing attention

**Example**:
```bash
python3 -m autobots.skills.analyze_coverage.src.main \
  fault_list.faults.gz \
  --output-format json
```

### Use Case 2: Root Cause Investigation
**Scenario**: User wants to know WHY coverage is lost in specific categories.

**Agent Actions**:
1. Filter faults by status (e.g., AU.SEQ)
2. Perform hierarchical analysis
3. Identify specific modules contributing to the issue

**Example**:
```python
problem_modules = identify_problematic_modules(
    fault_list_path="fault_list.faults.gz",
    status_filter="AU.SEQ",
    depth=4,
    top_n=10
)
```

### Use Case 3: Coverage Trend Analysis
**Scenario**: Track coverage improvement across design iterations.

**Agent Actions**:
1. Analyze multiple fault lists from different runs
2. Compare category counts over time
3. Report improvements or regressions

## Phase 1 Implementation Status

✅ **Completed**:
- Fault list parser (supports .gz compression)
- Category classification
- Hierarchical module analysis
- JSON output for agent consumption
- Command-line interface
- Agent helper functions

## Future Enhancements (Phase 2+)

- **Coverage Report Parser**: Parse `.coverage` files for additional metrics
- **Trend Database**: Store results for historical tracking
- **Visualization**: Generate charts and graphs
- **Root Cause Analysis**: Automated recommendations
- **CI/CD Integration**: Run as part of regression pipeline
- **Machine Learning**: Predict coverage issues before ATPG

## Examples

### Example 1: Basic Analysis
```bash
python3 -m autobots.skills.analyze_coverage.src.main \
  /nfs/site/disks/project/faultlist/design.faults.gz
```

### Example 2: JSON Output for Agent
```bash
python3 -m autobots.skills.analyze_coverage.src.main \
  design.faults.gz \
  --output-format json \
  --hierarchy-depth 3 > analysis.json
```

### Example 3: Full Analysis with Report
```python
from autobots.skills.analyze_coverage.src.agent_interface import generate_coverage_report

report = generate_coverage_report(
    fault_list_path="design.faults.gz",
    coverage_report_path="design.detailed.coverage",
    output_file="coverage_report.txt"
)
print(report)
```

## Troubleshooting

**Issue**: Parser finds no faults
- Check file format matches expected structure
- Verify file is not corrupted
- Try uncompressing .gz file and inspecting first 20 lines

**Issue**: Slow performance
- Large fault lists (>5M faults) may take 1-2 minutes to parse
- Consider filtering or sampling for quick analysis

**Issue**: BrokenPipeError
- This is handled gracefully when piping output to `head` or similar commands
- Not a bug, just a side effect of output truncation
