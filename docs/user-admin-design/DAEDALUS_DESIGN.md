# Symphonia Role & Permission Architecture

**Author:** Daedalus
**Date:** 2026-02-26
**Status:** DESIGN — awaiting review against independent design
**Target deployment:** Government policy consultations (3–10 facilitators, 20–100 experts per session)

---

## 1. Why a Formal Role System Is Non-Negotiable

The current binary `is_admin` flag has five structural failures:

1. **Admins cannot be experts.** An `is_admin=True` user sees `AdminDashboard`, never `UserDashboard`. A government researcher who both *runs* consultations and *participates* in others has no viable path. They must maintain two accounts.

2. **Form creation has no ownership boundary.** `create_form` requires `get_current_admin_user` — so any admin creates forms visible to all admins. A Ministry of Health facilitator can see and modify Ministry of Defence forms. This is a data-governance violation in government contexts.

3. **"Owner or admin" is an escalation path, not a permission model.** `assert_form_owner_or_admin()` checks `form.owner_id == user.id or user.is_admin`. This means every admin is a de facto superuser over every form. The `owner_id` field provides no real scoping.

4. **No audit attribution for roles.** The `AuditLog` table records `user_id` and `action`, but there's no `role` or `acting_as` field. When a platform admin modifies someone else's form, the audit log cannot distinguish "admin override" from "owner action." Government auditors will flag this.

5. **Registration is uncontrolled.** `POST /register` is open — anyone can create an account. There is no invitation, no approval gate, no domain restriction. For a government deployment, this is unacceptable.

**Conclusion:** Symphonia needs a role system. Not because it's architecturally fashionable, but because the current design cannot satisfy the minimum requirements of a multi-stakeholder government deployment.

---

## 2. Role Model: Three Roles, One Permission Per Form

### 2.1 Platform Roles

| Role | Slug | Description |
|------|------|-------------|
| **Platform Admin** | `platform_admin` | Manages the deployment. Creates facilitator accounts. Views audit logs. Cannot see form content unless explicitly granted access. |
| **Facilitator** | `facilitator` | Creates and manages consultations. Owns forms. Runs synthesis. Invites experts. Can also participate as an expert in *other* facilitators' forms. |
| **Expert** | `expert` | Participates in consultations via invite code. Submits responses. Views synthesis. Can comment. Cannot create forms or run synthesis. |

### 2.2 Why Not Five Roles (Like Prometheus Proposed)

Prometheus suggested `PLATFORM_ADMIN → ORG_ADMIN → ANALYST → EXPERT → OBSERVER`. This is overengineered for Symphonia's current shape:

- **ORG_ADMIN** implies multi-tenancy (organizations). Symphonia has no `Organization` model and building one is a multi-month effort. Defer.
- **ANALYST** (read-only facilitator) is a permission variant, not a role. Solve with a per-form permission bit if needed later.
- **OBSERVER** (read-only expert) can be handled by a `can_respond` flag on `UserFormUnlock`. Not a platform role.

Three roles cover the actual access patterns. More can be added later without breaking the schema (the `role` column is a string enum, not a foreign key to a roles table).

### 2.3 Key Principle: Platform Role + Per-Form Relationship

A user's **platform role** determines what *categories* of action they can perform. Their **per-form relationship** determines which *specific forms* they can act on.

```
Platform role: what you CAN do  (facilitator → create forms, run synthesis)
Form relationship: WHERE you do it  (owner of form #7, expert on form #12)
```

A facilitator who joins another facilitator's form via invite code becomes an expert *on that specific form*. Their platform role doesn't change — they just have two relationships: owner on their own forms, participant on the joined form.

---

## 3. Database Schema Changes

### 3.1 User Table Migration

```sql
-- Step 1: Add role column with default that preserves current behavior
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'expert';

-- Step 2: Backfill from is_admin
UPDATE users SET role = 'platform_admin' WHERE is_admin = TRUE;
UPDATE users SET role = 'expert' WHERE is_admin = FALSE;

-- Step 3: Add display_name for non-email identification (optional but useful)
ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL;

-- Step 4: Add invited_by for audit trail on account creation
ALTER TABLE users ADD COLUMN invited_by INTEGER NULL REFERENCES users(id);

-- Step 5: Add created_at (currently missing from users table!)
ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP);

-- Step 6 (LATER, after all code migrated): Drop is_admin
-- ALTER TABLE users DROP COLUMN is_admin;
-- DO NOT drop is_admin until every query, test, and JWT claim has been migrated.
```

