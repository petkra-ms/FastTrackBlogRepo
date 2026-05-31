# Web Lead Qualification PCF
## AI-Powered Lead Assessment for Dynamics 365 Sales

---

## Agenda

1. Business Problem & Requirements
2. Building with GitHub Copilot
3. Solution Architecture
4. PCF Control Deep Dive
5. Authentication Mechanism (MSAL)
6. Copilot Studio Agent Integration
7. End-to-End Flow of Work
8. Deployment & Configuration
9. Lessons Learned
10. Demo

---

## 1. Business Problem

### The Challenge

- Sales teams receive **high volumes of web leads** (marketing pages, campaigns, landing pages)
- Many leads are **not sales-relevant**: complaints, vendors, spam, job seekers, unrelated inquiries
- Manual triage is **inconsistent and slow** — varies by region and individual
- Contextual signals (free text, company info, intent cues) are **not evaluated consistently**
- Sales wants help **inside the lead form**, not in a separate system

### The Goal

> Provide an AI-assisted signal directly in the Lead form to help sellers quickly understand whether a lead is likely sales-relevant — without auto-rejecting or auto-qualifying leads.

---

## 2. Requirements at a Glance

### Key User Stories

| # | User Story |
|---|---|
| US-01 | View an AI-based relevance assessment for a lead |
| US-02 | Understand the AI's reasoning (explainability) |
| US-03 | Toggle the lead's sales-relevance status (yes/no) |
| US-04 | Review & apply AI-recommended field value changes |
| US-05 | Maintain full control — AI is advisory only |
| US-06 | Provide thumbs-up/down feedback on AI quality |
| US-07 | Re-trigger the AI assessment manually |

### Design Principles

- **Advisory only** — no automatic qualification changes
- **Explainable** — summary + key factors + disclaimer
- **Non-intrusive** — no form blocking, graceful error handling
- **Human-in-the-loop** — seller judgment always authoritative

---

## 3. Building with GitHub Copilot

### The Development Journey

The entire PCF control was developed collaboratively with **GitHub Copilot CLI** — from initial research through production deployment.

### Phase 1: Research & Specification

- Started with a research document (`01-research.md`) outlining the problem space
- Copilot helped shape the **functional specification** (`02-spec.md`) with:
  - 8 user stories with acceptance criteria
  - 11 functional requirements
  - AI response JSON schema
  - Dataverse entity schemas for feedback and assessment persistence

### Phase 2: Implementation

- Copilot generated the **complete PCF control** including:
  - `index.ts` — PCF lifecycle entry point
  - `LeadSummaryRoot.tsx` — main React orchestrator
  - `LeadSummaryCard.tsx` — AI summary display with re-analyze button
  - `SalesRelevancePanel.tsx` — toggle switch + field recommendations
  - `FeedbackPanel.tsx` — thumbs up/down + comments
  - `aiService.ts` — AI response parsing
  - `feedbackService.ts` — Dataverse CRUD for feedback entity
  - `agentClient.ts` — MSAL + Copilot Studio SDK integration

### Phase 3: Testing & Dev Harness

- Copilot created a **full dev harness** (`dev-harness/`) with:
  - 6 preset mock scenarios (happy path, no factors, unclear, error, loading, empty)
  - Live Agent Test tab with real MSAL authentication
  - Local HTTP server with esbuild bundling
- **22 unit tests** — all passing

### Phase 4: Packaging & Deployment

- Copilot handled the **solution packaging** workflow:
  - `pac solution init` + `pac solution add-reference`
  - Manifest configuration (bound properties, external service usage, WebAPI features)
  - Production builds (`--buildMode production`)
  - Solution checker analysis and fixes

### Phase 5: Iterative Debugging in Production

- Discovered `context.copilot.executeEvent()` doesn't work in production D365
- Copilot pivoted the architecture to **MSAL + Copilot Studio SDK**
- Iterated through multiple deployment cycles fixing:
  - OData navigation property names
  - Field type mismatches (Boolean vs Option Set)
  - Bundle caching issues (version bumps)
  - Authentication scope configuration

---

