export interface FieldRecommendation {
    /** Logical name of the lead field (e.g. "companyname") */
    fieldName: string;
    /** Human-readable label (e.g. "Company Name") */
    displayName: string;
    /** Value the agent recommends setting */
    recommendedValue: string;
}

export interface AISummaryResult {
    summary: string;
    isSalesRelevant: "yes" | "no" | "unclear";
    keyFactors: string[];
    /** Explanation of why field changes are recommended (or empty if none) */
    recommendationText: string;
    /** Specific field values the agent suggests updating on the lead */
    fieldRecommendations: FieldRecommendation[];
}

const AI_TIMEOUT_MS = 30_000;

export function parseAIResponse(text: string): AISummaryResult {
    // Strip possible markdown fences the model may wrap around JSON
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned) as {
        summary: string;
        isSalesRelevant: string;
        keyFactors?: string[];
        recommendationText?: string;
        fieldRecommendations?: {
            fieldName?: string;
            displayName?: string;
            recommendedValue?: string;
        }[];
    };

    const relevance = parsed.isSalesRelevant?.toLowerCase();
    const isSalesRelevant: AISummaryResult["isSalesRelevant"] =
        relevance === "yes" ? "yes" : relevance === "no" ? "no" : "unclear";

    return {
        summary: parsed.summary ?? "",
        isSalesRelevant,
        keyFactors: Array.isArray(parsed.keyFactors)
            ? parsed.keyFactors.filter((f): f is string => typeof f === "string")
            : [],
        recommendationText: typeof parsed.recommendationText === "string"
            ? parsed.recommendationText
            : "",
        fieldRecommendations: Array.isArray(parsed.fieldRecommendations)
            ? parsed.fieldRecommendations
                  .filter(
                      (r): r is FieldRecommendation =>
                          typeof r?.fieldName === "string" &&
                          typeof r?.displayName === "string" &&
                          typeof r?.recommendedValue === "string"
                  )
            : [],
    };
}

/**
 * Calls a Copilot Studio agent topic via the PCF framework Copilot API.
 *
 * Sends only the lead ID — the agent retrieves lead data from Dataverse.
 * The agent topic must accept a `leadId` parameter and return a message
 * with JSON text in the shape:
 * { "summary": "...", "isSalesRelevant": "yes|no|unclear", "keyFactors": ["..."],
 *   "recommendationText": "...", "fieldRecommendations": [{ "fieldName": "...", "displayName": "...", "recommendedValue": "..." }] }
 *
 * Includes a 30-second timeout. Throws on API errors or timeout;
 * callers should handle graceful degradation.
 */
export async function callCopilotAgent(
    copilot: ComponentFramework.Copilot,
    eventName: string,
    leadId: string
): Promise<AISummaryResult> {
    const agentCall = copilot.executeEvent(eventName, { leadId });

    const timeout = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error("AI request timed out")), AI_TIMEOUT_MS);
    });

    const responses = await Promise.race([agentCall, timeout]);

    // Find the first message response that contains text
    const message = responses.find((r) => r.type === "message" && r.text);
    if (!message?.text) {
        throw new Error("Copilot agent returned no text response");
    }

    return parseAIResponse(message.text);
}
