# Plan: Address Open Questions from Research Spec (Section 9)

> **Spec updated:** `docs/spec/02-spec.md` has been updated with all decisions below (US‑07/08, FR‑09/10/11, AC‑09/10/11, Section 7a entity schema, resolved open questions).

## Problem Statement

The research spec (`docs/spec/01-research.md`) section 9 identifies four open questions that remain unresolved in the current implementation. This plan addresses each with the decisions captured during planning.

## Decisions Made

| # | Open Question | Decision |
|---|---|---|
| 1 | Auto-load vs. on-demand AI call | Keep auto-load on form open; add a **"Re-analyze"** button for manual refresh |
| 2 | Persist AI result vs. transient | Persist in a **new custom entity** (`<prefix>_leadaisummary`) linked to the lead |
| 3 | Localization of explanation text | **English only for v1** — defer localization to a future iteration |
| 4 | Handle field changes after scoring | **Auto-detect changes** and show a "stale result" warning banner |

---

## Implementation Plan

### 1. Re-analyze Button

**What:** Add a "Re-analyze" button to the LeadSummaryCard that allows the seller to manually re-trigger the AI call.

**Files to change:**
- `LeadSummaryControl/components/LeadSummaryCard.tsx` — add a re-analyze button next to the card header
- `LeadSummaryControl/components/LeadSummaryRoot.tsx` — expose a `handleReanalyze` callback that resets the dirty-check ref and re-runs the AI call
- `LeadSummaryControl/__tests__/LeadSummaryCard.test.tsx` — add tests for the re-analyze button rendering and click behavior

**Details:**
- Button appears once the initial AI call completes (success or error)
- Disabled while AI is loading
- Clicking it clears `calledForLeadRef`, resets AI state, and re-invokes `callCopilotAgent`
- Uses Fluent UI `Button` with an `ArrowSync` icon

### 2. Persist AI Assessment in Dataverse

**What:** After the AI call returns, save the result to a new custom entity `<prefix>_leadaisummary`. On load, check for an existing assessment first — if one exists and is recent, display it immediately while optionally re-running the AI in the background.

**New entity schema (`<prefix>_leadaisummary`):**
- `<prefix>_leadaisummaryid` — primary key (GUID)
- `<prefix>_leadid` — lookup to `lead`
- `<prefix>_summary` — multiline text
- `<prefix>_issalesrelevant` — option set (1=yes, 2=no, 3=unclear)
- `<prefix>_keyfactors` — multiline text (JSON array serialized as string)
- `<prefix>_recommendationtext` — multiline text
- `<prefix>_fieldrecommendations` — multiline text (JSON serialized)
- `createdon` — system timestamp

**Files to create:**
- `LeadSummaryControl/services/assessmentService.ts` — CRUD for the assessment entity (save, retrieve latest for lead)

**Files to change:**
- `LeadSummaryControl/components/LeadSummaryRoot.tsx` — on mount, fetch the latest persisted assessment and display it immediately; after AI call completes, persist the new result; on re-analyze, persist the updated result
- `LeadSummaryControl/services/aiService.ts` — no changes (the AI service stays pure; persistence is handled at the orchestration layer)

**New tests:**
- `LeadSummaryControl/__tests__/assessmentService.test.ts` — unit tests for save/retrieve

**Behavior:**
- On load: fetch latest persisted assessment → display instantly (no spinner if found)
- In parallel: trigger AI call → when complete, replace displayed result and persist new record
- On re-analyze: trigger AI call → persist new record (keeps history)
- History accumulates (one record per AI call, not upsert)

### 3. Localization — Deferred (No Work)

English only for v1. No changes needed. This decision is documented here for traceability.

### 4. Stale Result Warning Banner

**What:** Detect when lead fields change after the AI assessment was generated and show a "stale" warning banner suggesting the user re-analyze.

**Approach:**
- The PCF `updateView()` is called by the framework whenever bound properties change. However, the current manifest only binds `copilotEventName`, `publisherPrefix`, and `salesRelevantFieldName` — not the lead data fields themselves.
- Since the AI agent retrieves lead data server-side (only `leadId` is sent), we cannot directly detect field-level changes from the PCF context.
- **Solution:** Use `context.webAPI.retrieveRecord` to fetch a snapshot of key lead fields (topic, description, companyname, emailaddress1, websiteurl) when the AI call completes, and store a hash/fingerprint. On each `updateView()` cycle, re-fetch and compare. If the fingerprint differs, show a "stale" banner.

**Files to create:**
- `LeadSummaryControl/services/leadFieldsService.ts` — fetch key lead fields, compute a simple fingerprint (concatenated string hash)

**Files to change:**
- `LeadSummaryControl/components/LeadSummaryRoot.tsx` — add stale-detection logic: store fingerprint after AI call, poll/compare on `updateView`, expose `isStale` state
- `LeadSummaryControl/components/LeadSummaryCard.tsx` — render a warning banner (Fluent `MessageBar` with "warning" intent) when `isStale` is true, with text like *"Lead fields have changed since this assessment. Click Re-analyze to update."*
- `LeadSummaryControl/index.ts` — pass a signal from `updateView` to trigger a stale check (e.g., an incrementing counter prop or a callback)

**New tests:**
- `LeadSummaryControl/__tests__/leadFieldsService.test.ts` — test fingerprint computation and comparison
- Update `LeadSummaryCard.test.tsx` — test stale banner rendering

---

## Todo Summary

1. **re-analyze-button** — Add re-analyze button to LeadSummaryCard + Root wiring + tests
2. **persist-assessment** — Create assessmentService + integrate persist/retrieve in Root + tests
3. **stale-detection** — Create leadFieldsService + fingerprint logic + stale banner UI + tests
4. *(Localization deferred — no work item)*

## Dependencies

- `re-analyze-button` has no dependencies (can start immediately)
- `persist-assessment` has no dependencies (can start immediately)
- `stale-detection` depends on `re-analyze-button` (the banner recommends clicking Re-analyze)

## Notes

- The new Dataverse entity (`<prefix>_leadaisummary`) must be created manually in the target environment (or via a solution). The code will reference it but cannot create the schema.
- The stale detection polling approach adds one `retrieveRecord` call per `updateView` cycle. If this proves too chatty, we can debounce or only check on a timer.
- All changes follow existing patterns: Fluent UI v9 components, `context.webAPI` for all Dataverse access, strict null checks.
