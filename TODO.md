# Repository Task List

## Task Format Legend
- [ ] Incomplete
- [x] Complete
- [~] In Progress
- [!] Blocked

# TODO.md - Testing Infrastructure Improvements

This document outlines prioritized tasks to improve the Spa-Flow testing infrastructure for a solo developer workflow (direct-to-main, AI-agent driven). Each parent task is SMALL in scope, with subtasks breaking it down further.

---

## Task 8: Enforce Generated Files are Up-to-Date in CI

- [x] **ID:** T8 | **Status:** Complete

**Related file paths:**  
- `.github/workflows/ci.yml` (contract-tests job)  
- `lib/api-spec/package.json`

**Definition of done:**  
- After running `pnpm run codegen` in CI, any diff in generated folders causes CI to fail with a clear message.

**Out of scope:**  
- Auto-committing generated files.

**Rules to follow:**  
- Run `git --no-pager diff --exit-code` on the generated directories.  
- Print the diff and instruction to run `pnpm run codegen` locally if mismatch.

**Advanced coding pattern:**  
Add a helper script `scripts/check-generated.sh` that runs codegen, diffs, and exits.

**Anti-patterns:**  
- Silently ignoring diff.  
- Running codegen without checking diff.

**Imports/exports:**  
Not applicable.

**Depends on:**  
None.

**Blocks:**  
None.

### Subtasks

- [x] **T8.1** – `.github/workflows/ci.yml` – In `contract-tests` job, add a step `- name: Regenerate and check diff` after installing dependencies.
- [x] **T8.2** – The step runs: `cd lib/api-spec && pnpm run codegen && git --no-pager diff --exit-code lib/api-client-react/src/generated lib/api-zod/src/generated || (echo "Generated files out of date. Run 'cd lib/api-spec && pnpm run codegen' and commit changes." && exit 1)`.
- [x] **T8.3** – Test by modifying `openapi.yaml` without regenerating, push, and confirm CI fails.

---

## Task 9: Add Pre-push Hook for Fast Local Checks

- [x] **ID:** T9 | **Status:** Complete

**Related file paths:**  
- `.git/hooks/pre-push` (new)

**Definition of done:**  
- Running `git push` triggers type checking and smoke tests.  
- Push is aborted if either fails.

**Out of scope:**  
- Running full test suite.  
- Automatically fixing errors.

**Rules to follow:**  
- Use `pnpm run typecheck` and `pnpm -r --if-present run test:fast`.  
- Exit with non-zero code on failure.  
- Make hook executable.

**Advanced coding pattern:**  
Add a timeout to prevent hanging (e.g., `timeout 60s`).

**Anti-patterns:**  
- Running slow tests (E2E, load).  
- Skipping hook because it's annoying (keep it fast).

**Imports/exports:**  
Not applicable.

**Depends on:**  
None.

**Blocks:**  
None.

### Subtasks

- [x] **T9.1** – Create `.git/hooks/pre-push` with shebang `#!/bin/sh`.
- [x] **T9.2** – Add command: `echo "Running type check..." && pnpm run typecheck || exit 1`.
- [x] **T9.3** – Add command: `echo "Running smoke tests..." && pnpm -r --if-present run test:fast || exit 1`.
- [x] **T9.4** – Make hook executable: `chmod +x .git/hooks/pre-push`.
- [x] **T9.5** – Test by introducing a type error and pushing – push should be rejected.

**Implementation notes:**
- Pre-push hook created at `.git/hooks/pre-push`
- Hook runs typecheck and test:fast before allowing push
- Hook exits with non-zero code on failure to abort push
- Note: test:fast currently fails due to express-rate-limit IPv6 validation errors (documented in TASK-067)
- Typecheck passes successfully

---

## Task 10: Fix or Remove Stryker Mutation Testing

- [x] **ID:** T10 | **Status:** Complete

**Related file paths:**  
- `.github/workflows/ci.yml` (mutation-tests job)  
- `artifacts/api-server/package.json`  
- `artifacts/api-server/stryker.conf.js`

**Definition of done:**  
- Either Stryker runs successfully on a small file set (e.g., `src/lib/auth.ts`) without "No tests executed" error, OR the mutation test job is removed from CI and documented as disabled.

**Out of scope:**  
- Achieving a high mutation score.  
- Adding Stryker to other packages.

**Rules to follow:**  
- If fixing: limit `mutate` to one or two files initially, use `vitest` runner with `--run` flag.  
- If removing: delete or comment out the CI job and update `mutation-testing.md` to reflect status.

**Advanced coding pattern:**  
Use Stryker's `--concurrency 1` and `--logLevel debug` to diagnose issues.

**Anti-patterns:**  
- Leaving a broken job in CI that fails silently.  
- Not documenting the decision.

**Imports/exports:**  
Not applicable.

**Depends on:**  
None.

**Blocks:**  
None.

### Subtasks

