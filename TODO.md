# Repository Task List

## Task Format Legend
- [ ] Incomplete
- [x] Complete
- [~] In Progress
- [!] Blocked

---

## [x] TASK-035: Implement Holiday and Special Event Pricing Logic
**Status:** Complete
**Priority:** High

### Related File Paths
- `lib/db/src/schema/special_events.ts`
- `artifacts/api-server/src/lib/pricing.ts`
- `artifacts/api-server/src/routes/config.ts`
- `artifacts/spaflow/src/pages/settings.tsx`

### Definition of Done
- ✅ Special events table created with date ranges and disable flags
- ✅ Pricing logic checks for active special events
- ✅ Specials disabled on holiday/special event dates
- ✅ Admin UI to manage special events
- ✅ Tests updated and passing

### Out of Scope
- Automatic holiday calendar integration
- Recurring special event patterns
- Event-specific pricing overrides

### Rules to Follow
- Special events table stores date range and disableSpecials flag
- Check current date against active special events
- Disable birthday, 1824, and other specials on event dates
- Provide admin UI for event CRUD operations
- Cache active events for performance

### Advanced Coding Pattern
- Temporal patterns for date range queries
- Specification pattern for special eligibility
- Caching strategy for event lookups

### Anti-Patterns
- Hardcoded holiday dates
- Missing timezone handling
- N+1 queries on every pricing calculation

### Imports/Exports
- Export special events schema
- Export isSpecialEventActive utility function

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### ✅ TASK-035-A: Create Special Events Schema
**Target:** `lib/db/src/schema/special_events.ts`
**Action:** Create specialEventsTable with id, name, startDate, endDate, disableSpecials boolean, createdAt fields.

#### ✅ TASK-035-B: Create Special Events Migration
**Target:** `lib/db/drizzle/`
**Action:** Generate migration to create special_events table with proper indexes on date ranges.

#### ✅ TASK-035-C: Add Special Event Check to Pricing Logic
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Add isSpecialEventActive function, modify calculatePrice to skip birthday and 1824 specials when event active.

#### ✅ TASK-035-D: Add Special Events API Endpoints
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add GET/POST/PUT/DELETE endpoints for special events management, require manager role.

#### ✅ TASK-035-E: Create Special Events Admin UI
**Target:** `artifacts/spaflow/src/pages/settings.tsx`
**Action:** Add special events management section with date range picker, disable specials toggle, CRUD operations.

#### ✅ TASK-035-F: Add Special Events to Config API
**Target:** `artifacts/api-server/src/routes/config.ts`
**Action:** Add active special events to config endpoint response for frontend reference.

#### ✅ TASK-035-G: Add Tests for Special Event Logic
**Target:** `artifacts/api-server/src/lib/pricing.test.ts`
**Action:** Write tests for pricing on special event date, verify birthday special disabled, verify 1824 special disabled.

### Implementation Notes
- **Schema**: Created special_events table with id, name, startDate, endDate, disableSpecials boolean, createdAt, updatedAt fields
- **Indexes**: Added indexes on startDate, endDate, and composite dateRange index for efficient queries
- **Migration**: Generated migration 0006_bright_katie_power.sql to create special_events table
- **Pricing Logic**: Added specialsDisabled parameter to PricingInput, modified calculatePrice to skip birthday and 18-24 specials when true
- **Special Events Utility**: Created special-events.ts with isSpecialEventActive function using cache-aside pattern (5-minute TTL)
- **API Endpoints**: Added GET/POST/PUT/DELETE /api/v1/config/special-events endpoints with manager role requirement and audit logging
- **Cache Invalidation**: Implemented cache invalidation on create/update/delete operations
- **Config API**: Updated GET /api/v1/config to include specialsDisabled flag for frontend reference
- **Admin UI**: Created settings.tsx page with CRUD operations for special events management (manager-only access)
- **Tests**: Added 5 test cases to pricing.test.ts for special event logic (birthday disabled, 18-24 disabled, standard pricing, false/undefined handling)
- **Type Safety**: Fixed TypeScript errors in config.ts (AuthPayload.sub vs .id, req.params.id array handling)

---

## [ ] TASK-036: Add Manager-Only Client PII Viewing
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/api-server/src/lib/encryption.ts`
- `artifacts/spaflow/src/pages/client-detail.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Manager-only endpoint to decrypt client PII
- Client detail page shows PII for managers
- Proper authentication and authorization
- Audit logging for PII access
- Tests updated and passing

### Out of Scope
- Editing encrypted PII
- PII export functionality
- Bulk PII decryption

### Rules to Follow
- Require MANAGER role for PII access
- Log all PII access attempts in audit logs
- Decrypt on-demand, never store decrypted data
- Show clear security warning in UI
- Rate limit PII access endpoint

### Advanced Coding Pattern
- Role-based access control
- Audit trail pattern
- Secure data handling

### Anti-Patterns
- Returning decrypted PII in standard client endpoints
- Missing audit logging
- Caching decrypted PII

### Imports/Exports
- Export decryptPiiForManager function
- Export PII access types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-036-A: Add PII Decryption Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add GET /clients/:id/pii endpoint requiring MANAGER role, decrypt DOB/address/documentNumber, return in response.

#### TASK-036-B: Add Audit Logging for PII Access
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In PII endpoint, log audit entry with action VIEW_PII, resourceType client, include accessed fields in description.

#### TASK-036-C: Add Rate Limiting to PII Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Apply strict rate limiter to PII endpoint, limit to 10 requests per minute per user.

#### TASK-036-D: Update OpenAPI for PII Endpoint
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add /clients/{id}/pii endpoint definition with security requirement, response schema with decrypted fields.

#### TASK-036-E: Add PII View Modal to Client Detail
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Add "View Identification" button for managers, open modal with decrypted PII, show security warning.

#### TASK-036-F: Add PII Access to API Client
**Target:** `lib/api-client-react/src/`
**Action:** Generate or add useGetClientPii hook for PII endpoint access.

#### TASK-036-G: Add Tests for PII Access
**Target:** `artifacts/api-server/src/routes/clients.test.ts`
**Action:** Write tests for PII endpoint with manager role, verify 403 for staff role, verify audit log entry created.

---

## [ ] TASK-037: Add Membership Renewal Flow
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/spaflow/src/pages/client-detail.tsx`
- `artifacts/api-server/src/routes/checkin.ts`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Membership renewal API endpoint
- Client detail page shows renewal option
- Renewal creates new membership record
- Renewal processes payment via Square
- Transaction record created
- Tests updated and passing

### Out of Scope
- Membership upgrade/downgrade
- Proactive renewal reminders
- Membership pause functionality

### Rules to Follow
- Only allow renewal for expired memberships
- Require payment for renewal
- Create new membership record, don't update existing
- Set new expiration date based on membership type
- Update client membership status immediately

### Advanced Coding Pattern
- Domain service for membership lifecycle
- Transaction script for renewal process
- State machine for membership status

### Anti-Patterns
- Updating existing membership record
- Missing payment processing
- Incorrect expiration date calculation

### Imports/Exports
- Export renewal types
- Export membership renewal service

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-037-A: Add Membership Renewal Schema
**Target:** `lib/api-zod/src/`
**Action:** Add RenewMembershipBody schema with membershipType (one_time, six_month) and paymentToken fields.

#### TASK-037-B: Add Membership Renewal Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add POST /clients/:id/memberships/renew endpoint, validate expired membership, process payment, create new membership record.

#### TASK-037-C: Update Client Membership Status on Renewal
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In renewal endpoint, update client membershipStatus and membershipExpiresAt after successful payment.

#### TASK-037-D: Create Transaction for Renewal
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** In renewal endpoint, create transaction record with type membership, link to new membership record.

#### TASK-037-E: Add Renewal to OpenAPI Spec
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add POST /clients/{id}/memberships/renew endpoint with request/response schemas.

#### TASK-037-F: Add Renewal UI to Client Detail
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Show "Renew Membership" button for expired memberships, open modal with type selection and payment form.

#### TASK-037-G: Add Renewal to API Client
**Target:** `lib/api-client-react/src/`
**Action:** Generate or add useRenewMembership hook for renewal endpoint.

#### TASK-037-H: Add Tests for Membership Renewal
**Target:** `artifacts/api-server/src/routes/clients.test.ts`
**Action:** Write tests for renewal with expired membership, verify payment processed, verify new membership created, verify status updated.

---

## [ ] TASK-038: Enhance Pricing Rule Display in Check-in
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/spaflow/src/pages/checkin.tsx`