## 4. Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Dynamics 365 Sales                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Lead Main Form                           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         PCF Control (LeadSummaryControl)        │  │  │
│  │  │  ┌───────────┐ ┌──────────┐ ┌──────────────┐   │  │  │
│  │  │  │  Summary   │ │ Relevance│ │   Feedback   │   │  │  │
│  │  │  │   Card     │ │  Panel   │ │    Panel     │   │  │  │
│  │  │  └───────────┘ └──────────┘ └──────────────┘   │  │  │
│  │  └────────────────────┬────────────────────────────┘  │  │
│  └───────────────────────┼───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
   ┌─────────────┐  ┌───────────┐  ┌──────────────┐
   │  Entra ID   │  │ Copilot   │  │  Dataverse   │
   │  (MSAL)     │  │  Studio   │  │  Web API     │
   │             │  │  Agent    │  │              │
   │ Token Auth  │  │           │  │ - Feedback   │
   │ via Popup   │  │ LeadQual  │  │ - Lead Data  │
   └─────────────┘  │  Topic    │  └──────────────┘
                    │     │     │
                    │     ▼     │
                    │ ┌───────┐ │
                    │ │ Power │ │
                    │ │ Auto- │ │
                    │ │ mate  │ │
                    │ │ Flow  │ │
                    │ └───┬───┘ │
                    │     │     │
                    │     ▼     │
                    │ ┌───────┐ │
                    │ │  AI   │ │
                    │ │Builder│ │
                    │ │Prompt │ │
                    │ └───────┘ │
                    └───────────┘
```

### Components

| Component | Technology | Purpose |
|---|---|---|
| PCF Control | TypeScript + React + Fluent UI v9 | UI rendering in D365 Lead form |
| Authentication | MSAL (`@azure/msal-browser`) | Acquire tokens for Copilot Studio API |
| Agent Client | `@microsoft/agents-copilotstudio-client` | Streaming communication with agent |
| Copilot Studio Agent | Custom topic + Power Automate | Orchestrate AI assessment |
| Power Automate Flow | Dataverse connector + AI Builder | Retrieve lead data + generate assessment |
| Feedback Storage | Dataverse custom entity | Persist user feedback records |

---

## 5. PCF Control Deep Dive

### Control Manifest Properties

| Property | Type | Purpose |
|---|---|---|
| `boundField` | Bound (SingleLine.Text) | Anchor to attach control to form |
| `clientId` | Input | Entra app registration Client ID |
| `tenantId` | Input | Azure AD Tenant ID |
| `environmentId` | Input | Power Platform environment GUID |
| `agentIdentifier` | Input | Copilot Studio agent schema name |
| `publisherPrefix` | Input | Dataverse entity prefix (e.g., `ftdemo`) |
| `salesRelevantFieldName` | Input | Logical name of the boolean field on lead |

### Key Features Declared

```xml
<external-service-usage enabled="true" />
<feature-usage>
  <uses-feature name="WebAPI" required="true" />
</feature-usage>
```

### UI Structure

The control renders **three stacked sections**:

1. **Lead Summary Card**
   - AI-generated summary (1–3 sentences)
   - Key factors (bullet list)
   - Sales relevance badge (Yes / No / Unclear)
   - "AI suggestion" badge + trust disclaimer
   - Re-analyze button

2. **Sales Relevance Panel**
   - Toggle switch (pre-selected by AI, overridable by user)
   - Field recommendations table
   - "Update Lead" button

3. **Feedback Panel**
   - Thumbs up / thumbs down buttons
   - Optional comment text area
   - Aggregate feedback counts

---

## 6. Authentication Mechanism (MSAL)

### Why MSAL?

The PCF control runs **client-side** in the browser. It cannot use service-to-service auth.
The Microsoft reference architecture prescribes using **MSAL with popup-based interactive auth**.

### Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐
│   PCF    │     │   Entra ID   │     │  Copilot Studio │
│ Control  │     │  (Azure AD)  │     │      API        │
└────┬─────┘     └──────┬───────┘     └────────┬────────┘
     │                  │                      │
     │  1. Check cached │                      │
     │     token        │                      │
     │──────────────────►                      │
     │                  │                      │
     │  2a. Token valid │                      │
     │◄──────────────── │                      │
     │                  │                      │
     │  2b. Token expired → Popup              │
     │──────────────────►                      │
     │                  │                      │
     │  3. User signs in│                      │
     │     (SSO / MFA)  │                      │
     │◄──────────────── │                      │
     │                  │                      │
     │  4. Bearer token │                      │
     │─────────────────────────────────────────►
     │                  │                      │
     │  5. Agent response (streaming)          │
     │◄─────────────────────────────────────── │
```

