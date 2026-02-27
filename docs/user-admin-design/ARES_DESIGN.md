# Symphonia User/Admin Role System — Design Document

**Author:** Ares
**Date:** 2026-02-26
**Status:** Proposal for review

---

## Executive Summary

Symphonia's current `is_admin` boolean is a liability. It conflates platform operations with consultation facilitation, blocks admins from participating as experts, and provides zero scoping — every admin sees every form on the platform. For a government policy team running expert consultations on national AI strategy, this is a deal-breaker.

**The fix is three roles, not five.** Every role beyond three adds a configuration screen nobody will use and a support ticket someone will file. Here's what ships:

| Role | Who | What they do |
|------|-----|-------------|
| **Facilitator** | Researchers, policy officers | Create consultations, design questions, run synthesis, view results, invite experts |
| **Expert** | Domain specialists, panel members | Join consultations by code, submit responses round-by-round, see synthesised feedback |
| **Platform Admin** | IT/ops (1-2 people) | Manage users, promote facilitators, global settings, audit log |

That's it. No `ORG_ADMIN`, no `ANALYST`, no `OBSERVER`. Those are roles for a product with 50 organisations. Symphonia has one deployment per government team. Ship the simple thing.

---

## 1. Why a Formal Role System (and Why Exactly Three Roles)

### The current system is broken in five ways:

1. **Admins can't be experts.** The dashboard fork (`Dashboard.tsx:12-13`) is a hard binary: `isAdmin ? <AdminDashboard /> : <UserDashboard />`. An admin who wants to join a consultation as a panellist cannot. In a government setting, senior researchers are often both facilitators AND domain experts on related consultations.

2. **Every authenticated user can create forms.** The `POST /forms/create` route (`routes.py`) requires only `get_current_user`. That means any expert who registered to fill in a questionnaire can also create consultations. This is wrong. Experts should not see a "New Consultation" button.

3. **Admins see everything.** `GET /forms` returns all forms platform-wide to any admin. When the Ministry of Digital Affairs runs three parallel consultations with different teams, every admin sees every consultation — including ones they shouldn't.

4. **No ownership scoping on admin actions.** `assert_form_owner_or_admin` treats all admins as global superusers. Admin A can delete Admin B's consultation. This is a political problem in government teams.

5. **No audit trail for role changes.** The `is_admin` flag is set directly in the database. There's no record of who promoted whom or when.

### Why not five roles (Prometheus-style)?

Prometheus proposed: `PLATFORM_ADMIN → ORG_ADMIN → ANALYST → EXPERT → OBSERVER`.

This is over-engineering for the target deployment:

- **ORG_ADMIN**: Symphonia is single-tenant. One deployment = one organisation. The platform admin IS the org admin.
- **ANALYST**: An analyst is just a facilitator who hasn't created a form yet. Same permissions, different moment in time. Don't model moments as roles.
- **OBSERVER**: Read-only access to results is a feature of the export/sharing system, not a user role. You don't need an account to read a PDF export.

Three roles. Zero configuration screens for role hierarchies. A facilitator gets started in under 60 seconds.

---

## 2. Role Definitions

### 2.1 Expert (default role)

**Who:** Anyone who registers or is invited to participate in a consultation.

**Can:**
- Join a consultation via invite code
- View consultations they've joined
- Submit and update responses for the active round
- See synthesised results after a round closes
- View their own submission history

**Cannot:**
- Create consultations
- See other experts' individual responses
- Run synthesis
- Access any admin/facilitator features
- See consultations they haven't joined

**Registration:** Self-service. Email + password. No approval required. This is critical — you cannot ask 80 domain experts to wait for manual approval before a consultation deadline.

### 2.2 Facilitator

**Who:** Researchers, policy officers, consultation leads.

**Can (everything Expert can, plus):**
- Create new consultations
- Design and edit questions for their own consultations
- Manage rounds (open, close, advance) for their own consultations
- Run LLM synthesis on their own consultations
- View all expert responses for their own consultations
- Export results for their own consultations
- Regenerate/revoke join codes for their own consultations
- Join OTHER facilitators' consultations as an expert (via code)

**Cannot:**
- See or manage other facilitators' consultations (unless invited)
- Promote/demote users
- Access platform settings
- Delete other facilitators' forms