- [ ] **T10.1** – `artifacts/api-server/stryker.conf.js` – Set `mutate: ['src/lib/auth.ts']` (only one file). Set `vitest: { run: '--run' }` if needed.
- [ ] **T10.2** – Run `cd artifacts/api-server && pnpm run test:mutation` locally. If it succeeds, proceed to T10.3; if fails, go to T10.4.
- [ ] **T10.3** (success path) – `.github/workflows/ci.yml` – Keep `mutation-tests` job but add `if: github.ref == 'refs/heads/main'` to run only on main, not every push.
- [ ] **T10.4** (failure path) – `.github/workflows/ci.yml` – Comment out or delete the entire `mutation-tests` job.
- [ ] **T10.5** – `docs/mutation-testing.md` – Add a note that mutation testing is currently disabled due to Vitest runner incompatibility, and when it will be re-evaluated.

---

## [ ] TASK-054: Add Resource Maintenance Management
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `lib/db/src/schema/lockers.ts`
- `lib/db/src/schema/rooms.ts`
- `artifacts/api-server/src/routes/maintenance.ts` (new)
- `artifacts/spaflow/src/pages/maintenance.tsx` (new)

### Definition of Done
- Add "maintenance" status to lockers and rooms
- Add maintenance notes field
- Create maintenance schedule UI
- Add maintenance history tracking
- Exclude maintenance resources from availability
- Add maintenance notifications to staff
- Tests updated and passing

### Out of Scope
- Predictive maintenance
- Maintenance cost tracking
- Vendor management for repairs

### Rules to Follow
- Maintenance status prevents resource assignment
- Maintenance notes required for maintenance status
- Track maintenance history
- Notify staff of maintenance schedule
- Exclude from availability calculations
- Manager-only maintenance management

### Advanced Coding Pattern
- State machine for resource status
- Maintenance scheduling pattern
- Notification pattern for staff
- History tracking pattern

### Anti-Patterns
- No maintenance history
- Missing notifications
- Resources available during maintenance
- No validation for maintenance notes

### Imports/Exports
- Update resource schema types
- Export maintenance types
- Export maintenance utilities

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-054-A: Add Maintenance Status to Resource Enums
**Target:** `lib/db/src/schema/lockers.ts`
**Action:** Add "maintenance" to resourceStatusEnum, update rooms.ts to use same enum, create migration.

#### TASK-054-B: Add Maintenance Notes Field
**Target:** `lib/db/src/schema/lockers.ts`
**Action:** Add maintenanceNotes text field to lockersTable and roomsTable, create migration.

#### TASK-054-C: Update Availability Queries
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Update all availability queries to exclude maintenance status, update rooms.ts similarly.

#### TASK-054-D: Add Maintenance API Endpoints
**Target:** `artifacts/api-server/src/routes/maintenance.ts` (new)
**Action:** Add GET/POST/PUT/DELETE endpoints for maintenance records, link to resources, require manager role.

#### TASK-054-E: Create Maintenance Schedule UI
**Target:** `artifacts/spaflow/src/pages/maintenance.tsx` (new)
**Action:** Create manager-only page showing current maintenance, schedule new maintenance, view maintenance history, resource selector.

#### TASK-054-F: Add Maintenance Notifications
**Target:** `artifacts/api-server/src/services/notifications.ts`
**Action:** Add notification when maintenance scheduled, notify staff when maintenance starts/ends, include resource and notes.

#### TASK-054-G: Add Maintenance History
**Target:** `artifacts/spaflow/src/pages/maintenance.tsx`
**Action:** Show maintenance history for each resource, include dates, notes, who performed maintenance, duration.

#### TASK-054-H: Add Tests for Maintenance
**Target:** `artifacts/api-server/src/routes/maintenance.test.ts` (new)
**Action:** Write tests for maintenance CRUD, availability exclusion, notifications, history tracking.

---

## [ ] TASK-055: Add Client Behavior Analytics
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/analytics.ts` (new)
- `artifacts/spaflow/src/pages/analytics.tsx` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Client visit frequency tracking
- Average visit duration calculation
- Peak client hours identification
- Client lifetime value calculation
- Churn risk analysis (members not visiting)
- Client segmentation by visit patterns
- Tests updated and passing

### Out of Scope
- Predictive analytics for future behavior
- Machine learning models
- Real-time behavior tracking

### Rules to Follow
- Use existing rental session data
- Calculate metrics from historical data
- Support date range filtering
- Identify patterns and trends
- Export analytics data
- Manager-only access

### Advanced Coding Pattern
- Analytics service pattern
- Data aggregation pipeline
- Metric calculation algorithms
- Segmentation strategy

### Anti-Patterns
- Inefficient aggregations
- Missing date range support
- No export functionality
- Complex ML when simple stats suffice

### Imports/Exports
- Create analytics service
- Export analytics types
- Export metric calculators

### Depends On
- TASK-049 (Advanced revenue reports)

### Blocks
- None

---

### Subtasks

#### TASK-055-A: Add Visit Frequency Calculation
**Target:** `artifacts/api-server/src/services/analytics.ts` (new)
**Action:** Calculate visit frequency per client (visits per month), identify frequent visitors, detect visit patterns.

#### TASK-055-B: Add Average Visit Duration Calculation
**Target:** `artifacts/api-server/src/services/analytics.ts`
**Action:** Calculate average session duration per client, identify long/short visit patterns, segment by duration.

#### TASK-055-C: Add Peak Hours Analysis
**Target:** `artifacts/api-server/src/services/analytics.ts`
**Action:** Analyze check-in times by hour, identify peak client hours, segment by day of week, show occupancy trends.

#### TASK-055-D: Add Client Lifetime Value Calculation
**Target:** `artifacts/api-server/src/services/analytics.ts`
**Action:** Calculate CLV per client (total revenue over lifetime), identify high-value clients, segment by CLV tiers.

#### TASK-055-E: Add Churn Risk Analysis
**Target:** `artifacts/api-server/src/services/analytics.ts`
**Action:** Identify members not visiting in 30/60/90 days, calculate churn risk score, flag at-risk clients for outreach.

#### TASK-055-F: Add Client Segmentation
**Target:** `artifacts/api-server/src/services/analytics.ts`
**Action:** Segment clients by visit patterns (frequent, occasional, rare), by revenue tier, by membership type, by visit duration.

#### TASK-055-G: Add Analytics API Endpoints
**Target:** `artifacts/api-server/src/routes/analytics.ts` (new)
**Action:** Add endpoints for all analytics metrics, support date range filtering, client-specific analytics, require manager role.

#### TASK-055-H: Create Analytics Dashboard
**Target:** `artifacts/spaflow/src/pages/analytics.tsx` (new)
**Action:** Create manager-only page with client analytics, visit patterns, CLV rankings, churn risk list, segmentation charts.

#### TASK-055-I: Add Tests for Analytics
**Target:** `artifacts/api-server/src/services/analytics.test.ts` (new)
**Action:** Write tests for all metric calculations, verify accuracy with known data, test date range filtering.

---

## [ ] TASK-056: Add Inventory Reports
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/reports.ts`
- `artifacts/spaflow/src/pages/reports.tsx`

