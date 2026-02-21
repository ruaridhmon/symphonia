# Grind Worker 4: API Layer & Error Handling

## Summary

Created a centralised API client and typed API modules to replace duplicated raw `fetch()` calls across the frontend. Migrated `UserDashboard.tsx` to use the new API layer with proper error handling.

## Files Created

### `frontend/src/api/client.ts`
- Central `apiClient<T>()` function with automatic auth header injection from `localStorage`
- Auto-redirect to `/login` on 401 (token expired)
- `ApiError` class with HTTP status for typed catch blocks
- Convenience `api.get/post/put/delete` methods with generic return types
- Reads `VITE_API_BASE_URL` from env, falls back to `/api`

### `frontend/src/api/forms.ts`
- **Types:** `Form`, `FormListItem`, `FormDetail`, `CreateFormPayload`, `UpdateFormPayload`
- **Functions:** `getForms()`, `getForm(id)`, `createForm(data)`, `updateForm(id, data)`, `getMyForms()`, `unlockForm(code)`

### `frontend/src/api/rounds.ts`
- **Types:** `Round`, `ActiveRound`, `NextRoundResult`, `RoundConfig`
- **Functions:** `getRounds(formId)`, `getActiveRound(formId)`, `nextRound(formId, config?)`

### `frontend/src/api/responses.ts`
- **Types:** `SubmitResponsePayload`, `ResponseItem`, `HasSubmittedResult`, `MyResponse`
- **Functions:** `submitResponse(formId, answers)`, `hasSubmitted(formId)`, `getMyResponse(formId)`, `getResponses(formId, allRounds?)`
- Note: `submitResponse` uses `URLSearchParams` (form-encoded) because the backend endpoint uses `Form(...)` dependencies, not JSON body

## Files Modified

### `frontend/src/UserDashboard.tsx`
- Replaced raw `fetch()` calls with `getMyForms()` and `unlockForm()` from `api/forms`
- Added `error` state and `loading` state
- Added error banner with retry button (same pattern as AdminDashboard)
- Added loading indicator in the forms list
- Typed `myForms` state as `Form[]` (was untyped `[]`)
- Wrapped `fetchMyForms` in `useCallback` for proper dependency tracking
- `handleUnlock` now catches `ApiError` with specific messages per status code
- Removed direct `API_BASE_URL` import (now encapsulated in api client)

## Build Status
✅ `npm run build` — passes cleanly (vite build, 2183 modules, 0 errors)

## Migration Path for Other Components
The following components still use raw `fetch()` and can be migrated to use these API modules:
- `AdminDashboard.tsx` → `getForms()`, `createForm()`
- `FormPage.tsx` → `getForm()`, `getActiveRound()`, `submitResponse()`, `hasSubmitted()`, `getMyResponse()`
- `SummaryPage.tsx` → `getForm()`, `getRounds()`, `getResponses()`, `nextRound()`
- `ResultPage.tsx` → `hasSubmitted()` (feedback variant)
- `components/CommentThread.tsx` → could add a `comments` API module
- `components/ResponseEditor.tsx` → `submitResponse()`
