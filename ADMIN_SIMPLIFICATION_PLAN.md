# Admin Dashboard Simplification Plan

**Goal**: Clean up cluttered admin dashboard with simplified code and user workflow. Remove all Supabase artifacts (app uses Neon only).

---

## Tasks

### Phase 1: Remove Supabase Artifacts
- [ ] Delete `src/lib/supabase.ts` (unused 7-line file)
- [ ] Remove `@supabase/supabase-js` from `package.json` dependencies
- [ ] Remove Supabase env vars from any `.env` files
- [ ] Search and remove stale Supabase references in `instructions/` folder

### Phase 2: Create Reusable Components

#### Modal Component
- [ ] Create `src/components/Modal.tsx`
  - Props: `open`, `onClose`, `title`, `children`, `maxWidth?`
  - Handles backdrop click-to-close and escape key
  - Replaces modal markup duplicated across admin pages

#### Icon System
- [ ] Create `src/components/icons.tsx`
  - Extract inline SVG icons from `AdminApp.tsx` navItems
  - Named exports: `DashboardIcon`, `TasksIcon`, `EmployeesIcon`, `JobsIcon`, `TimeIcon`, `SearchIcon`, `LogoutIcon`

### Phase 3: Extract Custom Hooks
- [ ] Create `src/hooks/useForm.ts` — generic form state handler
- [ ] Create `src/hooks/useModal.ts` — modal open/close state with save-in-progress
- [ ] Refactor `AdminTasksPage.tsx` (13 useState → ~4 with hooks)
- [ ] Refactor `AdminEmployeesPage.tsx` similarly

### Phase 4: Consolidate Styles
- [ ] Add CSS classes to `global.css`:
  - `.toolbar`
  - `.stat-card`
  - `.form-group`
  - `.modal-header`, `.modal-body`, `.modal-footer`
  - `.user-badge`
- [ ] Remove inline `style={{...}}` objects from admin pages
- [ ] Maintain 4px grid spacing per Superhuman guidelines
- [ ] Use `tabular-nums` for numeric data

### Phase 5: Simplify Individual Pages

#### AdminApp.tsx
- [ ] Move user avatar/footer inline styles to CSS `.user-badge`
- [ ] Use Icon components instead of inline SVG

#### AdminTasksPage.tsx (highest complexity)
- [ ] Apply `useForm` and `useModal` hooks
- [ ] Extract `TaskFilters` component (search + status dropdown)
- [ ] Extract `SubtaskList` component for checklist UI
- [ ] Replace `window.confirm()` with AlertDialog for delete

#### AdminEmployeesPage.tsx
- [ ] Extract `EmployeeCard` component
- [ ] Combine Add + View/Edit into single `EmployeeModal` with mode prop
- [ ] Simplify synthetic email generation

#### AdminDashboardPage.tsx
- [ ] Remove unused `elapsed()` function
- [ ] Extract `StatCard` component
- [ ] Extract `ActiveWorkersCard` and `AttentionTasksCard` components

### Phase 6: Verification
- [ ] Run `npm install` — verify Supabase removal doesn't break
- [ ] Run `npm run build` — should succeed
- [ ] Run `tsc --noEmit` — no TypeScript errors
- [ ] Manual test all 5 admin views
- [ ] Confirm modals open/close properly

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Theme | Keep dark theme | User preference |
| Navigation | State-based (not URL) | Simple admin SPA pattern |
| Form management | Custom `useForm` hook | Minimal deps, fits existing patterns |
| Delete confirmation | AlertDialog component | Better UX than `window.confirm()` |

---

## Files to Create

```
src/
  components/
    Modal.tsx        # Reusable modal wrapper
    icons.tsx        # SVG icon components
    AlertDialog.tsx  # Delete confirmation dialog
  hooks/
    useForm.ts       # Form state management
    useModal.ts      # Modal state management
```

## Files to Delete

```
src/lib/supabase.ts  # Unused Supabase client
```

## Files to Modify

```
package.json                          # Remove @supabase/supabase-js
src/styles/global.css                 # Add new utility classes
src/pages/AdminApp.tsx                # Use Icon components, CSS classes
src/pages/admin/AdminDashboardPage.tsx
src/pages/admin/AdminTasksPage.tsx
src/pages/admin/AdminEmployeesPage.tsx
src/pages/admin/AdminJobsPage.tsx
src/pages/admin/AdminTimePage.tsx
```

---

## Progress

Started: March 5, 2026
Status: **Planning Complete — Ready to Execute**
