"""
ATPG Coverage Analysis Skill

This module provides tools for analyzing ATPG coverage reports from Tessent.
"""

from .analyzer import CoverageAnalyzer
from .models import Fault, CoverageSummary
from .agent_interface import (
    analyze_coverage,
    identify_top_loss_categories,
    identify_problematic_modules,
    generate_coverage_report
)

__all__ = [
    'CoverageAnalyzer',
    'Fault',
    'CoverageSummary',
    'analyze_coverage',
    'identify_top_loss_categories',
    'identify_problematic_modules',
    'generate_coverage_report'
]

__version__ = '1.0.0'