### Definition of Done
- Pricing breakdown clearly shows applied rules
- Each rule has explanatory tooltip
- Special pricing prominently highlighted
- Membership cost separated if bundled
- Visual hierarchy in pricing display

### Out of Scope
- Changing pricing calculation logic
- Adding new pricing rules

### Rules to Follow
- Show rules in priority order
- Use color coding for special pricing
- Provide context for each rule
- Keep display concise but informative

### Advanced Coding Pattern
- Presentational component for pricing breakdown
- Tooltip component for rule explanations
- Badge component for special pricing

### Anti-Patterns
- Cluttered pricing display
- Missing rule explanations
- Inconsistent visual hierarchy

### Imports/Exports
- No new imports required

### Depends On
- TASK-034 (1824 special bundle)
- TASK-035 (Holiday pricing)

### Blocks
- None

---

### Subtasks

#### TASK-038-A: Create Pricing Breakdown Component
**Target:** `artifacts/spaflow/src/components/`
**Action:** Create PricingBreakdown component accepting subtotal, tax, total, appliedRules array, render structured breakdown.

#### TASK-038-B: Add Rule Explanations
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Add tooltip or expandable section for each pricing rule with detailed explanation of why it was applied.

#### TASK-038-C: Highlight Special Pricing
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Use distinct color/badge for birthday, 1824, and other special pricing rules to draw attention.

#### TASK-038-D: Separate Membership Cost
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.tsx`
**Action:** Show membership cost as separate line item when bundled, distinguish from rental cost.

#### TASK-038-E: Integrate Component into Check-in
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** Replace existing pricing display with PricingBreakdown component in payment step.

#### TASK-038-F: Add Tests for Pricing Display
**Target:** `artifacts/spaflow/src/components/PricingBreakdown.test.tsx`
**Action:** Write tests for component rendering with various rule combinations, verify tooltips work, verify special highlighting.

---

## [ ] TASK-039: Add Bulk Operations for Lockers and Rooms
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/rooms.ts`
- `artifacts/spaflow/src/pages/lockers.tsx`
- `artifacts/spaflow/src/pages/rooms.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Bulk release expired lockers/rooms endpoint
- Bulk release by status endpoint
- Frontend bulk action buttons
- Confirmation dialogs for bulk operations
- Audit logging for bulk actions
- Tests updated and passing

### Out of Scope
- Bulk assignment operations
- Bulk pricing changes
- Scheduled bulk operations

### Rules to Follow
- Require confirmation for bulk operations
- Log each individual action in audit
- Return summary of operations performed
- Rate limit bulk operations
- Validate all resources before bulk action

### Advanced Coding Pattern
- Command pattern for bulk operations
- Transaction script for atomic bulk actions
- Batch processing with error handling

### Anti-Patterns
- Silent failures in bulk operations
- Missing audit trail
- No confirmation prompts

### Imports/Exports
- Export bulk operation types
- Export bulk operation utilities

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-039-A: Add Bulk Release Schema
**Target:** `lib/api-zod/src/`
**Action:** Add BulkReleaseBody schema with resourceIds array and operation type (all_expired, by_status).

#### TASK-039-B: Add Bulk Release Endpoint for Lockers
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Add POST /lockers/bulk-release endpoint, validate IDs, release each in transaction, return summary.

#### TASK-039-C: Add Bulk Release Endpoint for Rooms
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Add POST /rooms/bulk-release endpoint, validate IDs, release each in transaction, return summary.

#### TASK-039-D: Add Audit Logging for Bulk Operations
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** Log individual audit entries for each resource released in bulk operation, include bulk operation ID.

#### TASK-039-E: Add Bulk Endpoints to OpenAPI
**Target:** `lib/api-spec/openapi.yaml`
**Action:** Add bulk-release endpoints for lockers and rooms with request/response schemas.

#### TASK-039-F: Add Bulk Release UI to Lockers Page
**Target:** `artifacts/spaflow/src/pages/lockers.tsx`
**Action:** Add "Release All Expired" button, add multi-select for lockers, add confirmation dialog.

#### TASK-039-G: Add Bulk Release UI to Rooms Page
**Target:** `artifacts/spaflow/src/pages/rooms.tsx`
**Action:** Add "Release All Expired" button, add multi-select for rooms, add confirmation dialog.

#### TASK-039-H: Add Tests for Bulk Operations
**Target:** `artifacts/api-server/src/routes/lockers.test.ts`
**Action:** Write tests for bulk release expired, bulk release by selection, verify audit logs, verify error handling.

---

## [ ] TASK-040: Add Quick Action Buttons to Dashboard
**Status:** Pending
**Priority:** Low

### Related File Paths
- `artifacts/spaflow/src/pages/dashboard.tsx`
- `artifacts/api-server/src/routes/dashboard.ts`

### Definition of Done
- Quick check-in button on dashboard
- Quick add to waitlist button
- Quick client search
- Quick locker release
- Navigation to relevant pages
- Tests updated and passing

### Out of Scope
- Full check-in flow on dashboard
- Complex operations on dashboard
- Dashboard state management

### Rules to Follow
- Quick actions navigate to dedicated pages
- Pre-fill relevant data when possible
- Keep dashboard uncluttered
- Use consistent button styling

### Advanced Coding Pattern
- Navigation component with pre-fill
- Action button component
- Context-aware navigation

### Anti-Patterns
- Implementing full flows on dashboard
- Too many quick actions
- Inconsistent navigation patterns

### Imports/Exports
- No new imports required

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-040-A: Add Quick Check-in Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "New Check-in" button in header, navigate to /checkin with empty state.

#### TASK-040-B: Add Quick Waitlist Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "Add to Waitlist" button, open small dialog with client search, navigate to waitlist on confirm.

#### TASK-040-C: Add Quick Client Search
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add client search input in header, show dropdown results, navigate to client detail on select.

#### TASK-040-D: Add Quick Release Button
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Add "Release Resource" button, show dialog with locker/room selector, call release endpoint.

#### TASK-040-E: Style Quick Actions Consistently
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Use consistent button styling, icon placement, and layout for all quick action buttons.

#### TASK-040-F: Add Tests for Quick Actions
**Target:** `artifacts/spaflow/src/pages/dashboard.test.tsx`
**Action:** Write tests for each quick action button, verify navigation, verify pre-fill data, verify dialogs open.

---

## [ ] TASK-041: Implement Room Price Range Selection
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/lib/pricing.ts`
- `artifacts/api-server/src/routes/checkin.ts`
- `artifacts/spaflow/src/pages/checkin.tsx`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Room pricing supports range selection within quality tiers
- UI allows staff to select specific price within allowed range
- Pricing engine handles range-based pricing correctly
- Default price selection (midpoint of range)
- Price validation against range limits
- Tests updated and passing