**Important:** Do NOT drop `is_admin` in the same migration. Run both columns in parallel during the transition phase. The `is_admin` column becomes a computed shim:

```python
@property
def is_admin(self) -> bool:
    """Backward-compat shim. Remove after full migration."""
    return self.role in ("platform_admin", "facilitator")
```

Wait — that's wrong. `is_admin` currently gates form creation, synthesis, settings, audit log viewing. Facilitators should be able to create forms and run synthesis, but NOT view platform settings or all audit logs. So the shim must be:

```python
@property
def is_admin(self) -> bool:
    """Backward-compat shim. Maps to platform_admin only."""
    return self.role == "platform_admin"
```

Facilitator permissions must be gated by a NEW dependency, not the old `get_current_admin_user`.

### 3.2 UserFormUnlock Table Enhancement

The current `UserFormUnlock` tracks "this user joined this form." It needs to also track *how* they relate to the form:

```sql
-- Add role-on-form and tracking fields
ALTER TABLE user_form_unlocks ADD COLUMN form_role VARCHAR(20) NOT NULL DEFAULT 'expert';
-- Valid values: 'owner', 'facilitator', 'expert', 'observer'

ALTER TABLE user_form_unlocks ADD COLUMN joined_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP);
ALTER TABLE user_form_unlocks ADD COLUMN invited_by INTEGER NULL REFERENCES users(id);

-- Add unique constraint to prevent duplicate enrollments
-- (may already be enforced in code, but enforce at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_form ON user_form_unlocks(user_id, form_id);
```

**Backfill:** All existing `UserFormUnlock` rows get `form_role = 'expert'`. Form owners get an additional row with `form_role = 'owner'`:

```sql
-- Backfill form owners into UserFormUnlock
INSERT INTO user_form_unlocks (user_id, form_id, form_role, joined_at)
SELECT owner_id, id, 'owner', COALESCE(created_at, CURRENT_TIMESTAMP)
FROM forms
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, form_id) DO UPDATE SET form_role = 'owner';
```

### 3.3 InviteCode Table (New)

The current `join_code` on `FormModel` is a single string field with no expiry, no usage tracking, and no revocation. For government deployments, invite codes need:

```sql
CREATE TABLE invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    form_role VARCHAR(20) NOT NULL DEFAULT 'expert',  -- what role does this code grant?
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    expires_at TIMESTAMP NULL,        -- NULL = never expires
    max_uses INTEGER NULL,            -- NULL = unlimited
    use_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(100) NULL           -- e.g. "Panel A experts", "Ministry observers"
);

CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_form ON invite_codes(form_id);
```

The existing `FormModel.join_code` remains as a convenience field (the "default" invite code for the form). New codes can be created for different panels, roles, or batches.

### 3.4 AuditLog Enhancement

```sql
ALTER TABLE audit_log ADD COLUMN acting_role VARCHAR(20) NULL;
-- Records the role under which the action was performed.
-- e.g., "platform_admin" when an admin overrides, "facilitator" for normal ops
```

### 3.5 Full SQLAlchemy Model (Post-Migration)

```python
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String(20), nullable=False, default="expert")  # platform_admin | facilitator | expert
    display_name = Column(String(100), nullable=True)
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Backward-compat shim — remove after full migration
    is_admin = Column(Boolean, default=False)

    has_submitted_feedback = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    # Relationships (unchanged)
    responses = relationship("Response", back_populates="user")
    feedback_entries = relationship("Feedback", back_populates="user")
    archived_responses = relationship("ArchivedResponse", back_populates="user")
    unlocked_forms = relationship("UserFormUnlock", back_populates="user", cascade="all, delete-orphan")
    owned_forms = relationship("FormModel", foreign_keys="[FormModel.owner_id]", back_populates="owner")


class UserFormUnlock(Base):
    __tablename__ = "user_form_unlocks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    form_id = Column(Integer, ForeignKey("forms.id"), nullable=False)
    form_role = Column(String(20), nullable=False, default="expert")  # owner | facilitator | expert | observer
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    invited_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    __table_args__ = (UniqueConstraint("user_id", "form_id", name="uq_user_form"),)

    user = relationship("User", foreign_keys=[user_id], back_populates="unlocked_forms")
    form = relationship("FormModel", back_populates="unlocked_by_users")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    form_role = Column(String(20), nullable=False, default="expert")
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    use_count = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    label = Column(String(100), nullable=True)

    form = relationship("FormModel")
    creator = relationship("User")
```

