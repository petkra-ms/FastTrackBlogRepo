# Research Spec – AI‑assisted Lead Qualification PCF Control

1. Context & Problem Statement
Sales teams receive a high volume of leads from web forms (e.g. marketing pages, campaign landing pages).
A significant portion of these leads are not sales‑relevant (complaints, vendors, spam, job seekers, unrelated inquiries), but they still land in Dynamics 365 Sales and consume seller time.

**Current challenges:**

- Manual triage by sales reps is inconsistent and slow.
- Qualification quality varies by region and individual.
- Important contextual signals (free text, company info, intent cues) are not evaluated consistently
- Sales wants help inside the lead form, not in a separate system

**Goal:**
Provide an AI‑assisted signal directly in the Lead form to help sellers quickly understand whether a lead is likely sales‑relevant — without auto‑rejecting or auto‑qualifying leads.


2. Target Outcome (What success looks like)
From a seller perspective:

- I open a Lead record and immediately see an AI relevance assessment
- I understand why the lead is classified a certain way
- I can still override the decision using my judgment

From a platform perspective:

- The solution is non-invasive, explainable, and compliant
- No automatic writes to qualification state
- AI output is clearly marked as “advisory”

3. Scope Clarification
## In Scope (Research Phase)

- PCF custom control embedded in Lead main form
- AI inference based on:
    - Web form fields (e.g. description, message, company name, email domain)
    - Lead metadata already stored in Dataverse


- Retrieval of AI assessment on demand or on load
- Visual representation of:
    - Relevance score or category
    - Key influencing factors (explainability)

The AI integration should follow the the pattern described in docs\PCF to Custom MCS Agent Integration.pdf: 
- use a custom topic for calling a Microsoft Copilot agent (out of scope)
- use enterprise application registration to provide privileges to call the agent

## Out of Scope (for v1)

- Fully automatic lead qualification
- Background/batch scoring of all leads
- Training custom AI models
- Marketing attribution or campaign ROI analysis
- the copilot agent itself which does the AI magic
- customization of the CRM System and adding additional fields 

4. Users & Personas

Primary user
- Sales (Development) Representative (SDR)
- Account Executive (AE)

Secondary
- Sales Manager (quality oversight)
- Admin (solution deployment & governance)

Key constraints:
- Sellers tolerate guidance, not black-box automation
- UI must be quick to read (≤ 5 seconds to understand)

5. Data Sources (Explored, not finalized)
Candidate inputs:
- Lead fields:
    - Topic
    - Description / Message
    - Company Name
    - Website
    - Email (domain)
    - Country
    - Lead Source

**Research decision:**
Prefer existing Dataverse fields only for v1 to avoid new data dependencies.


6. AI Capability Exploration
Possible AI approaches (evaluated)

Use the Copilot PCF SDK to trigger an agent in Copilot Studio. 
The agent must exist and there is a defined set of parameters that the agent returns. 


7. Dynamics 365 / PCF Constraints
Key platform constraints identified:

- PCF runs client-side → AI call must be proxied via the pattern described in the PDF document: docs\PCF to Custom MCS Agent Integration.pdf

- Secrets must never be stored in PCF
- Network latency must be handled gracefully

PCF implications:
- Read-only advisory UI (no blocking behavior)
- Must handle:
    - Load
    - Refresh
    - Field change events

8. Compliance & Trust Considerations
Key risks identified:

- Over-reliance on AI recommendations
- Perceived “automatic rejection”
- GDPR and explainability expectations

Mitigations:

- Label clearly as “AI suggestion”
- No automatic field updates
- Human decision always required
- Ability to inspect reasoning


9. Open Questions (to be resolved before Spec)

Should AI run:
- Automatically on form load?
- Only on user click (“Analyze lead”)?

Should the result be:
- Stored in Dataverse?
- Or computed transiently?

- How do we localize explanations (language)?
- How do we handle changes to lead fields after scoring?

10. Preliminary Decisions (Captured for Traceability)

| ID | Decision                          | Rationale                   |
| R1 | Advisory-only AI                  | Avoide automation risk      |
| R2 | PCF control on Lead form          | Contextual, seller-friendly |
| R3 | Existing Dataverse Data only (v1) | Reduce complexity           |
| R4 | Explainable output required | Trust and compliance              |


11. Non‑Goals (Explicit)

- We are not building a replacement for seller judgment
- We are not optimizing for marketing automation
- We are not training ML models in v1


12. Exit Criteria for Research Phase
Research is considered complete when:

- Core decisions (AI pattern, UX approach, integration path) are agreed
- Unknowns are reduced to implementation choices
- Input is ready to be turned into:
    - User stories
    - Acceptance criteria
    - Architecture plan