**Key design decision:** A facilitator who joins another facilitator's consultation via code becomes an expert on THAT consultation. Roles are global, but participation is per-consultation. This solves the "admin can't be an expert" problem cleanly.

### 2.3 Platform Admin

**Who:** 1-2 IT/operations staff per deployment.

**Can (everything Facilitator can, plus):**
- View all consultations platform-wide (read-only override)
- Promote users to Facilitator
- Demote Facilitators to Expert
- Manage platform settings (LLM config, rate limits, branding)
- View full audit log
- Delete any consultation (with audit trail)
- Create other Platform Admins

**Cannot:**
- Edit another facilitator's consultation content (questions, synthesis). Read-only visibility for oversight, not content control.

**Design rationale:** Platform Admin is an operational role, not a content role. They ensure the platform runs. They do not design consultations. If they need to facilitate, they also have Facilitator powers and create their own consultations.

---

## 3. Session/Form Creation

### 3.1 Who Can Create

Only **Facilitator** and **Platform Admin** roles. The current `POST /forms/create` endpoint that allows any authenticated user to create forms must be gated.

### 3.2 Creation Flow

**Step 1: New Consultation**
Facilitator clicks "New Consultation" from their dashboard.

**Step 2: Basic Setup (single screen)**
```
┌─────────────────────────────────────────┐
│  New Consultation                       │
│                                         │
│  Title: [National AI Strategy - Round 1]│
│                                         │
│  Description (optional):                │
│  [Brief context shown to experts when   │
│   they join]                            │
│                                         │
│  Questions:                             │
│  + Add question                         │
│                                         │
│  [  Create Consultation  ]              │
└─────────────────────────────────────────┘
```

**Step 3: Join Code Generated**
System auto-generates a code (see Section 4). Facilitator sees:

```
┌─────────────────────────────────────────┐
│  ✓ Consultation Created                 │
│                                         │
│  Share this code with your experts:     │
│                                         │
│  ┌───────────────────────┐              │
│  │  SYM-KFWX-9274        │  [Copy]     │
│  └───────────────────────┘              │
│                                         │
│  [Go to Consultation]  [Create Another] │
└─────────────────────────────────────────┘
```

**What changed from current:**
- Removed "Allow join" checkbox from creation. Join-by-code is ALWAYS enabled at creation. You can disable it later from consultation settings. Default-open is the right call — facilitators forget to enable it, then 40 experts can't join.
- Questions can be empty at creation. This lets facilitators create the shell, share the code, and fill in questions before the deadline. The current code already supports `questions: []`.
- `owner_id` is always set (non-nullable for new forms).

### 3.3 What's Collected

At creation time:
- `title` (required, string, max 200 chars)
- `description` (optional, string, max 2000 chars) — NEW field
- `questions` (optional, defaults to `[]`)
- `owner_id` (auto-set to current user)
- `join_code` (auto-generated)
- `allow_join` (defaults to `true`, hidden from creation form)

At no point does the facilitator choose a join code. Auto-generation only.

---

## 4. Join-by-Code Mechanism

### 4.1 Code Format

**Current:** `secrets.token_urlsafe(8)` — produces things like `dBj_qQ2kZNI`. Ugly. Not dictatable over the phone. Contains ambiguous characters (`l`/`1`, `O`/`0`). Not human-parseable.

**Proposed:** `SYM-XXXX-NNNN` format.

