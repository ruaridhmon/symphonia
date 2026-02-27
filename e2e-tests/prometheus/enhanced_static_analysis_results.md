# Enhanced Static Analysis Results

**Scanned:** `/tmp/test_scan`
**Files scanned:** 1
**Total issues:** 4

## Severity Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 4 | Used in JSX — crashes at runtime |
| 🟠 HIGH | 0 | Referenced — likely crash |
| 🟡 LOW | 0 | Minor issue |
| ℹ️ INFO | 0 | Informational |

## Issues by File

### 🔴 test_component.tsx

- 🔴 **Line 6**: `MessageSquare` — Icon 'MessageSquare' used in JSX but not imported from 'lucide-react' — WILL CRASH
  - Suggested fix: `import { MessageSquare } from 'lucide-react';`
- 🔴 **Line 7**: `BarChart3` — Icon 'BarChart3' used in JSX but not imported from 'lucide-react' — WILL CRASH
  - Suggested fix: `import { BarChart3 } from 'lucide-react';`
- 🔴 **Line 8**: `HelpCircle` — Icon 'HelpCircle' used in JSX but not imported from 'lucide-react' — WILL CRASH
  - Suggested fix: `import { HelpCircle } from 'lucide-react';`
- 🔴 **Line 9**: `MyCustomComponent` — Component 'MyCustomComponent' used in JSX but not imported — WILL CRASH at runtime

## Missing Icon Imports by Library

### `lucide-react`

```tsx
import { BarChart3, HelpCircle, MessageSquare } from 'lucide-react';
```

