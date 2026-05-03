"""Agent interface for coverage analysis.
This module provides high-level functions that agents can call.
"""
import json
import os
import sys
from typing import Dict, List, Tuple
from pathlib import Path

# Support both relative and absolute imports
try:
    from .analyzer import CoverageAnalyzer
    from .models import CoverageSummary
except ImportError:
    from analyzer import CoverageAnalyzer
    from models import CoverageSummary

def analyze_coverage(fault_list_path: str, coverage_report_path: str = None) -> Dict:
    """
    Analyze coverage from fault list and optional coverage report.
    
    Args:
        fault_list_path: Path to the fault list file (.faults.gz or .faults)
        coverage_report_path: Optional path to coverage report file
        
    Returns:
        Dictionary containing coverage analysis results in JSON format
    """
    try:
        # Use direct API instead of subprocess for better performance
        analyzer = CoverageAnalyzer(fault_report_path=fault_list_path)
        summary = analyzer.get_coverage_summary()
        hier_summary = analyzer.get_hierarchical_summary(depth=3)
        
        output = {
            "summary": json.loads(summary.to_json()),
            "hierarchical": hier_summary
        }
        return output
    except Exception as e:
        return {"error": str(e)}

def identify_top_loss_categories(fault_list_path: str, top_n: int = 5) -> List[Dict]:
    """
    Identify the top N coverage loss categories.
    
    Args:
        fault_list_path: Path to the fault list file
        top_n: Number of top categories to return
        
    Returns:
        List of dictionaries with category name, count, and percentage
    """
    result = analyze_coverage(fault_list_path)
    
    if "error" in result:
        return []
    
    categories = result.get("summary", {}).get("categories", [])
    
    # Filter out detected categories (DS, DI.*)
    loss_categories = [
        cat for cat in categories 
        if not cat["name"].startswith("DS") and not cat["name"].startswith("DI")
    ]
    
    # Sort by count and return top N
    loss_categories.sort(key=lambda x: x["count"], reverse=True)
    return loss_categories[:top_n]

def identify_problematic_modules(
    fault_list_path: str, 
    status_filter: str, 
    depth: int = 3,
    top_n: int = 10
) -> List[Tuple[str, int]]:
    """
    Identify modules with the most faults of a specific status.
    
    Args:
        fault_list_path: Path to the fault list file
        status_filter: Fault status to filter (e.g., "AU.SEQ", "UO", "AU.PC")
        depth: Hierarchy depth to analyze
        top_n: Number of top modules to return
        
    Returns:
        List of tuples (module_path, fault_count)
    """
    import gzip
    from collections import defaultdict
    
    module_counts = defaultdict(int)
    
    open_func = gzip.open if fault_list_path.endswith('.gz') else open
    mode = 'rt' if fault_list_path.endswith('.gz') else 'r'
    
    with open_func(fault_list_path, mode) as f:
        for line in f:
            parts = line.strip().split(None, 2)
            if len(parts) == 3:
                status = parts[1]
                path = parts[2]
                
                if status == status_filter:
                    # Extract module path based on depth
                    path_parts = path.strip('/').split('/')
                    module_path = '/' + '/'.join(path_parts[:depth]) if path_parts else path
                    module_counts[module_path] += 1
    
    # Sort by count and return top N
    sorted_modules = sorted(module_counts.items(), key=lambda x: x[1], reverse=True)
    return sorted_modules[:top_n]

def generate_coverage_report(
    fault_list_path: str, 
    coverage_report_path: str = None,
    output_file: str = None
) -> str:
    """
    Generate a comprehensive coverage analysis report.
    
    Args:
        fault_list_path: Path to the fault list file
        coverage_report_path: Optional path to coverage report
        output_file: Optional file to write the report to
        
    Returns:
        Report text as string
    """
    analysis = analyze_coverage(fault_list_path, coverage_report_path)
    
    if "error" in analysis:
        return f"Error: {analysis['error']}"
    
    summary = analysis.get("summary", {})
    total = summary.get("total_faults", 0)
    categories = summary.get("categories", [])
    
    report_lines = [
        "=" * 80,
        "COVERAGE ANALYSIS REPORT",
        "=" * 80,
        f"\nTotal Faults: {total:,}",
        "\n--- Coverage Loss Categories ---\n"
    ]
    
    # Get top loss categories
    loss_cats = identify_top_loss_categories(fault_list_path, top_n=10)
    
    for cat in loss_cats:
        report_lines.append(
            f"  {cat['name']:15s} : {cat['count']:8,} ({cat['percentage']:6.2f}%)"
        )
    
    report_lines.extend([
        "\n--- Top Problematic Modules (AU.SEQ) ---\n"
    ])
    
    # Find top modules with sequential issues
    seq_modules = identify_problematic_modules(fault_list_path, "AU.SEQ", depth=4, top_n=5)
    for module, count in seq_modules:
        report_lines.append(f"  {count:8,} faults: {module}")
    
    report_text = "\n".join(report_lines)
    
    if output_file:
        with open(output_file, 'w') as f:
            f.write(report_text)
    
    return report_text