- `SYM` — fixed prefix. Makes it immediately recognisable as a Symphonia code. Prevents confusion with other codes/passwords.
- `XXXX` — 4 uppercase letters, no ambiguous characters. Alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ` (23 chars, removed I and O).
- `NNNN` — 4 digits, no ambiguous characters. Set: `2345679` (7 digits, removed 0, 1, 8).

**Entropy:** 23^4 * 7^4 = 280,561 * 2,401 = ~674 million combinations. More than sufficient for a government deployment running hundreds of consultations. Not a security boundary — it's a convenience identifier, not an access token.

**Properties:**
- Dictatable over the phone: "Sierra Yankee Mike dash Kilo Foxtrot Whiskey X-ray dash nine two seven four"
- Copy-pasteable
- Case-insensitive matching (normalise to uppercase on backend)
- Collision-checked on generation (existing retry loop is fine)
- Hyphen-tolerant on input (strip hyphens and whitespace before matching)

**Why not higher entropy?** This is not a security boundary. The join code gets you into a consultation — it doesn't give you admin access. If someone brute-forces a join code, they become an expert on a consultation. The facilitator can see all participants and remove unknown ones. Defense in depth: rate limit the unlock endpoint (already done), facilitator can revoke codes.

### 4.2 Expert Join Flow

**Option A: Has account, has code**
1. Expert logs in
2. Dashboard shows "Join a Consultation" card with code input
3. Expert enters `SYM-KFWX-9274`
4. System validates → creates `UserFormUnlock` record
5. Consultation appears in expert's "My Consultations" list immediately
6. Expert clicks through to the active round

**Option B: No account, has code (NEW — critical for adoption)**

This is the flow that matters most. A senior government advisor gets an email: "Please join our AI strategy consultation using code SYM-KFWX-9274 at symphonia.example.gov". They don't have an account.

1. Expert visits the platform
2. Login page shows a "Join a Consultation" section below the login form
3. Expert clicks "Don't have an account? Register"
4. Registers with email + password
5. After registration, lands on dashboard
6. Enters code → joined

**Improvement over current:** The current flow works but the register → login → join chain is three separate mental steps. We can improve this in Phase 2 with a magic-link join URL: `symphonia.example.gov/join/SYM-KFWX-9274`. If the user is logged in, it joins immediately. If not, it stores the code in the session, routes through registration/login, then auto-joins. This eliminates the code-entry step entirely for link-based invitations.

### 4.3 Facilitator's View of Participants

After experts join, the facilitator sees a participant list on the consultation management page:

```
Participants (47)
┌──────────────────────────────────┐
│ expert1@university.edu    Joined │
│ advisor@ministry.gov      Joined │
│ unknown@gmail.com     [Remove]  │
│ ...                              │
└──────────────────────────────────┘
Join code: SYM-KFWX-9274  [Regenerate] [Disable]
```

Regenerating the code invalidates the old one. Disabling it prevents new joins but doesn't remove existing participants.

---

## 5. Mapping to the Existing Codebase

### 5.1 Database Schema Changes

**Users table — replace `is_admin` with `role`:**

```python
class UserRole(str, Enum):
    EXPERT = "expert"
    FACILITATOR = "facilitator"
    PLATFORM_ADMIN = "platform_admin"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.EXPERT, nullable=False)
    # REMOVE: is_admin = Column(Boolean, default=False)
    has_submitted_feedback = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)

    @property
    def is_admin(self) -> bool:
        """Backward compat — reads from role column."""
        return self.role == UserRole.PLATFORM_ADMIN

    @property
    def is_facilitator(self) -> bool:
        return self.role in (UserRole.FACILITATOR, UserRole.PLATFORM_ADMIN)
```

**FormModel — add description field:**

```python
class FormModel(Base):
    # ... existing fields ...
    description = Column(String, nullable=True)  # NEW
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # make NOT NULL for new forms
```

**Migration strategy for `is_admin`:**

```python
# Alembic migration
def upgrade():
    # 1. Add role column with default
    op.add_column('users', sa.Column('role', sa.String(), server_default='expert', nullable=False))

    # 2. Migrate existing data
    op.execute("UPDATE users SET role = 'platform_admin' WHERE is_admin = true")
    op.execute("UPDATE users SET role = 'expert' WHERE is_admin = false")

    # 3. Drop is_admin (or keep as computed for backward compat during transition)
    # Phase 1: keep is_admin, Phase 2: drop it
    # op.drop_column('users', 'is_admin')

    # 4. Add description to forms
    op.add_column('forms', sa.Column('description', sa.String(), nullable=True))
```

**Why not keep `is_admin` forever?** Because two sources of truth always diverge. The `@property` shim buys us time, but the column should be dropped in Phase 2 once all code reads from `role`.

### 5.2 Auth Changes (`backend/core/auth.py`)

Replace the admin dependency functions:

```python
# REPLACE get_admin_user / get_current_admin_user with:

def require_role(*roles: UserRole):
    """FastAPI dependency factory — returns 403 if user's role is not in the allowed set."""
    async def dependency(user: User = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(r.value for r in roles)}"
            )
        return user
    return dependency

