import re
import gzip
from collections import defaultdict

# Support both relative and absolute imports
try:
    from .models import Fault, CoverageSummary
except ImportError:
    from models import Fault, CoverageSummary

class CoverageAnalyzer:
    """
    Analyzes Tessent fault reports to categorize coverage loss.
    """

    def __init__(self, fault_report_path: str):
        """
        Initializes the CoverageAnalyzer with the path to the fault report.

        Args:
            fault_report_path: The path to the Tessent fault report file.
        """
        self.fault_report_path = fault_report_path
        self.faults = self._parse_fault_report()

    def _parse_fault_report(self) -> list[Fault]:
        """
        Parses the Tessent fault report to extract fault information.
        This handles both plain text and gzipped files.
        
        Expected format: <fault_value> <status> <path>
        Example: "0    AU       /reset_n"

        Returns:
            A list of Fault objects.
        """
        faults = []
        try:
            open_func = gzip.open if self.fault_report_path.endswith('.gz') else open
            mode = 'rt' if self.fault_report_path.endswith('.gz') else 'r'
            
            with open_func(self.fault_report_path, mode) as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Parse Tessent fault list format: <value> <status> <path>
                    # Example: "0    AU       /reset_n"
                    parts = line.split(None, 2)  # Split on whitespace, max 3 parts
                    if len(parts) == 3:
                        fault_value = parts[0]
                        status = parts[1]
                        path = parts[2]
                        
                        # Extract base status (e.g., "DI" from "DI.CLK")
                        base_status = status.split('.')[0] if '.' in status else status
                        
                        faults.append(Fault(
                            fault_type=f"SA{fault_value}",
                            status=status,
                            path=path
                        ))
        except FileNotFoundError:
            print(f"Error: Fault report not found at {self.fault_report_path}")
            return []
        except Exception as e:
            print(f"An error occurred while parsing: {e}")
            return []
        
        return faults

    def get_coverage_summary(self) -> CoverageSummary:
        """
        Generates a summary of coverage loss by category.

        Returns:
            A CoverageSummary object.
        """
        category_counts = defaultdict(int)
        for fault in self.faults:
            category_counts[fault.status] += 1

        total_faults = len(self.faults)
        
        return CoverageSummary(
            total_faults=total_faults,
            category_counts=dict(category_counts)
        )

    def get_hierarchical_summary(self, depth: int = 2) -> dict:
        """
        Generates a hierarchical summary of coverage loss.

        Args:
            depth: The hierarchy depth to report on.

        Returns:
            A nested dictionary with coverage loss by module.
        """
        hier_summary = defaultdict(lambda: defaultdict(int))
        for fault in self.faults:
            path_parts = fault.path.strip('/').split('/')
            module_path = '/'.join(path_parts[:depth])
            hier_summary[module_path][fault.status] += 1
            hier_summary[module_path]['total'] += 1
        
        return dict(hier_summary)