### Out of Scope
- Changing quality tier structure (covered by TASK-033)
- Dynamic pricing based on demand
- Room-specific pricing overrides

### Rules to Follow
- Standard rooms: $25-28 weekdays, $28-31 weekends
- Premium rooms: $29-32 weekdays, $32-35 weekends
- Deluxe rooms: $33-34 weekdays, $36-37 weekends
- Default to midpoint of range
- Validate selected price is within allowed range
- Apply range pricing consistently across all room operations

### Advanced Coding Pattern
- Value object for price ranges
- Pricing strategy pattern
- Range validation with min/max constraints
- Default selection strategy

### Anti-Patterns
- Hardcoded prices without range support
- Missing range validation
- Inconsistent default selection
- Skipping range checks

### Imports/Exports
- Export price range constants
- Export range validation utilities
- Export pricing strategy types

### Depends On
- TASK-033 (Room quality tiers)

### Blocks
- None

---

### Subtasks

#### TASK-041-A: Define Price Range Constants
**Target:** `artifacts/api-server/src/lib/constants.ts`
**Action:** Add price range constants for each quality tier and time period (weekday/weekend), define min/max/default for each.

#### TASK-041-B: Update Pricing Engine for Range Selection
**Target:** `artifacts/api-server/src/lib/pricing.ts`
**Action:** Modify calculatePrice to accept optional selectedPrice parameter, validate against range, default to midpoint if not provided.

#### TASK-041-C: Add Price Selection to Check-in Schema
**Target:** `lib/api-zod/src/`
**Action:** Add optional selectedPrice field to CheckInBody schema with validation against allowed range based on room tier and time.

#### TASK-041-D: Update Check-in API for Price Selection
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** Accept selectedPrice in check-in request, validate against range, use selected price or default in transaction.

#### TASK-041-E: Add Price Selection UI to Check-in
**Target:** `artifacts/spaflow/src/pages/checkin.tsx`
**Action:** When room selected, show price range with slider or input, allow staff to select price within range, display selected price in summary.

#### TASK-041-F: Update Renew/Extend for Range Pricing
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** Fetch room tier and original price, apply range pricing for renewals/extensions, maintain price consistency.

#### TASK-041-G: Add Tests for Range Pricing
**Target:** `artifacts/api-server/src/lib/pricing.test.ts`
**Action:** Write tests for range validation, default selection, boundary cases, verify pricing within ranges for all tiers.

---

## [ ] TASK-042: Link Product Transactions to Rental Sessions
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `lib/db/src/schema/transactions.ts`
- `artifacts/api-server/src/routes/checkin.ts`
- `artifacts/api-server/src/routes/clients.ts`
- `artifacts/spaflow/src/pages/client-detail.tsx`

### Definition of Done
- Product transactions include sessionId reference
- Check-in links product purchases to rental session
- Client detail shows products by rental session
- Transaction history filters by session
- Database migration executed
- Tests updated and passing

### Out of Scope
- Changing product transaction structure
- Modifying product pricing logic
- Historical data migration (only new transactions)

### Rules to Follow
- Add sessionId field to product transactions
- Link products to primary rental session during check-in
- Handle standalone product purchases (sessionId = null)
- Maintain backward compatibility with existing data
- Add foreign key constraint to rental_sessions

### Advanced Coding Pattern
- Domain-driven design: transaction aggregate root
- Optional relationship pattern
- Data migration strategy
- Backward compatibility pattern

### Anti-Patterns
- Losing existing product transaction data
- Missing sessionId for check-in products
- Breaking product-only transactions
- Inconsistent session linking

### Imports/Exports
- Update transaction schema types
- Export updated transaction types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-042-A: Add SessionId to Product Transactions
**Target:** `lib/db/src/schema/transactions.ts`
**Action:** Add sessionId field to transactionsTable, make nullable, add foreign key to rental_sessions with ON DELETE SET NULL.

#### TASK-042-B: Create Database Migration for SessionId
**Target:** `lib/db/drizzle/`
**Action:** Generate migration to add session_id column to transactions table with foreign key constraint, set existing values to null.

#### TASK-042-C: Update Check-in to Link Products to Session
**Target:** `artifacts/api-server/src/routes/checkin.ts`
**Action:** After rental session created, update product transactions to include sessionId, handle standalone product purchases.

#### TASK-042-D: Add Products by Session Endpoint
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add GET /clients/:id/rentals/:sessionId/products endpoint to return products purchased during specific rental.

#### TASK-042-E: Update Client Detail to Show Session Products
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** In rental history, expand each rental to show products purchased during that session.

#### TASK-042-F: Update Transaction Filter by Session
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add optional sessionId filter to GET /clients/:id/transactions to filter transactions by rental session.

#### TASK-042-G: Add Tests for Session-Product Linking
**Target:** `artifacts/api-server/src/routes/checkin.test.ts`
**Action:** Write tests for check-in with products, verify sessionId linked, verify standalone products have null sessionId.

---

## [ ] TASK-043: Implement Payment Reconciliation Database Schema and Service
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `lib/db/src/schema/reconciliation.ts` (new)
- `artifacts/api-server/src/services/reconciliation.ts` (new)
- `artifacts/api-server/src/lib/square.ts`

### Definition of Done
- Reconciliation database schema created
- Reconciliation service implemented
- Discrepancy detection algorithm working
- Tests for service logic passing

### Out of Scope
- API endpoints (covered by TASK-073)
- Webhook handling (covered by TASK-073)
- Dashboard UI (covered by TASK-074)
- Scheduled jobs (covered by TASK-074)

### Rules to Follow
- Compare payment IDs and amounts
- Calculate discrepancies accurately
- Store reconciliation results
- Test with sample data

### Advanced Coding Pattern
- Reconciliation service pattern
- Discrepancy detection algorithm
- Audit trail for reconciliation

### Anti-Patterns
- Missing discrepancy detection
- Inaccurate calculations
- No audit trail

### Imports/Exports
- Create reconciliation service
- Export reconciliation types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-043-A: Create Reconciliation Schema
**Target:** `lib/db/src/schema/reconciliation.ts` (new)
**Action:** Create reconciliationResultsTable with date, totalInternal, totalSquare, discrepancies, status, createdAt fields.

#### TASK-043-B: Implement Reconciliation Service
**Target:** `artifacts/api-server/src/services/reconciliation.ts` (new)
**Action:** Create service to fetch Square payments for date range, compare with internal transactions, calculate discrepancies, store results.

#### TASK-043-C: Add Tests for Reconciliation Service
**Target:** `artifacts/api-server/src/services/reconciliation.test.ts` (new)
**Action:** Write tests for reconciliation logic, discrepancy detection, accuracy of calculations.

---

