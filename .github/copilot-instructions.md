# Copilot Instructions

## Project Overview

A PCF (Power Apps Component Framework) control for Dynamics 365 that renders a custom lead summary card. It reads two fields on the `lead` entity, uses AI to generate a concise summary and a sales-relevance verdict, and captures per-user feedback stored in a linked custom D365 entity.

**Key inputs from the lead record:**
- `Direct inquiry` — text field with the raw inquiry content
- `Lead Source Detail` — option set (dropdown) indicating the lead's source

**Key outputs:**
- AI-generated summary of the inquiry and source detail
- Sales-relevance indicator (yes / no / unclear)
- In-control feedback UI whose submissions are persisted as records in a custom feedback entity, linked to the lead, supporting multiple feedback entries per lead

## Build & Deploy

```bash
# Install dependencies
npm install

# Build (production)
npm run build

# Start local test harness (watch mode)
npm start

# Run all tests
npm test

# Run a single test by name
npm test -- --testNamePattern="<test name>"

# Push control to a Dataverse environment (requires pac CLI authenticated)
pac pcf push --publisher-prefix <your-prefix>
```

> Authenticate the PAC CLI before pushing: `pac auth create --url https://<org>.crm.dynamics.com`

## Architecture

```
CustomLeadSummary/
├── index.ts                  # PCF entry point — implements StandardControl<IInputs, IOutputs>
├── ControlManifest.Input.xml # Declares bound properties, datasets, and resources
├── components/               # React (or plain TS) UI components
│   ├── LeadSummaryCard.tsx   # Renders the AI summary and sales-relevance badge
│   └── FeedbackPanel.tsx     # Thumbs up/down + optional comment; triggers feedback save
├── services/
│   ├── aiService.ts          # Calls the AI endpoint to generate summary + relevance verdict
│   └── feedbackService.ts    # CRUD for the custom feedback entity via context.webAPI
└── __tests__/                # Jest unit tests
```

**Data flow:**
1. PCF runtime calls `init()` → `updateView()` with `context.parameters` containing the two bound lead fields.
2. `aiService.ts` sends `directInquiry` + `leadSourceDetail` to the AI endpoint and returns `{ summary, isSalesRelevant }`.
3. The result is rendered in `LeadSummaryCard`. The current user's prior feedback (if any) is fetched via `context.webAPI.retrieveMultipleRecords` on the feedback entity, filtered by lead ID and current user.
4. On feedback submission, `feedbackService.ts` creates a new record in the custom feedback entity (not upsert — multiple submissions per user per lead are allowed).

**External dependencies:**
- AI calls use the PCF Copilot framework API (`context.copilot.executeEvent`). The control passes `directInquiry` and `leadSourceDetail` as parameters to a registered Copilot Studio agent event. The event name is configured via the `copilotEventName` PCF input property.
- The Copilot Studio agent topic must accept `directInquiry` (string) and `leadSourceDetail` (string) parameters and respond with a message whose `text` is JSON: `{ "summary": "...", "isSalesRelevant": "yes|no|unclear" }`
- Dynamics 365 Web API — accessed exclusively through `context.webAPI` (never direct fetch to OData endpoint)

## Key Conventions

**PCF lifecycle:**
- All D365 API calls must go through `context.webAPI`, never raw `fetch`/`XMLHttpRequest` to the OData endpoint.
- `init()` is for setup only; avoid heavy async work there — defer data loading to `updateView()`.
- `updateView()` is called by the framework on every bound property change; guard against redundant AI calls with a dirty-check on the input values.

**Feedback entity:**
- The custom feedback entity is named with the publisher prefix (e.g., `<prefix>_leadsummaryfeedback`).
- Each record has at minimum: lookup to `lead`, `systemuser` (submitter), `feedbacktype` (option set: ThumbsUp / ThumbsDown), optional `comment` (text), and `airelevanceverdict` (mirroring the AI output at time of submission).
- Multiple records per lead are intentional — do not prevent duplicate submissions from the same user.

**AI service:**
- Always pass both `directInquiry` and `leadSourceDetail` together in a single `context.copilot.executeEvent(eventName, { directInquiry, leadSourceDetail })` call — do not call them separately.
- The AI response shape is `{ summary: string; isSalesRelevant: "yes" | "no" | "unclear" }` — parsed from the `text` field of the first `MCSResponse` with `type === "message"`.
- If the AI call fails, the control must degrade gracefully: show the raw field values and hide the sales-relevance badge rather than blocking the form.

**TypeScript:**
- Input/output types are generated from `ControlManifest.Input.xml` into `ManifestTypes.d.ts` — do not hand-edit that file.
- Use strict null checks; treat all `context.parameters` values as potentially `null | undefined` until validated.
