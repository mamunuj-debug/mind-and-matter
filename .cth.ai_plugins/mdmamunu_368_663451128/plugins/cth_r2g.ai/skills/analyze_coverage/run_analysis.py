#!/usr/bin/env python3
"""Script to run coverage analysis using the skill."""

import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from agent_interface import analyze_coverage, identify_top_loss_categories, identify_problematic_modules, generate_coverage_report

# Configuration
fault_list = '/nfs/site/disks/teg_regression_004/yeesiang/cheetah_r2g/r2g.1280_dev/runs/dhm/1280.3/sage_atpg/sage/WORK/atspeed_bypass/faultlist/dhm.byp.atspeed.xxxx.x.ph1.faults.gz'

# Generate output filename with timestamp
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
output_file = f"coverage_analysis_{timestamp}.txt"

print("=" * 80)
print("ATSPEED COVERAGE ANALYSIS - DHM/1280.3")
print("=" * 80)
print(f"\nSaving detailed analysis to: {output_file}")
print("Generating report...\n")

# Collect all output
output_lines = []
output_lines.append("=" * 80)
output_lines.append("ATSPEED COVERAGE ANALYSIS - DHM/1280.3")
output_lines.append("=" * 80)
output_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
output_lines.append("")

# Generate comprehensive report
report = generate_coverage_report(fault_list)
output_lines.append(report)

# Get detailed analysis for different fault types
output_lines.append("\n\n" + "=" * 80)
output_lines.append("TOP OBSERVABILITY ISSUES (UO)")
output_lines.append("=" * 80)

uo_modules = identify_problematic_modules(fault_list, "UO", depth=4, top_n=20)
for module_path, count in uo_modules:
    output_lines.append(f"  {count:6,} faults: {module_path}")

output_lines.append("\n" + "=" * 80)
output_lines.append("TOP CONSTRAINT ISSUES (AU.PC)")
output_lines.append("=" * 80)

pc_modules = identify_problematic_modules(fault_list, "AU.PC", depth=4, top_n=20)
for module_path, count in pc_modules:
    output_lines.append(f"  {count:6,} faults: {module_path}")

output_lines.append("\n" + "=" * 80)
output_lines.append("TOP ATPG UNTESTABLE (AU)")
output_lines.append("=" * 80)

au_modules = identify_problematic_modules(fault_list, "AU", depth=4, top_n=20)
for module_path, count in au_modules:
    output_lines.append(f"  {count:6,} faults: {module_path}")

# Save to file
with open(output_file, 'w') as f:
    f.write('\n'.join(output_lines))

print(f"✓ Analysis complete!")
print(f"✓ Full report saved to: {output_file}")
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

# Show just the top-level summary on terminal
result = analyze_coverage(fault_list)
summary = result.get("summary", {})
total = summary.get("total_faults", 0)
categories = summary.get("categories", [])

print(f"\nTotal Faults: {total:,}")
print("\nTop Coverage Loss Categories:")
loss_cats = identify_top_loss_categories(fault_list, top_n=7)
for cat in loss_cats:
    print(f"  {cat['name']:15s} : {cat['count']:8,} ({cat['percentage']:6.2f}%)")

print(f"\nTop 5 Modules with UO faults:")
for module_path, count in uo_modules[:5]:
    print(f"  {count:4,} faults: {module_path}")

print(f"\n✓ See {output_file} for complete analysis")
print("=" * 80)
