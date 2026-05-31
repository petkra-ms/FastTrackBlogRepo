import * as React from "react";
import {
    Button,
    Switch,
    Text,
    Spinner,
    tokens,
    makeStyles,
    mergeClasses,
} from "@fluentui/react-components";
import type { AISummaryResult, FieldRecommendation } from "../services/aiService";

// ─── Styles ───────────────────────────────────────────────────────────────────

const useStyles = makeStyles({
    panel: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalS,
        padding: `${tokens.spacingVerticalS} 0`,
    },
    suggestion: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalXS,
        color: tokens.colorNeutralForeground3,
    },
    switchRow: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
    },
    recommendationBox: {
        display: "flex",
        flexDirection: "column",
        gap: tokens.spacingVerticalXS,
        padding: tokens.spacingVerticalS,
        backgroundColor: tokens.colorNeutralBackground3,
        borderRadius: tokens.borderRadiusMedium,
    },
    recommendationTable: {
        width: "100%",
        borderCollapse: "collapse" as const,
    },
    tableHeader: {
        textAlign: "left" as const,
        paddingBottom: tokens.spacingVerticalXXS,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    tableCell: {
        padding: `${tokens.spacingVerticalXXS} ${tokens.spacingHorizontalS} ${tokens.spacingVerticalXXS} 0`,
    },
    updateRow: {
        display: "flex",
        alignItems: "center",
        gap: tokens.spacingHorizontalS,
        paddingTop: tokens.spacingVerticalXS,
    },
    successText: {
        color: tokens.colorPaletteGreenForeground1,
    },
    errorText: {
        color: tokens.colorPaletteRedForeground1,
    },
});

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ISalesRelevancePanelProps {
    /** AI suggestion — used as pre-selection hint */
    aiSuggestion?: AISummaryResult["isSalesRelevant"];
    /** Current user selection; null = nothing chosen yet */
    selected: "yes" | "no" | null;
    onSelectionChange: (value: "yes" | "no") => void;
    /** Explanation of why field changes are recommended */
    recommendationText?: string;
    /** Field values the AI suggests updating on the lead */
    fieldRecommendations?: FieldRecommendation[];
    /** Called when the user clicks "Update Lead" */
    onUpdateLead: () => void;
    isUpdating: boolean;
    updateError?: string;
    updateSuccess: boolean;
    /** False when leadId is not yet available */
    canUpdate: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function suggestionLabel(verdict: AISummaryResult["isSalesRelevant"]): string {
    if (verdict === "yes") return "AI suggests: Sales Relevant";
    if (verdict === "no") return "AI suggests: Not Sales Relevant";
    return "AI could not determine relevance — please decide manually";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SalesRelevancePanel: React.FC<ISalesRelevancePanelProps> = ({
    aiSuggestion,
    selected,
    onSelectionChange,
    recommendationText,
    fieldRecommendations,
    onUpdateLead,
    isUpdating,
    updateError,
    updateSuccess,
    canUpdate,
}) => {
    const styles = useStyles();
    const hasRecommendations = fieldRecommendations && fieldRecommendations.length > 0;

    return (
        <div className={styles.panel}>
            <Text weight="semibold" size={300}>Sales Relevance</Text>

            {/* AI suggestion hint */}
            {aiSuggestion !== undefined && (
                <div className={styles.suggestion}>
                    <Text size={200} italic>{suggestionLabel(aiSuggestion)}</Text>
                </div>
            )}

            {/* Yes/No toggle switch */}
            <div className={styles.switchRow}>
                <Switch
                    checked={selected === "yes"}
                    onChange={(_e, data) => {
                        onSelectionChange(data.checked ? "yes" : "no");
                    }}
                    disabled={isUpdating}
                    label={selected === "yes" ? "Sales Relevant" : selected === "no" ? "Not Sales Relevant" : "Not set"}
                />
            </div>

            {/* Recommendation text */}
            {recommendationText && (
                <div className={styles.recommendationBox}>
                    <Text weight="semibold" size={200}>Agent Recommendation</Text>
                    <Text size={200}>{recommendationText}</Text>
                </div>
            )}

            {/* Recommended field changes */}
            {hasRecommendations && (
                <div className={styles.recommendationBox}>
                    <Text weight="semibold" size={200}>Suggested Field Updates</Text>
                    <table className={styles.recommendationTable}>
                        <thead>
                            <tr>
                                <th className={styles.tableHeader}>
                                    <Text size={200} weight="semibold">Field</Text>
                                </th>
                                <th className={styles.tableHeader}>
                                    <Text size={200} weight="semibold">Recommended Value</Text>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {fieldRecommendations.map((rec, i) => (
                                <tr key={i}>
                                    <td className={styles.tableCell}>
                                        <Text size={200}>{rec.displayName}</Text>
                                    </td>
                                    <td className={styles.tableCell}>
                                        <Text size={200} weight="semibold">{rec.recommendedValue}</Text>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Update Lead button — enabled when there are recommendations or relevance is set */}
            <div className={styles.updateRow}>
                <Button
                    appearance="primary"
                    onClick={onUpdateLead}
                    disabled={
                        (selected === null && !hasRecommendations) ||
                        isUpdating ||
                        !canUpdate ||
                        updateSuccess
                    }
                >
                    Update Lead
                </Button>
                {isUpdating && <Spinner size="tiny" />}
                {updateSuccess && (
                    <Text className={styles.successText} size={200}>✓ Lead updated</Text>
                )}
                {updateError && (
                    <Text className={mergeClasses(styles.errorText)} size={200}>
                        ⚠ {updateError}
                    </Text>
                )}
            </div>
        </div>
    );
};
