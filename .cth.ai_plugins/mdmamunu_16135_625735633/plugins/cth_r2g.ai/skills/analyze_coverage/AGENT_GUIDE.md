# Coverage Analysis Skill - Agent Quick Reference

## For AI Agents - How to Use This Skill

This skill analyzes ATPG coverage to identify test gaps and problem areas.

### Basic Command

```bash
python3 -m autobots.skills.analyze_coverage.src.main <fault_list_path> --output-format json
```

### Common Agent Tasks

#### Task 1: Analyze overall coverage
```bash
python3 -m autobots.skills.analyze_coverage.src.main \
  /path/to/design.faults.gz \
  --output-format json
```

**Output**: JSON with total faults and category breakdown

#### Task 2: Find modules with sequential depth issues
```python
from autobots.skills.analyze_coverage.src.agent_interface import identify_problematic_modules

modules = identify_problematic_modules(
    fault_list_path="/path/to/design.faults.gz",
    status_filter="AU.SEQ",
    depth=4,
    top_n=10
)
# Returns: [(module_path, fault_count), ...]
```

#### Task 3: Get top coverage loss categories
```python
from autobots.skills.analyze_coverage.src.agent_interface import identify_top_loss_categories

losses = identify_top_loss_categories(
    fault_list_path="/path/to/design.faults.gz",
    top_n=5
)
# Returns: [{"name": "AU.SEQ", "count": 1000, "percentage": 2.5}, ...]
```

#### Task 4: Generate full report
```python
from autobots.skills.analyze_coverage.src.agent_interface import generate_coverage_report

report_text = generate_coverage_report(
    fault_list_path="/path/to/design.faults.gz",
    output_file="coverage_analysis.txt"
)
```

### Fault Status Codes Reference

**Coverage Loss Categories** (focus areas):
- `AU.SEQ` - Sequential depth (deep logic)
- `AU.TC` - Tied cells
- `AU.PC` - Pin constraints
- `UO` - Unobserved faults
- `UC` - Uncontrolled faults
- `UU` - Unused logic

**Detected Categories** (good):
- `DS` - Detected via simulation
- `DI.SCAN` - Detected via scan
- `DI.CLK` - Detected via clock
- `DI.SEN` - Detected via scan enable

### Agent Response Templates

#### Template 1: Initial Analysis Response
```
Coverage Analysis Results:
- Total Faults: {total}
- Test Coverage: {detected_percentage}%
- Top Coverage Loss: {top_category} ({count} faults, {percentage}%)

Recommendations:
- Focus on {top_module} ({fault_count} {status} faults)
- [Specific actions based on status]
```

#### Template 2: Sequential Depth Issue Response
```
Sequential Depth Analysis:
- Total AU.SEQ faults: {count}
- Top problematic module: {module_path}
- Impact: {percentage}% of total coverage loss

Recommendations:
- Add scan chains to {module_path}
- Review sequential depth settings in ATPG
- Consider test points for deep logic
```

### Quick Decision Tree for Agents

```
User asks about coverage → 
  Run analyze_coverage()
  
If coverage < 90% →
  Run identify_top_loss_categories()
  
If AU.SEQ is top issue →
  Run identify_problematic_modules(status_filter="AU.SEQ")
  Report: "Sequential depth issues in module X"
  
If UO is top issue →
  Run identify_problematic_modules(status_filter="UO")
  Report: "Observability issues in module Y"
  
If AU.PC/AU.TC is top issue →
  Report: "Constraint or tied cell issues, review design constraints"
```

### Performance Notes

- Small designs (<100K faults): < 5 seconds
- Medium designs (100K-1M faults): 5-30 seconds  
- Large designs (>1M faults): 30-120 seconds

### Error Handling

If analysis fails:
1. Check file exists and is readable
2. Verify file format (should start with fault entries)
3. Try with smaller sample: `zcat file.faults.gz | head -10000 | gzip > sample.faults.gz`
