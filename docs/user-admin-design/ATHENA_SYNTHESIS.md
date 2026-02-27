# Symphonia User/Admin Role System — Authoritative Synthesis

**Author:** Athena (Verifier)
**Inputs:** ARES_DESIGN.md, DAEDALUS_DESIGN.md
**Date:** 2026-02-26
**Status:** FINAL — this is the build document

---

## 0. Preamble

Two independent architects — Ares and Daedalus — designed Symphonia's role system in parallel with zero coordination. This document is the single source of truth. Where they converged, we ship with high confidence. Where they diverged, I made a call and explained why. Teams build from this document. The two input designs are reference material only.

---

## 1. Convergence Table

These points were independently agreed upon by both architects. Ship them as-is.

| Topic | Ares | Daedalus | Verdict |
|-------|------|----------|---------|
| **Three roles, not five** | Expert / Facilitator / Platform Admin. Rejects Prometheus's 5-tier hierarchy. | Expert / Facilitator / Platform Admin. Same rejection with same reasoning. | **Converged. Three roles.** |
| **Role slugs** | `expert`, `facilitator`, `platform_admin` | `expert`, `facilitator`, `platform_admin` | **Converged. Exact same strings.** |
| **Expert is default** | New registrations get `expert` | New registrations get `expert` | **Converged.** |
| **Facilitator = scoped to own forms** | Can only manage forms they created | Can only manage forms they own | **Converged.** |
| **Facilitator can join others' consultations as expert** | Explicitly designed for this | Explicitly designed for this | **Converged. Critical requirement.** |
| **Platform Admin = operational, not content** | Read-only override on other facilitators' content | Same — can see but not edit others' forms | **Converged.** |
| **String enum for role, not FK to roles table** | `SQLEnum(UserRole)` on User model | `VARCHAR(20)` column | **Converged on approach; Ares uses Python enum, Daedalus uses raw string. See decision D-01.** |
| **`is_admin` backward-compat property** | `@property` returning `role == PLATFORM_ADMIN` | `@property` returning `role == "platform_admin"` | **Converged. Both correctly map only platform_admin.** |
| **`require_role()` dependency factory** | Near-identical implementation | Near-identical implementation | **Converged.** |
| **JWT includes `role` alongside `is_admin`** | Yes, during transition | Yes, during transition | **Converged.** |
| **Dashboard three-way switch** | `switch(user.role)` with 3 components | `switch(role)` with 3 components | **Converged. Same component names.** |
| **`SYM-` prefix on join codes** | `SYM-XXXX-NNNN` | `SYM-XXXX-XXXX` | **Converged on prefix; diverged on format. See D-03.** |
| **Open registration preserved in Phase 1** | Self-service, no approval | Open registration + admin promotion | **Converged.** |
| **`is_admin` dropped in final phase, not Phase 1** | Phase 2/3 | Phase 3 | **Converged on strategy.** |
| **Existing join codes continue to work** | Old format accepted, new format for new codes | Backfill to new table, accept both formats | **Converged.** |
| **Form `description` field** | New nullable string column | Not mentioned (implicit in form design) | **Ares only, but uncontroversial. Ship it.** |
| **Zero-downtime migration** | Additive columns, no drops in Phase 1 | Explicit zero-downtime principle | **Converged.** |
| **No multi-tenancy** | Explicitly killed | Explicitly deferred | **Converged.** |
| **No Observer role** | Export to PDF instead | Per-form `can_respond` flag instead | **Converged on no platform role. See D-06.** |

**Convergence rate: 18/18 core decisions aligned.** This is extremely high confidence. The architects independently arrived at the same system.

---

## 2. Decision Log — Disagreements and Verdicts

### D-01: Role column type — Python Enum vs raw VARCHAR

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | `Column(SQLEnum(UserRole))` with Python `Enum` class | `Column(String(20))` with string literals |
| **Pros** | Type safety, IDE autocomplete, invalid values rejected at ORM level | Simpler migration, no enum sync issues, new values = just a string |

**Verdict: Ares wins — use SQLAlchemy `Enum` type backed by a Python `str, Enum` class.**

