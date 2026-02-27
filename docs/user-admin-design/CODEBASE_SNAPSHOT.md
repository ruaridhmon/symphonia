# Symphonia — Current Codebase Snapshot for User/Admin Design Brainstorm

## What Symphonia Is

Symphonia is a web platform for structured Delphi-style policy consultations. Facilitators (researchers, government teams) create multi-round questionnaire forms, recruit expert panels, run synthesis rounds using LLMs, and export results. Experts fill in forms round by round, see synthesised results, and refine their views.

## Current Auth/Role Model

**Backend model (backend/core/models.py):**
```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)         # THE ONLY ROLE FLAG
    has_submitted_feedback = Column(Boolean, default=False)
    reset_token / reset_token_expiry                  # password reset

    owned_forms = relationship("FormModel", ...)      # forms this user created
    unlocked_forms = relationship("UserFormUnlock")   # forms this user joined via code
```

**Auth (backend/core/auth.py):**
- JWT via httpOnly cookie (preferred) + Bearer header fallback
- 24h token expiry
- `get_current_user()` dependency
- `require_admin()` → raises 403 if not `user.is_admin`
- `require_admin_or_owner()` → 403 if not admin AND not owner of the resource

**Routes gate on `is_admin`:**
- All form creation/edit/delete → admin only
- Synthesis runs → admin only
- Settings, audit log → admin only
- Join via code → any authenticated user
- Submit responses → any authenticated user who has unlocked the form

**Frontend (Dashboard.tsx):**
```tsx
// Dead simple — admin sees admin view, everyone else sees user view
const { isAdmin } = useAuth();
return isAdmin ? <AdminDashboard /> : <UserDashboard />;
```

**AdminDashboard:** Full form management, analytics, settings, synthesis control.
**UserDashboard (just added):** Create own forms, join forms by code, view own forms.

## The Problem

The binary `is_admin` split is already broken:
1. Admins can't participate as regular users (no form joining from their view)
2. Regular users can now create forms (UserDashboard) but have no meaningful distinction from each other — anyone can create
3. No concept of "I created this form" vs "I was invited to fill in this form"
4. Government clients need audit trails and role separation — a researcher who runs consultations should not have access to all forms platform-wide
5. No org/team concept — currently one flat namespace for all admins

## Current Data Model for Forms

```python
class FormModel(Base):
    id, title, questions, allow_join, join_code
    owner_id = ForeignKey("users.id")  # who created it (nullable for old forms)
    rounds → RoundModel
    responses → Response
    unlocked_by_users → UserFormUnlock  # join-by-code tracking

class UserFormUnlock(Base):
    user_id, form_id  # many-to-many: which users have unlocked which forms
```

## Prior Art (from consensus library deliberation — use as inspiration but reason about Symphonia)

**Hector (product):** Two roles — Facilitator + Expert. Facilitator creates/manages, Expert responds. No superadmin v1. Invite codes: `EXP-MNQP-7814` (37-bit entropy).

**Prometheus (security):** Five roles — PLATFORM_ADMIN → ORG_ADMIN → ANALYST → EXPERT → OBSERVER. Session state machine. 50-bit invite codes with Luhn checksum.

---

## Your Task

Produce a comprehensive design document answering:

1. **Should Symphonia have a formal user/admin role system, and why?** What are the roles? What rights does each have?
2. **Session/form creation:** Who can create a form? What's collected? What's the creation flow?
3. **Join-by-code mechanism:** How does it work? What's the code format? What are the UX flows?
4. **How does this map onto the existing codebase?** What DB schema changes are needed? What API changes? What frontend changes? How do we migrate from the current `is_admin` boolean?
5. **Ship plan:** Phased, pragmatic. What ships first?

Target audience: a government policy team deploying Symphonia for expert consultations on national AI strategy. They have ~3-10 facilitators and 20-100 experts per consultation.

Write a thorough, opinionated design document. This will be reviewed against a second independent design.
