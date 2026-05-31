import * as React from "react";
import { FluentProvider, webLightTheme, Divider } from "@fluentui/react-components";
import { LeadSummaryCard } from "./LeadSummaryCard";
import { SalesRelevancePanel } from "./SalesRelevancePanel";
import { FeedbackPanel } from "./FeedbackPanel";
import { callAgent, type AgentConfig } from "../services/agentClient";
import type { AISummaryResult } from "../services/aiService";
import {
    saveFeedback,
    getFeedbackForLead,
} from "../services/feedbackService";
import type { FeedbackType, FeedbackRecord } from "../services/feedbackService";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ILeadSummaryRootProps {
    agentConfig: AgentConfig;
    publisherPrefix: string;
    salesRelevantFieldName: string;
    leadId: string;
    userId: string;
    webAPI: ComponentFramework.WebApi;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LeadSummaryRoot: React.FC<ILeadSummaryRootProps> = ({
    agentConfig,
    publisherPrefix,
    salesRelevantFieldName,
    leadId,
    userId,
    webAPI,
}) => {
    // ── AI state ──────────────────────────────────────────────────────────────
    const [aiResult, setAiResult] = React.useState<AISummaryResult | null>(null);
    const [aiLoading, setAiLoading] = React.useState(false);
    const [aiError, setAiError] = React.useState<string | undefined>(undefined);

    // ── Sales relevance selection state ──────────────────────────────────────
    const [selectedRelevance, setSelectedRelevance] = React.useState<"yes" | "no" | null>(null);
    const userSelectedRef = React.useRef(false); // true once user manually picks
    const [updateLoading, setUpdateLoading] = React.useState(false);
    const [updateError, setUpdateError] = React.useState<string | undefined>(undefined);
    const [updateSuccess, setUpdateSuccess] = React.useState(false);

    // ── Feedback state ────────────────────────────────────────────────────────
    const [feedbackRecords, setFeedbackRecords] = React.useState<FeedbackRecord[]>([]);
    const [feedbackSaving, setFeedbackSaving] = React.useState(false);
    const [feedbackError, setFeedbackError] = React.useState<string | undefined>(undefined);
    const [feedbackSuccess, setFeedbackSuccess] = React.useState(false);

    // ── Dirty-check ref to avoid redundant AI calls ─────────────────────────
    const calledForLeadRef = React.useRef<string | null>(null);

    // ── Trigger AI call once when leadId becomes available ────────────────────
    React.useEffect(() => {
        if (!leadId || !agentConfig.clientId || calledForLeadRef.current === leadId) {
            return;
        }

        calledForLeadRef.current = leadId;

        const fetchSummary = async (): Promise<void> => {
            setAiLoading(true);
            setAiError(undefined);
            setAiResult(null);
            try {
                const result = await callAgent(agentConfig, leadId);
                setAiResult(result);
            } catch (err: unknown) {
                setAiError(err instanceof Error ? err.message : String(err));
            } finally {
                setAiLoading(false);
            }
        };

        void fetchSummary();
    }, [leadId, agentConfig]);

    // ── Pre-select relevance from AI suggestion (if user hasn't picked yet) ──
    React.useEffect(() => {
        if (!userSelectedRef.current && aiResult?.isSalesRelevant !== "unclear") {
            const verdict = aiResult?.isSalesRelevant;
            if (verdict === "yes" || verdict === "no") {
                setSelectedRelevance(verdict);
            }
        }
    }, [aiResult]);

    // ── Lead update (sales relevance + any field recommendations) ────────────
    const handleUpdateLead = React.useCallback(() => {
        if (!leadId || !salesRelevantFieldName) return;

        const update = async (): Promise<void> => {
            setUpdateLoading(true);
            setUpdateError(undefined);
            try {
                const payload: Record<string, unknown> = {};

                // Always include sales relevance if selected
                if (selectedRelevance !== null) {
                    payload[salesRelevantFieldName] = selectedRelevance === "yes";
                }

                // Include all field recommendations from the AI
                const recs = aiResult?.fieldRecommendations ?? [];
                for (const rec of recs) {
                    payload[rec.fieldName] = rec.recommendedValue;
                }

                await webAPI.updateRecord("lead", leadId, payload);
                setUpdateSuccess(true);
            } catch (err: unknown) {
                setUpdateError(err instanceof Error ? err.message : String(err));
            } finally {
                setUpdateLoading(false);
            }
        };

        void update();
    }, [webAPI, leadId, salesRelevantFieldName, selectedRelevance, aiResult]);

    // ── Load existing feedback when leadId is available ───────────────────────
    React.useEffect(() => {
        if (!leadId || !publisherPrefix) return;

        void getFeedbackForLead(webAPI, leadId, publisherPrefix)
            .then(setFeedbackRecords)
            .catch(() => undefined);
    }, [leadId, publisherPrefix, webAPI]);

    // ── Feedback submission ───────────────────────────────────────────────────
    const handleFeedbackSubmit = React.useCallback(
        (feedbackType: FeedbackType, comment: string | undefined) => {
            if (!leadId || !userId || !publisherPrefix) return;

            const submit = async (): Promise<void> => {
                setFeedbackSaving(true);
                setFeedbackError(undefined);
                try {
                    await saveFeedback(
                        webAPI,
                        leadId,
                        userId,
                        feedbackType,
                        comment,
                        aiResult?.isSalesRelevant ?? "unclear",
                        publisherPrefix
                    );
                    setFeedbackSuccess(true);
                    const records = await getFeedbackForLead(webAPI, leadId, publisherPrefix);
                    setFeedbackRecords(records);
                } catch (err: unknown) {
                    console.error("Feedback save error:", err);
                    let msg = "Unknown error";
                    try {
                        msg = JSON.stringify(err, Object.getOwnPropertyNames(err as object), 2);
                    } catch {
                        msg = String(err);
                    }
                    setFeedbackError(msg);
                } finally {
                    setFeedbackSaving(false);
                }
            };

            void submit();
        },
        [webAPI, leadId, userId, publisherPrefix, aiResult]
    );

    // ── Render ────────────────────────────────────────────────────────────────
    return (
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
                onSelectionChange={(v) => {
                    userSelectedRef.current = true;
                    setSelectedRelevance(v);
                    setUpdateSuccess(false);
                    setUpdateError(undefined);
                }}
                recommendationText={aiResult?.recommendationText}
                fieldRecommendations={aiResult?.fieldRecommendations}
                onUpdateLead={handleUpdateLead}
                isUpdating={updateLoading}
                updateError={updateError}
                updateSuccess={updateSuccess}
                canUpdate={Boolean(leadId && salesRelevantFieldName)}
            />
            <Divider />
            <FeedbackPanel
                existingFeedback={feedbackRecords}
                isSaving={feedbackSaving}
                saveError={feedbackError}
                saveSuccess={feedbackSuccess}
                onSubmit={handleFeedbackSubmit}
            />
        </FluentProvider>
    );
};