---

## 4. Invite Code Design

### 4.1 Code Format

```
SYM-XXXX-XXXX
```

Where `X` is from the alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32 chars — no 0/O/1/I/L confusion).

- 8 characters from a 32-char alphabet = 32^8 = ~1.1 trillion combinations (40 bits of entropy)
- The `SYM-` prefix is cosmetic/routing — not part of the entropy
- Add a Luhn-mod-32 check digit? **No.** Unnecessary complexity. If the code doesn't exist in the DB, it's invalid. The check digit saves one DB query on typos — not worth the UX complexity of a longer code.

```python
import secrets

_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"

def generate_invite_code() -> str:
    """Generate a SYM-XXXX-XXXX invite code with 40 bits of entropy."""
    chars = [secrets.choice(_ALPHABET) for _ in range(8)]
    return f"SYM-{''.join(chars[:4])}-{''.join(chars[4:])}"
```

### 4.2 Join-by-Code Flow

**Current flow:**
1. User enters join code in `UserDashboard`
2. `POST /unlock_form` with `{join_code: "..."}`
3. Backend looks up `FormModel.join_code`, creates `UserFormUnlock`
4. User sees form in "My Forms"

**New flow:**
1. User enters invite code (with or without `SYM-` prefix — strip and normalize)
2. `POST /forms/join` with `{code: "SYM-XXXX-XXXX"}`
3. Backend:
   - Normalize code (uppercase, strip whitespace, strip `SYM-` prefix if partially entered)
   - Look up in `invite_codes` table
   - Validate: `is_active`, `expires_at`, `use_count < max_uses`
   - If valid: create `UserFormUnlock` with `form_role` from the invite code
   - Increment `use_count`
   - Return: `{form_id, form_title, form_role, message}`
4. Frontend navigates to the form

**Backward compatibility:** The existing `FormModel.join_code` field continues to work during transition. When a form is created, we auto-create an `InviteCode` row mirroring the legacy `join_code`. The `POST /unlock_form` endpoint stays alive but internally delegates to the new join logic.

### 4.3 Code Lifecycle

| Event | Action |
|-------|--------|
| Form created | Auto-generate one `InviteCode` with `form_role='expert'`, no expiry, no use limit |
| Facilitator creates additional code | New `InviteCode` row. Can specify role, expiry, max_uses, label |
| Facilitator deactivates code | `is_active = FALSE`. Existing enrollments unaffected. |
| Facilitator regenerates code | Old code deactivated, new code created. Old enrollments unaffected. |
| Form deleted | CASCADE deletes all invite codes |

---

## 5. Permission Matrix

### 5.1 Platform-Level Permissions

| Action | platform_admin | facilitator | expert |
|--------|:-:|:-:|:-:|
| View platform settings | Y | N | N |
| Modify platform settings | Y | N | N |
| View full audit log | Y | N | N |
| Create facilitator accounts | Y | N | N |
| Create forms | Y | Y | N |
| Join forms by invite code | Y | Y | Y |
| Submit responses to joined forms | Y | Y | Y |

### 5.2 Per-Form Permissions (by form_role in UserFormUnlock)

| Action | owner | facilitator (on form) | expert | observer |
|--------|:-:|:-:|:-:|:-:|
| Edit form title/questions | Y | Y | N | N |
| Delete form | Y | N | N | N |
| Manage rounds (advance, close) | Y | Y | N | N |
| Run synthesis | Y | Y | N | N |
| View all responses | Y | Y | N | N |
| Create invite codes | Y | Y | N | N |
| Manage invite codes (deactivate) | Y | N | N | N |
| Submit responses | N* | N* | Y | N |
| View synthesis | Y | Y | Y | Y |
| Post comments | Y | Y | Y | N |
| Export results | Y | Y | N | N |