### Definition of Done
- Product sales velocity report
- Low stock prediction based on sales trends
- Product performance by category
- Seasonal product demand analysis
- Automatic reorder point calculation
- Stock turnover rate calculation
- Tests updated and passing

### Out of Scope
- Inventory optimization algorithms
- Supplier management
- Purchase order automation

### Rules to Follow
- Use existing product and transaction data
- Calculate sales velocity (units sold per day)
- Predict stock-out dates based on trends
- Categorize products for analysis
- Suggest reorder quantities
- Manager-only access

### Advanced Coding Pattern
- Inventory analytics pattern
- Trend analysis algorithm
- Prediction calculation
- Reorder point calculation

### Anti-Patterns
- Manual calculations only
- Missing trend analysis
- No prediction capabilities
- Inefficient aggregations

### Imports/Exports
- Extend reports API with inventory endpoints
- Export inventory analytics types
- Export prediction utilities

### Depends On
- TASK-049 (Advanced revenue reports)

### Blocks
- None

---

### Subtasks

#### TASK-056-A: Add Sales Velocity Calculation
**Target:** `artifacts/api-server/src/services/inventory.ts` (new)
**Action:** Calculate sales velocity per product (units sold per day/week), identify fast/slow movers, support date range filtering.

#### TASK-056-B: Add Low Stock Prediction
**Target:** `artifacts/api-server/src/services/inventory.ts`
**Action:** Predict stock-out date based on sales velocity and current stock, flag products at risk, suggest reorder timeline.

#### TASK-056-C: Add Product Performance by Category
**Target:** `artifacts/api-server/src/services/inventory.ts`
**Action:** Aggregate sales by product category, calculate revenue per category, identify best/worst performing categories.

#### TASK-056-D: Add Seasonal Demand Analysis
**Target:** `artifacts/api-server/src/services/inventory.ts`
**Action:** Analyze sales by month/season, identify seasonal patterns, predict seasonal demand, suggest stock adjustments.

#### TASK-056-E: Add Reorder Point Calculation
**Target:** `artifacts/api-server/src/services/inventory.ts`
**Action:** Calculate optimal reorder point based on sales velocity and lead time, suggest reorder quantities, configure safety stock levels.

#### TASK-056-F: Add Stock Turnover Rate
**Target:** `artifacts/api-server/src/services/inventory.ts`
**Action:** Calculate stock turnover rate (cost of goods sold / average inventory), identify slow-moving stock, suggest clearance strategies.