### Key Configuration

| Setting | Value |
|---|---|
| App Type | SPA (Single Page Application) |
| Redirect URI | `https://<org>.crm.dynamics.com` |
| API Permission | `CopilotStudio.Copilots.Invoke` (Delegated) |
| Token Scope | `https://api.powerplatform.com/.default` |
| Cache Location | `localStorage` |
| Auth Strategy | Silent first → Popup fallback |

### Entra ID App Registration Checklist

1. ✅ Register app as **SPA** (not Web, not Native)
2. ✅ Add redirect URI: `https://<your-org>.crm.dynamics.com`
3. ✅ Add redirect URI: `http://localhost:3333` (for dev harness)
4. ✅ API permissions → Power Platform API → `CopilotStudio.Copilots.Invoke`
5. ✅ Grant admin consent
6. ✅ Note the Application (client) ID and Directory (tenant) ID

---

## 7. Copilot Studio Agent Integration

### Communication Protocol

The PCF control uses the **`@microsoft/agents-copilotstudio-client` SDK** with streaming:

```typescript
// 1. Initialize client with connection settings
const client = new CopilotStudioClient(
    { environmentId, agentIdentifier },
    accessToken
);

// 2. Start conversation (streaming)
for await (const activity of client.startConversationStreaming(true)) {
    conversationId = activity.conversation?.id;
}

// 3. Send event activity with leadId
const eventActivity = new Activity("event");
eventActivity.name = "LeadQualification";
eventActivity.value = { leadId };

// 4. Receive response (streaming)
for await (const reply of client.sendActivityStreaming(eventActivity)) {
    // Parse agent response...
}
```

### Agent Topic Configuration

In Copilot Studio:

| Setting | Value |
|---|---|
| Trigger | "When an activity is received" → Type: **Event** |
| Event Name Filter | `LeadQualification` |
| Input Parameter | `System.Activity.Value.leadId` (wrap in `Text()`) |
| Response | JSON message with assessment result |

### Power Automate Flow

```
Trigger: "When Copilot Studio calls a flow"
    │
    ▼
Dataverse: Get Lead Record
    │  (topic, description, companyname, emailaddress1,
    │   websiteurl, leadsourcecode, etc.)
    │
    ▼
AI Builder: Create text with GPT
    │  Prompt: "Analyze this lead and return JSON with
    │   summary, isSalesRelevant, keyFactors,
    │   recommendationText, fieldRecommendations"
    │
    ▼
Parse AI Response
    │  Extract from: responsev2.predictionOutput.text
    │
    ▼
Return to Agent: Respond to Copilot Studio
```

### AI Response Schema

```json
{
  "summary": "This lead appears to be a genuine product inquiry...",
  "isSalesRelevant": "yes",
  "keyFactors": [
    "Corporate email domain (contoso.com)",
    "Product inquiry mentioned in description",
    "Company website is active B2B site"
  ],
  "recommendationText": "Company name should be updated...",
  "fieldRecommendations": [
    {
      "fieldName": "companyname",
      "displayName": "Company Name",
      "recommendedValue": "Contoso Ltd"
    }
  ]
}
```

---

## 8. End-to-End Flow of Work

```
 User opens Lead record in D365
          │
          ▼
 PCF Control loads (updateView)
          │
          ▼
 MSAL: Acquire token (silent / popup)
          │
          ▼
 CopilotStudioClient: Start conversation (SSE streaming)
          │
          ▼
 Send Event Activity: { name: "LeadQualification", value: { leadId } }
          │
          ▼
 Copilot Studio: Topic triggered by Event activity
          │
          ▼
 Power Automate: Retrieve lead fields from Dataverse
          │
          ▼
 AI Builder: Generate assessment from lead data
          │
          ▼
 Agent returns JSON response (streaming)
          │
          ▼
 PCF parses response → renders Summary Card
          │
          ▼
 User reviews AI assessment
          │
          ├──► Toggle sales relevance (yes/no)
          ├──► Review field recommendations
          ├──► Click "Update Lead" → writes to Dataverse
          ├──► Submit feedback (thumbs up/down) → creates feedback record
          └──► Click "Re-analyze" → repeat from MSAL step
```

---

## 9. Deployment & Configuration

### Solution Package