## [ ] TASK-073: Implement Payment Reconciliation API and Webhooks
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/routes/reconciliation.ts` (new)
- `artifacts/api-server/src/routes/webhooks.ts` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Reconciliation API endpoints implemented
- Square webhook handler implemented
- Refund processing function working
- Tests for endpoints and webhooks passing

### Out of Scope
- Database schema (covered by TASK-043)
- Reconciliation service logic (covered by TASK-043)
- Dashboard UI (covered by TASK-074)
- Scheduled jobs (covered by TASK-074)

### Rules to Follow
- Manager-only access to reconciliation endpoints
- Verify Square webhook signatures
- Process payment.updated events
- Handle refund processing

### Advanced Coding Pattern
- Webhook handler pattern
- API endpoint pattern
- Signature verification

### Anti-Patterns
- Not verifying webhook signatures
- Missing webhook handling
- No refund processing

### Imports/Exports
- Export webhook handler
- Export reconciliation types

### Depends On
- TASK-043 (Payment Reconciliation Database Schema and Service)

### Blocks
- None

---

### Subtasks

#### TASK-073-A: Add Reconciliation API Endpoints
**Target:** `artifacts/api-server/src/routes/reconciliation.ts` (new)
**Action:** Add GET /reconciliation for daily reports, POST /reconciliation/run to trigger reconciliation, require manager role.

#### TASK-073-B: Add Square Webhook Handler
**Target:** `artifacts/api-server/src/routes/webhooks.ts` (new)
**Action:** Add POST /webhooks/square endpoint, verify Square signature, process payment.updated events, update transaction status.

#### TASK-073-C: Add Refund Processing
**Target:** `artifacts/api-server/src/services/reconciliation.ts`
**Action:** Add refund processing function, call Square refund API, update transaction status, create refund transaction record.

#### TASK-073-D: Add Tests for API and Webhooks
**Target:** `artifacts/api-server/src/routes/reconciliation.test.ts` (new)
**Action:** Write tests for reconciliation endpoints, webhook handling, refund processing.

---

## [ ] TASK-074: Implement Payment Reconciliation Dashboard and Automation
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/spaflow/src/pages/reconciliation.tsx` (new)
- `artifacts/api-server/src/jobs/cron.ts`

### Definition of Done
- Reconciliation dashboard created
- Scheduled reconciliation job implemented
- Discrepancy alerting working
- Manual trigger functionality working

### Out of Scope
- Database schema (covered by TASK-043)
- API endpoints (covered by TASK-073)
- Webhook handling (covered by TASK-073)

### Rules to Follow
- Manager-only access to dashboard
- Run reconciliation daily at 2 AM
- Alert on discrepancies
- Allow manual trigger

### Advanced Coding Pattern
- Dashboard UI pattern
- Cron job scheduling
- Alert configuration

### Anti-Patterns
- No scheduled reconciliation
- Missing discrepancy alerts
- No manual trigger option

### Imports/Exports
- No new exports needed

### Depends On
- TASK-073 (Payment Reconciliation API and Webhooks)

### Blocks
- None

---

### Subtasks

#### TASK-074-A: Create Reconciliation Dashboard
**Target:** `artifacts/spaflow/src/pages/reconciliation.tsx` (new)
**Action:** Create manager-only page showing daily reconciliation results, discrepancy list, manual trigger button, refund processing UI.

#### TASK-074-B: Add Scheduled Reconciliation Job
**Target:** `artifacts/api-server/src/jobs/cron.ts`
**Action:** Add cron job to run reconciliation daily at 2 AM, log results, alert on discrepancies.

#### TASK-074-C: Add Discrepancy Alerting
**Target:** `artifacts/api-server/src/jobs/cron.ts`
**Action:** Configure alert mechanism for discrepancies, send notifications to managers on significant discrepancies.

#### TASK-074-D: Test Dashboard and Automation
**Target:** Manual testing
**Action:** Test dashboard functionality, verify scheduled job runs, test manual trigger, verify alerting.

---

## [ ] TASK-044: Implement WebSocket Server Setup
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/lib/websocket.ts` (new)
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/package.json`

### Definition of Done
- WebSocket server implemented
- JWT authentication for WebSocket
- Connection management working
- Broadcast function working
- Tests for WebSocket server passing

### Out of Scope
- Frontend integration (covered by TASK-075, TASK-076)
- Resource broadcast integration (covered by TASK-075)

### Rules to Follow
- Use existing JWT for authentication
- Handle connection drops gracefully
- Implement broadcast function
- Test connection management

### Advanced Coding Pattern
- WebSocket connection management
- Event broadcasting pattern
- JWT authentication for WebSocket

### Anti-Patterns
- No authentication
- No connection management
- Missing broadcast function

### Imports/Exports
- Create WebSocket server module
- Export WebSocket utilities
- Export event types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-044-A: Add WebSocket Dependencies
**Target:** `artifacts/api-server/package.json`
**Action:** Add ws package for WebSocket server implementation.

#### TASK-044-B: Create WebSocket Server
**Target:** `artifacts/api-server/src/lib/websocket.ts` (new)
**Action:** Implement WebSocket server with JWT authentication, connection management, broadcast function, event types for updates.

#### TASK-044-C: Integrate WebSocket with Express
**Target:** `artifacts/api-server/src/app.ts`
**Action:** Attach WebSocket server to Express HTTP server, handle upgrade requests, pass HTTP server to WebSocket.

#### TASK-044-D: Add Tests for WebSocket
**Target:** `artifacts/api-server/src/lib/websocket.test.ts` (new)
**Action:** Write tests for WebSocket authentication, message broadcasting, connection management, reconnection logic.

---

## [ ] TASK-075: Integrate WebSocket for Resource Updates
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/routes/lockers.ts`
- `artifacts/api-server/src/routes/rooms.ts`

### Definition of Done
- Locker status changes broadcast via WebSocket
- Room status changes broadcast via WebSocket
- Waitlist updates broadcast via WebSocket
- Tests for broadcast integration passing

### Out of Scope
- WebSocket server (covered by TASK-044)
- Frontend integration (covered by TASK-076)

### Rules to Follow
- Broadcast after status changes
- Include resource type, ID, new status
- Test broadcast functionality

### Advanced Coding Pattern
- Event broadcasting pattern
- Observer pattern for updates

### Anti-Patterns
- Missing broadcast on status change
- Incomplete event data
- No testing

### Imports/Exports
- Import broadcast function from websocket.ts

### Depends On
- TASK-044 (WebSocket Server Setup)

### Blocks
- None

---

### Subtasks

#### TASK-075-A: Broadcast Resource Status Changes
**Target:** `artifacts/api-server/src/routes/lockers.ts`
**Action:** After locker status change, broadcast update via WebSocket with resource type, ID, new status.

#### TASK-075-B: Broadcast Room Status Changes
**Target:** `artifacts/api-server/src/routes/rooms.ts`
**Action:** After room status change or waitlist update, broadcast update via WebSocket.

#### TASK-075-C: Add Tests for Broadcast Integration
**Target:** `artifacts/api-server/src/routes/lockers.test.ts`
**Action:** Write tests for locker broadcast, room broadcast, waitlist broadcast.

---

## [ ] TASK-076: Implement WebSocket Frontend Integration
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/spaflow/src/hooks/use-websocket.ts` (new)
- `artifacts/spaflow/src/pages/dashboard.tsx`
- `artifacts/spaflow/src/pages/lockers.tsx`
- `artifacts/spaflow/src/pages/rooms.tsx`