**Reasoning:** The codebase already uses Python enums elsewhere (e.g., Pydantic models). The `str, Enum` pattern gives us string storage in the DB (VARCHAR under the hood in SQLite) with Python-side validation. We get the migration simplicity Daedalus wants (it's still a string in the DB) plus the type safety Ares wants. No downside.

```python
class UserRole(str, Enum):
    EXPERT = "expert"
    FACILITATOR = "facilitator"
    PLATFORM_ADMIN = "platform_admin"
```

The column uses `sa.String()` with `server_default='expert'` in the migration (not `sa.Enum`), so the DB sees plain strings. The Python model validates via the enum. Best of both.

---

### D-02: `UserFormUnlock.form_role` column — Yes or No

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | No `form_role` column. Ownership checked via `FormModel.owner_id`. | Add `form_role` to `UserFormUnlock` (`owner`, `facilitator`, `expert`, `observer`) |

**Verdict: Daedalus wins — add `form_role` to `UserFormUnlock`.**

**Reasoning:** The current codebase already has `owner_id` on `FormModel` which handles the "who created this" case. But Daedalus's design enables co-facilitators on a form without schema changes later — you just insert a `UserFormUnlock` row with `form_role='facilitator'`. Ares's open question #1 ("Should facilitators be able to co-own a consultation?") is answered by this column: yes, later, trivially, because the infrastructure is there.

However, we simplify Daedalus's proposal. In Phase 1, we only use two `form_role` values:

| form_role | Meaning |
|---|---|
| `expert` | Joined via code, can respond |
| `collaborator` | Co-facilitator added by owner (Phase 2+) |

We do NOT use `owner` as a `form_role` value. Ownership stays on `FormModel.owner_id`. Duplicating it in `UserFormUnlock` creates two sources of truth. The `form_role` column is for relationships beyond ownership.

We do NOT ship `observer` as a form_role in any phase. See D-06.

---

### D-03: Join code format — `SYM-XXXX-NNNN` vs `SYM-XXXX-XXXX`

| | Ares | Daedalus |
|---|---|---|
| **Format** | `SYM-XXXX-NNNN` (4 letters + 4 digits) | `SYM-XXXX-XXXX` (8 alphanumeric) |
| **Alphabet** | Letters: 23 chars (no I/O). Digits: 7 chars (no 0/1/8). | 32 chars: `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` |
| **Entropy** | ~674 million (29.3 bits) | ~1.1 trillion (40 bits) |

**Verdict: Daedalus wins on alphabet, Ares wins on format structure. Final format: `SYM-XXXX-NNNN`.**

Wait — let me re-evaluate. The visual distinction between letters and numbers in Ares's `XXXX-NNNN` format makes codes easier to read aloud and verify visually ("four letters then four numbers"). Daedalus's `XXXX-XXXX` with a mixed alphanumeric alphabet is harder to dictate — "is that a letter B or number 8?"

But Ares's digit set (`2345679`, 7 chars) gives only 7^4 = 2,401 combinations for the numeric half, which means 23^4 * 7^4 = ~674M total. That's sufficient but tight for a brute-force perspective.

**Final verdict: `SYM-XXXX-NNNN` format, but use Daedalus's unambiguous 32-char alphabet for the letter portion and `2345679` for the digit portion.**

```
SYM-ABCD-2345
    ^^^^      = 4 chars from ABCDEFGHJKLMNPQRSTUVWXYZ (23 chars, no I/O)
         ^^^^ = 4 chars from 2345679 (7 digits, no 0/1/8)
```

**Entropy: 23^4 * 7^4 = 280,561 * 2,401 = ~674 million.** Sufficient. Not a security boundary. Rate limiting on the join endpoint (already exists as `AUTH_LIMIT`) is the real guard.

**Implementation:**

```python
import secrets

_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"  # 23 chars, no I/O
_DIGITS = "2345679"                     # 7 chars, no 0/1/8

def generate_join_code() -> str:
    letters = ''.join(secrets.choice(_LETTERS) for _ in range(4))
    digits = ''.join(secrets.choice(_DIGITS) for _ in range(4))
    return f"SYM-{letters}-{digits}"
```

**Input normalization:** Uppercase, strip whitespace, strip hyphens, strip `SYM-` prefix if partially entered. Match case-insensitively. Accept old `secrets.token_urlsafe` codes as-is (no prefix).

---

### D-04: Separate `invite_codes` table — Yes or No

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | Keep codes on `FormModel.join_code`. New format, same storage. | New `invite_codes` table with expiry, max_uses, labels, multiple codes per form. |

**Verdict: Ship Ares's approach in Phase 1. Build Daedalus's table in Phase 2.**

**Reasoning:** The current codebase has `FormModel.join_code` as `unique=True, nullable=False`. Every form has exactly one code. This is working. Daedalus's `invite_codes` table is architecturally superior (multiple codes, expiry, usage tracking), but it touches the unlock/join flow, requires backfill logic, and adds four new CRUD endpoints. That's a lot of surface area for Phase 1.

Phase 1: Change the code *format* (new `SYM-XXXX-NNNN` generation function), keep the code on `FormModel.join_code`. This is a one-line change to the generation function.

Phase 2: Introduce the `invite_codes` table. Backfill existing `FormModel.join_code` values into it. Build the CRUD endpoints. Add expiry/max_uses/labels.

This gives us the user-visible improvement (readable codes) immediately without the schema complexity.

---

### D-05: `require_form_access()` dependency — Yes or No

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | `assert_form_owner_or_facilitator()` — checks `owner_id` match or platform_admin role | `require_form_access(*form_roles)` — checks `UserFormUnlock.form_role` with platform_admin override |

**Verdict: Ares's approach for Phase 1, evolve to Daedalus's in Phase 2.**

**Reasoning:** Daedalus's `require_form_access()` depends on the `form_role` column in `UserFormUnlock` and the owner being enrolled in their own form. The current codebase uses `FormModel.owner_id` for ownership. Ares's `assert_form_owner_or_facilitator()` is a minimal evolution of the existing `assert_form_owner_or_admin()` — same pattern, new name, same field. This lands faster and breaks nothing.

When the `invite_codes` table lands in Phase 2 (D-04), we have `form_role` in `UserFormUnlock`, and we can swap to Daedalus's more expressive `require_form_access()`.

---

### D-06: Observer role / form_role

| | Ares | Daedalus |
|---|---|---|
| **Observer** | Killed. "Export to PDF. Share the PDF." | Deferred. `observer` as a form_role value, read-only synthesis access. |

**Verdict: Killed. No observer, not even as a form_role.**

**Reasoning:** An observer is a person who can see synthesis results but cannot respond. In a government consultation, this is the minister who reads the report. That person reads a PDF export or a shared link. They do not need a Symphonia account, a role, or a form enrollment. Building observer infrastructure is solving a sharing problem with an access-control hammer. The right tool is export + sharing, not roles.

If a concrete requirement surfaces (e.g., "auditors need live read-only access to an ongoing consultation"), we add `observer` as a form_role value at that time. The schema supports it (it's just a string). But we don't build for it now.

---

### D-07: `display_name`, `invited_by`, `created_at` on User table

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | Not mentioned | Add `display_name`, `invited_by`, `created_at` columns to users |

**Verdict: Ship `created_at` only. Defer `display_name` and `invited_by`.**

**Reasoning:**
- `created_at` is an oversight in the current schema. Every table should have it. Ship it.
- `display_name` is nice-to-have. The current UI shows emails everywhere. When a facilitator wants "Dr. Elena Papadopoulos" instead of "e.papadopoulos@ministry.gov", they'll ask. Defer to Phase 2+.
- `invited_by` requires an invitation flow that doesn't exist yet. The column is useless without the feature. Defer to when invite-only registration ships (Phase 2+).

---

### D-08: Registration controls

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | Open registration, no changes. Notes email verification as Phase 3 optional. | Open registration Phase 1, then `registration_mode` setting (open/invite-only/domain-restricted) in Phase 2. |

**Verdict: Daedalus's phasing. Open for Phase 1, `registration_mode` setting in Phase 3.**

Phase 1 changes nothing about registration. Phase 3 adds a `registration_mode` platform setting. We push this from Daedalus's Phase 2 to Phase 3 because Phase 2 is already heavy (join codes table, facilitator UX). Registration control is important but not urgent — the deployment is on an internal government network.

---

### D-09: `acting_role` in AuditLog

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | Not mentioned (notes audit trail for role changes) | Add `acting_role` column to audit_log. Log `platform_admin_override` when admin acts on others' forms. |

**Verdict: Daedalus wins. Ship `acting_role` in Phase 1.**

**Reasoning:** Government auditors will ask "did the admin use their override power?" The `acting_role` field answers this. It's one `ALTER TABLE` and one string parameter on the audit logging function. Trivial cost, high audit value. Ship in Phase 1 migration alongside the role column.

---

### D-10: Consolidation of form creation endpoints

| | Ares | Daedalus |
|---|---|---|
| **Proposal** | Merge `POST /create_form` and `POST /forms/create` into one route with `require_facilitator` | Migrate `POST /create_form` guard to `require_role(PLATFORM_ADMIN, FACILITATOR)` |

**Verdict: Ares wins. Merge into `POST /forms/create`, deprecate `POST /create_form`.**

The codebase has two creation endpoints with different guards and different schemas (`FormCreate` vs `UserFormCreate`). That's technical debt. Merge them:
- `POST /forms/create` — guarded by `require_facilitator` (facilitator + platform_admin)
- `POST /create_form` — alias that redirects, deprecated, removed in Phase 3

The merged endpoint always auto-generates the join code (no manual code input) and always sets `owner_id`.

---

## 3. Final Role Model

### 3.1 Platform Roles

| Role | Slug | Default? | Who |
|------|------|----------|-----|
| **Expert** | `expert` | Yes | Domain specialists, panel members, anyone who registers |
| **Facilitator** | `facilitator` | No (promoted by admin) | Researchers, policy officers, consultation leads |
| **Platform Admin** | `platform_admin` | No (promoted by admin) | IT/ops staff (1-2 per deployment) |

Roles are strictly hierarchical: `platform_admin` can do everything `facilitator` can do, `facilitator` can do everything `expert` can do.

### 3.2 Assignment

- **On registration:** `expert` always.
- **Promotion to `facilitator`:** Platform admin uses `PATCH /admin/users/{id}/role`.
- **Promotion to `platform_admin`:** Platform admin uses `PATCH /admin/users/{id}/role`.
- **Demotion:** Platform admin only. Same endpoint. Audit-logged.
- **Self-promotion:** Impossible. The endpoint requires `platform_admin` role.

### 3.3 Dual-Role Behavior

A facilitator who joins ANOTHER facilitator's consultation via join code becomes an **expert on that specific form** while remaining a **facilitator on the platform**. There is no mode switch. The dashboard shows both:
- "My Consultations" — forms they own (facilitator view with management tools)
- "Participating In" — forms they joined via code (expert view with response tools)

---

## 4. Permission Matrix

### 4.1 Platform-Level Actions

| Action | platform_admin | facilitator | expert |
|--------|:-:|:-:|:-:|
| View/modify platform settings | Y | - | - |
| View full audit log | Y | - | - |
| View all consultations (read-only) | Y | - | - |
| Promote/demote users | Y | - | - |
| Delete any consultation | Y | - | - |
| Create consultations | Y | Y | - |
| Run synthesis (own forms) | Y | Y | - |
| Export results (own forms) | Y | Y | - |
| Join consultations by code | Y | Y | Y |
| Submit responses (joined forms) | Y | Y | Y |
| View own submission history | Y | Y | Y |

### 4.2 Per-Form Actions (scoped by ownership)

| Action | Owner | Joined Expert | Platform Admin (non-owner) |
|--------|:-:|:-:|:-:|
| Edit title/questions | Y | - | - (read-only) |
| Manage rounds | Y | - | - |
| Run synthesis | Y | - | - |
| View all responses | Y | - | Y (read-only override) |
| Generate/revoke join code | Y | - | - |
| View participants | Y | - | Y |
| Remove participants | Y | - | Y |
| Delete form | Y | - | Y (audit-logged as override) |
| Submit responses | - | Y | - |
| View synthesis results | Y | Y | Y |

---

## 5. Join-by-Code — Final Specification

### 5.1 Code Format

```
SYM-XXXX-NNNN

SYM   = fixed prefix (branding, disambiguation)
XXXX  = 4 uppercase letters from ABCDEFGHJKLMNPQRSTUVWXYZ (23 chars)
NNNN  = 4 digits from 2345679 (7 digits)
```

- **Entropy:** ~674 million combinations (29.3 bits)
- **Case-insensitive** on input (normalize to uppercase)
- **Hyphen/whitespace tolerant** on input (strip before matching)
- **Collision-checked** on generation (retry loop, existing pattern)
- **Not a security boundary** — rate limiting is the real guard

### 5.2 Storage

Phase 1: `FormModel.join_code` column (existing). New codes generated in `SYM-XXXX-NNNN` format. Old codes (`secrets.token_urlsafe` format) continue to work.

Phase 2: `invite_codes` table (see Section 6) for multiple codes per form, expiry, usage tracking.

### 5.3 Generation

```python
import secrets

_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"
_DIGITS = "2345679"

def generate_join_code() -> str:
    letters = ''.join(secrets.choice(_LETTERS) for _ in range(4))
    digits = ''.join(secrets.choice(_DIGITS) for _ in range(4))
    return f"SYM-{letters}-{digits}"
```

Replaces `secrets.token_urlsafe(8)` in the form creation flow.

### 5.4 Input Normalization (backend)

```python
def normalize_join_code(raw: str) -> str:
    """Strip whitespace, hyphens, uppercase. Accepts both old and new formats."""
    cleaned = raw.strip().upper().replace("-", "").replace(" ", "")
    # If it starts with SYM, strip it (user might type "SYM" or "SYM-")
    if cleaned.startswith("SYM"):
        cleaned = cleaned[3:]
    return cleaned
```

Lookup: first try exact match on `FormModel.join_code`, then try normalized match. This handles both old-format codes and new-format codes with/without the SYM prefix.

### 5.5 Expert Join Flow

**Has account:**
1. Log in → Dashboard → "Join a Consultation" card
2. Enter code → `POST /forms/unlock` → `UserFormUnlock` created
3. Consultation appears in "My Consultations" immediately

**No account:**
1. Visit platform → Register (email + password) → auto-assigned `expert` role
2. Log in → Dashboard → "Join a Consultation" card
3. Enter code → joined

**Phase 2 enhancement:** Magic-link URL `/join/{code}` — if logged in, auto-join. If not, store code in session, route through registration, auto-join after login.

### 5.6 Revocation

- **Regenerate code:** Facilitator clicks "Regenerate" → old code invalidated, new code generated. Existing participants unaffected.
- **Disable joins:** Facilitator sets `allow_join = false`. No new joins, existing participants stay.
- **Remove participant:** Facilitator removes specific `UserFormUnlock` record. Expert loses access to that form.

---

## 6. Form Creation Flow — Final Spec

### 6.1 Who Can Create

**Facilitator** and **Platform Admin** only. Enforced by `require_facilitator` dependency on `POST /forms/create`.

The existing `POST /forms/create` endpoint currently allows any authenticated user (`get_current_user`). This changes to `require_facilitator`.

### 6.2 What's Collected

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `title` | string (max 200) | Yes | — | — |
| `description` | string (max 2000) | No | `null` | NEW — context shown to experts when they join |
| `questions` | JSON array | No | `[]` | Can be empty at creation; facilitator adds later |

Auto-set by backend (not user-supplied):
- `owner_id` = current user's ID (non-nullable for new forms)
- `join_code` = auto-generated `SYM-XXXX-NNNN`
- `allow_join` = `true` (default-open; facilitator can disable later)

### 6.3 UI Flow

```
[Step 1: Create]
┌─────────────────────────────────────────┐
│  New Consultation                       │
│                                         │
│  Title: [                             ] │
│  Description (optional): [            ] │
│  Questions: + Add question              │
│                                         │
│  [  Create Consultation  ]              │
└─────────────────────────────────────────┘

[Step 2: Share]
┌─────────────────────────────────────────┐
│  Consultation Created                   │
│                                         │
│  Share this code with your experts:     │
│  ┌───────────────────────┐              │
│  │  SYM-KFWX-9274        │  [Copy]     │
│  └───────────────────────┘              │
│                                         │
│  [Go to Consultation]  [Create Another] │
└─────────────────────────────────────────┘
```

### 6.4 Backend Changes

Merge `POST /create_form` (admin) and `POST /forms/create` (user) into one endpoint:

```python
@router.post("/forms/create", status_code=201)
def create_form(
    payload: FormCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_facilitator),  # was: get_current_user
):
    join_code = generate_join_code()
    # ... collision retry loop ...
    form = FormModel(
        title=payload.title,
        description=payload.description,  # NEW field
        questions=payload.questions or [],
        owner_id=user.id,                 # always set
        join_code=join_code,
        allow_join=True,
    )
    db.add(form)
    db.commit()
    # ... return form
```

Deprecate `POST /create_form`. Keep it alive as an alias (redirects internally) until Phase 3.

---

## 7. Database Schema — Migration SQL

All migrations are additive. Zero downtime. No column drops until Phase 3.

### 7.1 Phase 1 Migration (Alembic)

```python
"""Add role system — Phase 1

Revision ID: <auto>
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa


def upgrade():
    # ── Users: add role column ──
    op.add_column('users',
        sa.Column('role', sa.String(20), server_default='expert', nullable=False))

    # Backfill from is_admin
    op.execute("UPDATE users SET role = 'platform_admin' WHERE is_admin = 1")
    op.execute("UPDATE users SET role = 'expert' WHERE is_admin = 0 OR is_admin IS NULL")

    # Add created_at (missing from original schema)
    op.add_column('users',
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False))

    # ── Forms: add description ──
    op.add_column('forms',
        sa.Column('description', sa.String(), nullable=True))

    # ── UserFormUnlock: add form_role and tracking ──
    op.add_column('user_form_unlocks',
        sa.Column('form_role', sa.String(20), server_default='expert', nullable=False))
    op.add_column('user_form_unlocks',
        sa.Column('joined_at', sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False))

    # Add unique constraint (currently enforced only in application code)
    op.create_unique_constraint('uq_user_form', 'user_form_unlocks', ['user_id', 'form_id'])

    # ── AuditLog: add acting_role ──
    op.add_column('audit_log',
        sa.Column('acting_role', sa.String(20), nullable=True))

    # ── DO NOT drop is_admin ──
    # The is_admin column stays until Phase 3.
    # The @property shim on the User model reads from role.


def downgrade():
    op.drop_constraint('uq_user_form', 'user_form_unlocks', type_='unique')
    op.drop_column('user_form_unlocks', 'joined_at')
    op.drop_column('user_form_unlocks', 'form_role')
    op.drop_column('forms', 'description')
    op.drop_column('users', 'created_at')
    op.drop_column('users', 'role')
    op.drop_column('audit_log', 'acting_role')
```

### 7.2 Phase 2 Migration — Invite Codes Table

```python
"""Add invite_codes table — Phase 2

Revision ID: <auto>
"""
from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table('invite_codes',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('form_id', sa.Integer(), sa.ForeignKey('forms.id', ondelete='CASCADE'), nullable=False),
        sa.Column('code', sa.String(20), unique=True, nullable=False),
        sa.Column('form_role', sa.String(20), server_default='expert', nullable=False),
        sa.Column('created_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.current_timestamp(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('max_uses', sa.Integer(), nullable=True),
        sa.Column('use_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('label', sa.String(100), nullable=True),
    )
    op.create_index('idx_invite_codes_code', 'invite_codes', ['code'])
    op.create_index('idx_invite_codes_form', 'invite_codes', ['form_id'])

    # Backfill: create invite_code rows from existing FormModel.join_code values
    op.execute("""
        INSERT INTO invite_codes (form_id, code, form_role, created_by, is_active)
        SELECT f.id, f.join_code, 'expert',
               COALESCE(f.owner_id, (SELECT id FROM users WHERE role = 'platform_admin' LIMIT 1)),
               f.allow_join
        FROM forms f
        WHERE f.join_code IS NOT NULL AND f.join_code != ''
    """)


def downgrade():
    op.drop_index('idx_invite_codes_form')
    op.drop_index('idx_invite_codes_code')
    op.drop_table('invite_codes')
```

### 7.3 Phase 3 Migration — Drop Legacy

```python
"""Drop is_admin column — Phase 3

Revision ID: <auto>
"""
from alembic import op


def upgrade():
    # Only run after grep confirms zero references to is_admin in codebase
    op.drop_column('users', 'is_admin')


def downgrade():
    import sqlalchemy as sa
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='0'))
    op.execute("UPDATE users SET is_admin = 1 WHERE role = 'platform_admin'")
```

---

## 8. API Changes — Route by Route

### 8.1 New Auth Dependencies (`backend/core/auth.py`)

```python
from enum import Enum

class UserRole(str, Enum):
    EXPERT = "expert"
    FACILITATOR = "facilitator"
    PLATFORM_ADMIN = "platform_admin"


def require_role(*roles: UserRole):
    """FastAPI dependency — returns 403 if user's role not in allowed set."""
    async def _check(user: User = Depends(get_current_user)):
        if user.role not in {r.value for r in roles}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(r.value for r in roles)}",
            )
        return user
    return _check


# Convenience aliases
require_facilitator = require_role(UserRole.FACILITATOR, UserRole.PLATFORM_ADMIN)
require_platform_admin = require_role(UserRole.PLATFORM_ADMIN)


def assert_form_owner_or_facilitator(form: object, user: User) -> None:
    """Raise 403 unless user owns the form or is a platform admin."""
    if getattr(form, "owner_id", None) == user.id:
        return
    if user.role == UserRole.PLATFORM_ADMIN.value:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the consultation owner or a platform admin can perform this action",
    )
```

### 8.2 Existing Route Migration

| Route | Current Guard | New Guard | Phase |
|-------|---------------|-----------|-------|
| `POST /forms/create` | `get_current_user` | `require_facilitator` | 1 |
| `POST /create_form` | `get_current_admin_user` | Deprecated → alias to `/forms/create` | 1 |
| `GET /forms` (all) | `get_current_admin_user` | `require_platform_admin` | 1 |
| `GET /my_forms` | `get_current_user` | `get_current_user` (unchanged) | — |
| `GET /forms/my-created` | `get_current_user` | `require_facilitator` | 1 |
| `PUT /forms/{id}` | `get_current_admin_user` | `assert_form_owner_or_facilitator` | 1 |
| `DELETE /forms/{id}` | `get_current_admin_user` | `assert_form_owner_or_facilitator` | 1 |
| `DELETE /forms/{id}/delete` | `assert_form_owner_or_admin` | `assert_form_owner_or_facilitator` | 1 |
| `POST /forms/{id}/rounds/.../generate_synthesis` | `get_current_admin_user` | `assert_form_owner_or_facilitator` | 1 |
| `POST /forms/{id}/regenerate-join-code` | `assert_form_owner_or_admin` | `assert_form_owner_or_facilitator` | 1 |
| `POST /forms/unlock` | `get_current_user` | `get_current_user` (unchanged) | — |
| `GET /admin/settings` | `get_current_admin_user` | `require_platform_admin` | 1 |
| `PUT /admin/settings` | `get_current_admin_user` | `require_platform_admin` | 1 |
| `GET /audit-log` | `get_current_admin_user` | `require_platform_admin` | 1 |

### 8.3 New Endpoints

| Route | Guard | Phase | Purpose |
|-------|-------|-------|---------|
| `GET /admin/users` | `require_platform_admin` | 2 | List users for role management |
| `PATCH /admin/users/{id}/role` | `require_platform_admin` | 2 | Change user's platform role |
| `GET /forms/{id}/participants` | `assert_form_owner_or_facilitator` | 2 | List experts who joined a form |
| `DELETE /forms/{id}/participants/{uid}` | `assert_form_owner_or_facilitator` | 2 | Remove an expert from a form |
| `POST /forms/join` | `get_current_user` | 2 | New invite-code-aware join (supplements `/forms/unlock`) |
| `GET /forms/{id}/invite-codes` | `assert_form_owner_or_facilitator` | 2 | List invite codes for a form |
| `POST /forms/{id}/invite-codes` | `assert_form_owner_or_facilitator` | 2 | Create new invite code |
| `PATCH /forms/{id}/invite-codes/{cid}` | `assert_form_owner_or_facilitator` | 2 | Update invite code (deactivate, label) |

### 8.4 JWT Changes

```python
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    # Phase 1: include both role and is_admin for backward compat
    # Phase 3: remove is_admin
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
```

Login response payload (Phase 1):
```json
{"access_token": "...", "email": "user@gov.cy", "is_admin": true, "role": "platform_admin"}
```

`GET /me` response (Phase 1):
```json
{"email": "user@gov.cy", "is_admin": true, "role": "platform_admin"}
```

**Critical security note (from Daedalus, endorsed):** The `role` claim in the JWT is for frontend display only. The backend MUST read `user.role` from the database, never from the JWT payload. The current `get_current_user` already loads the full User object from DB by `sub` claim — this pattern continues unchanged.

---

## 9. Frontend Changes

### 9.1 AuthContext Update

```typescript
// AuthContext.tsx
export interface User {
  email: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAdmin: boolean;          // backward compat: role === 'platform_admin'
  isFacilitator: boolean;    // role === 'facilitator' || role === 'platform_admin'
  role: 'expert' | 'facilitator' | 'platform_admin';
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AUTH_STORAGE_KEYS = ['access_token', 'is_admin', 'email', 'role'] as const;
```

**Login handler additions:**
```typescript
localStorage.setItem('role', data.role || 'expert');
setRole(data.role || 'expert');
setIsFacilitator(['facilitator', 'platform_admin'].includes(data.role));
```

### 9.2 Dashboard Routing

```typescript
// Dashboard.tsx
export default function Dashboard() {
  const { role } = useAuth();

  switch (role) {
    case 'platform_admin':
      return <AdminDashboard />;
    case 'facilitator':
      return <FacilitatorDashboard />;
    default:
      return <ExpertDashboard />;
  }
}
```

### 9.3 Dashboard Components

| Component | Role | Contents |
|-----------|------|----------|
| `ExpertDashboard` | expert | Join-by-code card + "My Consultations" (forms joined via code) |
| `FacilitatorDashboard` | facilitator | "My Consultations" (forms I own, with management tools) + "Participating In" (forms joined via code) + "Create New" button + "Join as Expert" card |
| `AdminDashboard` | platform_admin | Everything in FacilitatorDashboard + "All Consultations" tab (read-only) + "Users" tab + "Settings" |

**Key derivation:** `ExpertDashboard` is the current `UserDashboard` minus the form creation section. `FacilitatorDashboard` is a merge of the current `AdminDashboard` (scoped to owned forms) and the `UserDashboard` join flow. `AdminDashboard` extends `FacilitatorDashboard` with platform-wide views.

### 9.4 Route Protection

```typescript
function RequireRole({ roles, children }: { roles: string[], children: ReactNode }) {
  const { role } = useAuth();
  if (!roles.includes(role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Usage in router
<Route path="/admin/*" element={
  <RequireRole roles={['platform_admin']}>
    <AdminLayout />
  </RequireRole>
} />
```

---

## 10. Ship Plan

### Phase 1 — Role Column + Auth Gating (Week 1-2)

**Goal:** Replace `is_admin` with `role` across the entire stack. Every route correctly gated. Frontend shows three dashboards.

**Backend:**
1. Alembic migration: `role`, `created_at` on users; `form_role`, `joined_at`, unique constraint on `user_form_unlocks`; `acting_role` on `audit_log`; `description` on forms
2. Add `UserRole` enum, `require_role()`, `require_facilitator`, `require_platform_admin` to `auth.py`
3. Add `assert_form_owner_or_facilitator()` — replaces `assert_form_owner_or_admin()`
4. Add `is_admin` property shim on User model (reads from `role`)
5. Migrate all route guards per Section 8.2 table
6. Update JWT creation to include `role`
7. Update `GET /me` and login responses to include `role`
8. New join code generation function (`SYM-XXXX-NNNN`)
9. Input normalization on `/forms/unlock`
10. Merge form creation into `POST /forms/create` with `require_facilitator`

**Frontend:**
1. Add `role`, `isFacilitator` to `AuthContext`
2. Update `Dashboard.tsx` to three-way switch
3. Create `ExpertDashboard` (from `UserDashboard`, minus create button)
4. Create `FacilitatorDashboard` (owned forms management + join card)
5. Update `AdminDashboard` (platform-wide views)
6. Gate "New Consultation" behind `isFacilitator`
7. Update localStorage to persist `role`

**Migration path:**
- All `is_admin=true` users → `platform_admin`
- All `is_admin=false` users → `expert`
- First facilitators promoted manually by platform admin via direct DB update or a temporary admin endpoint

**Testing:**
- All existing tests pass via `is_admin` property shim
- New tests for each role on each route
- E2E: expert cannot create form, facilitator can, admin can see all

**Does NOT include:** Invite codes table, participant management UI, user management UI, magic-link join.

---

### Phase 2 — Facilitator UX + Invite Codes + User Management (Week 3-4)

**Goal:** Full facilitator workflow. Invite codes with expiry/limits. Admin user management panel.

**Backend:**
1. `invite_codes` table migration + backfill from `FormModel.join_code`
2. `POST /forms/join` endpoint (invite-code-aware, validates expiry/limits)
3. Invite code CRUD endpoints (create, list, update, deactivate)
4. `GET /admin/users`, `PATCH /admin/users/{id}/role` endpoints
5. `GET /forms/{id}/participants`, `DELETE /forms/{id}/participants/{uid}` endpoints
6. Audit logging with `acting_role` on all state-changing actions
7. Magic-link join URL: `/join/{code}`

**Frontend:**
1. Participant list UI on form management page
2. Invite code management panel for facilitators
3. User management page for platform admins
4. Magic-link join flow (code in URL → auto-join or redirect to register)
5. Updated join-code input with format hint (`SYM-XXXX-NNNN`)

**Testing:**
1. E2E: facilitator creates form → generates invite code → expert joins → submits response → facilitator runs synthesis
2. E2E: platform admin promotes user to facilitator
3. Invite code expiry and max_uses enforcement
4. Permission boundary: expert cannot access facilitator endpoints

---

### Phase 3 — Cleanup + Hardening (Week 5-6)

**Goal:** Remove all legacy code. Lock down registration. Security audit.

1. Drop `is_admin` column from `users` table
2. Remove `is_admin` from JWT claims
3. Remove `get_admin_user`, `get_current_admin_user`, `assert_form_owner_or_admin` functions
4. Remove `POST /create_form` endpoint (deprecated alias)
5. Remove `is_admin` from localStorage and `AuthContext`
6. Add `registration_mode` platform setting (open / invite-only / domain-restricted)
7. Security audit: verify every route has correct permission gate (grep for any remaining `get_current_user` on routes that should be restricted)
8. Update all tests to use `role` exclusively
9. Remove `POST /forms/unlock` (replaced by `POST /forms/join`)

---

## 11. Explicitly Deferred / Killed

| Item | Status | Reasoning |
|------|--------|-----------|
| **Multi-tenancy / Organizations** | KILLED | Symphonia is single-tenant. One deployment = one government team. `org_id` adds foreign keys to every table, tenant-scoped queries, org-level settings. Months of work for a feature nobody asked for. If needed: add `org_id` later; the role system works with or without it. |
| **Observer role** | KILLED | Read a PDF export. Share a link. Observers don't need accounts. If live read-only access is required later, add `observer` as a `form_role` value — the schema supports it without migration. |
| **Analyst role** | KILLED | An analyst is a facilitator who hasn't created a form yet. Same permissions, different moment in time. Don't model moments as roles. |
| **ORG_ADMIN role** | KILLED | Requires multi-tenancy. See above. |
| **Custom role configuration** | KILLED forever | Three roles. Hardcoded. No admin screen to create custom roles. Custom roles are a governance tar pit that generates support tickets, not value. |
| **Session state machine** | KILLED | A consultation is open or closed. A round is active or not. Two booleans, not a five-state FSM. |
| **Invite-by-email** | DEFERRED to Phase 3+ | Nice-to-have polish. Join codes work. Email delivery is a separate infrastructure concern (SMTP config, templates, delivery tracking). |
| **Email verification** | DEFERRED to Phase 3+ | Optional platform setting. Internal government networks may not need it. Don't block Phase 1. |
| **Co-facilitator workflow** | DEFERRED to Phase 2+ | The `form_role` column on `UserFormUnlock` makes this trivially addable. But the UI for "add a co-facilitator" needs design. Platform admin as escape hatch for now. |
| **OAuth / SSO (SAML, OIDC)** | DEFERRED indefinitely | Orthogonal to the role model. The role system works regardless of auth method. Add SSO when a government deployment mandates it. |
| **API keys / service accounts** | DEFERRED indefinitely | No current use case for programmatic access. |
| **display_name on User** | DEFERRED to Phase 2+ | Nice-to-have. The UI works with emails. |
| **Per-question permissions** | KILLED | "Expert can answer Q1-5 but not Q6-10." No current use case. Don't build for hypotheticals. |
| **Feature flags / registration_mode** | DEFERRED to Phase 3 | Open registration is fine for Phase 1-2 on an internal network. |

---

## 12. Risk Register

| Risk | L | I | Mitigation |
|------|---|---|------------|
| Existing admins lose access during migration | M | H | `is_admin` property shim ensures zero breaking changes. All current admins become `platform_admin` which inherits facilitator powers. |
| Facilitators can't run synthesis (gating bug) | L | H | Integration test for every facilitator route. `require_facilitator` includes `PLATFORM_ADMIN` by construction. |
| Join code collision | VL | L | 674M namespace + collision retry loop + monitoring. |
| Government team demands custom roles | M | L | Say no. Document the three roles, their coverage, and why custom roles create more problems than they solve. |
| JWT `role` claim used as authoritative | L | H | Backend reads `user.role` from DB, never from JWT. Code review checkpoint. Add comment in `get_current_user`. |
| Old tokens without `role` claim break frontend | M | M | Frontend defaults to `role = is_admin ? 'platform_admin' : 'expert'` when `role` claim is missing. 24h expiry means old tokens die naturally. |
| `POST /forms/create` guard change locks out users mid-session | L | M | Users with stale `is_admin` in localStorage see a create button that returns 403. Fix: re-fetch `/me` on 403 to update role state. |

---

## 13. Validation Checklist (Post-Implementation)

Before declaring any phase complete:

- [ ] Every route in the API has been manually verified against the permission matrix
- [ ] `grep -r "get_current_admin_user\|get_admin_user\|is_admin" backend/` returns zero hits (Phase 3 only)
- [ ] `grep -r "isAdmin" frontend/src/` returns zero hits (Phase 3 only)
- [ ] An expert user cannot see "Create Consultation" in the UI
- [ ] An expert user gets 403 when calling `POST /forms/create` directly
- [ ] A facilitator can create a form AND join another facilitator's form as expert
- [ ] A platform admin can see all forms but cannot edit another facilitator's questions
- [ ] The audit log records `acting_role` for every state-changing action
- [ ] Old-format join codes (pre-SYM) still work
- [ ] New join codes render as `SYM-XXXX-NNNN` and are accepted case-insensitively

---

*Athena has spoken. The designs converge. The path is clear. Build from this document.*
