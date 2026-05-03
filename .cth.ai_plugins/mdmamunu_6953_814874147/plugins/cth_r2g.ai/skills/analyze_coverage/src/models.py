from dataclasses import dataclass, field, asdict
from typing import Dict
import json

@dataclass
class Fault:
    """
    Represents a single fault from a Tessent report.
    """
    fault_type: str
    status: str
    path: str

@dataclass
class CoverageSummary:
    """
    Represents a summary of coverage analysis.
    """
    total_faults: int
    category_counts: Dict[str, int]

    def __str__(self):
        """
        Provides a user-friendly string representation of the summary.
        """
        if self.total_faults == 0:
            return "No faults found or report could not be parsed."

        lines = [f"Total Faults: {self.total_faults}"]
        for category, count in self.category_counts.items():
            percentage = (count / self.total_faults) * 100
            lines.append(f"  - {category}: {count} ({percentage:.2f}%)")
        
        return "\n".join(lines)
    
    def to_json(self) -> str:
        """
        Returns a JSON representation of the summary.
        """
        data = {
            "total_faults": self.total_faults,
            "categories": []
        }
        
        for category, count in self.category_counts.items():
            percentage = (count / self.total_faults) * 100 if self.total_faults > 0 else 0
            data["categories"].append({
                "name": category,
                "count": count,
                "percentage": round(percentage, 2)
            })
        
        return json.dumps(data, indent=2)
