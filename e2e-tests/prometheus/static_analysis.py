#!/usr/bin/env python3
"""
static_analysis.py — Static analysis for missing icon/component imports.

Scans React/TypeScript source files for references to identifiers that
are not imported. Specifically targets the class of bug that caused the
Symphonia crash: using a component/icon without importing it.

This catches bugs at analysis time, before any browser is needed.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class ImportIssue:
    """A detected import issue."""
    file: str
    line: int
    identifier: str
    severity: str  # "error" or "warning"
    message: str


# Known lucide-react icons (common ones that might be used without import)
LUCIDE_ICONS = {
    "AlertCircle", "AlertTriangle", "ArrowDown", "ArrowLeft", "ArrowRight",
    "ArrowUp", "BarChart", "BarChart2", "BarChart3", "Bell", "Book",
    "Calendar", "Check", "CheckCircle", "ChevronDown", "ChevronLeft",
    "ChevronRight", "ChevronUp", "Circle", "ClipboardList", "Clock",
    "Copy", "Download", "Edit", "ExternalLink", "Eye", "EyeOff",
    "File", "FileText", "Filter", "Globe", "HelpCircle", "Home",
    "Image", "Info", "Link", "Link2", "List", "Loader2", "Lock",
    "LogOut", "Mail", "MapPin", "Menu", "MessageCircle", "MessageSquare",
    "Minus", "Moon", "MoreHorizontal", "MoreVertical", "PanelRight",
    "Pencil", "Play", "Plus", "RefreshCw", "Save", "Search",
    "Send", "Settings", "Share", "Shield", "Sparkles", "Star",
    "Sun", "Trash", "Trash2", "TrendingUp", "Upload", "User",
    "Users", "X", "XCircle", "Zap",
}


def scan_file(filepath: Path) -> list[ImportIssue]:
    """Scan a single TSX/TS file for missing imports."""
    issues = []
    content = filepath.read_text()
    lines = content.split("\n")

    # Extract all imports
    imported_names = set()
    for line in lines:
        # Match: import { A, B, C } from '...'
        match = re.match(r"import\s+\{([^}]+)\}\s+from", line)
        if match:
            names = [n.strip().split(" as ")[-1].strip() for n in match.group(1).split(",")]
            imported_names.update(names)
        # Match: import X from '...'
        match = re.match(r"import\s+(\w+)\s+from", line)
        if match:
            imported_names.add(match.group(1))

    # Scan for JSX usage of identifiers that look like components
    # (PascalCase identifiers in JSX context)
    for i, line in enumerate(lines, 1):
        # Skip import lines and comments
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("//") or stripped.startswith("*"):
            continue

        # Find PascalCase identifiers used in JSX: <Component or {Component
        # Also catch Component.xxx and Component( patterns
        jsx_refs = re.findall(r'<(\b[A-Z][a-zA-Z0-9]+)\b', line)
        # Also catch bare references like: SomeIcon size={...}
        bare_refs = re.findall(r'\b([A-Z][a-zA-Z0-9]+)\s+size=', line)

        for ref in set(jsx_refs + bare_refs):
            if ref not in imported_names:
                # Check if it's a known built-in (e.g., React types)
                if ref in {"React", "HTMLDivElement", "HTMLInputElement", "Record",
                           "Partial", "Array", "Error", "Promise", "Set", "Map"}:
                    continue

                severity = "error"
                if ref in LUCIDE_ICONS:
                    msg = f"Lucide icon '{ref}' used but not imported from 'lucide-react'"
                else:
                    msg = f"Component '{ref}' used in JSX but not imported"

                issues.append(ImportIssue(
                    file=str(filepath),
                    line=i,
                    identifier=ref,
                    severity=severity,
                    message=msg,
                ))

    return issues


def scan_directory(directory: Path) -> list[ImportIssue]:
    """Scan all TSX/TS files in a directory recursively."""
    all_issues = []
    for ext in ("*.tsx", "*.ts"):
        for filepath in directory.rglob(ext):
            # Skip node_modules, test files, .d.ts
            path_str = str(filepath)
            if "node_modules" in path_str or ".d.ts" in path_str:
                continue
            issues = scan_file(filepath)
            all_issues.extend(issues)
    return all_issues


def main():
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "/Users/hephaestus/.openclaw/workspace/projects/symphonia-repo/frontend/src"
    )

    print(f"🔍 Scanning {src_dir} for missing imports...")
    issues = scan_directory(src_dir)

    if not issues:
        print("✅ No missing import issues found!")
        return 0

    # Group by file
    by_file = {}
    for issue in issues:
        by_file.setdefault(issue.file, []).append(issue)

    errors = [i for i in issues if i.severity == "error"]
    warnings = [i for i in issues if i.severity == "warning"]

    print(f"\n{'=' * 60}")
    print(f"Found {len(issues)} issue(s) in {len(by_file)} file(s)")
    print(f"  🔴 Errors: {len(errors)}")
    print(f"  🟡 Warnings: {len(warnings)}")
    print(f"{'=' * 60}\n")

    for filepath, file_issues in sorted(by_file.items()):
        rel = Path(filepath).name
        print(f"📄 {rel}")
        for issue in file_issues:
            icon = "🔴" if issue.severity == "error" else "🟡"
            print(f"  {icon} Line {issue.line}: {issue.message}")
        print()

    # Write results to file
    output_dir = Path(__file__).parent
    results_file = output_dir / "static_analysis_results.md"
    with open(results_file, "w") as f:
        f.write("# Static Analysis Results\n\n")
        f.write(f"**Scanned:** {src_dir}\n")
        f.write(f"**Total issues:** {len(issues)} ({len(errors)} errors, {len(warnings)} warnings)\n\n")
        for filepath, file_issues in sorted(by_file.items()):
            f.write(f"## {Path(filepath).name}\n\n")
            for issue in file_issues:
                f.write(f"- **Line {issue.line}**: {issue.message}\n")
            f.write("\n")
    print(f"Results written to {results_file}")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