### Definition of Done
- WebSocket React hook created
- Dashboard shows real-time updates
- Lockers page shows real-time updates
- Rooms page shows real-time updates
- Connection status indicator working
- Auto-reconnect with exponential backoff working

### Out of Scope
- WebSocket server (covered by TASK-044)
- Resource broadcast (covered by TASK-075)

### Rules to Follow
- Use WebSocket hook in pages
- Auto-reconnect with exponential backoff
- Show connection status to users
- Invalidate queries on messages

### Advanced Coding Pattern
- React hook pattern
- Auto-reconnection strategy
- Query invalidation pattern

### Anti-Patterns
- No reconnection logic
- Missing connection status
- Not invalidating queries

### Imports/Exports
- Create WebSocket hook
- Export hook from hooks directory

### Depends On
- TASK-075 (Integrate WebSocket for Resource Updates)

### Blocks
- None

---

### Subtasks

#### TASK-076-A: Create WebSocket React Hook
**Target:** `artifacts/spaflow/src/hooks/use-websocket.ts` (new)
**Action:** Create hook for WebSocket connection, handle messages, auto-reconnect with exponential backoff, provide connection status.

#### TASK-076-B: Update Dashboard for Real-Time Updates
**Target:** `artifacts/spaflow/src/pages/dashboard.tsx`
**Action:** Use WebSocket hook, listen for resource updates, invalidate queries on message, show connection indicator.

#### TASK-076-C: Update Lockers Page for Real-Time Updates
**Target:** `artifacts/spaflow/src/pages/lockers.tsx`
**Action:** Use WebSocket hook, listen for locker updates, update grid in real-time, show connection indicator.

#### TASK-076-D: Update Rooms Page for Real-Time Updates
**Target:** `artifacts/spaflow/src/pages/rooms.tsx`
**Action:** Use WebSocket hook, listen for room and waitlist updates, update grid in real-time, show connection indicator.

#### TASK-076-E: Test Frontend Integration
**Target:** Manual testing
**Action:** Test dashboard real-time updates, test lockers page updates, test rooms page updates, verify connection indicator.

---

## [ ] TASK-045: Add Deployment Automation
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `.github/workflows/deploy-staging.yml` (new)
- `.github/workflows/deploy-production.yml` (new)
- `scripts/deploy.sh` (new)
- `docs/deployment.md` (new)

### Definition of Done
- Automated deployment to staging environment
- Automated deployment to production environment
- Blue-green deployment strategy
- Rollback procedures
- Database migration automation
- Environment-specific configuration management
- Deployment monitoring and alerting

### Out of Scope
- Multi-region deployment
- Kubernetes orchestration
- Complex canary deployments

### Rules to Follow
- Deploy to staging first, run tests, then promote to production
- Use blue-green deployment for zero-downtime
- Automate database migrations
- Require manual approval for production deployment
- Log all deployments
- Alert on deployment failures

### Advanced Coding Pattern
- CI/CD pipeline pattern
- Blue-green deployment strategy
- Database migration automation
- Deployment rollback pattern

### Anti-Patterns
- Direct production deployment without staging
- Manual deployment process
- No rollback capability
- Missing migration automation

### Imports/Exports
- No code changes required
- CI/CD workflows and scripts only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-045-A: Create Staging Deployment Workflow
**Target:** `.github/workflows/deploy-staging.yml` (new)
**Action:** Create GitHub Actions workflow for staging deployment, run tests, build artifacts, deploy to staging server, run smoke tests.

#### TASK-045-B: Create Production Deployment Workflow
**Target:** `.github/workflows/deploy-production.yml` (new)
**Action:** Create GitHub Actions workflow for production deployment, require manual approval, blue-green deployment, run smoke tests.

#### TASK-045-C: Implement Blue-Green Deployment
**Target:** `scripts/deploy.sh` (new)
**Action:** Create deployment script supporting blue-green strategy, switch traffic between versions, rollback capability.

#### TASK-045-D: Automate Database Migrations
**Target:** `scripts/deploy.sh`
**Action:** Integrate drizzle-kit migrate into deployment script, run migrations before application deploy, verify migration success.

#### TASK-045-E: Add Environment Configuration
**Target:** `.github/workflows/`
**Action:** Configure environment-specific variables for staging and production, use GitHub secrets for sensitive data.

#### TASK-045-F: Create Deployment Documentation
**Target:** `docs/deployment.md` (new)
**Action:** Document deployment process, rollback procedures, troubleshooting guide, environment configuration.

#### TASK-045-G: Add Deployment Monitoring
**Target:** `.github/workflows/`
**Action:** Add deployment status monitoring, alert on failures, log deployment metrics, track deployment duration.

---

## [ ] TASK-046: Add Monitoring and Alerting
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `artifacts/api-server/src/lib/monitoring.ts` (new)
- `.github/workflows/monitoring.yml` (new)
- `docs/monitoring.md` (new)

### Definition of Done
- Application performance monitoring (APM) integration
- Error tracking (Sentry integration)
- Uptime monitoring
- Database performance monitoring
- Alert configuration for critical failures
- Log aggregation and analysis
- Monitoring dashboard

### Out of Scope
- Complex distributed tracing
- Custom monitoring solution (use existing tools)

### Rules to Follow
- Use Sentry for error tracking
- Use existing logging infrastructure
- Monitor critical metrics (response time, error rate, database connections)
- Alert on critical failures immediately
- Aggregate logs for analysis
- Provide monitoring dashboard for managers

### Advanced Coding Pattern
- Monitoring service pattern
- Error tracking integration
- Metric collection pattern
- Alert configuration pattern

### Anti-Patterns
- No error tracking
- Missing critical alerts
- Silent failures
- No log aggregation

### Imports/Exports
- Create monitoring module
- Export monitoring utilities
- Export alert types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-046-A: Integrate Sentry Error Tracking
**Target:** `artifacts/api-server/src/lib/sentry.ts`
**Action:** Configure Sentry SDK for error tracking, capture exceptions, add context (user, request), track performance.

#### TASK-046-B: Add Performance Monitoring
**Target:** `artifacts/api-server/src/lib/monitoring.ts` (new)
**Action:** Create monitoring service to track response times, error rates, database query times, memory usage.

#### TASK-046-C: Add Health Check Enhancements
**Target:** `artifacts/api-server/src/routes/health.ts`
**Action:** Add database connection check, Redis check (if used), Square API check, Twilio API check, disk space check.

#### TASK-046-D: Configure Critical Alerts
**Target:** `artifacts/api-server/src/lib/monitoring.ts`
**Action:** Define alert rules for critical failures (error rate > 5%, response time > 5s, database down), integrate with alerting service.

#### TASK-046-E: Add Log Aggregation
**Target:** `artifacts/api-server/src/lib/logger.ts`
**Action:** Configure structured logging, add correlation IDs, integrate with log aggregation service, set up log retention.

#### TASK-046-F: Create Monitoring Dashboard
**Target:** `artifacts/spaflow/src/pages/monitoring.tsx` (new)
**Action:** Create manager-only page showing system health, error rates, response times, recent alerts, log viewer.

#### TASK-046-G: Add Uptime Monitoring
**Target:** `.github/workflows/monitoring.yml` (new)
**Action:** Create workflow to ping application endpoints every 5 minutes, alert on failures, track uptime percentage.

#### TASK-046-H: Document Monitoring Setup
**Target:** `docs/monitoring.md` (new)
**Action:** Document monitoring setup, alert configuration, troubleshooting procedures, on-call rotation.