*\* Owners and form-facilitators should not submit responses to forms they manage — this is a methodological constraint in Delphi, not a technical one. Enforce in the UI with a warning; allow backend override for testing.*

### 5.3 Platform Admin Override

Platform admins can perform any action on any form. This is the "break glass" capability. **Every platform admin action on a form they don't own MUST log `acting_role = 'platform_admin_override'` in the audit log.**

---

## 6. API Route Changes

### 6.1 New Auth Dependencies

```python
# auth.py additions

from enum import Enum

class PlatformRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    FACILITATOR = "facilitator"
    EXPERT = "expert"

class FormRole(str, Enum):
    OWNER = "owner"
    FACILITATOR = "facilitator"
    EXPERT = "expert"
    OBSERVER = "observer"


def require_role(*roles: PlatformRole):
    """Dependency: require user to have one of the specified platform roles."""
    async def _check(user: User = Depends(get_current_user)):
        if user.role not in [r.value for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(r.value for r in roles)}",
            )
        return user
    return _check


def require_form_access(*form_roles: FormRole):
    """Dependency factory: require user to have one of the specified roles on a form.

    Platform admins always pass (override).
    Extracts form_id from path parameter.
    """
    async def _check(
        form_id: int,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        # Platform admin override
        if user.role == PlatformRole.PLATFORM_ADMIN.value:
            return user

        enrollment = db.query(UserFormUnlock).filter(
            UserFormUnlock.user_id == user.id,
            UserFormUnlock.form_id == form_id,
        ).first()

        if not enrollment or enrollment.form_role not in [r.value for r in form_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions on this form",
            )
        return user
    return _check


# Backward-compat shim (used during migration)
async def get_current_admin_user(user: User = Depends(get_current_user)):
    """DEPRECATED: Use require_role() instead. Kept for migration."""
    if user.role not in ("platform_admin", "facilitator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return user
```

### 6.2 Route Migration Map

Each `get_current_admin_user` callsite must be migrated to the appropriate new dependency:

| Route | Current Gate | New Gate | Notes |
|-------|-------------|----------|-------|
| `POST /forms` (create_form) | `get_current_admin_user` | `require_role(PLATFORM_ADMIN, FACILITATOR)` | Sets `owner_id` to current user |
| `GET /forms` (get_forms — list all) | `get_current_admin_user` | `require_role(PLATFORM_ADMIN)` | Only platform admins see all forms |
| `PUT /forms/{id}` (update_form) | `get_current_admin_user` | `require_form_access(OWNER, FACILITATOR)` | Scoped to form |
| `DELETE /forms/{id}` | `get_current_admin_user` | `require_form_access(OWNER)` + platform_admin override | Only owner deletes |
| `POST /forms/{id}/rounds` | `get_current_admin_user` | `require_form_access(OWNER, FACILITATOR)` | |
| `POST /forms/{id}/synthesize` | `get_current_admin_user` | `require_form_access(OWNER, FACILITATOR)` | |
| `GET /forms/{id}/responses` | `get_current_admin_user` | `require_form_access(OWNER, FACILITATOR)` | Experts see only own responses |
| `GET /settings` | `get_current_admin_user` | `require_role(PLATFORM_ADMIN)` | Platform-level config |
| `PUT /settings` | `get_current_admin_user` | `require_role(PLATFORM_ADMIN)` | |
| `GET /audit-log` | `get_current_admin_user` | `require_role(PLATFORM_ADMIN)` | |
| `POST /admin/users` | N/A (new) | `require_role(PLATFORM_ADMIN)` | Create facilitator/expert accounts |
| `POST /forms/join` | `get_current_user` | `get_current_user` (any authenticated) | Replaces `/unlock_form` |
| `GET /my/forms` | `get_current_user` | `get_current_user` | Forms user is enrolled in |
| `POST /forms/{id}/invite-codes` | N/A (new) | `require_form_access(OWNER, FACILITATOR)` | Create new invite codes |

### 6.3 New Endpoints

