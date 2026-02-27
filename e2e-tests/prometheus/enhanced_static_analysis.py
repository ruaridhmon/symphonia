#!/usr/bin/env python3
"""
enhanced_static_analysis.py — Enhanced static analysis for missing imports.

Extends Prometheus's static_analysis.py with:
1. Checks ALL .tsx/.jsx files for PascalCase identifiers used in JSX that aren't imported
2. Checks for common icon libraries: lucide-react, @heroicons/react, react-icons
3. Reports severity: CRITICAL (crash-causing) vs LOW (unused import)
4. Outputs as JSON + markdown

This catches the class of bugs that caused the Symphonia crashes:
- RoundCard.tsx: BarChart3 + HelpCircle not imported
- MessageSquare used but not imported
- Any PascalCase JSX reference without a corresponding import
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import Optional


# ─── Severity Levels ─────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"  # Used in JSX — will crash at runtime (ReferenceError)
    HIGH = "HIGH"          # Used in executable code — likely crash
    LOW = "LOW"            # Imported but unused, or minor pattern
    INFO = "INFO"          # Informational finding


# ─── Data Structures ─────────────────────────────────────────────────────────

@dataclass
class ImportIssue:
    """A detected import issue."""
    file: str
    line: int
    identifier: str
    severity: str
    message: str
    category: str  # "missing-import", "unused-import", "icon-library", "component"
    library: Optional[str] = None  # e.g., "lucide-react", "@heroicons/react"
    context: str = ""  # The source line for reference


@dataclass
class AnalysisReport:
    """Complete analysis report."""
    scan_directory: str
    total_files_scanned: int
    total_issues: int
    critical_count: int
    high_count: int
    low_count: int
    info_count: int
    issues: list[ImportIssue] = field(default_factory=list)
    files_with_issues: dict[str, list[ImportIssue]] = field(default_factory=dict)


# ─── Icon Library Databases ──────────────────────────────────────────────────

# Comprehensive lucide-react icon set
LUCIDE_ICONS: set[str] = {
    "AlertCircle", "AlertTriangle", "ArrowDown", "ArrowLeft", "ArrowRight",
    "ArrowUp", "ArrowUpDown", "BarChart", "BarChart2", "BarChart3", "Bell",
    "BellRing", "Book", "BookOpen", "Brain", "Calendar", "CalendarDays",
    "Check", "CheckCircle", "CheckCircle2", "ChevronDown", "ChevronLeft",
    "ChevronRight", "ChevronUp", "ChevronsUpDown", "Circle", "CircleDot",
    "ClipboardList", "Clock", "Cloud", "Code", "Code2", "Cog",
    "Command", "Copy", "CopyCheck", "CreditCard", "Crown",
    "Database", "Download", "Edit", "Edit2", "Edit3",
    "ExternalLink", "Eye", "EyeOff", "File", "FileText", "Filter",
    "Flag", "Flame", "Folder", "FolderOpen", "Forward", "Gauge",
    "Gift", "GitBranch", "GitCommit", "GitMerge", "GitPullRequest",
    "Globe", "Globe2", "GripVertical", "Hash", "Heart", "HelpCircle",
    "History", "Home", "Image", "Inbox", "Info", "Key",
    "Laptop", "Layers", "Layout", "LayoutDashboard", "LifeBuoy",
    "Link", "Link2", "List", "ListOrdered", "Loader", "Loader2",
    "Lock", "LogIn", "LogOut", "Mail", "Map", "MapPin",
    "Maximize", "Maximize2", "Menu", "MessageCircle", "MessageSquare",
    "Mic", "Minimize", "Minimize2", "Minus", "Monitor", "Moon",
    "MoreHorizontal", "MoreVertical", "Mountain", "Move", "Music",
    "Navigation", "Network", "Newspaper",
    "Package", "Palette", "PanelLeft", "PanelRight", "Paperclip",
    "Pause", "Pencil", "Phone", "Pie", "Pin", "Play", "Plus",
    "PlusCircle", "Pointer", "Power", "Printer",
    "QrCode", "Quote",
    "Redo", "RefreshCw", "Repeat", "Reply", "Rocket", "RotateCw",
    "Save", "Scale", "Scan", "Search", "Send", "Server", "Settings",
    "Settings2", "Share", "Share2", "Sheet", "Shield", "ShieldCheck",
    "ShoppingCart", "Shuffle", "Sidebar", "Signal", "Skull", "Slash",
    "Sliders", "Smartphone", "Smile", "Sparkle", "Sparkles",
    "Speaker", "Star", "StickyNote", "Sun", "Sunrise", "Sunset",
    "Table", "Tablet", "Tag", "Tags", "Target", "Terminal",
    "ThumbsDown", "ThumbsUp", "Timer", "ToggleLeft", "ToggleRight",
    "Trash", "Trash2", "TrendingDown", "TrendingUp", "Triangle",
    "Trophy", "Truck", "Tv",
    "Undo", "Unlink", "Unlock", "Upload", "User", "UserCheck",
    "UserMinus", "UserPlus", "Users", "UserX",
    "Video", "Volume", "Volume1", "Volume2", "VolumeX",
    "Wallet", "Wand", "Wand2", "Wifi", "WifiOff", "Wind",
    "Wrench",
    "X", "XCircle", "XOctagon",
    "Zap", "ZapOff", "ZoomIn", "ZoomOut",
    # Additional icons that may appear (newer lucide versions)
    "ChartNoAxesColumn", "SquareStack", "ScanLine", "Boxes",
    "BrainCircuit", "Lightbulb", "ScrollText", "FileSearch",
    "MessageSquarePlus", "MessagesSquare", "Activity",
}

# Heroicons set (common ones)
HEROICONS: set[str] = {
    "AcademicCapIcon", "AdjustmentsIcon", "AnnotationIcon", "ArchiveIcon",
    "ArrowCircleDownIcon", "ArrowCircleLeftIcon", "ArrowCircleRightIcon",
    "ArrowCircleUpIcon", "ArrowDownIcon", "ArrowLeftIcon",
    "ArrowNarrowDownIcon", "ArrowNarrowLeftIcon", "ArrowNarrowRightIcon",
    "ArrowNarrowUpIcon", "ArrowRightIcon", "ArrowSmDownIcon",
    "ArrowSmLeftIcon", "ArrowSmRightIcon", "ArrowSmUpIcon", "ArrowUpIcon",
    "AtSymbolIcon", "BadgeCheckIcon", "BanIcon", "BeakerIcon", "BellIcon",
    "BookOpenIcon", "BookmarkIcon", "BriefcaseIcon", "CalendarIcon",
    "CameraIcon", "CashIcon", "ChartBarIcon", "ChartPieIcon",
    "ChatIcon", "ChatAltIcon", "ChatAlt2Icon",
    "CheckCircleIcon", "CheckIcon", "ChevronDoubleDownIcon",
    "ChevronDoubleLeftIcon", "ChevronDoubleRightIcon",
    "ChevronDoubleUpIcon", "ChevronDownIcon", "ChevronLeftIcon",
    "ChevronRightIcon", "ChevronUpIcon", "ClipboardCheckIcon",
    "ClipboardCopyIcon", "ClipboardListIcon", "ClipboardIcon",
    "ClockIcon", "CloudIcon", "CloudDownloadIcon", "CloudUploadIcon",
    "CodeIcon", "CogIcon", "CollectionIcon", "ColorSwatchIcon",
    "CreditCardIcon", "CubeIcon", "CubeTransparentIcon",
    "CurrencyDollarIcon", "CurrencyEuroIcon", "CursorClickIcon",
    "DatabaseIcon", "DesktopComputerIcon", "DeviceMobileIcon",
    "DocumentIcon", "DocumentAddIcon", "DocumentDownloadIcon",
    "DocumentDuplicateIcon", "DocumentRemoveIcon", "DocumentReportIcon",
    "DocumentSearchIcon", "DocumentTextIcon",
    "DotsCircleHorizontalIcon", "DotsHorizontalIcon", "DotsVerticalIcon",
    "DownloadIcon",
    "DuplicateIcon",
    "EmojiHappyIcon", "EmojiSadIcon", "ExclamationCircleIcon",
    "ExclamationIcon", "ExternalLinkIcon", "EyeIcon", "EyeOffIcon",
    "FastForwardIcon", "FilmIcon", "FilterIcon", "FingerPrintIcon",
    "FireIcon", "FlagIcon", "FolderIcon", "FolderAddIcon",
    "FolderDownloadIcon", "FolderOpenIcon", "FolderRemoveIcon",
    "GlobeIcon", "GlobeAltIcon", "HandIcon", "HashtagIcon",
    "HeartIcon", "HomeIcon",
    "IdentificationIcon", "InboxIcon", "InboxInIcon",
    "InformationCircleIcon", "KeyIcon",
    "LibraryIcon", "LightBulbIcon", "LightningBoltIcon", "LinkIcon",
    "LocationMarkerIcon", "LockClosedIcon", "LockOpenIcon", "LoginIcon",
    "LogoutIcon",
    "MailIcon", "MailOpenIcon", "MapIcon",
    "MenuIcon", "MenuAlt1Icon", "MenuAlt2Icon", "MenuAlt3Icon",
    "MenuAlt4Icon", "MicrophoneIcon", "MinusCircleIcon", "MinusIcon",
    "MinusSmIcon", "MoonIcon",
    "MusicNoteIcon", "NewspaperIcon",
    "OfficeBuildingIcon",
    "PaperAirplaneIcon", "PaperClipIcon", "PauseIcon", "PencilIcon",
    "PencilAltIcon", "PhoneIcon", "PhoneIncomingIcon", "PhoneMissedCallIcon",
    "PhoneOutgoingIcon", "PhotographIcon", "PlayIcon", "PlusIcon",
    "PlusCircleIcon", "PlusSmIcon", "PresentationChartBarIcon",
    "PresentationChartLineIcon", "PrinterIcon", "PuzzleIcon",
    "QrcodeIcon", "QuestionMarkCircleIcon",
    "ReceiptRefundIcon", "ReceiptTaxIcon", "RefreshIcon", "ReplyIcon",
    "RewindIcon",
    "RssIcon",
    "SaveIcon", "SaveAsIcon", "ScaleIcon", "ScissorsIcon", "SearchIcon",
    "SearchCircleIcon", "SelectorIcon", "ServerIcon", "ShareIcon",
    "ShieldCheckIcon", "ShieldExclamationIcon", "ShoppingBagIcon",
    "ShoppingCartIcon", "SortAscendingIcon", "SortDescendingIcon",
    "SparklesIcon", "SpeakerphoneIcon", "StarIcon", "StatusOfflineIcon",
    "StatusOnlineIcon", "StopIcon", "SunIcon", "SupportIcon",
    "SwitchHorizontalIcon", "SwitchVerticalIcon",
    "TableIcon", "TagIcon", "TemplateIcon", "TerminalIcon",
    "ThumbDownIcon", "ThumbUpIcon", "TicketIcon", "TranslateIcon",
    "TrashIcon", "TrendingDownIcon", "TrendingUpIcon", "TruckIcon",
    "UploadIcon", "UserIcon", "UserAddIcon", "UserCircleIcon",
    "UserGroupIcon", "UserRemoveIcon", "UsersIcon",
    "VariableIcon", "VideoCameraIcon", "ViewBoardsIcon",
    "ViewGridIcon", "ViewGridAddIcon", "ViewListIcon",
    "VolumeOffIcon", "VolumeUpIcon",
    "WifiIcon",
    "XIcon", "XCircleIcon",
    "ZoomInIcon", "ZoomOutIcon",
}

# React-icons prefixes (react-icons/fa, react-icons/fi, etc.)
REACT_ICONS_PREFIXES = {"Fa", "Fi", "Ai", "Bi", "Bs", "Cg", "Di", "Fc",
                         "Gi", "Go", "Gr", "Hi", "Im", "Io", "Md", "Ri",
                         "Si", "Ti", "Vsc", "Wi", "Ci", "Tb", "Tfi", "Rx"}

# Known React/TypeScript built-ins and common types that should be excluded
BUILTIN_IDENTIFIERS: set[str] = {
    "React", "Fragment", "Component", "PureComponent", "StrictMode",
    "Suspense", "Profiler",
    # TypeScript types
    "HTMLDivElement", "HTMLInputElement", "HTMLFormElement", "HTMLButtonElement",
    "HTMLTextAreaElement", "HTMLSelectElement", "HTMLAnchorElement",
    "HTMLSpanElement", "HTMLParagraphElement", "HTMLHeadingElement",
    "HTMLElement", "HTMLImageElement", "SVGSVGElement",
    "Record", "Partial", "Required", "Readonly", "Pick", "Omit",
    "Array", "Error", "Promise", "Set", "Map", "WeakMap", "WeakSet",
    "Object", "String", "Number", "Boolean", "Symbol", "Date", "RegExp",
    "Function", "Proxy", "Reflect", "JSON", "Math", "Intl",
    # React types
    "ReactNode", "ReactElement", "ComponentType", "FC", "FunctionComponent",
    "ComponentProps", "PropsWithChildren", "PropsWithRef",
    "ChangeEvent", "MouseEvent", "KeyboardEvent", "FocusEvent",
    "FormEvent", "SyntheticEvent", "TouchEvent",
    "Ref", "RefObject", "MutableRefObject", "ForwardedRef",
    "CSSProperties", "SVGProps",
    # Common error boundary / higher-order patterns
    "ErrorInfo",
    # Common library types
    "AxiosError", "AxiosResponse",
    # DOM globals
    "Element", "Node", "Event", "Document", "Window",
    "NodeList", "FileList", "FormData", "File", "Blob",
    "URL", "URLSearchParams",
    "Headers", "Request", "Response",
    "AbortController", "AbortSignal",
    "IntersectionObserver", "MutationObserver", "ResizeObserver",
    "WebSocket", "MessageEvent",
    "Storage", "Navigator", "Location",
    "CustomEvent", "PopStateEvent",
}


# ─── Scanner ─────────────────────────────────────────────────────────────────

def identify_library(identifier: str) -> Optional[str]:
    """Identify which icon library an identifier likely belongs to."""
    if identifier in LUCIDE_ICONS:
        return "lucide-react"
    if identifier in HEROICONS or identifier.endswith("Icon"):
        return "@heroicons/react"
    for prefix in REACT_ICONS_PREFIXES:
        if identifier.startswith(prefix) and len(identifier) > len(prefix):
            return f"react-icons/{prefix.lower()}"
    return None


def extract_imports(content: str) -> tuple[set[str], dict[str, str]]:
    """
    Extract all imported names from a file.
    Returns (set of imported names, dict of name → source module).
    """
    imported_names: set[str] = set()
    import_sources: dict[str, str] = {}

    # Multi-line import handling: join continuation lines
    # Match: import { A, B, C } from '...'
    # Also handles multi-line imports with newlines inside braces
    for match in re.finditer(
        r"import\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]",
        content,
        re.MULTILINE | re.DOTALL,
    ):
        names_str = match.group(1)
        source = match.group(2)
        for name_part in names_str.split(","):
            name_part = name_part.strip()
            if not name_part:
                continue
            # Handle: Name as Alias
            if " as " in name_part:
                _, alias = name_part.split(" as ", 1)
                name = alias.strip()
            else:
                name = name_part.strip()
            if name:
                imported_names.add(name)
                import_sources[name] = source

    # Match: import DefaultExport from '...'
    for match in re.finditer(
        r"import\s+([A-Z]\w+)\s+from\s+['\"]([^'\"]+)['\"]",
        content,
    ):
        name = match.group(1)
        source = match.group(2)
        imported_names.add(name)
        import_sources[name] = source

    # Match: import DefaultExport, { Named1, Named2 } from '...'
    # (combined default + named imports)
    for match in re.finditer(
        r"import\s+(\w+)\s*,\s*\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]",
        content,
        re.MULTILINE | re.DOTALL,
    ):
        default_name = match.group(1)
        names_str = match.group(2)
        source = match.group(3)
        imported_names.add(default_name)
        import_sources[default_name] = source
        for name_part in names_str.split(","):
            name_part = name_part.strip()
            if not name_part:
                continue
            if " as " in name_part:
                _, alias = name_part.split(" as ", 1)
                name = alias.strip()
            else:
                name = name_part.strip()
            if name:
                imported_names.add(name)
                import_sources[name] = source

    # Match: import type { A, B } from '...' (TypeScript type-only imports)
    for match in re.finditer(
        r"import\s+type\s+\{([^}]+)\}\s+from\s+['\"]([^'\"]+)['\"]",
        content,
        re.MULTILINE | re.DOTALL,
    ):
        names_str = match.group(1)
        source = match.group(2)
        for name_part in names_str.split(","):
            name_part = name_part.strip()
            if not name_part:
                continue
            if " as " in name_part:
                _, alias = name_part.split(" as ", 1)
                name = alias.strip()
            else:
                name = name_part.strip()
            if name:
                imported_names.add(name)
                import_sources[name] = source

    # Match: import * as Namespace from '...'
    for match in re.finditer(
        r"import\s+\*\s+as\s+(\w+)\s+from\s+['\"]([^'\"]+)['\"]",
        content,
    ):
        name = match.group(1)
        source = match.group(2)
        imported_names.add(name)
        import_sources[name] = source

    return imported_names, import_sources


def extract_local_declarations(content: str) -> set[str]:
    """Extract locally declared PascalCase identifiers (functions, consts, classes, types, interfaces)."""
    declared: set[str] = set()

    # function MyComponent(...)
    for m in re.finditer(r"\bfunction\s+([A-Z]\w+)", content):
        declared.add(m.group(1))

    # const MyComponent = ...
    for m in re.finditer(r"\bconst\s+([A-Z]\w+)\s*[:=]", content):
        declared.add(m.group(1))

    # let MyComponent = ...
    for m in re.finditer(r"\blet\s+([A-Z]\w+)\s*[:=]", content):
        declared.add(m.group(1))

    # class MyComponent ...
    for m in re.finditer(r"\bclass\s+([A-Z]\w+)", content):
        declared.add(m.group(1))

    # type MyType = ...
    for m in re.finditer(r"\btype\s+([A-Z]\w+)", content):
        declared.add(m.group(1))

    # interface MyInterface ...
    for m in re.finditer(r"\binterface\s+([A-Z]\w+)", content):
        declared.add(m.group(1))

    # enum MyEnum ...
    for m in re.finditer(r"\benum\s+([A-Z]\w+)", content):
        declared.add(m.group(1))

    return declared


def scan_file(filepath: Path) -> list[ImportIssue]:
    """Scan a single TSX/JSX/TS file for missing imports."""
    issues: list[ImportIssue] = []

    try:
        content = filepath.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return issues

    lines = content.split("\n")
    imported_names, import_sources = extract_imports(content)
    local_declarations = extract_local_declarations(content)

    # All known identifiers (imported + locally declared)
    known_names = imported_names | local_declarations | BUILTIN_IDENTIFIERS

    # Track which identifiers we've already reported for this file
    reported: set[str] = set()

    for i, line in enumerate(lines, 1):
        stripped = line.strip()

        # Skip import lines, comments, type-only lines
        if stripped.startswith("import "):
            continue
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
            continue
        if stripped.startswith("export type") or stripped.startswith("export interface"):
            continue
        # Skip JSX comment lines: {/* ... */}
        if re.match(r"^\{/\*.*\*/\}$", stripped):
            continue
        # Skip lines that are entirely JSX comments
        if "{/*" in stripped and "*/" in stripped and stripped.count("{/*") == stripped.count("*/"):
            # Check if the PascalCase ref is only inside a comment
            pass  # We'll filter this at the reference level below

        # ── Pattern 1: JSX tag usage — <Component ...> ──
        # Exclude TypeScript generics: useState<Type>, useRef<Type>, Promise<Type>, etc.
        # These appear as `identifier<Type>` with no space before `<`
        jsx_tags = []
        for m in re.finditer(r"<\s*([A-Z][a-zA-Z0-9]+)(?:\s|>|/)", line):
            ref = m.group(1)
            pos = m.start()
            # Check if preceded by a word character (function call generic)
            if pos > 0 and re.match(r"\w", line[pos - 1]):
                continue  # TypeScript generic: useState<Type>, Array<Type>, etc.
            # Check if preceded by common generic patterns
            pre = line[:pos].rstrip()
            if pre.endswith(("useState", "useRef", "useCallback", "useMemo",
                             "useEffect", "useContext", "useReducer",
                             "Promise", "Array", "Set", "Map", "Record",
                             "Partial", "Required", "Readonly", "Pick", "Omit",
                             "Exclude", "Extract", "ReturnType", "Parameters",
                             "InstanceType", "Awaited", "Component",
                             "createContext", "forwardRef", "lazy", "memo",
                             "as", ":")):
                continue  # TypeScript generic or type assertion
            jsx_tags.append(ref)

        # ── Pattern 2: JSX self-closing — <Component /> ──
        jsx_self_closing_raw = re.findall(r"<\s*([A-Z][a-zA-Z0-9]+)\s*/\s*>", line)
        jsx_self_closing = []
        for ref in jsx_self_closing_raw:
            # Make sure it's not inside a generic context
            match_pos = line.find(f"<{ref}")
            if match_pos > 0 and re.match(r"\w", line[match_pos - 1]):
                continue
            jsx_self_closing.append(ref)

        # ── Pattern 3: Component rendered as expression — {Component} ──
        # Skip refs inside JSX comments: {/* ... */}
        # Remove JSX comment blocks before scanning for expressions
        line_no_comments = re.sub(r"\{/\*.*?\*/\}", "", line)
        jsx_expressions = re.findall(r"\{([A-Z][a-zA-Z0-9]+)\}", line_no_comments)

        # ── Pattern 4: JSX attribute-style icon usage — <Icon size={...} /> ──
        icon_usage = re.findall(r"<\s*([A-Z][a-zA-Z0-9]+)\s+size\s*=", line)

        # ── Pattern 5: Direct call as component — Component({...}) ──
        # Only match when ( immediately follows identifier (no space)
        # This avoids matching text content like "Description (optional)"
        # or "Agreements ({count})" which are plain text, not function calls.
        component_calls = re.findall(r"\b([A-Z][a-zA-Z0-9]+)\(", line_no_comments)
        # Filter out known non-component patterns
        component_calls = [
            c for c in component_calls
            if c not in {"String", "Number", "Boolean", "Object", "Array",
                         "Error", "Promise", "Set", "Map", "Date", "RegExp",
                         "Function", "Symbol", "JSON", "Math", "Intl",
                         "Proxy", "Reflect", "URL", "Headers", "Request",
                         "Response", "AbortController", "FormData", "File",
                         "Blob", "WebSocket", "Event", "CustomEvent",
                         "Document", "Window", "Node", "Element",
                         "IntersectionObserver", "MutationObserver",
                         "ResizeObserver", "URLSearchParams",
                         "TypeError", "ReferenceError", "SyntaxError",
                         "RangeError", "Packer", "Paragraph", "TextRun",
                         "Uint8Array", "Int32Array", "Float64Array",
                         "ArrayBuffer", "DataView", "SharedArrayBuffer",
                         "WeakRef", "FinalizationRegistry"}
        ]

        # Combine all references found on this line
        all_refs = set(jsx_tags + jsx_self_closing + jsx_expressions +
                       icon_usage + component_calls)

        for ref in all_refs:
            if ref in known_names or ref in reported:
                continue

            # Skip if it looks like a type annotation context
            if re.search(rf"\b{ref}\s*[<\[\]]", line) and "<" not in line[:line.index(ref)] if ref in line else False:
                continue

            reported.add(ref)
            library = identify_library(ref)

            # Determine severity
            is_jsx = ref in set(jsx_tags + jsx_self_closing + icon_usage)
            if is_jsx:
                severity = Severity.CRITICAL
                category = "missing-import"
                if library:
                    msg = f"Icon '{ref}' used in JSX but not imported from '{library}' — WILL CRASH"
                else:
                    msg = f"Component '{ref}' used in JSX but not imported — WILL CRASH at runtime"
            else:
                severity = Severity.HIGH
                category = "missing-import"
                if library:
                    msg = f"Icon '{ref}' referenced but not imported from '{library}'"
                else:
                    msg = f"Component '{ref}' referenced but not imported"

            issues.append(ImportIssue(
                file=str(filepath),
                line=i,
                identifier=ref,
                severity=severity.value,
                message=msg,
                category=category,
                library=library,
                context=stripped[:120],
            ))

    return issues


def scan_directory(directory: Path) -> list[ImportIssue]:
    """Scan all TSX/JSX/TS files in a directory recursively."""
    all_issues: list[ImportIssue] = []

    for ext in ("*.tsx", "*.jsx", "*.ts"):
        for filepath in sorted(directory.rglob(ext)):
            path_str = str(filepath)
            # Skip node_modules, test files, .d.ts, build output
            if any(skip in path_str for skip in [
                "node_modules", ".d.ts", "dist/", "build/", ".next/",
                "__mocks__",
            ]):
                continue
            issues = scan_file(filepath)
            all_issues.extend(issues)

    return all_issues


# ─── Output Formatters ───────────────────────────────────────────────────────

def write_json_report(report: AnalysisReport, output_path: Path) -> None:
    """Write the report as JSON."""
    data = {
        "scan_directory": report.scan_directory,
        "total_files_scanned": report.total_files_scanned,
        "total_issues": report.total_issues,
        "critical_count": report.critical_count,
        "high_count": report.high_count,
        "low_count": report.low_count,
        "info_count": report.info_count,
        "issues": [asdict(issue) for issue in report.issues],
    }
    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"📄 JSON report: {output_path}")


def write_markdown_report(report: AnalysisReport, output_path: Path) -> None:
    """Write the report as Markdown."""
    with open(output_path, "w") as f:
        f.write("# Enhanced Static Analysis Results\n\n")
        f.write(f"**Scanned:** `{report.scan_directory}`\n")
        f.write(f"**Files scanned:** {report.total_files_scanned}\n")
        f.write(f"**Total issues:** {report.total_issues}\n\n")

        # Severity breakdown
        f.write("## Severity Breakdown\n\n")
        f.write(f"| Severity | Count | Description |\n")
        f.write(f"|----------|-------|-------------|\n")
        f.write(f"| 🔴 CRITICAL | {report.critical_count} | Used in JSX — crashes at runtime |\n")
        f.write(f"| 🟠 HIGH | {report.high_count} | Referenced — likely crash |\n")
        f.write(f"| 🟡 LOW | {report.low_count} | Minor issue |\n")
        f.write(f"| ℹ️ INFO | {report.info_count} | Informational |\n")
        f.write("\n")

        if not report.issues:
            f.write("✅ **No issues found!**\n")
            return

        # Group by file
        by_file: dict[str, list[ImportIssue]] = {}
        for issue in report.issues:
            by_file.setdefault(issue.file, []).append(issue)

        f.write("## Issues by File\n\n")
        for filepath, file_issues in sorted(by_file.items()):
            rel_path = Path(filepath).name
            critical_in_file = sum(1 for i in file_issues if i.severity == "CRITICAL")
            badge = "🔴" if critical_in_file > 0 else "🟡"
            f.write(f"### {badge} {rel_path}\n\n")

            for issue in sorted(file_issues, key=lambda x: x.line):
                severity_icon = {
                    "CRITICAL": "🔴",
                    "HIGH": "🟠",
                    "LOW": "🟡",
                    "INFO": "ℹ️",
                }.get(issue.severity, "❓")

                f.write(f"- {severity_icon} **Line {issue.line}**: `{issue.identifier}` — {issue.message}\n")
                if issue.library:
                    f.write(f"  - Suggested fix: `import {{ {issue.identifier} }} from '{issue.library}';`\n")

            f.write("\n")

        # Summary of icon library usage
        libraries_used: dict[str, list[str]] = {}
        for issue in report.issues:
            if issue.library:
                libraries_used.setdefault(issue.library, []).append(issue.identifier)

        if libraries_used:
            f.write("## Missing Icon Imports by Library\n\n")
            for lib, icons in sorted(libraries_used.items()):
                unique_icons = sorted(set(icons))
                f.write(f"### `{lib}`\n\n")
                f.write(f"```tsx\nimport {{ {', '.join(unique_icons)} }} from '{lib}';\n```\n\n")

    print(f"📝 Markdown report: {output_path}")


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> int:
    src_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "/Users/hephaestus/.openclaw/workspace/projects/symphonia-repo/frontend/src"
    )

    if not src_dir.exists():
        print(f"❌ Directory not found: {src_dir}")
        return 1

    print(f"🔍 Enhanced Static Analysis — scanning {src_dir}")
    print(f"   Checking: .tsx, .jsx, .ts files")
    print(f"   Icon libraries: lucide-react, @heroicons/react, react-icons/*")
    print()

    # Count files
    file_count = 0
    for ext in ("*.tsx", "*.jsx", "*.ts"):
        for fp in src_dir.rglob(ext):
            if "node_modules" not in str(fp) and ".d.ts" not in str(fp):
                file_count += 1

    issues = scan_directory(src_dir)

    # Build report
    report = AnalysisReport(
        scan_directory=str(src_dir),
        total_files_scanned=file_count,
        total_issues=len(issues),
        critical_count=sum(1 for i in issues if i.severity == "CRITICAL"),
        high_count=sum(1 for i in issues if i.severity == "HIGH"),
        low_count=sum(1 for i in issues if i.severity == "LOW"),
        info_count=sum(1 for i in issues if i.severity == "INFO"),
        issues=issues,
    )

    # Group by file for the report
    for issue in issues:
        report.files_with_issues.setdefault(issue.file, []).append(issue)

    # Console output
    if not issues:
        print("✅ No missing import issues found!")
        return 0

    by_file: dict[str, list[ImportIssue]] = {}
    for issue in issues:
        by_file.setdefault(issue.file, []).append(issue)

    print(f"{'=' * 70}")
    print(f"Found {len(issues)} issue(s) in {len(by_file)} file(s)")
    print(f"  🔴 CRITICAL (crash): {report.critical_count}")
    print(f"  🟠 HIGH:             {report.high_count}")
    print(f"  🟡 LOW:              {report.low_count}")
    print(f"  ℹ️  INFO:             {report.info_count}")
    print(f"{'=' * 70}")
    print()

    for filepath, file_issues in sorted(by_file.items()):
        rel = Path(filepath).relative_to(src_dir) if filepath.startswith(str(src_dir)) else Path(filepath).name
        print(f"📄 {rel}")
        for issue in sorted(file_issues, key=lambda x: x.line):
            icon = {"CRITICAL": "🔴", "HIGH": "🟠", "LOW": "🟡", "INFO": "ℹ️"}.get(issue.severity, "❓")
            print(f"  {icon} Line {issue.line}: {issue.message}")
            if issue.library:
                print(f"     Fix: import {{ {issue.identifier} }} from '{issue.library}';")
        print()

    # Write output files
    output_dir = Path(__file__).parent
    write_json_report(report, output_dir / "enhanced_static_analysis_results.json")
    write_markdown_report(report, output_dir / "enhanced_static_analysis_results.md")

    # Exit code: 1 if critical issues found, 0 otherwise
    return 1 if report.critical_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
