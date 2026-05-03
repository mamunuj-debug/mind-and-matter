import argparse
import os
import sys
import json

# Support both relative and absolute imports
try:
    from .analyzer import CoverageAnalyzer
except ImportError:
    from analyzer import CoverageAnalyzer

def main():
    """
    Main function to demonstrate the usage of CoverageAnalyzer.
    Accepts fault report and coverage report file paths as command-line arguments.
    """
    parser = argparse.ArgumentParser(description="Analyze Tessent fault reports for coverage loss.")
    parser.add_argument("fault_report", help="Path to the fault report/fault list file (can be plain text or gzipped).")
    parser.add_argument("--coverage-report", "-c", help="Path to the detailed coverage report file (optional).")
    parser.add_argument("--output-format", "-o", choices=["text", "json"], default="text", help="Output format (text or json).")
    parser.add_argument("--output-file", "-f", help="Output file path. If not specified, prints to stdout (use with caution for large hierarchical data).")
    parser.add_argument("--hierarchy-depth", "-d", type=int, default=2, help="Hierarchy depth for module analysis (default: 2).")
    parser.add_argument("--summary-only", "-s", action="store_true", help="Show only summary (no hierarchical data) on stdout.")
    
    args = parser.parse_args()
    
    report_to_analyze = args.fault_report

    if not os.path.exists(report_to_analyze):
        print(f"Error: Fault report file not found at {report_to_analyze}")
        return

    if args.coverage_report:
        if not os.path.exists(args.coverage_report):
            print(f"Error: Coverage report file not found at {args.coverage_report}")
            return
        print(f"Using coverage report: {args.coverage_report}")
        # TODO: Integrate coverage report parsing in Phase 2

    try:
        # Initialize the analyzer
        analyzer = CoverageAnalyzer(fault_report_path=report_to_analyze)

        # Get the coverage summary
        summary = analyzer.get_coverage_summary()
        hier_summary = analyzer.get_hierarchical_summary(depth=args.hierarchy_depth)
        
        if args.output_format == "json":
            # JSON output for agent consumption
            output = {
                "summary": json.loads(summary.to_json()),
                "hierarchical": hier_summary if not args.summary_only else {}
            }
            output_str = json.dumps(output, indent=2)
        else:
            # Text output for human consumption
            lines = []
            lines.append("Coverage Summary:")
            lines.append(str(summary))
            
            if not args.summary_only:
                lines.append(f"\nHierarchical Summary (depth={args.hierarchy_depth}):")
                if not hier_summary:
                    lines.append("No hierarchical data to display.")
                for module, counts in hier_summary.items():
                    lines.append(f"  - {module}:")
                    for status, count in counts.items():
                        lines.append(f"    - {status}: {count}")
            output_str = "\n".join(lines)
        
        # Write to file or stdout
        if args.output_file:
            with open(args.output_file, 'w') as f:
                f.write(output_str)
            print(f"✓ Analysis complete. Results saved to: {args.output_file}")
            print(f"\n{summary}")  # Still show summary on terminal
        else:
            print(output_str)
    except BrokenPipeError:
        # Handle broken pipe gracefully (e.g., when piping to head)
        sys.stderr.close()
        sys.exit(0)

if __name__ == "__main__":
    main()
