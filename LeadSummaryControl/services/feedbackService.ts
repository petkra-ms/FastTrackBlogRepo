import type { AISummaryResult } from "./aiService";

export type FeedbackType = "ThumbsUp" | "ThumbsDown";

export interface FeedbackRecord {
    id: string;
    feedbackType: FeedbackType;
    comment?: string;
    aiVerdict: AISummaryResult["isSalesRelevant"];
    createdOn: string;
}

/**
 * Returns the logical name of the custom feedback entity.
 * e.g. publisherPrefix = "cr123"  →  "cr123_leadsummaryfeedback"
 */
export function feedbackEntityName(publisherPrefix: string): string {
    return `${publisherPrefix}_leadsummaryfeedback`;
}

/**
 * Saves a new feedback record linked to the given lead.
 * Multiple records per (lead, user) are intentional.
 *
 * @param webAPI        PCF context.webAPI
 * @param leadId        GUID of the current lead record
 * @param userId        GUID of the current system user (context.userSettings.userId)
 * @param feedbackType  "ThumbsUp" | "ThumbsDown"
 * @param comment       Optional free-text comment from the user
 * @param aiVerdict     The AI's isSalesRelevant value at the time of submission
 * @param publisherPrefix  Dataverse publisher prefix
 */
export async function saveFeedback(
    webAPI: ComponentFramework.WebApi,
    leadId: string,
    userId: string,
    feedbackType: FeedbackType,
    comment: string | undefined,
    aiVerdict: AISummaryResult["isSalesRelevant"],
    publisherPrefix: string
): Promise<string> {
    const entityName = feedbackEntityName(publisherPrefix);

    const record: Record<string, unknown> = {
        // Lookup to lead (navigation property from relationship metadata)
        [`ftdemo_Lead@odata.bind`]: `/leads(${leadId})`,
        // Boolean: true = ThumbsUp, false = ThumbsDown
        [`${publisherPrefix}_feedbacktype`]: feedbackType === "ThumbsUp",
        // Text field mirroring the AI verdict at time of submission
        [`${publisherPrefix}_airelevanceverdict`]: aiVerdict,
    };

    if (comment?.trim()) {
        record[`${publisherPrefix}_comment`] = comment.trim();
    }

    const result = await webAPI.createRecord(entityName, record);
    return result.id;
}

/**
 * Retrieves all feedback records for a given lead, ordered newest first.
 * Returns records regardless of who submitted them (for aggregate display).
 */
export async function getFeedbackForLead(
    webAPI: ComponentFramework.WebApi,
    leadId: string,
    publisherPrefix: string
): Promise<FeedbackRecord[]> {
    const entityName = feedbackEntityName(publisherPrefix);
    const prefix = publisherPrefix;

    const result = await webAPI.retrieveMultipleRecords(
        entityName,
        `?$filter=_${prefix}_lead_value eq '${leadId}'` +
        `&$select=${prefix}_leadsummaryfeedbackid,${prefix}_feedbacktype,${prefix}_comment,${prefix}_airelevanceverdict,createdon` +
        `&$orderby=createdon desc`
    );

    return result.entities.map((e) => ({
        id: e[`${prefix}_leadsummaryfeedbackid`] as string,
        feedbackType: e[`${prefix}_feedbacktype`] === true ? "ThumbsUp" : "ThumbsDown",
        comment: e[`${prefix}_comment`] as string | undefined,
        aiVerdict: (e[`${prefix}_airelevanceverdict`] as string as AISummaryResult["isSalesRelevant"]) ?? "unclear",
        createdOn: e.createdon as string,
    }));
}

function aiVerdictToOptionSet(verdict: AISummaryResult["isSalesRelevant"]): number {
    if (verdict === "yes") return 1;
    if (verdict === "no") return 2;
    return 3; // unclear
}

function optionSetToAiVerdict(value: number): AISummaryResult["isSalesRelevant"] {
    if (value === 1) return "yes";
    if (value === 2) return "no";
    return "unclear";
}