# Convenience aliases
require_facilitator = require_role(UserRole.FACILITATOR, UserRole.PLATFORM_ADMIN)
require_platform_admin = require_role(UserRole.PLATFORM_ADMIN)
```

Update `assert_form_owner_or_admin`:

```python
def assert_form_owner_or_facilitator(form: object, user: User) -> None:
    """Raise 403 if user is not the form's owner AND not a platform admin."""
    if getattr(form, "owner_id", None) == user.id:
        return  # Owner always has access
    if user.role == UserRole.PLATFORM_ADMIN:
        return  # Platform admin has read/delete access
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only the consultation owner or a platform admin can perform this action",
    )
```

### 5.3 API Route Changes

| Current Route | Current Guard | New Guard | Notes |
|---|---|---|---|
| `POST /forms/create-admin` | `get_current_admin_user` | `require_facilitator` | Deprecate, merge into `/forms/create` |
| `POST /forms/create` | `get_current_user` | `require_facilitator` | Now facilitator-only |
| `GET /forms` (all forms) | `get_current_admin_user` | `require_platform_admin` | Global list — admin only |
| `GET /my_forms` | `get_current_user` | `get_current_user` | No change — any authenticated user |
| `GET /my_created_forms` | `get_current_user` | `require_facilitator` | Only facilitators have created forms |
| `POST /forms/unlock` | `get_current_user` | `get_current_user` | No change — any role can join |
| `PUT /forms/{id}` | `assert_form_owner_or_admin` | `assert_form_owner_or_facilitator` | Scoped to owner |
| `DELETE /forms/{id}` | `assert_form_owner_or_admin` | `assert_form_owner_or_facilitator` | Scoped to owner + admin |
| Synthesis routes | `get_current_admin_user` | `assert_form_owner_or_facilitator` | Scoped to form owner |
| `GET /admin/settings` | `get_current_admin_user` | `require_platform_admin` | Platform-level only |
| `GET /audit-log` | `get_current_admin_user` | `require_platform_admin` | Platform-level only |

**New routes needed:**

| Route | Guard | Purpose |
|---|---|---|
| `GET /users` | `require_platform_admin` | List users for role management |
| `PATCH /users/{id}/role` | `require_platform_admin` | Change a user's role |
| `GET /forms/{id}/participants` | `assert_form_owner_or_facilitator` | List experts who joined |
| `DELETE /forms/{id}/participants/{user_id}` | `assert_form_owner_or_facilitator` | Remove an expert |

### 5.4 Frontend Changes

**`Dashboard.tsx` — three-way split:**

```tsx
export default function Dashboard() {
  const { user } = useAuth();

  switch (user.role) {
    case 'platform_admin':
      return <AdminDashboard />;
    case 'facilitator':
      return <FacilitatorDashboard />;
    default:
      return <ExpertDashboard />;
  }
}
```

**What each dashboard contains:**

| Component | What it shows |
|---|---|
| `ExpertDashboard` | Join-by-code card + list of joined consultations (current `UserDashboard` minus the "My Consultations" creation section) |
| `FacilitatorDashboard` | "My Consultations" (forms I created) + "Create New" + "Join as Expert" card. Merge of current AdminDashboard (scoped to owned forms) and UserDashboard join flow |
| `AdminDashboard` | Everything in `FacilitatorDashboard` + "All Consultations" tab + "Users" tab + "Settings" |

**Key UX decision:** The Facilitator dashboard has a "Join as Expert" section at the bottom. This makes the dual-role (facilitator on mine, expert on yours) discoverable without a mode switch.

**`AuthContext` changes:**

```tsx
interface AuthState {
  user: {
    id: number;
    email: string;
    role: 'expert' | 'facilitator' | 'platform_admin';
  } | null;
  token: string | null;
  // Convenience getters
  isAdmin: boolean;        // backward compat: role === 'platform_admin'
  isFacilitator: boolean;  // role === 'facilitator' || role === 'platform_admin'
}
```

The JWT payload should include the role:
```python
def create_access_token(data: dict, ...):
    to_encode = data.copy()
    to_encode["role"] = data.get("role", "expert")  # include role in JWT
    ...