```
POST   /admin/users                    — Create user account (platform_admin only)
GET    /admin/users                    — List all users (platform_admin only)
PATCH  /admin/users/{id}/role          — Change user platform role (platform_admin only)

POST   /forms/join                     — Join form by invite code (any authenticated user)
GET    /forms/{id}/invite-codes        — List invite codes for form (owner/facilitator)
POST   /forms/{id}/invite-codes        — Create new invite code (owner/facilitator)
PATCH  /forms/{id}/invite-codes/{cid}  — Update invite code (deactivate, change label)
DELETE /forms/{id}/invite-codes/{cid}  — Deactivate invite code (owner only)

GET    /my/forms                       — All forms I'm enrolled in (any role)
GET    /my/forms/{id}                  — My enrollment details on a specific form
GET    /me                             — Returns role in addition to email
```

### 6.4 JWT Claims Update

Current:
```json
{"sub": "42", "is_admin": true, "exp": 1740000000}
```

New:
```json
{"sub": "42", "role": "facilitator", "is_admin": true, "exp": 1740000000}
```

Keep `is_admin` in the JWT during transition so existing frontend code doesn't break. The frontend reads `is_admin` from localStorage; we'll add `role` alongside it.

---

## 7. Frontend Changes

### 7.1 AuthContext Update

```typescript
// AuthContext.tsx — extend user state
interface AuthUser {
  email: string;
  token: string;
  isAdmin: boolean;    // keep for backward compat
  role: "platform_admin" | "facilitator" | "expert";
}
```

The `isAdmin` computed property:
```typescript
get isAdmin(): boolean {
  return this.role === "platform_admin";
}
```

### 7.2 Dashboard Routing

Replace the binary switch:

```typescript
// Dashboard.tsx — current
return isAdmin ? <AdminDashboard /> : <UserDashboard />;

// Dashboard.tsx — new
function Dashboard() {
  const { role } = useAuth();

  switch (role) {
    case "platform_admin":
      return <AdminDashboard />;      // Platform settings + all forms
    case "facilitator":
      return <FacilitatorDashboard />; // Own forms + join others
    case "expert":
      return <ExpertDashboard />;      // Joined forms only
    default:
      return <ExpertDashboard />;
  }
}
```

### 7.3 Component Breakdown

| Component | Who sees it | What it shows |
|-----------|------------|---------------|
| `AdminDashboard` | platform_admin | Global form list, user management, settings, audit log |
| `FacilitatorDashboard` | facilitator | "My Consultations" (owned forms), "Participating In" (joined forms), create form button |
| `ExpertDashboard` | expert | "My Consultations" (joined forms), join-by-code input |
| `FormManager` | owner/facilitator on form | Round management, synthesis, responses, invite codes |
| `FormParticipant` | expert on form | Current round questionnaire, synthesis view, comments |

**Key insight:** `FacilitatorDashboard` is essentially the current `UserDashboard` (which already has "My Consultations" and "Join a Form" sections) plus synthesis/round management on owned forms. The current `AdminDashboard` becomes `AdminDashboard` (platform management only) + `FormManager` (extracted into a reusable component).

---

## 8. Registration & Account Creation

### 8.1 Current Problem

`POST /register` is open to anyone. In a government deployment, you don't want random accounts.

### 8.2 Design: Controlled Registration

**Option A: Invite-only registration**
Remove open registration. Platform admin creates accounts via `POST /admin/users`. Users receive an email with a temporary password or magic link.

**Option B: Open registration with role assignment**
Keep open registration, but all new accounts are `expert` by default. Platform admin promotes to `facilitator` as needed.

**Recommendation: Option B for Phase 1, Option A as a configurable setting for Phase 2.**

Rationale: Option B is zero-migration on the registration flow. Every existing account becomes `expert` (or `platform_admin` if they were `is_admin=True`). The platform admin can then promote researchers to `facilitator` through a simple admin panel.

Add a `Setting` row: `registration_mode` = `open` | `invite_only` | `domain_restricted`.

