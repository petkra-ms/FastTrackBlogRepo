# Specification – AI‑assisted Lead Relevance PCF Control

## 1. Feature Overview

**Name:** AI Lead Relevance Advisor (PCF Control)

**Summary:**
Provide sales users with an AI-generated relevance assessment for inbound leads directly within the Dynamics 365 Lead form, helping them quickly determine whether a lead is sales-relevant, while keeping the human fully in control.

The control is advisory only, explainable, and embedded in the seller's existing workflow. When the AI agent identifies data quality issues or enrichment opportunities, the control also presents recommended field updates that the seller can apply with a single click.

## 2. Goals & Success Criteria

### Business Goals

- Reduce time spent manually triaging low-quality leads
- Improve consistency of lead qualification decisions
- Surface actionable data-quality recommendations alongside the relevance assessment
- Support (not replace) seller judgment

### Success Criteria

- A seller can understand the AI assessment in ≤ 5 seconds
- The AI output clearly explains why a lead is considered relevant or not
- No qualification state changes occur automatically
- Sellers trust and adopt the control (i.e., it is not ignored)
- When field recommendations are present, sellers can review and apply them in one action

## 3. Users & Usage Context

### Primary Users

- Sales Development Representatives (SDRs)
- Account Executives (AEs)

### Usage Context

- Lead Main Form in Dynamics 365 Sales ("AI Lead Summary" tab)
- Desktop-first, responsive on tablet
- Viewed during initial lead review or first contact preparation

## 4. User Stories

### US‑01 — View AI Relevance Assessment
As a sales user,
I want to see an AI-based relevance assessment for a lead,
so that I can quickly decide whether this lead is worth pursuing.

### US‑02 — Understand Why the Lead Was Rated
As a sales user,
I want to see a short explanation of the AI's reasoning and the key factors it considered,
so that I can judge whether the recommendation makes sense.

### US‑03 — Set Sales Relevance
As a sales user,
I want to toggle the lead's sales-relevance status (yes / no) using a simple switch,
so that my decision is recorded on the lead record.

### US‑04 — Review & Apply Field Recommendations
As a sales user,
I want to see recommended field value changes when the AI detects data-quality issues or enrichment opportunities,
so that I can improve the lead record with a single click.

### US‑05 — Maintain Full Control
As a sales user,
I want to make my own qualification decision regardless of the AI suggestion,
so that my judgment always remains authoritative.

### US‑06 — Provide Feedback on AI Quality
As a sales user,
I want to give thumbs-up or thumbs-down feedback (with an optional comment) on the AI summary,
so that the team can track AI accuracy over time.

### US‑07 — Re‑analyze a Lead
As a sales user,
I want to manually re-trigger the AI assessment for a lead,
so that I can get an updated analysis after reviewing or editing the lead data.

### US‑08 — Know When the Assessment Is Stale
As a sales user,
I want to be warned when lead fields have changed since the last AI assessment,
so that I know the displayed analysis may no longer reflect the current data.

## 5. Functional Requirements

### FR‑01 — Display Relevance Result

- The control must display a sales-relevance verdict: **yes**, **no**, or **unclear**.
- The output must be clearly labeled as **"AI suggestion"** via a badge.

### FR‑02 — Provide Explainability

The control must display:

- A natural-language **summary** (1–3 sentences)
- **Key factors** influencing the assessment (bullet list)
- A trust **disclaimer**: *"AI-generated suggestion. Final decision remains yours."*

Example:
> "This lead is likely sales-relevant because it comes from a corporate email domain, references a product inquiry, and includes a company website."

### FR‑03 — Use Existing Lead Data Only (via Agent)

- The PCF control passes only the **lead ID** to the Copilot Studio agent.
- The agent is responsible for retrieving all relevant lead fields from Dataverse (Topic, Description, Company Name, Website, Email, Country, Lead Source, etc.).
- No lead field values are sent from the client to the agent.

### FR‑04 — Sales Relevance Toggle

- The control provides a **Switch** (yes / no) for the seller to set or override sales relevance.
- The AI suggestion pre-selects the switch when the verdict is "yes" or "no" (not "unclear").
- The seller can change the toggle at any time.