---

## [ ] TASK-047: Create E2E Test Infrastructure
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `tests/e2e/` (new)
- `playwright.config.ts`

### Definition of Done
- E2E test directory structure created
- Page objects for key pages added
- Test data fixtures set up
- Test database configured
- Playwright configured

### Out of Scope
- Writing actual E2E tests (covered by TASK-077, TASK-078)
- CI integration (covered by TASK-079)

### Rules to Follow
- Use Playwright for E2E testing
- Set up test data fixtures
- Configure test database
- Use Page Object Model pattern

### Advanced Coding Pattern
- Page Object Model pattern
- Test data management
- Test isolation strategies

### Anti-Patterns
- No test data fixtures
- No test database
- Missing page objects

### Imports/Exports
- No code changes required
- Test infrastructure only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-047-A: Create E2E Test Structure
**Target:** `tests/e2e/` (new)
**Action:** Create E2E test directory structure, add page objects for key pages, set up test data fixtures, configure test database.

#### TASK-047-B: Configure Playwright
**Target:** `playwright.config.ts`
**Action:** Configure Playwright settings, browsers, test database connection, base URL, timeouts.

---

## [ ] TASK-077: Add E2E Tests for Core Flows
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `tests/e2e/checkin.spec.ts` (new)
- `tests/e2e/waitlist.spec.ts` (new)
- `tests/e2e/membership.spec.ts` (new)
- `tests/e2e/resources.spec.ts` (new)

### Definition of Done
- Check-in flow E2E test
- Waitlist assignment E2E test
- Membership purchase E2E test
- Resource release E2E test
- All tests passing

### Out of Scope
- Test infrastructure (covered by TASK-047)
- CRUD tests (covered by TASK-078)
- Visual regression (covered by TASK-078)
- CI integration (covered by TASK-079)

### Rules to Follow
- Test critical user journeys
- Test both happy path and error cases
- Use realistic test data
- Maintain test data cleanup

### Advanced Coding Pattern
- Page Object Model pattern
- Test data management

### Anti-Patterns
- Brittle tests that break easily
- No test data cleanup
- Missing critical user journeys

### Imports/Exports
- Test files only

### Depends On
- TASK-047 (Create E2E Test Infrastructure)

### Blocks
- None

---

### Subtasks

#### TASK-077-A: Add Check-in Flow E2E Test
**Target:** `tests/e2e/checkin.spec.ts` (new)
**Action:** Write E2E test for complete check-in flow: client search, resource selection, product selection, payment, confirmation.

#### TASK-077-B: Add Waitlist Assignment E2E Test
**Target:** `tests/e2e/waitlist.spec.ts` (new)
**Action:** Write E2E test for waitlist flow: add to waitlist, automatic assignment, confirmation, SMS notification verification.

#### TASK-077-C: Add Membership Purchase E2E Test
**Target:** `tests/e2e/membership.spec.ts` (new)
**Action:** Write E2E test for membership purchase flow: select membership type, payment, status update, transaction record.

#### TASK-077-D: Add Resource Release E2E Test
**Target:** `tests/e2e/resources.spec.ts` (new)
**Action:** Write E2E test for resource release flow: release occupied locker, verify status update, verify waitlist assignment (for rooms).

---

## [ ] TASK-078: Add E2E Tests for CRUD and Visual Regression
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `tests/e2e/crud.spec.ts` (new)
- `tests/e2e/visual.spec.ts` (new)

### Definition of Done
- CRUD operations E2E tests
- Visual regression tests
- All tests passing

### Out of Scope
- Test infrastructure (covered by TASK-047)
- Core flow tests (covered by TASK-077)
- CI integration (covered by TASK-079)

### Rules to Follow
- Test all CRUD operations
- Configure acceptable diff thresholds
- Test key pages for visual regression

### Advanced Coding Pattern
- Visual regression testing
- CRUD testing pattern

### Anti-Patterns
- Missing CRUD operations
- No visual regression tests
- Too strict diff thresholds

### Imports/Exports
- Test files only

### Depends On
- TASK-077 (Add E2E Tests for Core Flows)

### Blocks
- None

---

### Subtasks

#### TASK-078-A: Add CRUD Operations E2E Tests
**Target:** `tests/e2e/crud.spec.ts` (new)
**Action:** Write E2E tests for all CRUD operations: clients, products, users, lockers, rooms, verify create/read/update/delete.

#### TASK-078-B: Add Visual Regression Tests
**Target:** `tests/e2e/visual.spec.ts` (new)
**Action:** Add visual regression tests for key pages, compare screenshots, detect UI changes, configure acceptable diff thresholds.

---

## [ ] TASK-079: Integrate E2E Tests into CI
**Status:** Pending
**Priority:** Critical

### Related File Paths
- `.github/workflows/ci.yml`

### Definition of Done
- E2E tests added to CI workflow
- Tests run on PR and main branch
- Passing tests required for merge

### Out of Scope
- Test infrastructure (covered by TASK-047)
- Writing E2E tests (covered by TASK-077, TASK-078)

### Rules to Follow
- Run E2E tests in CI pipeline
- Require passing tests for merge
- Configure test timeouts

### Advanced Coding Pattern
- CI/CD integration pattern
- Test gate pattern

### Anti-Patterns
- Not running E2E tests in CI
- Allowing merge with failing tests
- Missing test timeouts

### Imports/Exports
- CI workflow only

### Depends On
- TASK-078 (Add E2E Tests for CRUD and Visual Regression)

### Blocks
- None

---

### Subtasks

#### TASK-079-A: Integrate E2E Tests into CI
**Target:** `.github/workflows/ci.yml`
**Action:** Add E2E test step to CI workflow, run on PR and main branch, require passing tests for merge.

#### TASK-079-B: Configure CI Test Settings
**Target:** `.github/workflows/ci.yml`
**Action:** Configure test timeouts, browser selection, test database for CI environment.

#### TASK-079-C: Test CI Integration
**Target:** Manual testing
**Action:** Run CI workflow with E2E tests, verify tests pass, verify merge blocked on test failure.

---

