/**
 * agentClient.ts
 *
 * Acquires a token via MSAL and communicates with a Copilot Studio agent
 * using the @microsoft/agents-copilotstudio-client SDK (SSE streaming).
 *
 * This replaces the previous context.copilot.executeEvent() approach,
 * following the reference architecture:
 * https://learn.microsoft.com/en-us/dynamics365/guidance/reference-architectures/custom-copilot-agent-dynamics-365-power-apps
 */

import { PublicClientApplication, type Configuration } from "@azure/msal-browser";
import { Activity } from "@microsoft/agents-activity";
import { ConnectionSettings, CopilotStudioClient } from "@microsoft/agents-copilotstudio-client";
import { parseAIResponse, type AISummaryResult } from "./aiService";

export interface AgentConfig {
    clientId: string;
    tenantId: string;
    environmentId: string;
    agentIdentifier: string;
}

const AI_TIMEOUT_MS = 60_000;

let pcaInstance: PublicClientApplication | null = null;
let lastClientId = "";
let lastTenantId = "";

function getPCA(clientId: string, tenantId: string): PublicClientApplication {
    if (pcaInstance && lastClientId === clientId && lastTenantId === tenantId) {
        return pcaInstance;
    }
    const config: Configuration = {
        auth: {
            clientId,
            authority: `https://login.microsoftonline.com/${tenantId}`,
        },
        cache: { cacheLocation: "localStorage" },
    };
    pcaInstance = new PublicClientApplication(config);
    lastClientId = clientId;
    lastTenantId = tenantId;
    return pcaInstance;
}

/**
 * Acquires a token for the Copilot Studio API.
 * Tries silent first; falls back to popup if needed.
 */
async function getToken(clientId: string, tenantId: string): Promise<string> {
    const pca = getPCA(clientId, tenantId);
    await pca.initialize();

    const scopes = ["https://api.powerplatform.com/.default"];
    const accounts = pca.getAllAccounts();

    if (accounts.length > 0) {
        try {
            const result = await pca.acquireTokenSilent({ scopes, account: accounts[0] });
            return result.accessToken;
        } catch {
            // Silent failed — fall through to popup
        }
    }

    const result = await pca.acquireTokenPopup({ scopes });
    return result.accessToken;
}

/**
 * Calls the Copilot Studio agent with a message prompt containing the leadId.
 *
 * Flow:
 * 1. Acquire MSAL token
 * 2. Start a streaming conversation via CopilotStudioClient
 * 3. Send an event activity with the leadId
 * 4. Collect the agent's response (event or message)
 * 5. Parse the JSON response into AISummaryResult
 */
export async function callAgent(
    config: AgentConfig,
    leadId: string,
): Promise<AISummaryResult> {
    const token = await getToken(config.clientId, config.tenantId);

    const connectionSettings: ConnectionSettings = {
        environmentId: config.environmentId,
        agentIdentifier: config.agentIdentifier,
    };

    const client = new CopilotStudioClient(connectionSettings, token);

    const resultPromise = (async () => {
        let conversationId = "";

        // Start conversation — iterate initial activities to get conversationId
        for await (const activity of client.startConversationStreaming(true)) {
            conversationId = activity.conversation?.id ?? conversationId;
            if (conversationId) break;
        }

        if (!conversationId) {
            throw new Error("Failed to obtain conversationId from agent");
        }

        // Send an event activity with the leadId as the value
        const eventActivity = new Activity("event");
        eventActivity.name = "LeadQualification";
        eventActivity.value = { leadId };
        eventActivity.conversation = { id: conversationId };

        let agentResponseText = "";

        for await (const reply of client.sendActivityStreaming(eventActivity)) {
            // Prefer named event "AgentAnswer" (per reference architecture)
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

        if (!agentResponseText) {
            throw new Error("Agent returned no response text");
        }

        // Check for error messages from the agent
        if (agentResponseText.startsWith("An error has occurred")) {
            throw new Error(`Agent error: ${agentResponseText}`);
        }

        return parseAIResponse(agentResponseText);
    })();

    // Race against timeout
    const timeout = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("Agent request timed out (60s)")), AI_TIMEOUT_MS);
    });

    return Promise.race([resultPromise, timeout]);
}