### FR‑05 — Field Recommendations

- When the AI agent returns `fieldRecommendations`, the control displays:
  - A **recommendation text** explaining why changes are suggested
  - A **table** of recommended field updates (field display name → recommended value)
- The **"Update Lead"** button is enabled when recommendations are present or the relevance toggle has been set.
- Clicking "Update Lead" writes the sales-relevance value **and** all recommended field values to the lead record in a single `webAPI.updateRecord` call.

### FR‑06 — Advisory-Only Behavior

The control must not:

- Change lead status or qualification state automatically
- Auto-create activities
- Write any data without explicit user action ("Update Lead" button)

All decisions remain manual.

### FR‑07 — Error & Fallback Handling

If AI inference fails:

- Show a neutral message (e.g. *"AI summary unavailable: [reason]"*)
- Do not block form usage
- Hide the relevance badge; show raw field values if available
- A 30-second timeout prevents indefinite waiting

### FR‑08 — Feedback Collection

- Sellers can submit **thumbs-up / thumbs-down** feedback with an optional comment.
- Each submission creates a new record in a custom feedback entity (`<prefix>_leadsummaryfeedback`), linked to the lead and the submitting user.
- Multiple feedback records per lead per user are allowed (no upsert).
- The control displays aggregate feedback counts.

### FR‑09 — Manual Re‑analyze

- The control provides a **"Re-analyze"** button (with an `ArrowSync` icon) in the Lead Summary Card header.
- The button appears once the initial AI call completes (success or error).
- The button is disabled while an AI call is in flight.
- Clicking the button resets the dirty-check, clears the current AI state, and re-invokes the Copilot agent.
- After re-analysis completes, the updated result replaces the previously displayed assessment.

### FR‑10 — Persist AI Assessment in Dataverse

- Each AI assessment is persisted as a record in a custom entity (`<prefix>_leadaisummary`), linked to the lead.
- On initial load, the control fetches the **latest persisted assessment** and displays it immediately (no spinner if a cached result exists).
- In parallel, the control triggers a fresh AI call. When the new result arrives, it replaces the cached display and a new assessment record is persisted.
- On re-analyze (FR‑09), the new result is also persisted as an additional record.
- Assessment records accumulate over time (one record per AI call, no upsert) to provide an audit trail.
- The custom entity must be provisioned in Dataverse before deployment (see Section 7a).

### FR‑11 — Stale Result Warning

- After an AI assessment completes, the control captures a **fingerprint** of key lead fields (topic, description, company name, email, website) via `context.webAPI.retrieveRecord`.
- On each `updateView()` cycle, the control re-fetches the same fields and compares the fingerprint.
- If the fingerprint has changed, the control displays a **warning banner** (Fluent UI `MessageBar` with "warning" intent):
  *"Lead fields have changed since this assessment. Click Re-analyze to update."*
- The warning is dismissed automatically when the user triggers a re-analyze (FR‑09) and a new assessment completes.

## 6. Acceptance Criteria

### AC‑01 — Initial Load Behavior
**Given** I open a Lead record
**When** the PCF control loads
**Then** I see either:
- A relevance assessment with summary, key factors, and disclaimer, **or**
- A clear message explaining why it is not available

### AC‑02 — Explainability
**Given** an AI assessment is shown
**Then** the UI includes:
- A visible "AI suggestion" badge
- A natural-language summary
- Key factors (when provided)
- A trust disclaimer

### AC‑03 — Sales Relevance Toggle
**Given** the AI returns a "yes" or "no" verdict
**Then** the Switch is pre-selected accordingly
**And** the seller can toggle it to the opposite value at any time

### AC‑04 — Field Recommendations
**Given** the AI returns field recommendations
**Then** the control displays the recommendation text and a table of suggested values
**And** the "Update Lead" button is enabled

### AC‑05 — Update Lead
**Given** the seller clicks "Update Lead"
**Then** the sales-relevance field and all recommended fields are written to the lead record
**And** a success confirmation is shown