## [ ] TASK-048: Add Membership Purchase UI
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/spaflow/src/pages/client-detail.tsx`
- `artifacts/api-server/src/routes/clients.ts`
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Dedicated "Purchase Membership" button on client detail
- Membership purchase dialog with type selection
- Payment form integration with Square
- Transaction record creation
- Client membership status update
- Membership history timeline
- Tests updated and passing

### Out of Scope
- Membership renewal (covered by TASK-037)
- Membership upgrade/downgrade flow
- Changing membership pricing structure

### Rules to Follow
- Only show purchase button for non-members or expired members
- Show membership pricing clearly
- Integrate with existing Square payment flow
- Update client status immediately on success
- Add to transaction history
- Show membership expiration date

### Advanced Coding Pattern
- Modal dialog pattern for purchase flow
- Payment integration pattern
- State management for purchase flow
- Timeline component for history

### Anti-Patterns
- Duplicate payment logic
- Not updating client status
- Missing transaction record
- No validation of current membership status

### Imports/Exports
- Use existing Square payment components
- Use existing transaction types
- No new exports needed

### Depends On
- TASK-037 (Membership renewal flow API)

### Blocks
- None

---

### Subtasks

#### TASK-048-A: Add Membership Purchase Button
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Add "Purchase Membership" button visible for non-members and expired members, open purchase dialog on click.

#### TASK-048-B: Create Membership Purchase Dialog
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Create dialog with membership type selection (one-time, six-month), pricing display, Square payment form, confirm button.

#### TASK-048-C: Add Membership Purchase API Call
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Integrate with existing membership purchase API (TASK-037), handle payment token, process payment, show success/error.

#### TASK-048-D: Update Client Status on Purchase
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Invalidate client query on success, update membership badge, show new expiration date, add to transaction history.

#### TASK-048-E: Add Membership History Timeline
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Create timeline component showing membership purchases, renewals, status changes with dates and amounts.

#### TASK-048-F: Add Membership Expiration Warning
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Show warning badge when membership expires within 7 days, display days remaining, highlight expiration date.

#### TASK-048-G: Add Tests for Membership Purchase UI
**Target:** `artifacts/spaflow/src/pages/client-detail.test.tsx`
**Action:** Write tests for purchase dialog, payment flow, status update, history timeline, expiration warning.

---

## [ ] TASK-049: Implement Advanced Revenue Reports
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/reports.ts`
- `artifacts/spaflow/src/pages/reports.tsx` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Revenue by membership type breakdown
- Revenue by time of day analysis
- Revenue by day of week
- Membership conversion rate tracking
- Average transaction value calculation
- Product sales vs rental revenue breakdown
- Discount/special usage analytics
- Export to CSV functionality
- Tests updated and passing

### Out of Scope
- Predictive revenue forecasting
- Real-time revenue dashboard (covered by existing dashboard)
- External data integration

### Rules to Follow
- Use existing transaction data
- Aggregate by relevant dimensions
- Calculate conversion rates
- Support date range filtering
- Export to CSV for analysis
- Manager-only access

### Advanced Coding Pattern
- Aggregation query pattern
- Report generation service
- Data transformation pipeline
- CSV export utility

### Anti-Patterns
- N+1 query patterns
- Inefficient aggregations
- Missing date range support
- No export functionality

### Imports/Exports
- Extend reports API with new endpoints
- Export report types
- Export aggregation utilities

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-049-A: Add Revenue by Membership Type Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/revenue/membership endpoint, aggregate revenue by membership type, support date range filtering.

#### TASK-049-B: Add Revenue by Time of Day Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/revenue/time-of-day endpoint, aggregate revenue by hour, support date range filtering.

#### TASK-049-C: Add Revenue by Day of Week Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/revenue/day-of-week endpoint, aggregate revenue by weekday, support date range filtering.

#### TASK-049-D: Add Membership Conversion Rate Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/analytics/conversion-rate endpoint, calculate non-member to member conversion rate, support date range filtering.

#### TASK-049-E: Add Average Transaction Value Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/analytics/avg-transaction endpoint, calculate average transaction value, support date range filtering.

#### TASK-049-F: Add Product vs Rental Revenue Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/revenue/breakdown endpoint, separate product revenue from rental revenue, support date range filtering.

#### TASK-049-G: Add Discount Usage Analytics Endpoint
**Target:** `artifacts/api-server/src/routes/reports.ts`
**Action:** Add GET /reports/analytics/discounts endpoint, track usage of birthday, 1824, and other specials, support date range filtering.

#### TASK-049-H: Create Advanced Reports Page
**Target:** `artifacts/spaflow/src/pages/reports.tsx` (new)
**Action:** Create manager-only page with all advanced reports, date range picker, charts for visualization, CSV export buttons.

#### TASK-049-I: Add CSV Export to Reports
**Target:** `artifacts/spaflow/src/pages/reports.tsx`
**Action:** Implement CSV export for all report types, include headers, format data properly, trigger download.

#### TASK-049-J: Add Tests for Advanced Reports
**Target:** `artifacts/api-server/src/routes/reports.test.ts`
**Action:** Write tests for each new report endpoint, verify aggregation accuracy, test date range filtering, verify CSV export.

---

## [ ] TASK-050: Implement Backup and Disaster Recovery
**Status:** Pending
**Priority:** High

### Related File Paths
- `.github/workflows/backup.yml` (new)
- `scripts/backup.sh` (new)
- `scripts/restore.sh` (new)
- `docs/disaster-recovery.md` (new)

### Definition of Done
- Automated daily database backups
- Backup retention policy (30 days)
- Backup verification and restore testing
- Disaster recovery runbook documented
- RPO/RTO documented
- Failover testing procedures
- Backup monitoring and alerting

### Out of Scope
- Real-time replication (too complex for current scale)
- Multi-region deployment
- Third-party backup service integration

### Rules to Follow
- Use pg_dump for PostgreSQL backups
- Store backups in secure location
- Encrypt backups at rest
- Test restore process monthly
- Document RPO (Recovery Point Objective): 24 hours
- Document RTO (Recovery Time Objective): 4 hours

### Advanced Coding Pattern
- Backup automation pattern
- Disaster recovery planning
- Backup verification strategy
- Incident response playbook

### Anti-Patterns
- No automated backups
- No restore testing
- No documentation
- Storing backups unencrypted

### Imports/Exports
- No code changes required
- Documentation and scripts only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-050-A: Create Backup Script
**Target:** `scripts/backup.sh` (new)
**Action:** Create shell script using pg_dump to backup database, compress backup, encrypt with GPG, upload to secure storage.

#### TASK-050-B: Create Restore Script
**Target:** `scripts/restore.sh` (new)
**Action:** Create shell script to decrypt backup, decompress, restore using psql, verify data integrity.

#### TASK-050-C: Add Automated Backup Workflow
**Target:** `.github/workflows/backup.yml` (new)
**Action:** Create GitHub Actions workflow to run backup script daily at 3 AM, store as artifact, alert on failure.

#### TASK-050-D: Create Disaster Recovery Runbook
**Target:** `docs/disaster-recovery.md` (new)
**Action:** Document disaster recovery procedures, backup locations, restore steps, contact information, escalation procedures.

#### TASK-050-E: Document RPO and RTO
**Target:** `docs/disaster-recovery.md`
**Action:** Document Recovery Point Objective (24 hours), Recovery Time Objective (4 hours), and rationale for each.

#### TASK-050-F: Test Backup and Restore
**Target:** `scripts/`
**Action:** Manually test backup script, test restore script to staging environment, verify data integrity, document results.

#### TASK-050-G: Add Backup Monitoring
**Target:** `.github/workflows/backup.yml`
**Action:** Add monitoring to backup workflow, alert on failure, log backup size and duration, verify backup success.

---

## [ ] TASK-051: Implement Data Quality Features
**Status:** Pending
**Priority:** High

### Related File Paths
- `artifacts/api-server/src/routes/data-quality.ts` (new)
- `artifacts/spaflow/src/pages/data-quality.tsx` (new)
- `scripts/data-cleanup.ts` (new)
- `lib/api-spec/openapi.yaml`

### Definition of Done
- Duplicate client detection (by name, phone, email)
- Data quality dashboard
- Automated data validation rules
- Data anomaly detection
- Client merge functionality for duplicates
- Data cleanup tools
- Tests updated and passing

### Out of Scope
- Automatic data correction (manual review required)
- Complex ML-based anomaly detection
- Historical data cleaning

### Rules to Follow
- Detect potential duplicates with fuzzy matching
- Require manual review before merging
- Log all data quality actions
- Provide clear reason for each anomaly
- Support bulk data validation
- Manager-only access to data quality tools