```python
# Registration gate (Phase 2)
@router.post("/register")
def register(request: Request, email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    reg_mode = db.query(Setting).filter(Setting.key == "registration_mode").first()
    mode = reg_mode.value if reg_mode else "open"

    if mode == "invite_only":
        raise HTTPException(status_code=403, detail="Registration is by invitation only")

    if mode == "domain_restricted":
        allowed = db.query(Setting).filter(Setting.key == "allowed_domains").first()
        domains = json.loads(allowed.value) if allowed else []
        if not any(email.endswith(f"@{d}") for d in domains):
            raise HTTPException(status_code=403, detail="Email domain not authorized")

    # ... existing registration logic ...
    user = User(email=email, hashed_password=get_password_hash(password), role="expert")
    # ...
```

### 8.3 Facilitator Promotion Flow

```
Platform Admin → Admin Panel → User List → Select User → "Promote to Facilitator"
POST /admin/users/{id}/role  {role: "facilitator"}
```

This writes to `audit_log` with action `change_user_role`, detail `{old_role, new_role}`.

---

## 9. Migration Strategy

### 9.1 Guiding Principles

- **Zero-downtime migration.** No "maintenance mode." Changes are additive.
- **Backward-compatible JWT.** Old tokens with `is_admin` continue to work until they expire (24h). New tokens include both `is_admin` and `role`.
- **Database changes are additive.** New columns with defaults. No column drops until Phase 3.
- **Feature flags per phase.** `Setting` table controls which behavior is active.

### 9.2 Phase 1 — Schema + Shim (Week 1)

**Goal:** Add role infrastructure without changing any user-visible behavior.

**Backend:**
1. Alembic migration: add `role`, `display_name`, `invited_by`, `created_at` columns to `users`
2. Alembic migration: add `form_role`, `joined_at`, `invited_by` columns to `user_form_unlocks`; add unique constraint
3. Alembic migration: add `acting_role` to `audit_log`
4. Alembic migration: create `invite_codes` table
5. Data migration: backfill `role` from `is_admin`; backfill `form_role` in existing unlocks; create `InviteCode` rows from existing `FormModel.join_code` values
6. Add `PlatformRole`, `FormRole` enums to auth.py
7. Add `require_role()` and `require_form_access()` dependencies
8. Modify `get_current_admin_user` to check `role in ('platform_admin', 'facilitator')` — this makes all existing admin routes accessible to both, which is the CURRENT behavior (all admins see everything)
9. Add `role` to JWT claims (alongside `is_admin`)
10. Add `role` to `GET /me` response

**Frontend:**
1. Add `role` to `AuthContext` state, persist in localStorage
2. Read `role` from login response and `/me` endpoint
3. Keep `isAdmin` computed from role for now
4. No dashboard changes yet

**Tests:**
1. Update `conftest.py` to seed users with `role` column
2. Add tests for `require_role()` and `require_form_access()`
3. Ensure all existing tests pass unchanged (the shim keeps old behavior)

**Migration SQL (combined):**

```sql
-- 001_add_roles.sql

-- Users: add role
ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'expert';
UPDATE users SET role = 'platform_admin' WHERE is_admin = TRUE;

-- Users: add metadata
ALTER TABLE users ADD COLUMN display_name VARCHAR(100) NULL;
ALTER TABLE users ADD COLUMN invited_by INTEGER NULL REFERENCES users(id);
ALTER TABLE users ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP);

-- UserFormUnlock: add form_role
ALTER TABLE user_form_unlocks ADD COLUMN form_role VARCHAR(20) NOT NULL DEFAULT 'expert';
ALTER TABLE user_form_unlocks ADD COLUMN joined_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP);
ALTER TABLE user_form_unlocks ADD COLUMN invited_by INTEGER NULL REFERENCES users(id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_form ON user_form_unlocks(user_id, form_id);

-- Backfill form owners into unlocks
INSERT OR IGNORE INTO user_form_unlocks (user_id, form_id, form_role, joined_at)
SELECT owner_id, id, 'owner', CURRENT_TIMESTAMP
FROM forms
WHERE owner_id IS NOT NULL;

-- AuditLog: add acting_role
ALTER TABLE audit_log ADD COLUMN acting_role VARCHAR(20) NULL;

-- InviteCode table
CREATE TABLE IF NOT EXISTS invite_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    form_id INTEGER NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    form_role VARCHAR(20) NOT NULL DEFAULT 'expert',
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    expires_at TIMESTAMP NULL,
    max_uses INTEGER NULL,
    use_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    label VARCHAR(100) NULL
);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_form ON invite_codes(form_id);

-- Backfill invite codes from existing join_codes
INSERT OR IGNORE INTO invite_codes (form_id, code, form_role, created_by, created_at, is_active)
SELECT f.id, f.join_code, 'expert',
       COALESCE(f.owner_id, (SELECT id FROM users WHERE role = 'platform_admin' LIMIT 1)),
       CURRENT_TIMESTAMP,
       f.allow_join
FROM forms f
WHERE f.join_code IS NOT NULL AND f.join_code != '';
```