#### TASK-056-G: Add Inventory Report Endpoints
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/inventory/* endpoints for all inventory metrics, support date range filtering, require manager role.

#### TASK-056-H: Add Inventory Reports to Dashboard
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Add inventory section to reports page, show sales velocity, low stock predictions, category performance, seasonal trends.

#### TASK-056-I: Add Tests for Inventory Reports
**Target:** `artifacts/api-server/src/services/inventory.test.ts` (new)
**Action:** Write tests for all inventory calculations, verify prediction accuracy, test date range filtering.

---

## [ ] TASK-057: Improve Mobile-Responsive Design
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/checkin.tsx`
- `artifacts/spaflow/src/pages/dashboard.tsx`
- `artifacts/spaflow/src/pages/lockers.tsx`
- `artifacts/spaflow/src/pages/rooms.tsx`
- `artifacts/spaflow/src/index.css`

### Definition of Done
- Optimize check-in flow for tablet use
- Add mobile-specific navigation patterns
- Increase touch target sizes for mobile
- Test on actual tablet devices
- Add landscape mode optimization for tablets
- Add responsive breakpoints for all pages
- Tests updated and passing

### Out of Scope
- Native mobile app development
- PWA (Progressive Web App) features

### Rules to Follow
- Design for tablet landscape mode (common at front desk)
- Minimum touch target 44x44px
- Test on iPad and Android tablets
- Optimize form inputs for touch
- Use responsive breakpoints (mobile, tablet, desktop)
- Maintain functionality across all screen sizes

### Advanced Coding Pattern
- Responsive design pattern
- Touch-optimized UI patterns
- Breakpoint strategy
- Mobile-first design principles

### Anti-Patterns
- Desktop-only design
- Too small touch targets
- No tablet optimization
- Breaking functionality on mobile

### Imports/Exports
- No new imports required
- CSS and component changes only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-057-A: Add Responsive Breakpoints
**Target:** `artifacts/spaflow/src/index.css`
**Action:** Add Tailwind breakpoints for mobile (640px), tablet (768px), desktop (1024px), large desktop (1280px).

#### TASK-057-B: Optimize Check-in Flow for Tablet
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Redesign check-in flow for tablet landscape mode, use 2-column layout, larger touch targets, optimize form inputs.

#### TASK-057-C: Optimize Dashboard for Mobile
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Make KPI cards stack on mobile, optimize active rentals list for small screens, add horizontal scroll for charts if needed.

#### TASK-057-D: Optimize Resource Grids for Mobile
**Target:** `artifacts/spaflow/src/pages/lockers.tsx`, `rooms.tsx`
**Action:** Adjust grid columns for mobile (2-3 columns), add horizontal scroll for large grids, optimize touch targets.

#### TASK-057-E: Add Mobile Navigation
**Target:** `artifacts/spaflow/src/components/layout/Sidebar.tsx`
**Action:** Add hamburger menu for mobile, collapsible sidebar, bottom navigation option for tablets, smooth transitions.

#### TASK-057-F: Increase Touch Target Sizes
**Target:** All interactive components
**Action:** Ensure all buttons and interactive elements are at least 44x44px, increase padding on mobile, optimize spacing.

#### TASK-057-G: Add Landscape Mode Optimization
**Target:** `artifacts/spaflow/src/pages/`
**Action:** Optimize layouts for tablet landscape mode, use available width effectively, consider front desk tablet use case.

#### TASK-057-H: Test on Actual Devices
**Target:** Manual testing
**Action:** Test on iPad and Android tablets, verify touch interactions, check responsive behavior, document issues.

---

## [ ] TASK-058: Add Advanced Search and Filtering
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/spaflow/src/pages/clients.tsx`
- `artifacts/spaflow/src/pages/transactions.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Advanced client search with multiple filters
- Search by date range (visits, transactions)
- Search by membership status
- Search by rental history
- Saved search filters
- Export search results to CSV
- Search suggestions/autocomplete
- Tests updated and passing

### Out of Scope
- Full-text search with Elasticsearch
- Complex query builders
- Natural language search

### Rules to Follow
- Support multiple filter combinations
- Use database indexes for performance
- Provide filter presets (common searches)
- Allow saving custom filters
- Export results for analysis
- Show search result count

### Advanced Coding Pattern
- Advanced filtering pattern
- Search query builder
- Filter preset pattern
- Saved filter management

### Anti-Patterns
- Inefficient queries without indexes
- Too many filter options
- No preset filters
- Missing export functionality

### Imports/Exports
- Extend client search API
- Export filter types
- Export search utilities

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-058-A: Add Advanced Client Search Filters
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add filters for date range, membership status, last visit date, total visits, total spent, require proper indexes.

#### TASK-058-B: Add Search Presets
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add preset filters (active members, expired members, high-value clients, recent visitors, inactive clients).

#### TASK-058-C: Add Saved Search Functionality
**Target:** `lib/db/src/schema/saved_searches.ts` (new)
**Action:** Create savedSearchesTable with userId, name, filters JSON, createdAt, add CRUD endpoints for saved searches.

#### TASK-058-D: Add Search Suggestions
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add autocomplete endpoint for client names, return suggestions based on partial input, prioritize recent clients.

#### TASK-058-E: Add Export to CSV
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add CSV export endpoint for search results, include all relevant fields, format for spreadsheet import.

#### TASK-058-F: Update Client Search UI
**Target:** `artifacts/spaflow/src/pages/clients.tsx`
**Action:** Add advanced filter panel, filter presets, saved search dropdown, export button, search suggestions.

#### TASK-058-G: Add Transaction Search Filters
**Target:** `artifacts/api-server/src/routes/transactions.ts`
**Action:** Add filters for date range, transaction type, amount range, client, product type, require proper indexes.

#### TASK-058-H: Add Tests for Advanced Search
**Target:** `artifacts/api-server/src/routes/clients.test.ts`
**Action:** Write tests for all filters, verify query performance, test saved searches, test export functionality.

---

## [ ] TASK-059: Add PII Access Audit
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/spaflow/src/pages/audit-logs.tsx`
- `lib/db/src/schema/audit_logs.ts`

### Definition of Done
- PII access audit report (who viewed what PII and when)
- PII access alerts for unusual access patterns
- PII retention policy configuration
- PII access approval workflow for sensitive operations
- Enhanced audit log filtering for PII access
- Tests updated and passing

### Out of Scope
- Automated PII data export for GDPR (future enhancement)
- PII encryption key rotation (complex, future)

### Rules to Follow
- Log all PII access with full context
- Alert on unusual access patterns (multiple clients, off-hours)
- Require manager approval for bulk PII access
- Provide PII-specific audit filters
- Document retention policy
- Support data export requests manually

### Advanced Coding Pattern
- Audit trail enhancement
- Anomaly detection pattern
- Approval workflow pattern
- Retention policy enforcement

### Anti-Patterns
- Missing PII access logging
- No anomaly detection
- Unlimited PII access without approval
- No retention policy

### Imports/Exports
- Extend audit logging for PII
- Export PII audit types
- Export approval workflow types

### Depends On
- TASK-036 (Manager-only PII viewing)

### Blocks
- None

---

### Subtasks

#### TASK-059-A: Enhance PII Access Logging
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add detailed logging for PII endpoint access, include fields accessed, access reason, request metadata.

#### TASK-059-B: Add PII Access Report Endpoint
**Target:** `artifacts/api-server/src/routes/audit.ts`
**Action:** Add GET /audit/pii-access endpoint, return PII access history with filtering, require manager role.

#### TASK-059-C: Implement PII Access Anomaly Detection
**Target:** `artifacts/api-server/src/services/pii-audit.ts` (new)
**Action:** Create service to detect unusual patterns (bulk access, off-hours, rapid successive access), generate alerts.

#### TASK-059-D: Add PII Access Alerts
**Target:** `artifacts/api-server/src/services/pii-audit.ts`
**Action:** Send alerts for anomalous PII access, log alerts, notify managers via notification system.

#### TASK-059-E: Add PII Access Approval Workflow
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** For bulk PII access (>10 clients), require manager approval, create approval request, track approval status.

#### TASK-059-F: Add PII-Specific Audit Filters
**Target:** `artifacts/spaflow/src/pages/audit-logs.tsx`
**Action:** Add filter for PII access actions, show PII access report, display anomaly alerts, show approval requests.

#### TASK-059-G: Document PII Retention Policy
**Target:** `docs/security.md`
**Action:** Document PII retention period (e.g., 7 years), data deletion procedures, GDPR compliance notes.

#### TASK-059-H: Add Tests for PII Audit
**Target:** `artifacts/api-server/src/services/pii-audit.test.ts` (new)
**Action:** Write tests for PII access logging, anomaly detection, approval workflow, alert generation.

---

## [ ] TASK-060: Create User Documentation
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `docs/user-manual.md` (new)
- `docs/quick-reference.md` (new)
- `docs/troubleshooting.md` (new)

### Definition of Done
- Staff user manual
- Quick reference guide
- Video tutorials for common workflows
- FAQ for staff
- Troubleshooting guide
- Onboarding checklist for new staff

### Out of Scope
- Developer documentation (covered elsewhere)
- API documentation (covered by OpenAPI)

### Rules to Follow
- Write in clear, non-technical language
- Include screenshots for complex workflows
- Cover all common use cases
- Include troubleshooting steps
- Keep documentation up to date
- Make accessible to all staff

### Advanced Coding Pattern
- Technical writing best practices
- Documentation maintenance strategy
- User-centered documentation design

### Anti-Patterns
- Outdated documentation
- Too technical for non-technical staff
- Missing common workflows
- No troubleshooting guidance

### Imports/Exports
- No code changes required
- Documentation only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-060-A: Create Staff User Manual
**Target:** `docs/user-manual.md` (new)
**Action:** Write comprehensive manual covering all features, step-by-step workflows, screenshots, best practices.

#### TASK-060-B: Create Quick Reference Guide
**Target:** `docs/quick-reference.md` (new)
**Action:** Create one-page quick reference with common tasks, keyboard shortcuts, frequently asked questions, contact information.

#### TASK-060-C: Create Video Tutorial Scripts
**Target:** `docs/video-tutorials.md` (new)
**Action:** Write scripts for video tutorials covering check-in, resource management, waitlist, troubleshooting.

#### TASK-060-D: Create FAQ Document
**Target:** `docs/faq.md` (new)
**Action:** Compile FAQ from common questions, include solutions, add troubleshooting tips, update regularly.

#### TASK-060-E: Create Troubleshooting Guide
**Target:** `docs/troubleshooting.md` (new)
**Action:** Document common issues, error messages, solutions, escalation procedures, system status checks.

#### TASK-060-F: Create Onboarding Checklist
**Target:** `docs/onboarding.md` (new)
**Action:** Create checklist for new staff including account setup, training modules, shadowing, certification.

#### TASK-060-G: Add Documentation Links in App
**Target:** `artifacts/spaflow/src/pages/`
**Action:** Add help button in sidebar linking to documentation, add contextual help links on complex pages.

---

## [ ] TASK-061: Add Visual Resource Map
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/spaflow/src/pages/resource-map.tsx` (new)
- `artifacts/api-server/src/routes/config.ts`

### Definition of Done
- Create visual floor plan of spa layout
- Show lockers and rooms in physical positions
- Color-code by status on map
- Click map to view resource details
- Show waitlist queue on room map
- Add drag-and-drop assignment on map
- Tests updated and passing

### Out of Scope
- 3D visualization
- Interactive floor plan editor
- Complex spatial analysis

### Rules to Follow
- Create simple 2D floor plan representation
- Use grid-based layout for simplicity
- Maintain real-time status updates
- Support click-to-view-details
- Show visual indicators for status
- Optional drag-and-drop for advanced users

### Advanced Coding Pattern
- Canvas or SVG rendering
- Real-time state synchronization
- Interactive map component
- Drag-and-drop pattern

### Anti-Patterns
- Overly complex visualization
- Missing real-time updates
- No interaction capabilities
- Hard-coded floor plan

### Imports/Exports
- Create resource map component
- Export map types
- Export map utilities

### Depends On
- TASK-044 (WebSocket real-time updates)

### Blocks
- None

---

### Subtasks

#### TASK-061-A: Create Floor Plan Configuration
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add endpoint for floor plan configuration (layout, resource positions), allow manager to configure spa layout.

#### TASK-061-B: Create Resource Map Component
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx` (new)
**Action:** Create component rendering floor plan using SVG, position lockers and rooms based on configuration, color-code by status.

#### TASK-061-C: Add Real-Time Status Updates
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx`
**Action:** Integrate WebSocket for real-time status updates, update map colors on status changes, show live indicator.

#### TASK-061-D: Add Click-to-View Details
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx`
**Action:** Add click handler for resources, open detail dialog with resource info, show client and time remaining.

#### TASK-061-E: Add Waitlist Queue Visualization
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx`
**Action:** Show waitlist queue next to rooms on map, display position numbers, show assigned room when available.

#### TASK-061-F: Add Drag-and-Drop Assignment
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx`
**Action:** Implement drag-and-drop for client assignment to resources, validate availability, call assignment API.

#### TASK-061-G: Add Map Configuration UI
**Target:** `artifacts/spaflow/src/pages/resource-map.tsx`
**Action:** Add manager-only mode to configure floor plan, drag resources to positions, save configuration.

#### TASK-061-H: Add Tests for Resource Map
**Target:** `artifacts/spaflow/src/pages/resource-map.test.tsx` (new)
**Action:** Write tests for map rendering, click interactions, status updates, drag-and-drop functionality.

---

## [ ] TASK-062: Add SMS Notification Enhancements
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/lib/sms.ts`
- `artifacts/api-server/src/routes/notifications.ts` (new)
- `lib/db/src/schema/notifications.ts` (new)
- `artifacts/spaflow/src/pages/notifications.tsx` (new)

### Definition of Done
- SMS template management UI
- SMS delivery status tracking
- SMS opt-in/opt-out management per client
- SMS campaign history
- Two-way SMS support (client replies)
- SMS analytics (open rates, response rates)
- Tests updated and passing

### Out of Scope
- Marketing SMS automation
- SMS marketing campaigns
- Complex SMS routing

### Rules to Follow
- Use existing Twilio integration
- Create reusable SMS templates
- Track delivery status from Twilio webhooks
- Respect client opt-out preferences
- Log all SMS activity
- Manager-only template management

### Advanced Coding Pattern
- Template management pattern
- Webhook handler pattern
- Opt-in management pattern
- Campaign tracking pattern

### Anti-Patterns
- Hardcoded SMS messages
- No delivery tracking
- Missing opt-out management
- No template system

### Imports/Exports
- Enhance SMS service
- Export template types
- Export notification types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-062-A: Create SMS Template Schema
**Target:** `lib/db/src/schema/sms_templates.ts` (new)
**Action:** Create smsTemplatesTable with name, content, variables, isActive, createdAt, add CRUD endpoints.

#### TASK-062-B: Add SMS Template Management UI
**Target:** `artifacts/spaflow/src/pages/sms-templates.tsx` (new)
**Action:** Create manager-only page for SMS templates, create/edit/delete templates, variable substitution preview.

#### TASK-062-C: Add Delivery Status Tracking
**Target:** `lib/db/src/schema/notifications.ts` (new)
**Action:** Create notificationsTable with type, recipient, status, deliveryStatus, content, sentAt, deliveredAt.

#### TASK-062-D: Add Twilio Webhook Handler
**Target:** `artifacts/api-server/src/routes/webhooks.ts`
**Action:** Add webhook handler for Twilio delivery status updates, update notification records, log delivery events.

#### TASK-062-E: Add SMS Opt-In Management
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Add SMS preferences section, opt-in/opt-out for different notification types, save to client record.

#### TASK-062-F: Add SMS Campaign History
**Target:** `artifacts/spaflow/src/pages/notifications.tsx` (new)
**Action:** Create page showing SMS history, filter by type/status, show delivery rates, search by recipient.

#### TASK-062-G: Add SMS Analytics
**Target:** `artifacts/api-server/src/routes/analytics.ts`
**Action:** Add SMS analytics endpoint, calculate delivery rate, response rate, opt-in rate, support date range filtering.

#### TASK-062-H: Add Tests for SMS Enhancements
**Target:** `artifacts/api-server/src/routes/webhooks.test.ts` (new)
**Action:** Write tests for webhook handling, delivery status updates, template variable substitution, opt-in management.

---

## [ ] TASK-063: Add Calendar Integration
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/routes/calendar.ts` (new)
- `artifacts/spaflow/src/pages/calendar.tsx` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Export bookings to calendar (iCal/Google Calendar)
- Sync staff schedules with calendar
- Holiday calendar integration for special pricing
- Maintenance schedule calendar view
- Recurring event support
- Tests updated and passing

### Out of Scope
- Full calendar sync (one-way export only)
- Complex recurring patterns
- Multi-calendar sync

### Rules to Follow
- Generate iCal (.ics) files for export
- Support Google Calendar import
- Include booking details in calendar events
- Show maintenance on calendar
- Support basic recurring events
- Manager-only calendar access

### Advanced Coding Pattern
- iCal file generation
- Calendar event mapping
- Recurring event pattern
- Export utility pattern

### Anti-Patterns
- Manual calendar entry only
- Missing iCal format compliance
- No recurring event support
- Incomplete event details

### Imports/Exports
- Create calendar service
- Export calendar types
- Export iCal utilities

### Depends On
- TASK-035 (Holiday and special event pricing)

### Blocks
- None

---

### Subtasks

#### TASK-063-A: Create Calendar Service
**Target:** `artifacts/api-server/src/services/calendar.ts` (new)
**Action:** Create service to generate iCal files from bookings, map rental sessions to calendar events, format according to RFC 5545.

#### TASK-063-B: Add Calendar Export Endpoint
**Target:** `artifacts/api-server/src/routes/calendar.ts` (new)
**Action:** Add GET /calendar/export endpoint, accept date range filter, return iCal file for download, require authentication.

#### TASK-063-C: Add Maintenance Calendar View
**Target:** `artifacts/spaflow/src/pages/maintenance.tsx`
**Action:** Add calendar view to maintenance page, show scheduled maintenance on calendar, filter by resource, navigate to details.

#### TASK-063-D: Add Holiday Calendar Integration
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add holiday calendar configuration, integrate with special events (TASK-035), show holidays on calendar view.

#### TASK-063-E: Add Recurring Event Support
**Target:** `artifacts/api-server/src/services/calendar.ts`
**Action:** Support basic recurring patterns (daily, weekly, monthly) for maintenance and events, generate multiple iCal events.

#### TASK-063-F: Create Calendar Page
**Target:** `artifacts/spaflow/src/pages/calendar.tsx` (new)
**Action:** Create manager-only calendar page showing bookings, maintenance, holidays, filter by resource type, export button.

#### TASK-063-G: Add Calendar Sync Instructions
**Target:** `docs/user-manual.md`
**Action:** Document how to export calendar, import to Google Calendar/iCal, set up recurring events, troubleshooting.

#### TASK-063-H: Add Tests for Calendar Integration
**Target:** `artifacts/api-server/src/services/calendar.test.ts` (new)
**Action:** Write tests for iCal generation, event mapping, recurring patterns, file format compliance.

---

## [ ] TASK-064: Add Historical Data Archival
**Status:** Pending
**Priority:** Low

### Related File Paths
- `scripts/archive-data.ts` (new)
- `docs/data-retention.md` (new)

### Definition of Done
- Define archival policy (2 years)
- Implement archival process for old transactions
- Archive old audit logs
- Archive old rental sessions
- Query archived data when needed
- Restore from archive functionality
- Tests updated and passing

### Out of Scope
- Automatic archival (manual trigger)
- Real-time archival
- Complex archival strategies

### Rules to Follow
- Archive data older than 2 years
- Keep recent data in active database
- Compress archived data
- Store archive securely
- Provide query interface for archived data
- Document retention policy

### Advanced Coding Pattern
- Data archival pattern
- Compression strategy
- Archive query pattern
- Data restoration pattern

### Anti-Patterns
- No archival strategy
- Losing data
- No way to query archived data
- Uncompressed archives

### Imports/Exports
- No code changes required
- Scripts and documentation only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-064-A: Define Archival Policy
**Target:** `docs/data-retention.md` (new)
**Action:** Document retention policy (2 years for transactions, 1 year for audit logs, 6 months for rental sessions), rationale for each.

#### TASK-064-B: Create Archive Script
**Target:** `scripts/archive-data.ts` (new)
**Action:** Create script to identify data older than retention policy, export to compressed files, verify data integrity, remove from active database.

#### TASK-064-C: Archive Old Transactions
**Target:** `scripts/archive-data.ts`
**Action:** Archive transactions older than 2 years, compress to JSON/CSV, store in secure location, verify archive.

#### TASK-064-D: Archive Old Audit Logs
**Target:** `scripts/archive-data.ts`
**Action:** Archive audit logs older than 1 year, compress to JSON, store in secure location, verify archive.

#### TASK-064-E: Archive Old Rental Sessions
**Target:** `scripts/archive-data.ts`
**Action:** Archive completed rental sessions older than 6 months, compress to JSON, store in secure location, verify archive.

#### TASK-064-F: Add Archive Query Interface
**Target:** `scripts/archive-data.ts`
**Action:** Create script to query archived data, search by date range, export to readable format, restore to database if needed.

#### TASK-064-G: Add Restore Functionality
**Target:** `scripts/archive-data.ts`
**Action:** Add restore function to import archived data back to database, validate data integrity, handle conflicts.

#### TASK-064-H: Test Archive and Restore
**Target:** `scripts/`
**Action:** Manually test archival process, test restore from archive, verify data integrity, document results.

---

## [ ] TASK-065: Add API Documentation Enhancements
**Status:** Pending
**Priority:** Low

### Related File Paths
- `lib/api-spec/openapi.yaml`
- `docs/api-guide.md` (new)

### Definition of Done
- API usage examples
- Authentication examples
- Error response documentation
- Rate limiting documentation
- Webhook documentation
- SDK documentation
- Tests updated and passing

### Out of Scope
- Changing API structure
- Adding new API endpoints
- Complex API guides

### Rules to Follow
- Document all public endpoints
- Include request/response examples
- Document authentication flow
- Document error responses
- Document rate limits
- Keep documentation in sync with code

### Advanced Coding Pattern
- API documentation pattern
- Example generation
- Documentation maintenance
- Code documentation sync

### Anti-Patterns
- Outdated documentation
- Missing examples
- No error documentation
- Incomplete authentication docs

### Imports/Exports
- No code changes required
- Documentation only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-065-A: Add API Usage Examples
**Target:** `docs/api-guide.md` (new)
**Action:** Document usage examples for all major endpoints, include curl commands, request/response bodies, common use cases.

#### TASK-065-B: Document Authentication Flow
**Target:** `docs/api-guide.md`
**Action:** Document JWT authentication flow, include examples for login, token refresh, handling expired tokens.

#### TASK-065-C: Document Error Responses
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add detailed error response documentation to OpenAPI spec, include error codes, messages, resolution steps.

#### TASK-065-D: Document Rate Limiting
**Target:** `docs/api-guide.md`
**Action:** Document rate limits per endpoint, include rate limit headers, retry-after handling, best practices.

#### TASK-065-E: Document Webhooks
**Target:** `docs/api-guide.md`
**Action:** Document webhook endpoints, signature verification, event types, retry logic, error handling.

#### TASK-065-F: Document SDK Usage
**Target:** `docs/api-guide.md`
**Action:** Document React Query hooks usage, TypeScript types, error handling, pagination, caching.

#### TASK-065-G: Add Code Examples to OpenAPI
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add x-codeSamples extension to OpenAPI spec, include examples in multiple languages (JavaScript, Python, curl).

#### TASK-065-H: Verify Documentation Accuracy
**Target:** Manual verification
**Action:** Test all API examples in documentation, verify they work with current API, update as needed.

---

## [ ] TASK-066: Add Missing Lint Script
**Status:** Pending
**Priority:** Low

### Related File Paths
- `package.json`

### Definition of Done
- Add `lint` script to root package.json
- Script should run ESLint across all packages
- Script should be consistent with AGENTS.md quality commands

### Out of Scope
- Adding new lint rules
- Fixing existing lint errors

### Rules to Follow
- Use pnpm workspace filtering to run lint across packages
- Follow existing script patterns in package.json
- Ensure script works with `pnpm run lint`

### Advanced Coding Pattern
- Workspace-aware linting
- Consistent with existing quality scripts

### Anti-Patterns
- Missing lint script when referenced in AGENTS.md
- Inconsistent with other quality scripts

### Imports/Exports
- No code changes required
- Package.json script only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-066-A: Add Lint Script to Root Package.json
**Target:** `package.json`
**Action:** Add `"lint": "pnpm -r --if-present run lint"` to scripts section.

#### TASK-066-B: Verify Lint Script Works
**Target:** Manual verification
**Action:** Run `pnpm run lint` and verify it executes correctly across all packages.

---

## [ ] TASK-067: Fix Express-Rate-Limit IPv6 Validation Errors
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/middleware/rateLimit.ts`

### Definition of Done
- Fix IPv6 keyGenerator validation errors in rateLimit.ts
- All `test:fast` tests pass without validation errors
- Pre-push hook can successfully run smoke tests

### Out of Scope
- Changing rate limiting logic
- Modifying rate limit thresholds

### Rules to Follow
- Use express-rate-limit's ipKeyGenerator helper for IPv6 support
- Maintain existing rate limiting behavior
- Ensure tests pass after fix

### Advanced Coding Pattern
- IPv6-compatible rate limiting
- Express-rate-limit best practices

### Anti-Patterns
- Ignoring IPv6 validation errors
- Disabling validation without proper fix

### Imports/Exports
- Update rateLimit.ts to use proper IPv6 key generator

### Depends On
- None

### Blocks
- Task 9 (pre-push hook depends on test:fast passing)

---

### Subtasks

#### TASK-067-A: Fix IPv6 Key Generator in rateLimit.ts
**Target:** `artifacts/api-server/src/middleware/rateLimit.ts`
**Action:** Update custom keyGenerator to use express-rate-limit's ipKeyGenerator helper for IPv6 compatibility.

#### TASK-067-B: Verify test:fast Passes
**Target:** Manual verification
**Action:** Run `pnpm -r --if-present run test:fast` and verify no validation errors occur.

#### TASK-067-C: Test Pre-push Hook
**Target:** Manual verification
**Action:** Test pre-push hook by introducing a type error and verifying push is rejected.

---