### AC‑06 — Non‑Intrusive Behavior
**Given** any AI outcome
**Then** no Lead fields are modified without explicit user action

### AC‑07 — Performance
**Given** normal network conditions
**Then** the AI assessment renders asynchronously with a loading spinner
**And** the call times out after 30 seconds with a graceful error message

### AC‑08 — Feedback
**Given** a seller submits feedback
**Then** a new feedback record is created in Dataverse
**And** the aggregate count updates in the UI

### AC‑09 — Re‑analyze
**Given** the initial AI assessment has completed (success or error)
**When** the seller clicks "Re-analyze"
**Then** a new AI call is triggered with a loading spinner
**And** the updated result replaces the previous assessment
**And** the new result is persisted in Dataverse

### AC‑10 — Cached Assessment on Load
**Given** a previous AI assessment exists in Dataverse for this lead
**When** the PCF control loads
**Then** the cached assessment is displayed immediately (no spinner)
**And** a fresh AI call runs in the background
**And** when the fresh result arrives, it replaces the cached display and is persisted

### AC‑11 — Stale Result Warning
**Given** an AI assessment is displayed
**When** lead fields (topic, description, company name, email, website) have changed since the assessment was generated
**Then** a warning banner is shown: *"Lead fields have changed since this assessment. Click Re-analyze to update."*
**And** the warning is dismissed after a successful re-analyze

## 7. AI Agent Response Schema

The Copilot Studio agent topic must accept a `leadId` (string) parameter and return a JSON message:

```json
{
  "summary": "Natural-language summary of the lead assessment.",
  "isSalesRelevant": "yes | no | unclear",
  "keyFactors": [
    "Corporate email domain detected",
    "Product inquiry mentioned in description"
  ],
  "recommendationText": "The company name should be updated based on the email domain.",
  "fieldRecommendations": [
    {
      "fieldName": "companyname",
      "displayName": "Company Name",
      "recommendedValue": "Contoso Ltd"
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `summary` | string | Yes | 1–3 sentence natural-language summary |
| `isSalesRelevant` | string | Yes | `"yes"`, `"no"`, or `"unclear"` |
| `keyFactors` | string[] | No | Bullet-point reasons for the verdict |
| `recommendationText` | string | No | Explanation of why field changes are suggested |
| `fieldRecommendations` | object[] | No | Array of `{ fieldName, displayName, recommendedValue }` |

## 7a. Assessment Persistence Entity Schema

The AI assessment is persisted in a custom Dataverse entity: `<prefix>_leadaisummary`.

This entity must be provisioned in the target environment before deploying the control (manually or via solution import).

| Column | Type | Description |
|---|---|---|
| `<prefix>_leadaisummaryid` | GUID (PK) | Auto-generated primary key |
| `<prefix>_leadid` | Lookup → `lead` | Reference to the assessed lead |
| `<prefix>_summary` | Multiline Text | AI-generated natural-language summary |
| `<prefix>_issalesrelevant` | Option Set | `1` = yes, `2` = no, `3` = unclear |
| `<prefix>_keyfactors` | Multiline Text | JSON-serialized string array of key factors |
| `<prefix>_recommendationtext` | Multiline Text | Explanation of recommended field changes |
| `<prefix>_fieldrecommendations` | Multiline Text | JSON-serialized array of `{ fieldName, displayName, recommendedValue }` |
| `createdon` | DateTime (system) | Timestamp of when the assessment was created |

**Notes:**
- Records accumulate (one per AI call) — no upsert. This provides an audit trail of assessments over time.
- The control retrieves only the latest record (ordered by `createdon desc`, `$top=1`) for display on load.
- `<prefix>` is the publisher prefix provided via the `publisherPrefix` PCF input property.

## 8. Non‑Functional Requirements

### Performance

- Async call pattern with visual loading spinner
- 30-second timeout with graceful fallback
- Single AI call per lead ID (dirty-check prevents redundant calls); re-analyze resets the check

### Security & Compliance

- No secrets stored in PCF
- AI service accessed via `context.copilot.executeEvent` (PCF Copilot framework)
- All Dataverse access via `context.webAPI` — no raw HTTP calls
- Only the lead ID is sent to the agent (no PII leaves the client)

### Trust & UX

- Clear disclaimer: *"AI-generated suggestion. Final decision remains yours."*
- "AI suggestion" badge on the summary card
- No red/green "judgmental" UI patterns for the verdict

### Accessibility

- Text-based explanations (no colour-only meaning)
- Screen-reader compatible (Fluent UI components)
- Switch toggle with dynamic label text

## 9. UI / UX Layout

The control renders in an "AI Lead Summary" tab on the Lead main form, structured as three stacked sections separated by dividers:

1. **Lead Summary Card** — AI-generated summary, key factors, disclaimer badge, **Re-analyze button**, **stale warning banner**
2. **Sales Relevance Panel** — Switch toggle, recommendation text, field recommendations table, "Update Lead" button
3. **Feedback Panel** — Thumbs up/down, optional comment, aggregate counts

Built with Fluent UI v9 (platform library 9.46.2). Card-style layout, no modal dialogs.

## 10. Edge Cases

- Empty or very short lead description → agent returns "unclear" verdict
- Free email domains (gmail, yahoo, outlook.com) → agent may flag as non-corporate
- Non-business inquiries (jobs, support, complaints) → agent returns "no" with explanation
- Non-English text → agent handles (or returns "unclear")
- AI call timeout or failure → spinner stops, error message shown, form remains usable
- No field recommendations returned → recommendation section hidden, "Update Lead" requires relevance toggle
- Agent returns malformed JSON → treated as error, graceful fallback
- Re-analyze while a previous call is in flight → button disabled, no duplicate calls
- No cached assessment exists on load → standard loading spinner, no stale state
- Lead fields change rapidly → fingerprint comparison debounced per `updateView` cycle; stale banner shown once any change is detected

## 11. Configuration Properties

| Property | Type | Description |
|---|---|---|
| `copilotEventName` | string | Name of the Copilot Studio agent event/topic to invoke |
| `publisherPrefix` | string | Dataverse publisher prefix (e.g. `ftdemo`) |
| `salesRelevantFieldName` | string | Logical name of the boolean field on lead (e.g. `ftdemo_issalesrelevant`) |

These are configured as PCF input properties in `ControlManifest.Input.xml` and bound via the form editor.

## 12. Resolved Open Questions

The following items from the research phase (01-research.md, Section 9) have been resolved:

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | Auto-load vs. on-demand AI call | Keep auto-load; add "Re-analyze" button (FR‑09) | Immediate value on form open; manual refresh for updated data |
| 2 | Persist AI result vs. transient | Persist in `<prefix>_leadaisummary` entity (FR‑10) | Instant display on re-open; audit trail of assessments |
| 3 | Localization of explanation text | English only for v1 | Reduce complexity; agent-generated text is out of scope for localization |
| 4 | Handle field changes after scoring | Auto-detect changes, show stale warning (FR‑11) | Keeps seller informed without blocking; pairs with Re-analyze |

## 13. Remaining Open Items

- Copilot Studio agent event name (currently placeholder `LeadRelevanceAssessment`)
- Stale detection polling frequency — may need debouncing if `updateView` fires too frequently

## 14. Definition of Done

- PCF control renders correctly on Lead main form in the "AI Lead Summary" tab
- AI assessment is explainable and advisory-only
- Sales relevance can be toggled via Switch and persisted to the lead
- Field recommendations are displayed and can be applied with one click
- "Re-analyze" button triggers a fresh AI assessment and persists the result
- Cached assessments are displayed instantly on form load
- Stale warning banner appears when lead fields change after assessment
- Feedback can be submitted and is persisted in Dataverse
- All acceptance criteria (AC‑01 through AC‑11) are met
- No automatic business process changes occur
- Errors handled gracefully (timeout, API failure, malformed response)
- Unit tests pass (aiService, feedbackService, assessmentService, leadFieldsService, LeadSummaryCard)
- Build succeeds with zero lint errors
- Ready for pilot with sales users