| Item | Value |
|---|---|
| Solution Name | Web Lead Qualification PCF |
| Publisher | ftdemo (prefix: ftdemo) |
| Control Name | `CustomLeadSummary.LeadSummaryControl` |
| Bundle Size | ~2 MB (includes MSAL + SDK) |
| Build Mode | Production (no eval) |

### Deployment Steps

1. **Build**: `npm run build -- --buildMode production`
2. **Package**: `cd Solution && dotnet build --configuration Release`
3. **Import**: Settings → Solutions → Import `Solution.zip`
4. **Publish**: Publish All Customizations
5. **Configure**: Add control to Lead form, set input properties
6. **Provision**: Create feedback entity (`ftdemo_leadsummaryfeedback`) in Dataverse

### Custom Dataverse Entities

**Feedback Entity: `ftdemo_leadsummaryfeedback`**

| Column | Type | Description |
|---|---|---|
| `ftdemo_lead` | Lookup → lead | Link to the assessed lead |
| `ftdemo_feedbacktype` | Yes/No (Boolean) | true = Thumbs Up, false = Thumbs Down |
| `ftdemo_comment` | Text | Optional user comment |
| `ftdemo_airelevanceverdict` | Text | AI verdict at time of submission |
| `ownerid` | Owner (system) | Auto-set to current user |

---

## 10. Lessons Learned

### Architecture Pivot

- ❌ `context.copilot.executeEvent()` — **does not work** in production D365 environments ("Result is not PredictAPI")
- ✅ MSAL + `@microsoft/agents-copilotstudio-client` SDK — the **Microsoft-recommended** approach

### Key Technical Insights

| Area | Learning |
|---|---|
| PCF Manifest | Must declare `<uses-feature name="WebAPI">` to use `context.webAPI` |
| PCF Manifest | Must have at least one `usage="bound"` property to appear in form editor |
| PCF Manifest | Must set `external-service-usage enabled="true"` for external HTTP calls |
| OData Binds | Navigation property names come from **relationship metadata**, not column logical names |
| Solution Checker | Dev-mode webpack bundles contain `eval()` → use `--buildMode production` |
| D365 Caching | Bump control version in manifest to force D365 to load updated bundles |
| MSAL Scope | Use `https://api.powerplatform.com/.default` (not the permission name) |
| Power Automate | `System.Activity.Value.leadId` is type "any" — wrap in `Text()` for string use |
| AI Builder | Response is nested: actual JSON is in `responsev2.predictionOutput.text` |

### GitHub Copilot as a Development Partner

- Copilot handled the **full development lifecycle**: research → spec → code → test → package → deploy → debug
- Iterative debugging in production was highly effective — Copilot adapted to real error messages
- The architecture pivot (from `executeEvent` to MSAL+SDK) was completed in a single session
- Total: **22 passing tests**, **6 mock scenarios**, **full dev harness**, **production-ready solution**

---

## 11. Demo

### What to Show

1. **Lead Form** → PCF control loads, spinner, AI assessment appears
2. **Summary Card** → Natural language summary + key factors + badge
3. **Relevance Toggle** → Pre-selected by AI, can be overridden
4. **Field Recommendations** → Table of suggested changes
5. **Update Lead** → Single click writes relevance + recommendations to lead
6. **Feedback** → Thumbs up/down, comment, aggregate counts
7. **Re-analyze** → Fresh AI call, updated results
8. **Dev Harness** → Mock scenarios at http://localhost:3333

---

## Thank You

### Resources

| Resource | Link |
|---|---|
| Reference Architecture | https://learn.microsoft.com/en-us/dynamics365/guidance/reference-architectures/custom-copilot-agent-dynamics-365-power-apps |
| PCF Documentation | https://learn.microsoft.com/en-us/power-apps/developer/component-framework/overview |
| MSAL Browser | https://www.npmjs.com/package/@azure/msal-browser |
| Copilot Studio SDK | https://www.npmjs.com/package/@microsoft/agents-copilotstudio-client |

### Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 16 + Fluent UI v9 |
| Language | TypeScript (strict mode) |
| Auth | MSAL v4 (SPA popup) |
| Agent SDK | @microsoft/agents-copilotstudio-client |
| Build | PCF Scripts (Webpack) |
| Tests | Jest |
| Platform | Dynamics 365 Sales (Model-Driven App) |
| AI | Copilot Studio + AI Builder |
| Development | GitHub Copilot CLI |