### 9.3 Phase 2 — Route Migration + Facilitator Dashboard (Week 2–3)

**Goal:** Migrate all routes from `get_current_admin_user` to granular dependencies. Ship the three-dashboard UI.

**Backend:**
1. Migrate each route per the table in Section 6.2 (one route at a time, each with its own PR)
2. Add `POST /forms/join` endpoint (new invite-code-aware join flow)
3. Add `POST /admin/users`, `GET /admin/users`, `PATCH /admin/users/{id}/role` endpoints
4. Add invite code CRUD endpoints
5. Update `audit_log()` calls to include `acting_role`
6. Add `GET /my/forms` endpoint that returns forms with enrollment info

**Frontend:**
1. Create `FacilitatorDashboard` component (fork from current `UserDashboard` + add form management)
2. Update `Dashboard.tsx` to three-way switch
3. Extract `FormManager` from `AdminDashboard` into reusable component
4. Update join-by-code UI to accept `SYM-XXXX-XXXX` format
5. Add "Invite Codes" panel to form management view
6. Add "User Management" panel to `AdminDashboard`

**Tests:**
1. Add E2E test: facilitator creates form, generates invite code, expert joins, submits response
2. Add E2E test: platform admin promotes user to facilitator
3. Add permission boundary tests: expert cannot create form, facilitator cannot see settings
4. Add invite code expiry/max-uses tests

### 9.4 Phase 3 — Cleanup + Hardening (Week 4)

**Goal:** Remove legacy code, add registration controls, finalize audit trail.

1. Remove `is_admin` from JWT claims (frontend reads `role` exclusively)
2. Remove `is_admin` column from `users` table (Alembic migration)
3. Remove `get_current_admin_user` and `assert_form_owner_or_admin` functions
4. Add `registration_mode` setting
5. Add email notifications for invite code delivery
6. Security audit: verify every route has correct permission gate
7. Update all tests to use `role` exclusively

---

## 10. What Breaks and How to Handle It

| Breaking Change | Impact | Mitigation |
|----------------|--------|------------|
| `is_admin` column removed | Any raw SQL or ORM query filtering on `is_admin` | Phase 3 only, after all code migrated. Grep for `is_admin` before dropping. |
| JWT shape change | Old tokens missing `role` claim | `get_current_user` falls back to `is_admin` claim if `role` missing. 24h expiry means old tokens die naturally. |
| `get_current_admin_user` behavior change | In Phase 1, allows facilitators where only platform_admin was intended | Acceptable: facilitators gaining temporary access to settings is low-risk during the 1-week Phase 1 window. Lock down in Phase 2. |
| `POST /unlock_form` deprecated | Frontend calling old endpoint | Keep endpoint alive, delegate to new join logic internally. Remove in Phase 3. |
| AdminDashboard shows all forms | Facilitators currently don't exist, so no new users see it. After Phase 2, only platform_admin sees global form list. | Clean boundary: `GET /forms` (all) = platform_admin; `GET /my/forms` = everyone. |
| Existing invite codes are short UUIDs | Old codes like `a3f8b2c1` still work | Backfill into `invite_codes` table. Accept both old format and new `SYM-XXXX-XXXX` format in the join endpoint. |

---

## 11. Security Considerations

### 11.1 Privilege Escalation Vectors

**Vector:** User modifies their own JWT `role` claim.
**Mitigation:** JWT is signed with `SECRET_KEY`. Cannot be modified without the secret. `get_current_user` always loads the user from DB by `sub` claim — the `role` is read from DB, not from the token. The `role` claim in the JWT is for frontend display only; backend always checks DB.