### Advanced Coding Pattern
- Data validation service
- Duplicate detection algorithm
- Fuzzy matching pattern
- Data quality scoring
- Merge conflict resolution

### Anti-Patterns
- Automatic data deletion
- Missing audit trail for changes
- No manual review process
- Over-aggressive duplicate detection

### Imports/Exports
- Create data quality service
- Export validation rules
- Export merge types

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-051-A: Implement Duplicate Detection Algorithm
**Target:** `artifacts/api-server/src/services/data-quality.ts` (new)
**Action:** Create service to detect duplicate clients by name similarity, phone number, email address, return confidence score.

#### TASK-051-B: Add Data Quality API Endpoints
**Target:** `artifacts/api-server/src/routes/data-quality.ts` (new)
**Action:** Add GET /data-quality/duplicates endpoint, GET /data-quality/anomalies endpoint, POST /data-quality/validate endpoint, require manager role.

#### TASK-051-C: Create Data Quality Dashboard
**Target:** `artifacts/spaflow/src/pages/data-quality.tsx` (new)
**Action:** Create manager-only page showing duplicate candidates, data anomalies, validation results, merge interface.

#### TASK-051-D: Implement Client Merge Functionality
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add POST /clients/:id/merge endpoint, accept target client ID, merge transactions and rentals, archive duplicate, require manager role.

#### TASK-051-E: Add Data Validation Rules
**Target:** `artifacts/api-server/src/services/data-quality.ts`
**Action:** Define validation rules (phone format, email format, DOB validity, address completeness), run validation on demand.

#### TASK-051-F: Create Data Cleanup Script
**Target:** `scripts/data-cleanup.ts` (new)
**Action:** Create script to fix common data issues (phone format, email format, whitespace), require confirmation before changes.

#### TASK-051-G: Add Tests for Data Quality
**Target:** `artifacts/api-server/src/services/data-quality.test.ts` (new)
**Action:** Write tests for duplicate detection, merge logic, validation rules, cleanup script.

---

## [ ] TASK-052: Add Performance Testing
**Status:** Pending
**Priority:** High

### Related File Paths
- `load-tests/`
- `artifacts/api-server/src/routes/*.test.ts`
- `docs/performance-testing.md` (new)

### Definition of Done
- Performance benchmarking for all endpoints
- Database query performance analysis
- Load testing for concurrent check-ins
- Stress testing for peak hours simulation
- Performance regression testing
- Database indexing optimization
- Performance documentation

### Out of Scope
- Continuous performance monitoring (covered by TASK-046)
- Complex performance profiling tools

### Rules to Follow
- Benchmark all API endpoints
- Identify slow database queries
- Test with realistic load (50 concurrent users)
- Document performance baselines
- Add performance regression tests to CI
- Optimize database indexes based on query analysis

### Advanced Coding Pattern
- Performance testing pattern
- Load testing strategy
- Query optimization pattern
- Benchmarking methodology

### Anti-Patterns
- No performance testing
- Missing load testing
- Unoptimized database queries
- No performance baselines

### Imports/Exports
- No code changes required
- Test scripts and documentation only

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-052-A: Benchmark All API Endpoints
**Target:** `load-tests/benchmark.js` (new)
**Action:** Create benchmark script to test all endpoints, measure response times, record baselines, identify slow endpoints.

#### TASK-052-B: Analyze Database Query Performance
**Target:** `scripts/query-analysis.ts` (new)
**Action:** Create script to analyze slow queries using pg_stat_statements, identify missing indexes, suggest optimizations.

#### TASK-052-C: Add Concurrent Check-in Load Test
**Target:** `load-tests/concurrent-checkin.js` (new)
**Action:** Create load test simulating 20 concurrent check-ins, measure throughput, identify bottlenecks, test row-level locking.

#### TASK-052-D: Add Peak Hours Stress Test
**Target:** `load-tests/peak-hours.js` (new)
**Action:** Create stress test simulating peak hour load (100 requests/second), measure system stability, identify breaking points.

#### TASK-052-E: Optimize Database Indexes
**Target:** `lib/db/src/schema/`
**Action:** Add indexes based on query analysis, test index effectiveness, document index strategy.

#### TASK-052-F: Add Performance Regression Tests to CI
**Target:** `.github/workflows/ci.yml`
**Action:** Add performance test step to CI workflow, fail if performance degrades by more than 20%, alert on performance issues.

#### TASK-052-G: Document Performance Baselines
**Target:** `docs/performance-testing.md` (new)
**Action:** Document performance baselines for all endpoints, query performance targets, optimization strategies.

---

## [ ] TASK-053: Add Automated Expiration Notifications
**Status:** Pending
**Priority:** Medium

### Related File Paths
- `artifacts/api-server/src/jobs/cron.ts`
- `artifacts/api-server/src/lib/sms.ts`
- `lib/db/src/schema/clients.ts`

### Definition of Done
- Expiration reminder at 30 minutes before session ends
- Expiration reminder at 15 minutes before session ends
- Configure reminder timing via environment variables
- Add opt-in/opt-out for SMS reminders per client
- Log notification delivery status
- Tests updated and passing

### Out of Scope
- Real-time push notifications
- Email notifications (covered by TASK-003)
- Complex notification scheduling

### Rules to Follow
- Use existing SMS infrastructure
- Send reminders based on session expiration time
- Respect client opt-out preferences
- Log all notification attempts
- Configure timing via environment variables
- Only send for active sessions

### Advanced Coding Pattern
- Notification service pattern
- Cron job scheduling
- Opt-in management pattern
- Notification delivery tracking

### Anti-Patterns
- Hardcoded reminder times
- Not respecting opt-out
- Missing delivery logging
- Sending notifications for expired sessions

### Imports/Exports
- Extend cron job functionality
- Export notification types
- Export reminder configuration

### Depends On
- None

### Blocks
- None

---

### Subtasks

#### TASK-053-A: Add SMS Opt-In to Client Schema
**Target:** `lib/db/src/schema/clients.ts`
**Action:** Add smsRemindersEnabled boolean field to clientsTable with default true, create migration.

#### TASK-053-B: Add Reminder Timing Configuration
**Target:** `artifacts/api-server/src/lib/env.ts`
**Action:** Add REMINDER_MINUTES_BEFORE array to envSchema (e.g., [30, 15]), configure default values.

#### TASK-053-C: Create Notification Service
**Target:** `artifacts/api-server/src/services/notifications.ts` (new)
**Action:** Create service to check expiring sessions, filter by opt-in, send SMS reminders, log delivery status.

#### TASK-053-D: Add Reminder Cron Job
**Target:** `artifacts/api-server/src/jobs/cron.ts`
**Action:** Add cron job to run every 5 minutes, check for sessions expiring within reminder window, trigger notifications.

#### TASK-053-E: Add Opt-In Toggle to Client Detail
**Target:** `artifacts/spaflow/src/pages/client-detail.tsx`
**Action:** Add toggle switch for SMS reminders preference, update client on change, show current preference status.

#### TASK-053-F: Add Notification History
**Target:** `artifacts/api-server/src/routes/clients.ts`
**Action:** Add GET /clients/:id/notifications endpoint to show notification history, include delivery status and timestamps.

#### TASK-053-G: Add Tests for Notifications
**Target:** `artifacts/api-server/src/services/notifications.test.ts` (new)
**Action:** Write tests for reminder timing, opt-in filtering, SMS sending, delivery logging.

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