```

**Route protection (frontend):**

```tsx
// ProtectedRoute wrapper
function RequireRole({ roles, children }: { roles: string[], children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

// Usage
<Route path="/admin/*" element={
  <RequireRole roles={['platform_admin']}>
    <AdminLayout />
  </RequireRole>
} />
```

### 5.5 Join Code Migration

Existing join codes (base64 strings) continue to work. The backend normalises input: strip whitespace, strip hyphens, try exact match first, then try case-insensitive match. New codes are generated in `SYM-XXXX-NNNN` format. Old codes are not retroactively reformatted — they still function but look different. Facilitators can regenerate to get the new format.

---

## 6. Ship Plan

### Phase 1: Role Column + Auth Gating (Week 1-2)

**Goal:** Replace `is_admin` with `role`, gate existing routes correctly.

**Changes:**
1. Alembic migration: add `role` column, migrate data from `is_admin`
2. Add `UserRole` enum and `require_role()` dependency to auth.py
3. Keep `is_admin` property as backward-compat shim
4. Update all route guards per the table in 5.3
5. Update JWT to include `role`
6. Update `AuthContext` to read `role` from JWT
7. Update `Dashboard.tsx` to three-way switch
8. Rename `UserDashboard` → `ExpertDashboard`, strip out form creation section
9. Create `FacilitatorDashboard` by forking `AdminDashboard` and scoping to owned forms + adding join card
10. Gate "New Consultation" behind facilitator role

**Does NOT include:** New join code format, participant management UI, user management UI.

**Migration:** All current `is_admin=true` users become `platform_admin`. All others become `expert`. Initial facilitators are promoted manually by a platform admin via a new API endpoint.

**Testing:** All existing E2E tests should pass with the `is_admin` property shim. New tests for role-based access on each route.

### Phase 2: Join Code Format + Facilitator UX (Week 3-4)

**Changes:**
1. New `SYM-XXXX-NNNN` code generation function
2. Input normalisation on `/forms/unlock` (strip whitespace/hyphens, uppercase)
3. Description field on forms
4. Participant list UI for facilitators
5. Remove/revoke participant API
6. Magic-link join URL: `/join/{code}` — auto-join if authenticated, redirect to register if not
7. Facilitator onboarding: first-time facilitator sees a quick 3-step guide

### Phase 3: Platform Admin Panel (Week 5-6)

**Changes:**
1. User management page: list users, change roles, search
2. Audit log for role changes
3. "All Consultations" view for platform admin (read-only)
4. Drop `is_admin` column from database
5. Platform settings page (LLM config, branding)

### What's explicitly NOT in any phase:

- **Multi-tenancy / organisations.** Not needed for single-deployment government use. If needed later, add an `org_id` foreign key. Don't build it now.
- **Observer role.** Export to PDF. Share the PDF. Done.
- **Invite-by-email.** Nice-to-have, not MVP. The code mechanism works. Email invites are a Phase 4 polish item.
- **Role hierarchy configuration.** There are three roles. They're hardcoded. No admin screen to create custom roles. Ever.
- **Session state machines.** Prometheus proposed a 5-state session FSM. Overkill. A consultation is open or closed. A round is active or not. That's two booleans, not a state machine.

---

## 7. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Existing admins lose access to features during migration | Medium | High | `is_admin` property shim ensures zero breaking changes in Phase 1 |
| Facilitators create forms but can't run synthesis (gating bug) | Low | High | Integration tests for every facilitator route |
| Join codes too short, collisions in large deployments | Very Low | Low | 674M namespace, collision retry loop, monitor in logs |
| Government team wants custom roles | Medium | Low | Say no. Three roles cover the use case. Custom roles are a governance tar pit. |
| Experts accidentally see "Create Consultation" | Low | Medium | Role check on frontend AND backend. Belt and suspenders. |

---

## 8. Open Questions

1. **Should facilitators be able to co-own a consultation?** Current design is single-owner. A government team might want 2-3 facilitators managing one consultation. Recommendation: defer to Phase 3+. Use platform admin as escape hatch for now.

2. **Should registration require email verification?** Current system: no. Government deployment may require it. Recommendation: add email verification as an optional platform setting in Phase 3. Don't block Phase 1 on it.

3. **Self-service facilitator promotion or admin-only?** Current recommendation: admin-only. A researcher emails the platform admin, admin clicks "Promote to Facilitator". If self-service is needed, add an approval workflow in Phase 4.

---

## Summary

Three roles. `expert` (default), `facilitator` (creates/runs consultations), `platform_admin` (manages the platform). Human-readable join codes (`SYM-XXXX-NNNN`). Facilitators can join other consultations as experts. Phase 1 ships in two weeks with zero breaking changes.

Kill complexity. Ship the thing. Iterate when real users ask for more.
