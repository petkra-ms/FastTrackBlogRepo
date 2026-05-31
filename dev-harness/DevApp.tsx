import * as React from "react";
import * as ReactDOM from "react-dom";
import { FluentProvider, webLightTheme, Divider } from "@fluentui/react-components";
import { LeadSummaryCard } from "../LeadSummaryControl/components/LeadSummaryCard";
import { SalesRelevancePanel } from "../LeadSummaryControl/components/SalesRelevancePanel";
import { FeedbackPanel } from "../LeadSummaryControl/components/FeedbackPanel";
import { LeadSummaryRoot } from "../LeadSummaryControl/components/LeadSummaryRoot";
import type { ILeadSummaryRootProps } from "../LeadSummaryControl/components/LeadSummaryRoot";
import { parseAIResponse } from "../LeadSummaryControl/services/aiService";
import type { AISummaryResult } from "../LeadSummaryControl/services/aiService";
import type { FeedbackType, FeedbackRecord } from "../LeadSummaryControl/services/feedbackService";

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO PREVIEW MODE (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

type ScenarioId = "sales-relevant" | "not-relevant" | "unclear" | "with-recs" | "loading" | "error";

interface Scenario {
    aiResult: AISummaryResult | null;
    isLoading: boolean;
    error?: string;
}

const SCENARIOS: Record<ScenarioId, Scenario> = {
    "sales-relevant": {
        isLoading: false,
        aiResult: {
            summary:
                "This lead is likely sales-relevant. The inquiry references enterprise pricing for the Dynamics 365 platform, originates from a corporate email domain (@contoso.com), and the company website indicates a mid-market B2B organization.",
            isSalesRelevant: "yes",
            keyFactors: [
                "Corporate email domain (contoso.com)",
                "Product-specific inquiry (Dynamics 365 pricing)",
                "Company website suggests mid-market B2B organization",
                "Lead source: Website contact form",
            ],
            recommendationText: "",
            fieldRecommendations: [],
        },
    },
    "not-relevant": {
        isLoading: false,
        aiResult: {
            summary:
                "This lead does not appear to be sales-relevant. The inquiry is a job application submitted through the website contact form, and the email uses a free provider (gmail.com).",
            isSalesRelevant: "no",
            keyFactors: [
                "Free email provider (gmail.com)",
                "Inquiry content is a job application, not a product inquiry",
                "No company website provided",
                "Lead source: Website contact form",
            ],
            recommendationText: "",
            fieldRecommendations: [],
        },
    },
    "unclear": {
        isLoading: false,
        aiResult: {
            summary:
                "The AI could not determine sales relevance with confidence. The inquiry is very brief and does not mention specific products or services. More information is needed.",
            isSalesRelevant: "unclear",
            keyFactors: [
                "Very short inquiry text (< 10 words)",
                "No company information provided",
                "Email domain could not be classified",
            ],
            recommendationText: "",
            fieldRecommendations: [],
        },
    },
    "with-recs": {
        isLoading: false,
        aiResult: {
            summary:
                "This lead is likely sales-relevant. The inquiry asks about CRM integration pricing. However, several lead fields appear incomplete or inconsistent and should be updated.",
            isSalesRelevant: "yes",
            keyFactors: [
                "Corporate email domain (fabrikam.com)",
                "Product inquiry: CRM integration",
                "Company name on lead does not match email domain",
            ],
            recommendationText:
                "The company name on the lead record ('Fabrikam Inc.') does not match the email domain. Additionally, the website field is empty but could be inferred from the email domain.",
            fieldRecommendations: [
                {
                    fieldName: "companyname",
                    displayName: "Company Name",
                    recommendedValue: "Fabrikam, Inc.",
                },
                {
                    fieldName: "websiteurl",
                    displayName: "Website",
                    recommendedValue: "https://www.fabrikam.com",
                },
                {
                    fieldName: "address1_country",
                    displayName: "Country",
                    recommendedValue: "United States",
                },
            ],
        },
    },
    loading: {
        isLoading: true,
        aiResult: null,
    },
    error: {
        isLoading: false,
        aiResult: null,
        error: "AI request timed out after 30 seconds. The Copilot agent did not respond.",
    },
};

const MOCK_FEEDBACK: FeedbackRecord[] = [
    { id: "fb-1", feedbackType: "ThumbsUp", comment: "Spot on!", aiVerdict: "yes", createdOn: "2026-05-19T14:30:00Z" },
    { id: "fb-2", feedbackType: "ThumbsUp", aiVerdict: "yes", createdOn: "2026-05-18T09:15:00Z" },
    { id: "fb-3", feedbackType: "ThumbsDown", comment: "Missed key details", aiVerdict: "no", createdOn: "2026-05-17T16:00:00Z" },
];

const ScenarioMode: React.FC = () => {
    const [scenarioId, setScenarioId] = React.useState<ScenarioId>("sales-relevant");
    const [selectedRelevance, setSelectedRelevance] = React.useState<"yes" | "no" | null>(null);
    const [updateLoading, setUpdateLoading] = React.useState(false);
    const [updateSuccess, setUpdateSuccess] = React.useState(false);
    const [updateError, setUpdateError] = React.useState<string | undefined>(undefined);
    const [feedbackSaving, setFeedbackSaving] = React.useState(false);
    const [feedbackSuccess, setFeedbackSuccess] = React.useState(false);
    const [feedbackError, setFeedbackError] = React.useState<string | undefined>(undefined);
    const [feedbackRecords, setFeedbackRecords] = React.useState<FeedbackRecord[]>(MOCK_FEEDBACK);

    const scenario = SCENARIOS[scenarioId];

    React.useEffect(() => {
        setUpdateSuccess(false);
        setUpdateError(undefined);
        setFeedbackSuccess(false);
        setFeedbackError(undefined);
        if (scenario.aiResult) {
            const v = scenario.aiResult.isSalesRelevant;
            setSelectedRelevance(v === "yes" || v === "no" ? v : null);
        } else {
            setSelectedRelevance(null);
        }
    }, [scenarioId]);

    React.useEffect(() => {
        const buttons: Array<{ id: string; scenario: ScenarioId }> = [
            { id: "btn-sales-relevant", scenario: "sales-relevant" },
            { id: "btn-not-relevant", scenario: "not-relevant" },
            { id: "btn-unclear", scenario: "unclear" },
            { id: "btn-with-recs", scenario: "with-recs" },
            { id: "btn-loading", scenario: "loading" },
            { id: "btn-error", scenario: "error" },
        ];
        const handlers: Array<{ el: HTMLElement; handler: () => void }> = [];
        for (const { id, scenario: s } of buttons) {
            const el = document.getElementById(id);
            if (!el) continue;
            const handler = (): void => {
                setScenarioId(s);
                for (const b of buttons) {
                    document.getElementById(b.id)?.classList.remove("active");
                }
                el.classList.add("active");
            };
            el.addEventListener("click", handler);
            handlers.push({ el, handler });
        }
        return () => {
            for (const { el, handler } of handlers) {
                el.removeEventListener("click", handler);
            }
        };
    }, []);

    return (
        <FluentProvider theme={webLightTheme}>
            <LeadSummaryCard
                summary={scenario.aiResult?.summary}
                keyFactors={scenario.aiResult?.keyFactors}
                isLoading={scenario.isLoading}
                error={scenario.error}
            />
            <Divider />
            <SalesRelevancePanel
                aiSuggestion={scenario.aiResult?.isSalesRelevant}
                selected={selectedRelevance}
                onSelectionChange={(v) => {
                    setSelectedRelevance(v);
                    setUpdateSuccess(false);
                    setUpdateError(undefined);
                }}
                recommendationText={scenario.aiResult?.recommendationText || undefined}
                fieldRecommendations={
                    scenario.aiResult?.fieldRecommendations?.length
                        ? scenario.aiResult.fieldRecommendations
                        : undefined
                }
                onUpdateLead={() => {
                    setUpdateLoading(true);
                    setUpdateError(undefined);
                    setTimeout(() => { setUpdateLoading(false); setUpdateSuccess(true); }, 800);
                }}
                isUpdating={updateLoading}
                updateError={updateError}
                updateSuccess={updateSuccess}
                canUpdate={true}
            />
            <Divider />
            <FeedbackPanel
                existingFeedback={feedbackRecords}
                isSaving={feedbackSaving}
                saveError={feedbackError}
                saveSuccess={feedbackSuccess}
                onSubmit={(ft: FeedbackType, comment: string | undefined) => {
                    setFeedbackSaving(true);
                    setFeedbackError(undefined);
                    setTimeout(() => {
                        setFeedbackSaving(false);
                        setFeedbackSuccess(true);
                        setFeedbackRecords((prev) => [
                            { id: `fb-new-${Date.now()}`, feedbackType: ft, comment, aiVerdict: scenario.aiResult?.isSalesRelevant ?? "unclear", createdOn: new Date().toISOString() },
                            ...prev,
                        ]);
                    }, 600);
                }}
            />
        </FluentProvider>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE AGENT TEST MODE — MSAL + @microsoft/agents-copilotstudio-client SDK
// ═══════════════════════════════════════════════════════════════════════════════

import { PublicClientApplication, type Configuration as MsalConfig } from "@azure/msal-browser";
import { Activity } from "@microsoft/agents-activity";
import { ConnectionSettings, CopilotStudioClient } from "@microsoft/agents-copilotstudio-client";

// ── Log types ────────────────────────────────────────────────────────────────

interface LogEntry {
    timestamp: string;
    direction: "sent" | "received" | "error" | "parsed" | "info";
    label: string;
    payload: string;
}

// ── Auth state type ──────────────────────────────────────────────────────────

type AuthState =
    | { status: "signed-out" }
    | { status: "signing-in" }
    | { status: "signed-in"; accessToken: string; expiresAt: number };

// ── localStorage keys ────────────────────────────────────────────────────────

const LS_TENANT_ID = "devHarness_tenantId";
const LS_CLIENT_ID = "devHarness_clientId";
const LS_ENVIRONMENT_ID = "devHarness_environmentId";
const LS_AGENT_ID = "devHarness_agentIdentifier";

// ── MSAL singleton ──────────────────────────────────────────────────────────

let pcaInstance: PublicClientApplication | null = null;
let pcaClientId = "";
let pcaTenantId = "";

function getPCA(clientId: string, tenantId: string): PublicClientApplication {
    if (pcaInstance && pcaClientId === clientId && pcaTenantId === tenantId) {
        return pcaInstance;
    }
    pcaInstance = new PublicClientApplication({
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
            redirectUri: window.location.origin,
        },
        cache: { cacheLocation: "localStorage" },
    } as MsalConfig);
    pcaClientId = clientId;
    pcaTenantId = tenantId;
    return pcaInstance;
}

// ── Component ────────────────────────────────────────────────────────────────

const AgentTestMode: React.FC = () => {
    // Config (persisted)
    const [tenantId, setTenantId] = React.useState(
        () => localStorage.getItem(LS_TENANT_ID) ?? ""
    );
    const [clientId, setClientId] = React.useState(
        () => localStorage.getItem(LS_CLIENT_ID) ?? ""
    );
    const [environmentId, setEnvironmentId] = React.useState(
        () => localStorage.getItem(LS_ENVIRONMENT_ID) ?? ""
    );
    const [agentIdentifier, setAgentIdentifier] = React.useState(
        () => localStorage.getItem(LS_AGENT_ID) ?? ""
    );
    const [leadId, setLeadId] = React.useState("00000000-0000-0000-0000-000000000001");

    // Auth state
    const [authState, setAuthState] = React.useState<AuthState>({ status: "signed-out" });

    // Log + control state
    const [log, setLog] = React.useState<LogEntry[]>([]);
    const [aiResult, setAiResult] = React.useState<AISummaryResult | null>(null);
    const [aiLoading, setAiLoading] = React.useState(false);
    const [aiError, setAiError] = React.useState<string | undefined>(undefined);
    const [selectedRelevance, setSelectedRelevance] = React.useState<"yes" | "no" | null>(null);

    // Persist settings
    React.useEffect(() => { localStorage.setItem(LS_TENANT_ID, tenantId); }, [tenantId]);
    React.useEffect(() => { localStorage.setItem(LS_CLIENT_ID, clientId); }, [clientId]);
    React.useEffect(() => { localStorage.setItem(LS_ENVIRONMENT_ID, environmentId); }, [environmentId]);
    React.useEffect(() => { localStorage.setItem(LS_AGENT_ID, agentIdentifier); }, [agentIdentifier]);

    const addLog = React.useCallback((entry: Omit<LogEntry, "timestamp">) => {
        setLog((prev) => [
            { ...entry, timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false, fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions) },
            ...prev,
        ]);
    }, []);

    const isSignedIn = authState.status === "signed-in";
    const isAuthBusy = authState.status === "signing-in";

    // ── Sign in handler (MSAL popup) ─────────────────────────────────────────
    const handleSignIn = React.useCallback(() => {
        if (!tenantId.trim() || !clientId.trim()) {
            addLog({ direction: "error", label: "Configuration error", payload: "Tenant ID and Client ID are required." });
            return;
        }

        setAuthState({ status: "signing-in" });

        const run = async (): Promise<void> => {
            const pca = getPCA(clientId, tenantId);
            await pca.initialize();

            const scopes = ["https://api.powerplatform.com/.default"];
            addLog({ direction: "info", label: "Starting MSAL auth", payload: `Scopes: ${scopes.join(", ")}` });

            // Try silent first
            const accounts = pca.getAllAccounts();
            if (accounts.length > 0) {
                try {
                    const result = await pca.acquireTokenSilent({ scopes, account: accounts[0] });
                    setAuthState({ status: "signed-in", accessToken: result.accessToken, expiresAt: result.expiresOn?.getTime() ?? (Date.now() + 3600000) });
                    addLog({ direction: "info", label: "Signed in (silent)", payload: `Account: ${accounts[0].username}` });
                    return;
                } catch {
                    addLog({ direction: "info", label: "Silent auth failed, trying popup", payload: "" });
                }
            }

            // Popup fallback
            const result = await pca.acquireTokenPopup({ scopes });
            setAuthState({ status: "signed-in", accessToken: result.accessToken, expiresAt: result.expiresOn?.getTime() ?? (Date.now() + 3600000) });
            addLog({ direction: "info", label: "Signed in (popup)", payload: `Account: ${result.account?.username ?? "unknown"}` });
        };

        run().catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            addLog({ direction: "error", label: "Sign-in failed", payload: msg });
            setAuthState({ status: "signed-out" });
        });
    }, [tenantId, clientId, addLog]);

    const handleSignOut = React.useCallback(() => {
        setAuthState({ status: "signed-out" });
        addLog({ direction: "info", label: "Signed out", payload: "Access token cleared." });
    }, [addLog]);

    // ── Send message to agent via CopilotStudioClient SDK ────────────────────
    const handleSendMessage = React.useCallback(() => {
        if (authState.status !== "signed-in") {
            addLog({ direction: "error", label: "Not signed in", payload: "Sign in first." });
            return;
        }
        if (!environmentId.trim() || !agentIdentifier.trim()) {
            addLog({ direction: "error", label: "Configuration error", payload: "Environment ID and Agent Identifier are required." });
            return;
        }

        setAiResult(null);
        setAiError(undefined);
        setAiLoading(true);
        setSelectedRelevance(null);

        const { accessToken } = authState;

        const run = async (): Promise<void> => {
            const connSettings: ConnectionSettings = {
                environmentId: environmentId.trim(),
                agentIdentifier: agentIdentifier.trim(),
            };

            addLog({ direction: "info", label: "Creating CopilotStudioClient", payload: JSON.stringify(connSettings, null, 2) });
            const client = new CopilotStudioClient(connSettings, accessToken);

            // Step 1: Start conversation
            addLog({ direction: "info", label: "Starting conversation (streaming)", payload: "" });
            let conversationId = "";
            for await (const act of client.startConversationStreaming(true)) {
                conversationId = act.conversation?.id ?? conversationId;
                addLog({ direction: "received", label: "Init activity", payload: JSON.stringify(act, null, 2) });
                if (conversationId) break;
            }
            if (!conversationId) {
                throw new Error("Failed to obtain conversationId from agent");
            }
            addLog({ direction: "info", label: "Conversation started", payload: `conversationId: ${conversationId}` });

            // Step 2: Send event with leadId
            const eventActivity = new Activity("event");
            eventActivity.name = "LeadQualification";
            eventActivity.value = { leadId };
            eventActivity.conversation = { id: conversationId };

            addLog({ direction: "sent", label: "Sending event", payload: JSON.stringify({ name: "LeadQualification", value: { leadId } }) });

            let agentResponseText = "";
            const allReplies: unknown[] = [];

            for await (const reply of client.sendActivityStreaming(eventActivity)) {
                allReplies.push(reply);
                addLog({ direction: "received", label: `Activity (${reply.type}${reply.name ? ': ' + reply.name : ''})`, payload: JSON.stringify(reply, null, 2) });

                // Prefer named event "AgentAnswer"
                if (reply.type === "event" && reply.name === "AgentAnswer") {
                    agentResponseText = typeof reply.value === "string"
                        ? reply.value
                        : JSON.stringify(reply.value);
                    break;
                }
                // Fall back to message activity with text
                if (reply.type === "message" && reply.text) {
                    agentResponseText = reply.text;
                }
            }

            addLog({ direction: "received", label: `Total ${allReplies.length} reply activities`, payload: "" });

            if (!agentResponseText) {
                throw new Error("Agent returned no response text.\n" + JSON.stringify(allReplies, null, 2));
            }

            addLog({ direction: "received", label: "Agent response (raw)", payload: agentResponseText });

            if (agentResponseText.startsWith("An error has occurred")) {
                throw new Error(`Agent error: ${agentResponseText}`);
            }

            // Step 3: Parse
            let parsed;
            try {
                parsed = parseAIResponse(agentResponseText);
            } catch {
                throw new Error(`Failed to parse agent response as JSON.\nRaw: ${agentResponseText}`);
            }
            addLog({ direction: "parsed", label: "parseAIResponse() result", payload: JSON.stringify(parsed, null, 2) });
            setAiResult(parsed);
            if (parsed.isSalesRelevant === "yes" || parsed.isSalesRelevant === "no") {
                setSelectedRelevance(parsed.isSalesRelevant);
            }
        };

        run().catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err);
            addLog({ direction: "error", label: "Agent call failed", payload: msg });
            setAiError(msg);
        }).finally(() => {
            setAiLoading(false);
        });
    }, [authState, environmentId, agentIdentifier, leadId, addLog]);

    const handleClearLog = React.useCallback(() => setLog([]), []);

    const directionStyles: Record<LogEntry["direction"], React.CSSProperties> = {
        sent: { borderLeft: "3px solid #0078d4", background: "#f0f6ff" },
        received: { borderLeft: "3px solid #107c10", background: "#f0fff0" },
        parsed: { borderLeft: "3px solid #8764b8", background: "#f8f0ff" },
        error: { borderLeft: "3px solid #d13438", background: "#fff0f0" },
        info: { borderLeft: "3px solid #8a8886", background: "#fafafa" },
    };
    const directionLabels: Record<LogEntry["direction"], string> = {
        sent: "📤 SENT",
        received: "📥 RECEIVED",
        parsed: "✅ PARSED",
        error: "❌ ERROR",
        info: "ℹ️ INFO",
    };

    const inputStyle: React.CSSProperties = { width: "100%", padding: "6px 10px", marginBottom: 12, border: "1px solid #c0c0c0", borderRadius: 4, fontSize: 13 };
    const monoInputStyle: React.CSSProperties = { ...inputStyle, fontFamily: "Consolas, monospace", fontSize: 12 };
    const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#424242" };
    const hintStyle: React.CSSProperties = { fontSize: 11, color: "#616161", marginBottom: 4 };

    return (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Left: config + log */}
            <div style={{ flex: "1 1 460px", minWidth: 400 }}>

                {/* ── Authentication (MSAL popup) ──────────────────────── */}
                <fieldset style={{ border: "1px solid #d0d0d0", borderRadius: 6, padding: 16, marginBottom: 16 }}>
                    <legend style={{ fontWeight: 600, fontSize: 13, padding: "0 6px" }}>
                        🔐 Authentication (MSAL Popup)
                    </legend>

                    <label style={labelStyle}>Tenant ID</label>
                    <div style={hintStyle}>Azure AD / Entra ID tenant (GUID or domain)</div>
                    <input type="text" value={tenantId} onChange={(e) => setTenantId(e.target.value)}
                        placeholder="e.g. contoso.onmicrosoft.com or 72f988bf-..."
                        disabled={isSignedIn || isAuthBusy} style={monoInputStyle} />

                    <label style={labelStyle}>Client ID (App Registration)</label>
                    <div style={hintStyle}>
                        SPA app registration with redirect URI = {window.location.origin} and
                        CopilotStudio.Copilots.Invoke permission
                    </div>
                    <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)}
                        placeholder="e.g. 1a2b3c4d-..."
                        disabled={isSignedIn || isAuthBusy} style={monoInputStyle} />

                    {authState.status === "signing-in" && (
                        <div style={{ fontSize: 13, color: "#616161", marginBottom: 12 }}>
                            ⏳ Opening sign-in popup…
                        </div>
                    )}

                    {authState.status === "signed-in" && (
                        <div style={{ fontSize: 13, color: "#107c10", marginBottom: 12 }}>
                            ✅ Signed in — token expires at {new Date(authState.expiresAt).toLocaleTimeString()}
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                        {!isSignedIn ? (
                            <button onClick={handleSignIn} disabled={isAuthBusy}
                                style={{ padding: "8px 20px", background: "#0078d4", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: isAuthBusy ? 0.6 : 1 }}>
                                {isAuthBusy ? "⏳ Signing in…" : "🔑 Sign In (Popup)"}
                            </button>
                        ) : (
                            <button onClick={handleSignOut}
                                style={{ padding: "8px 20px", background: "#fff", color: "#d13438", border: "1px solid #d13438", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                                Sign Out
                            </button>
                        )}
                    </div>
                </fieldset>

                {/* ── Agent config ─────────────────────────────────────── */}
                <fieldset style={{ border: "1px solid #d0d0d0", borderRadius: 6, padding: 16, marginBottom: 16, opacity: isSignedIn ? 1 : 0.5 }}>
                    <legend style={{ fontWeight: 600, fontSize: 13, padding: "0 6px" }}>Copilot Studio Agent (SDK)</legend>

                    <label style={labelStyle}>Environment ID</label>
                    <div style={hintStyle}>Power Platform environment ID (GUID) — from Copilot Studio → Settings → Advanced → Metadata</div>
                    <input type="text" value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)}
                        disabled={!isSignedIn} style={monoInputStyle} />

                    <label style={labelStyle}>Agent Identifier (Schema Name)</label>
                    <div style={hintStyle}>From Copilot Studio → Settings → Advanced → Metadata (e.g. copilots_header_cr123_MyAgent)</div>
                    <input type="text" value={agentIdentifier} onChange={(e) => setAgentIdentifier(e.target.value)}
                        disabled={!isSignedIn} style={monoInputStyle} />

                    <label style={labelStyle}>Lead ID (GUID)</label>
                    <div style={hintStyle}>A real lead record GUID from your Dataverse environment</div>
                    <input type="text" value={leadId} onChange={(e) => setLeadId(e.target.value)}
                        disabled={!isSignedIn} style={monoInputStyle} />

                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleSendMessage} disabled={!isSignedIn || aiLoading}
                            style={{ padding: "8px 20px", background: "#0078d4", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: (!isSignedIn || aiLoading) ? 0.6 : 1 }}>
                            {aiLoading ? "⏳ Calling agent…" : "▶ Send Message"}
                        </button>
                        <button onClick={handleClearLog}
                            style={{ padding: "8px 14px", background: "#fff", color: "#424242", border: "1px solid #c0c0c0", borderRadius: 4, cursor: "pointer", fontSize: 13 }}>
                            Clear Log
                        </button>
                    </div>
                </fieldset>

                {/* Event log */}
                <fieldset style={{ border: "1px solid #d0d0d0", borderRadius: 6, padding: 16 }}>
                    <legend style={{ fontWeight: 600, fontSize: 13, padding: "0 6px" }}>Event Log</legend>
                    {log.length === 0 && (
                        <div style={{ color: "#888", fontSize: 13, fontStyle: "italic" }}>
                            Click "Send Message" to see the request/response flow.
                        </div>
                    )}
                    {log.map((entry, i) => (
                        <div key={i} style={{ ...directionStyles[entry.direction], padding: "8px 12px", marginBottom: 8, borderRadius: 4, fontSize: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                <strong>{directionLabels[entry.direction]} — {entry.label}</strong>
                                <span style={{ color: "#888", fontSize: 11 }}>{entry.timestamp}</span>
                            </div>
                            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily: "Consolas, monospace", fontSize: 11, lineHeight: 1.5 }}>
                                {entry.payload}
                            </pre>
                        </div>
                    ))}
                </fieldset>
            </div>

            {/* Right: rendered control */}
            <div style={{ flex: "0 0 420px", position: "sticky", top: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#424242" }}>
                    Rendered Control Preview
                </div>
                <FluentProvider theme={webLightTheme}>
                    <LeadSummaryCard
                        summary={aiResult?.summary}
                        keyFactors={aiResult?.keyFactors}
                        isLoading={aiLoading}
                        error={aiError}
                    />
                    <Divider />
                    <SalesRelevancePanel
                        aiSuggestion={aiResult?.isSalesRelevant}
                        selected={selectedRelevance}
                        onSelectionChange={(v) => setSelectedRelevance(v)}
                        recommendationText={aiResult?.recommendationText || undefined}
                        fieldRecommendations={
                            aiResult?.fieldRecommendations?.length
                                ? aiResult.fieldRecommendations
                                : undefined
                        }
                        onUpdateLead={() => {}}
                        isUpdating={false}
                        updateSuccess={false}
                        canUpdate={true}
                    />
                    <Divider />
                    <FeedbackPanel
                        existingFeedback={[]}
                        isSaving={false}
                        saveSuccess={false}
                        onSubmit={() => {}}
                    />
                </FluentProvider>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROOT APP – switches between tabs
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = "scenarios" | "agent-test";

const DevApp: React.FC = () => {
    const [activeTab, setActiveTab] = React.useState<TabId>("scenarios");

    // Wire up the HTML tab buttons
    React.useEffect(() => {
        const tabs: Array<{ id: string; tab: TabId }> = [
            { id: "tab-scenarios", tab: "scenarios" },
            { id: "tab-agent-test", tab: "agent-test" },
        ];
        const handlers: Array<{ el: HTMLElement; handler: () => void }> = [];
        for (const { id, tab } of tabs) {
            const el = document.getElementById(id);
            if (!el) continue;
            const handler = (): void => {
                setActiveTab(tab);
                for (const t of tabs) document.getElementById(t.id)?.classList.remove("active");
                el.classList.add("active");

                // Toggle control groups visibility
                const scenarioEl = document.getElementById("scenario-controls");
                const agentEl = document.getElementById("agent-test-controls");
                if (scenarioEl) scenarioEl.style.display = tab === "scenarios" ? "flex" : "none";
                if (agentEl) agentEl.style.display = tab === "agent-test" ? "block" : "none";
            };
            el.addEventListener("click", handler);
            handlers.push({ el, handler });
        }
        return () => {
            for (const { el, handler } of handlers) el.removeEventListener("click", handler);
        };
    }, []);

    if (activeTab === "agent-test") {
        return <AgentTestMode />;
    }
    return <ScenarioMode />;
};

// ── Mount ─────────────────────────────────────────────────────────────────────
ReactDOM.render(<DevApp />, document.getElementById("control-root"));