**Actually — this is a critical point.** Currently `get_current_user` returns the DB user object, and permission checks read `user.is_admin` from that object (DB column, not JWT claim). This is correct and secure. The new `require_role()` must also read `user.role` from the DB object, not from the JWT. The JWT `role` claim is a convenience for the frontend to avoid an extra `/me` call; it is NOT authoritative.

**Vector:** Facilitator promotes themselves to platform_admin.
**Mitigation:** `PATCH /admin/users/{id}/role` requires `platform_admin` role. Facilitators cannot access this endpoint.

**Vector:** Expert accesses form management endpoints by guessing form_id.
**Mitigation:** `require_form_access(OWNER, FACILITATOR)` checks the `UserFormUnlock` table. If the expert isn't enrolled with the right form_role, 403.

**Vector:** Invite code brute force.
**Mitigation:** 40 bits of entropy = ~10^12 codes. Rate limiting on `/forms/join` (already have `AUTH_LIMIT`). Add exponential backoff or lockout after 5 failed attempts per IP.

### 11.2 Audit Requirements for Government

Every state-changing action must produce an `AuditLog` row with:
- `user_id`, `user_email` (who)
- `action` (what)
- `resource_type`, `resource_id` (on what)
- `acting_role` (as what role)
- `detail` (context: old values, new values)
- `ip_address` (from where)
- `timestamp` (when)

New auditable actions to add:
- `change_user_role` — detail: `{target_user_id, old_role, new_role}`
- `create_invite_code` — detail: `{code, form_role, max_uses, expires_at}`
- `deactivate_invite_code` — detail: `{code}`
- `join_form` — detail: `{invite_code, form_role}`
- `platform_admin_override` — logged whenever a platform admin acts on a form they don't own

---

## 12. Decision Log

| Decision | Rationale | Alternative Considered |
|----------|-----------|----------------------|
| 3 roles, not 5 | No org model yet; ANALYST and OBSERVER are per-form permission variants, not platform roles | Prometheus's 5-tier hierarchy |
| String enum for role, not FK to roles table | Simpler migration, no join needed for auth checks, extensible by adding new string values | Separate `roles` table with M2M |
| Per-form role in UserFormUnlock, not separate table | One query to check both enrollment and permission; no extra join | Separate `form_permissions` table |
| Invite codes in separate table, not just FormModel.join_code | Multiple codes per form, expiry, usage tracking, role-specific codes | Enhancing the existing join_code field |
| Keep is_admin during transition | Zero-downtime migration; old frontend/tests don't break | Big-bang migration with downtime |
| Registration stays open by default | Least disruption for Phase 1; configurable in Phase 2 | Immediately lock to invite-only |
| No organization/tenant model | Premature; adds months of work for multi-tenant isolation | Build org model now |

---

## 13. Out of Scope (Explicitly Deferred)

- **Multi-tenancy / Organizations.** Would require `org_id` foreign keys on nearly every table, tenant-scoped queries, org-level settings. Critical for SaaS; not needed for single-government deployments. Revisit when Symphonia serves multiple independent clients on the same instance.
- **Fine-grained per-question permissions.** E.g., "Expert can answer questions 1-5 but not 6-10." No current use case.
- **OAuth / SSO integration.** Government SSO (SAML, OIDC) is important but orthogonal to the role model. The role model works regardless of how users authenticate.
- **API keys / service accounts.** For programmatic access. Not needed for the current use case.

---

## 14. Summary

The Labyrinth has three corridors, not two.

**Platform Admin** holds the keys to the building. **Facilitator** designs the rooms and runs the trials. **Expert** walks the maze and provides wisdom. Each knows their path; none can walk another's without permission.

The migration is additive, backward-compatible, and ships in three phases over four weeks. No downtime. No big-bang. The `is_admin` boolean dies quietly in Phase 3, after every reference to it has been replaced.

The schema changes are six `ALTER TABLE` statements, one `CREATE TABLE`, and four `INSERT/UPDATE` backfills. The API changes are 30+ route dependency swaps, 6 new endpoints, and updated JWT claims. The frontend changes are one new dashboard component, one extracted form manager, and an updated auth context.

This is not a refactor. This is a structural upgrade from a cabin to a building that can bear the weight of government trust.

---

*Daedalus, master builder. The walls are plumb. The corridors are sound.*
